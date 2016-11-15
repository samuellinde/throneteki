const BaseCard = require('./basecard.js');

class PlotCard extends BaseCard {
    getInitiative() {
        return this.cardData.initiative;
    }

    getIncome() {
        return this.cardData.income;
    }

    getReserve() {
        return this.cardData.reserve;
    }

    revealed() {
        this.inPlay = true;
    }
}

module.exports = PlotCard;
