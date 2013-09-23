module.exports = Settlements;

function Settlements () {
    this.settlements = [];
}

Settlements.prototype = {
    add: function (settlement) {
        this.settlements.push(settlement);
    },

    byPlayerId: function (playerId) {
        return this.settlements.filter(function (x) {
            return x.playerId === playerId;
        });
    },

    byIntersectionId: function (intersectionId) {
        return this.settlements.filter(function (x) {
            return x.intersectionId === intersectionId;
        });
    },

    each: function (fn) {
        var settlements = this.settlements,
            i;
        for (i = 0; i < settlements.length; i++)
            fn(settlements[i]);
    }
};
