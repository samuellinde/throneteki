class AClashOfKings {
    constructor(player) {
        this.player = player;
        this.afterChallenge = this.afterChallenge.bind(this);
    }

    afterChallenge(game, challengeType, winner, loser) {
        if(winner === this.player && challengeType === 'power' && loser.power > 0) {
            game.addMessage(winner.name + ' uses ' + winner.activePlot.card.label + ' to move 1 power from ' + loser.name + '\'s faction card');
            game.transferPower(winner, loser, 1);
        }
    }
}

AClashOfKings.code = '01001';

module.exports = AClashOfKings;
