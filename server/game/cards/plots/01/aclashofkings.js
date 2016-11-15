const PlotCard = require('../../../plotcard.js');

class AClashOfKings extends PlotCard {
    constructor(owner, cardData) {
        super(owner, cardData);

        this.owner = owner;

        this.afterChallenge = this.afterChallenge.bind(this);
    }

    revealed() {
        super.revealed();

        this.game.on('afterChallenge', this.afterChallenge);
    }

    afterChallenge(challengeType, winner, loser) {
        if(!this.inPlay) {
            return;
        }

        if(winner === this.owner && challengeType === 'power' && loser.power > 0) {
            this.game.addMessage(winner.name + ' uses ' + this.name + ' to move 1 power from ' + loser.name + '\'s faction card');
            this.game.transferPower(winner, loser, 1);
        }
    }

    leavesPlay() {
        super.leavesPlay();

        this.game.removeListener('afterChallenge', this.afterChallenge);
    }
}

AClashOfKings.code = '01001';

module.exports = AClashOfKings;
