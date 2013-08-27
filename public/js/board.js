/**
 * Provides the logic to display the game board on the screen (view).
 */
define(['utils', 'components', 'settlement', 'road'], function (utils, components, Settlement, Road) {
    var intersectionMap = components.intersectionMap;

    var BoardModel = Backbone.Model.extend({
        initialize: function(settlements, roads) {
            this.settlements = settlements;
            this.roads = roads;
            this.listenTo(settlements, 'add', this.addSettlement);
            this.listenTo(roads, 'add', this.addRoad);
        },

        addRoad: function (road) {
            this.trigger('addRoad', road.attributes);
        },

        addSettlement: function(settlement) {
            this.trigger('addSettlement', settlement.attributes);
        },

        addAll: function() {
            settlements.each(this.addSettlement, this);
            roads.each(this.addRoad, this);
        }
    });

//    var BoardView = Backbone.View.extend({
//        // Instead of generating a new element, bind to the existing skeleton of
//        // the App already present in the HTML.
//        el: $("#board-container"),
//
//        events: {
//        },
//
//        initialize: function(settlements, roads) {
//            this.listenTo(settlements, 'add', this.addSettlement);
//            this.listenTo(roads, 'add', this.addRoad);
//        },
//
//        render: function() {
//        },
//
//        addRoad: function (road) {
//            var view = new Road.view({model: road});
//            this.$("#roads").append(view.render().el);
//        },
//
//        addSettlement: function(settlement) {
//            var view = new Settlement.view({model: settlement});
//            this.$("#settlements").append(view.render().el);
//        },
//
//        addAll: function() {
//            settlements.each(this.addSettlement, this);
//            roads.each(this.addRoad, this);
//        }
//    });

    function Board() {
        var me = this;

        var settlements = this.settlements = new Settlement.collection();
        var roads = this.roads = new Road.collection();

        this.model = new BoardModel(settlements, roads);
    }

    Board.prototype.configure = function (boardData) {
        this.resourceMap = boardData.resourceMap;
        this.diceMap = boardData.diceMap;
        this.tileDiceValueMap = boardData.tileDiceValueMap;
        this.playerMap = boardData.playerMap;
    };

    Board.prototype.longestRoad = function () {
        $.each(this.playerMap, function (i, player) {
        });
    };

    Board.prototype.isValidSettlement = function (player, settlementIntersection) {
        var intersections = intersectionMap;
        var settlements = this.settlements;
        var settlementIntersectionId = utils.getIntersectionId(settlementIntersection);
        // Check to see if this is a valid settlement intersection.
        if (!intersections[settlementIntersectionId]) {
            return;
        }
        
        // check to see if intersection is legal
        //     - intersection is not occupied
        //     - at least 2 roads  away from any other settlement.
        var isLegal = settlements.every(function (settlement) {
            var intersection = settlement.get('intersection');
            var count = 0;
            intersection.forEach(function (tileId) {
                if (settlementIntersection.indexOf(tileId) >= 0) {
                    count++;
                }
            });
            return count < 2;
        });
        if (!isLegal) { return; }

        // Used for initial game setup where settlement is placed without a road.
        if (settlements.byPlayerId(player.id).length < 3) {
            return true;
        }

        // player has a road that is connected
        var roads = this.roads;
        isLegal = roads.byPlayerId(player.id).some(function (road) {
            var edge = road.get('edge');
            var intersectionId = utils.getIntersectionId(edge[0]);
            if (intersectionId === settlementIntersectionId) {
                return true;
            }
            intersectionId = utils.getIntersectionId(edge[1]);
            if (intersectionId === settlementIntersectionId) {
                return true;
            }
        });
        if (!isLegal) { return; }
        return true;
    };

    Board.prototype.placeSettlement = function (settlement) {
        this.settlements.add(settlement);
    };

    Board.prototype.isValidRoad = function (player, start, end) {
        var intersections = intersectionMap;
        var roads = this.roads;
        // Check to see if start and end are valid intersections.
        var startId = utils.getIntersectionId(start);
        var endId = utils.getIntersectionId(end);
        if (!intersections[startId] || !intersections[endId]) {
            return;
        }
        // Make sure start and end positions are one edge length apart.
        var count = 2;
        start.forEach(function (tileId) {
            if (end.indexOf(tileId) >= 0) {
                count--;
            }
        });
        if (count) { return; }

        //     - not already an existing road here.
        isLegal = roads.every(function (road) {
            var edge = road.get('edge');
            var intersectionId = utils.getIntersectionId(edge[0]);
            if (startId === intersectionId || endId === intersectionId) {
                intersectionId = utils.getIntersectionId(edge[1]);
                if (startId === intersectionId || endId === intersectionId) {
                    return false;
                }
            }
            return true;
        });
        if (!isLegal) { return; }

        if (roads.byPlayerId(player.id).length < 3) {
            return true;
        }

        // check to see if location is legal
        //     - connecting to another road / settlement
        var isLegal = roads.byPlayerId(player.id).some(function (road) {
            var edge = road.get('edge');
            var intersectionId = utils.getIntersectionId(edge[0]);
            if (intersectionId === startId || intersectionId === endId) {
                return true;
            }
            intersectionId = utils.getIntersectionId(edge[1]);
            if (intersectionId === startId || intersectionId === endId) {
                return true;
            }
        });
        if (!isLegal) { return; }
        return true;
    };

    Board.prototype.placeRoad = function (road) {
        this.roads.add(road);
    };

    Board.prototype.isValidCity = function (player, intersectionId) {
        // check that the player has an existing settlement in the given intersection.
        return player.settlements.some(function (settlement) {
            return settlement.intersectionId === intersectionId &&
                settlement.type !== 'city';
        });
    };

    Board.prototype.placeCity = function (settlement) {
        settlement.type = 'city';
    };

    Board.prototype.moveRobber = function (tileId) {
        this.robber = tileId;
    };

    Board.prototype.getTileIdsByDiceValue = function (diceValue) {
        return this.diceMap[diceValue];
    };

    Board.prototype.getResourceTypeByTileId = function (tileId) {
        return this.resourceMap[tileId];
    };

    Board.prototype.getSettlementsAdjToTileId = function (tileId) {
        return this.settlements.filter(function (settlement) {
            return settlement.isAdjacentTo(tileId);
        });
    };

    Board.prototype.getSettlementAtLocation = function (loc) {
    };

    return Board;
});