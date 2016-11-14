const _ = require('underscore');
const uuid = require('node-uuid');

const Spectator = require('./spectator.js');
const cards = require('./cards');
const Card = require('./card.js');

class Player extends Spectator {
    constructor(id, name, owner, game) {
        super(id, name);

        this.drawCards = _([]);
        this.plotCards = _([]);
        this.drawDeck = _([]);
        this.hand = _([]);

        this.owner = owner;
        this.takenMulligan = false;
        this.game = game;
    }

    drawCardsToHand(numCards) {
        this.hand = _(this.hand.concat(this.drawDeck.first(numCards)));
        this.drawDeck = _(this.drawDeck.rest(numCards));
    }

    searchDrawDeck(limit, predicate) {
        var cards = this.drawDeck;

        if(_.isFunction(limit)) {
            predicate = limit;
        } else {
            if(limit > 0) {
                cards = _(this.drawDeck.first(limit));
            } else {
                cards = _(this.drawDeck.first(-limit));
            }
        }

        return cards.filter(predicate);
    }

    moveFromDrawDeckToHand(card) {
        this.drawDeck = this.removeCardByUuid(this.drawDeck, card.uuid);

        this.hand.push(card);
    }

    shuffleDrawDeck() {
        this.drawDeck = _(this.drawDeck.shuffle());
    }

    initDrawDeck() {
        this.drawDeck = this.drawCards;
        this.shuffleDrawDeck();
        this.hand = _([]);
        this.drawCardsToHand(7);
    }

    initPlotDeck() {
        this.plotDeck = this.plotCards;
    }

    initialise() {
        this.initDrawDeck();
        this.initPlotDeck();

        this.gold = 0;
        this.claim = 0;
        this.power = 0;
        this.reserve = 0;
        this.readyToStart = false;
        this.cardsInPlay = _([]);
        this.limitedPlayed = false;
        this.activePlot = undefined;
        this.plotDiscard = [];
        this.deadPile = _([]);
        this.discardPile = _([]);
        this.claimToDo = 0;

        this.menuTitle = 'Keep Starting Hand?';

        this.buttons = [
            { command: 'keep', text: 'Keep Hand' },
            { command: 'mulligan', text: 'Mulligan' }
        ];
    }

    startGame() {
        if(!this.readyToStart) {
            return;
        }

        this.gold = 8;
        this.phase = 'setup';

        this.buttons = [
            { command: 'setupdone', text: 'Done' }
        ];

        this.menuTitle = 'Select setup cards';
    }

    mulligan() {
        if(this.takenMulligan) {
            return false;
        }

        this.initDrawDeck();
        this.takenMulligan = true;

        this.buttons = [];
        this.menuTitle = 'Waiting for opponent to keep hand or mulligan';

        this.readyToStart = true;

        return true;
    }

    keep() {
        this.readyToStart = true;

        this.buttons = [];
        this.menuTitle = 'Waiting for opponent to keep hand or mulligan';
    }

    isCardUuidInList(list, card) {
        return list.any(c => {
            return c.uuid === card.uuid;
        });
    }

    canPlayCard(card) {
        if(this.phase !== 'setup' && this.phase !== 'marshal') {
            return false;
        }

        if(!this.isCardUuidInList(this.hand, card)) {
            return false;
        }

        var dupe = this.getDuplicateInPlay(card);

        if(card.getCost() > this.gold && !dupe) {
            return false;
        }

        if(this.limitedPlayed && card.isLimited() && !dupe) {
            return false;
        }

        // XXX this can come out soon, but not yet
        if(card.getType() === 'event') {
            return false;
        }

        if(card.getType() === 'character' && card.isUnique()) {
            if(this.deadPile.any(c => {
                return c.code === card.code;
            })) {
                return false;
            }
        }

        return true;
    }

    getDuplicateInPlay(card) {
        if(!card.isUnique()) {
            return undefined;
        }

        return this.cardsInPlay.find(playCard => {
            return playCard.code === card.code || playCard.name === card.name;
        });
    }

    removeFromHand(card) {
        this.hand = this.removeCardByUuid(this.hand, card.uuid);
    }

    discardFromDraw(number) {
        for(var i = 0; i < number; i++) {
            this.discardPile.push(this.drawDeck.first());
            this.drawDeck = _(this.drawDeck.slice(1));
        }
    }

    playCard(cardId, forcePlay) {
        var card = this.findCardByUuid(this.hand, cardId);

        if(!card) {
            return false;
        }

        if(!forcePlay && !this.canPlayCard(card)) {
            return false;
        }

        var dupeCard = this.getDuplicateInPlay(card);

        // XXX - Reducers should act here, or in card.getCost()?        
        if(!dupeCard && !forcePlay) {
            this.gold -= card.getCost();
        }

        if(card.getType() === 'attachment' && this.phase !== 'setup') {
            this.promptForAttachment(card);
            return true;
        }

        if(dupeCard && this.phase !== 'setup') {
            dupeCard.addDuplicate(card);
        } else {
            card.facedown = this.phase === 'setup';
            card.inPlay = true;
            this.cardsInPlay.push(card);
        }

        if(this.hasKeyword(card, 'Limited') && !forcePlay) {
            this.limitedPlayed = true;
        }

        this.removeFromHand(card);

        return true;
    }

    setupDone() {
        this.setup = true;
    }

    postSetup() {
        this.drawCardsToHand(7 - this.hand.size());

        var processedCards = [];

        this.cardsInPlay.each(card => {
            card.facedown = false;

            var dupe = _.find(processedCards, c => {
                return c.isUnique() && c.code === card.code;
            });

            if(dupe) {
                dupe.dupes.push(card);
            } else {
                processedCards.push(card);
            }
        });

        this.cardsInPlay = _(processedCards);
    }

    marshalDone() {
        this.marshalled = true;
    }

    startPlotPhase() {
        this.phase = 'plot';

        this.menuTitle = 'Choose your plot';
        this.buttons = [
            { command: 'selectplot', text: 'Done' }
        ];
        this.gold = 0;
        this.claim = 0;
        this.reserve = 0;
        this.firstPlayer = false;
        this.selectedPlot = undefined;
        this.claimToDo = 0;
        this.doneChallenges = false;
        this.plotRevealed = false;
        this.roundDone = false;
        this.marshalled = false;
        this.challenges = {
            complete: 0,
            maxTotal: 3,
            military: {
                performed: 0,
                max: 1,
                won: 0
            },
            intrigue: {
                performed: 0,
                max: 1,
                won: 0
            },
            power: {
                performed: 0,
                max: 1,
                won: 0
            }
        };
    }

    selectPlot(plot) {
        if(!this.plotDeck.any(card => {
            return card.uuid === plot.uuid;
        })) {
            return false;
        }

        this.selectedPlot = { facedown: true, card: plot };

        return true;
    }

    revealPlot() {
        this.menuTitle = '';
        this.buttons = [];

        this.selectedPlot.facedown = false;
        if(this.activePlot) {
            this.plotDiscard.push(this.activePlot.card);
        }

        this.activePlot = this.selectedPlot;
        this.plotDeck = this.removeCardByUuid(this.plotDeck, this.selectedPlot.uuid);

        if(this.plotDeck.empty() === 0) {
            this.plotDeck = this.plotDiscard;
            this.plotDiscard = _([]);
        }

        this.plotRevealed = true;
        this.revealFinished = false;

        this.selectedPlot = undefined;
    }

    hasWhenRevealed() {
        var plotText = this.activePlot.text;

        if(!_.isNull(plotText) && !_.isUndefined(plotText)) {
            return this.activePlot.text.indexOf('When Revealed:') !== -1;
        }

        return false;
    }

    drawPhase() {
        this.phase = 'draw';
        this.drawCardsToHand(2);
    }

    beginMarshal() {
        this.phase = 'marshal';

        this.buttons = [{ command: 'donemarshal', text: 'Done' }];
        this.menuTitle = 'Marshal your cards';

        this.gold += this.getTotalIncome();
        this.reserve = this.getTotalReserve();
        this.claim = this.activePlot.claim || 0;

        this.limitedPlayed = false;
        this.marshalled = false;
    }

    hasUnmappedAttachments() {
        return this.cardsInPlay.any(card => {
            return card.getType() === 'attachment';
        });
    }

    attach(attachment, card) {
        var inPlayCard = this.findCardInPlayByUuid(card.uuid);

        attachment.parent = inPlayCard;

        inPlayCard.attachments.push(attachment);
    }

    showDrawDeck() {
        this.showDeck = true;
    }

    isValidDropCombination(source, target) {
        if(source === 'plot' && target !== 'plot discard pile') {
            return false;
        }

        if(source === 'plot discard pile' && target !== 'plot') {
            return false;
        }

        return source !== target;
    }

    getSourceList(source) {
        switch(source) {
            case 'hand':
                return this.hand;
            case 'draw deck':
                return this.drawDeck;
            case 'discard pile':
                return this.discardPile;
            case 'dead pile':
                return this.deadPile;
            case 'play area':
                return this.cardsInPlay;
        }
    }

    updateSourceList(source, targetList) {
        switch(source) {
            case 'hand':
                this.hand = targetList;
                break;
            case 'draw deck':
                this.drawDeck = targetList;
                break;
            case 'discard pile':
                this.discardPile = targetList;
                break;
            case 'dead pile':
                this.deadPile = targetList;
                break;
            case 'play area':
                this.cardsInPlay = targetList;
        }
    }

    drop(cardId, source, target) {
        if(!this.isValidDropCombination(source, target)) {
            return false;
        }

        var sourceList = this.getSourceList(source);
        var card = this.findCardByUuid(sourceList, cardId);
        if(!card) {
            return false;
        }

        switch(target) {
            case 'hand':
                this.hand.push(card);
                break;
            case 'discard pile':
                if(source === 'play area') {
                    this.discardCard(cardId, this.discardPile);

                    return true;
                }

                this.discardPile.push(card);

                break;
            case 'dead pile':
                if(card.getType() !== 'character') {
                    return false;
                }

                if(source === 'play area') {
                    this.discardCard(cardId, this.deadPile);

                    return true;
                }

                this.deadPile.push(card);
                break;
            case 'play area':
                if(card.getType() === 'event') {
                    return false;
                }

                this.game.playCard(this.id, cardId, true);

                if(card.getType() === 'attachment') {
                    this.dropPending = true;
                    return true;
                }
                break;
            case 'draw deck':
                this.drawDeck.unshift(card);
                break;
        }

        if(card.parent && card.parent.attachments) {
            card.parent.attachments = this.removeCardByUuid(card.parent.attachments, cardId);
        }

        sourceList = this.removeCardByUuid(sourceList, cardId);

        this.updateSourceList(source, sourceList);

        return true;
    }

    promptForAttachment(card) {
        this.selectedAttachment = card;
        this.selectCard = true;
        this.menuTitle = 'Select target for attachment';
        this.buttons = [
            { text: 'Done', command: 'doneattachment' }
        ];
    }

    beginChallenge() {
        this.phase = 'challenge';
        this.menuTitle = '';
        this.buttons = [
            { text: 'Military', command: 'challenge', arg: 'military' },
            { text: 'Intrigue', command: 'challenge', arg: 'intrigue' },
            { text: 'Power', command: 'challenge', arg: 'power' },
            { text: 'Done', command: 'doneallchallenges' }
        ];

        this.cardsInChallenge = [];
        this.cardsInPlay.each(card => {
            card.stealth = undefined;
        });
        this.selectCard = false;
        this.selectingChallengers = false;
        this.selectedAttachment = undefined;
    }

    startChallenge(challengeType) {
        this.menuTitle = 'Select challenge targets';
        this.buttons = [
            { text: 'Done', command: 'donechallenge' }
        ];

        this.currentChallenge = challengeType;
        this.selectCard = true;
        this.challenger = true;
        this.selectingChallengers = true;
        this.pickingStealth = false;
    }

    addToStealth(card) {
        if(this.currentChallenge === 'military' && !card.is_military) {
            return false;
        }

        if(this.currentChallenge === 'intrigue' && !card.is_intrigue) {
            return false;
        }

        if(this.currentChallenge === 'power' && !card.is_power) {
            return false;
        }

        var inPlay = this.findCardInPlayByUuid(card.uuid);

        if(!inPlay) {
            return false;
        }

        inPlay.stealth = true;

        return true;
    }

    canAddToChallenge(card) {
        if(this.currentChallenge === 'military' && !card.is_military) {
            return false;
        }

        if(this.currentChallenge === 'intrigue' && !card.is_intrigue) {
            return false;
        }

        if(this.currentChallenge === 'power' && !card.is_power) {
            return false;
        }

        var inPlay = this.findCardInPlayByUuid(card.uuid);

        if(!inPlay) {
            return false;
        }

        if(inPlay.stealth) {
            return false;
        }

        return inPlay;
    }

    addToChallenge(card) {
        card.selected = !card.selected;

        if(card.selected) {
            this.cardsInChallenge.push(card);
        } else {
            this.cardsInChallenge = this.removeCardByUuid(this.cardsInChallenge, card.uuid);
        }
    }

    doneChallenge(myChallenge) {
        this.selectingChallengers = false;

        var challengeCards = _.filter(this.cardsInPlay, card => {
            return card.selected;
        });

        var strength = _.reduce(challengeCards, (memo, card) => {
            card.kneeled = true;
            card.selected = false;

            return memo + card.strength;
        }, 0);

        this.challengeStrength = strength;
        this.selectCard = false;

        if(myChallenge) {
            this.challenges[this.currentChallenge].performed++;
            this.challenges.complete++;
        }
    }

    beginDefend(challenge) {
        this.menuTitle = 'Select defenders';
        this.buttons = [
            { text: 'Done', command: 'donedefend' }
        ];

        this.selectCard = true;
        this.currentChallenge = challenge;
        this.phase = 'challenge';
        this.cardsInChallenge = [];
        this.selectingChallengers = true;
    }

    selectCharacterToKill() {
        this.selectCard = true;
        this.phase = 'claim';

        this.menuTitle = 'Select character to kill';
        this.buttons = [
            { command: 'cancelclaim', text: 'Done' }
        ];
    }

    killCharacter(card) {
        var character = this.findCardInPlayByUuid(card.uuid);

        if(!character) {
            return undefined;
        }

        if(!character.dupes.empty() > 0) {
            character.dupes = character.dupes.slice(1);
            character = undefined;
        } else {
            this.cardsInPlay = this.removeCardByUuid(this.cardsInPlay, card.uuid);

            this.deadPile.push(card);
        }

        this.claimToDo--;

        return character;
    }

    doneClaim() {
        this.phase = 'challenge';
        this.selectCard = false;

        this.menuTitle = 'Waiting for opponent to issue challenge';
        this.buttons = [];
    }

    discardAtRandom(number) {
        var toDiscard = number;

        while(toDiscard > 0) {
            var cardIndex = _.random(0, this.hand.size() - 1);

            var discarded = this.hand.splice(cardIndex, 1);

            _.each(discarded, card => {
                this.discardPile.push(card);
            });

            toDiscard--;
        }
    }

    getDominance() {
        var cardStrength = this.cardsInPlay.reduce((memo, card) => {
            if(!card.kneeled && card.getType() === 'character') {
                return memo + card.strength;
            }

            return memo;
        }, 0);

        return cardStrength + this.gold;
    }

    standCards() {
        this.cardsInPlay.each(card => {
            card.kneeled = false;
        });
    }

    taxation() {
        this.gold = 0;
    }

    getTotalPower() {
        var power = this.cardsInPlay.reduce((memo, card) => {
            return memo + card.power;
        }, this.power);

        return power;
    }

    hasKeyword(card, keyword) {
        if(!card.text) {
            return false;
        }

        return card.text.indexOf(keyword + '.') !== -1;
    }

    discardCard(cardId, pile) {
        var card = this.findCardInPlayByUuid(cardId);

        if(!card) {
            return;
        }

        _.each(card.dupes, dupe => {
            pile.push(dupe);
        });

        card.dupes = [];

        _.each(card.attachments, attachment => {
            this.removeAttachment(card, attachment);
        });

        this.cardsInPlay = this.removeCardByUuid(this.cardsInPlay, cardId);

        if(card.parent && card.parent.attachments) {
            card.parent.attachments = this.removeCardByUuid(card.parent.attachments, cardId);

            this.game.notifyLeavingPlay(this, card);
        }

        pile.push(card);
    }

    removeAttachment(cardInPlay, attachment) {
        var otherPlayer = this.game.getOtherPlayer(this);
        var owner = attachment.owner === this.id ? this : otherPlayer;

        if(this.hasKeyword(attachment, 'Terminal')) {
            owner.discardPile.push(attachment);
        } else {
            owner.hand.push(attachment);
        }

        this.game.notifyLeavingPlay(this, attachment);
    }

    findCardInPlayByUuid(uuid) {
        var returnedCard = undefined;

        this.cardsInPlay.each(card => {
            if(card.attachments) {
                var attachment = this.findCardByUuid(card.attachments, uuid);
                if(attachment) {
                    returnedCard = attachment;

                    return;
                }
            }

            if(card.uuid === uuid) {
                returnedCard = card;
                return;
            }
        });

        return returnedCard;
    }

    findCardInPlayByCode(code) {
        return this.cardsInPlay.find(card => {
            return card.code === code;
        });
    }

    removeCardByUuid(list, uuid) {
        return _(list.reject(card => {
            return card.uuid === uuid;
        }));
    }

    findCardByUuid(list, uuid) {
        var returnedCard = undefined;

        if(!list) {
            return undefined;
        }

        list.each(card => {
            if(card.attachments) {
                var attachment = this.findCardByUuid(card.attachments, uuid);

                if(attachment) {
                    returnedCard = attachment;
                    return;
                }
            }

            if(card.card && card.uuid === uuid) {
                returnedCard = card;
                return;
            } else if(card.uuid === uuid) {
                returnedCard = card;
                return;
            }
        });

        return returnedCard;
    }

    selectDeck(deck) {
        this.drawCards = _([]);
        this.plotCards = _([]);

        _.each(deck.drawCards, cardEntry => {
            for(var i = 0; i < cardEntry.count; i++) {
                var drawCard = undefined;

                if(cards[cardEntry.code]) {
                    drawCard = new cards[cardEntry.code](this, cardEntry);
                } else {
                    drawCard = new Card(this, cardEntry.card);
                }

                this.drawCards.push(drawCard);
            }
        });

        _.each(deck.plotCards, card => {
            for(var i = 0; i < card.count; i++) {
                var plotCard = _.clone(card.card);
                plotCard.uuid = uuid.v1();
                plotCard.owner = this.id;
                this.plotCards.push(plotCard);
            }
        });

        this.deck = deck;
    }

    getTotalPlotStat(property) {
        var baseValue = 0;

        if(this.activePlot && property(this.activePlot.card)) {
            baseValue = property(this.activePlot.card);
        }

        var modifier = _.chain(this.cardsInPlay).map(cip => {
            return [cip.card].concat(cip.attachments);
        }).flatten(true).reduce((memo, card) => {
            return memo + (property(card) || 0);
        }, 0);

        return baseValue + modifier;
    }

    getTotalInitiative() {
        return this.getTotalPlotStat(card => {
            return card.initiative;
        });
    }

    getTotalIncome() {
        return this.getTotalPlotStat(card => {
            return card.income;
        });
    }

    getTotalReserve() {
        return this.getTotalPlotStat(card => {
            return card.reserve;
        });
    }

    getState(isActivePlayer) {
        var state = {
            id: this.id,
            faction: this.deck.faction,
            agenda: this.deck.agenda,
            numDrawCards: this.drawDeck.size(),
            hand: this.hand.map(card => {
                return card.getSummary(isActivePlayer);
            }),
            buttons: isActivePlayer ? this.buttons : undefined,
            menuTitle: isActivePlayer ? this.menuTitle : undefined,
            gold: !isActivePlayer && this.phase === 'setup' ? 0 : this.gold,
            power: this.power,
            totalPower: this.getTotalPower(),
            reserve: this.reserve,
            claim: this.claim,
            phase: this.phase,
            cardsInPlay: this.cardsInPlay.map(card => {
                return card.getSummary(true);
            }),
            plotDeck: isActivePlayer ? this.plotDeck : undefined,
            numPlotCards: this.plotDeck.size(),
            plotSelected: !!this.selectedPlot,
            activePlot: this.activePlot,
            firstPlayer: this.firstPlayer,
            plotDiscard: this.plotDiscard,
            selectedAttachment: this.selectedAttachment,
            selectCard: this.selectCard,
            deadPile: this.deadPile.map(card => {
                return card.getSummary(isActivePlayer);
            }),
            discardPile: this.discardPile.map(card => {
                return card.getSummary(true);
            })
        };

        if(this.showDeck) {
            state.showDeck = true;
            state.drawDeck = this.drawDeck.map(card => {
                return card.getSummary(isActivePlayer);
            });
        }

        return state;
    }
}

module.exports = Player;
