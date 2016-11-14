const uuid = require('node-uuid');

class BaseCard {
    constructor(owner, cardData) {
        this.owner = owner;
        this.cardData = cardData;

        this.uuid = uuid.v1();
        this.code = cardData.code;
        this.name = cardData.name;
        this.facedown = false;
    }

    hasKeyword(keyword) {
        if(!this.cardData.text) {
            return false;
        }

        return this.cardData.text.toLowerCase().indexOf(keyword.toLowerCase() + '.') !== -1;
    }

    getInitiative() {
        return 0;
    }

    getIncome() {
        return 0;
    }

    getReserve() {
        return 0;
    }

    isUnique() {
        return this.cardData.is_unique;
    }

    getType() {
        return this.cardData.type_code;
    }

    getSummary(isActivePlayer) {
        return isActivePlayer ? {
            code: this.cardData.code,
            facedown: this.facedown,
            name: this.cardData.name,
            type: this.cardData.type_code,
            uuid: this.uuid
        } : { facedown: true };
    }
}

module.exports = BaseCard;
