const _ = require('underscore');

const BaseCard = require('./basecard.js');

class DrawCard extends BaseCard {
    constructor(owner, cardData) {
        super(owner, cardData);

        this.dupes = _([]);
        this.attachments = _([]);
    }

    addDuplicate(card) {
        this.dupes.push(card);
    }

    isLimited() {
        return this.hasKeyword('Limited');
    }

    getCost() {
        return this.cardData.cost;
    }

    getSummary(isActivePlayer) {
        var baseSummary = super.getSummary(isActivePlayer);

        return _.extend(baseSummary, {
            dupes: this.dupes.map(dupe => {
                return dupe.getSummary(isActivePlayer);
            })
        });
    }
}

module.exports = DrawCard;
