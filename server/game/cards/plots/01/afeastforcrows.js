const PlotCard = require('../../../plotcard.js');

class AFeastForCrows extends PlotCard {
    constructor(owner, cardData) {
        super(owner, cardData);

        this.afterDominance = this.afterDominance.bind(this);
    }

    revealed() {
        super.revealed();

        this.game.on('afterDominance', this.afterDominance);
    }

    afterDominance(winner) {
        if(!this.inPlay || winner !== this.owner) {
            return;
        }

        this.game.addMessage(winner.name + ' uses ' + this.name + ' to gain 2 power');
        this.game.addPower(winner, 2);
    }

    leavesPlay() {
        super.leavesPlay();

        this.game.removeListener('afterDominance', this.afterDominance);
    }
}

AFeastForCrows.code = '01002';

module.exports = AFeastForCrows;
