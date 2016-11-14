const uuid = require('node-uuid');

class Card {
    constructor(owner, cardData) {
        this.owner = owner;
        this.cardData = cardData;

        this.uuid = uuid.v1();
        this.code = cardData.code;
        this.name = cardData.name;
    }

    hasKeyword(keyword) {
        if(!this.cardData.text) {
            return false;
        }

        return this.cardData.text.toLowerCase().indexOf(keyword.toLowerCase() + '.') !== -1;
    }

    isUnique() {
        return this.cardData.is_unique;
    }

    isLimited() {
        return this.hasKeyword('Limited');
    }

    getCost() {
        return this.cardData.cost;
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

module.exports = Card;
