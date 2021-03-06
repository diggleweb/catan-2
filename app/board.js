module.exports = Board;

var Q = require('q'),
    Players = require('./players'),
    Settlements = require('./settlements'),
    Roads = require('./roads'),
    DevelopmentCards = require('./development_cards'),
    utils = require('./utils'),
    components = require('./components');

function Board(id) {
    this.id = id;
    this.settlements = new Settlements();
    this.roads = new Roads();
    this.players = new Players();
    this.devCards = new DevelopmentCards();
    this.longestRoad = {
        len: 4
    };
    this.largestArmy = {
        count: 3
    };
    this.readyCount = 0;
    this.isStarted = false;
}

Board.prototype.addUser = function (player) {
    var self = this,
        players = self.players;
    players.addPlayer(player);
    self.notify(player.name + ' joined the game');
    player.socket.once('ready', function () {
        var playerCount = players.count();
        self.readyCount++;
        if (self.readyCount === playerCount && playerCount > 2) {
            self.isStarted = true;
            self.initialize();
        }
    });
};

Board.prototype.removeUser = function (id) {
    var player = this.players.getPlayer(id);
    this.notify(player.name + ' has left the game');
    this.players.removePlayer(id);
};

Board.prototype.initialize = function () {
    var self = this,
        players = self.players,
        resourceMap = self.resourceMap = self.initResourceLocations(),
        diceMap = self.diceMap = self.initResourceValues(resourceMap),
        boardData = {
            resourceMap: resourceMap,
            diceMap: diceMap,
            playerMap: players.getSerializablePlayerMap()
        };

    self.broadcast('setup', boardData);
    self.firstRoll()
        .then(self.setup.bind(self))
        .then(function () {
            players.reset();
            self.nextTurn();
        });
};

/**
 * determine which player is going first.
 */
Board.prototype.firstRoll = function () {
    var self = this,
        players = this.players,
        playerCount = players.count(),
        deferred = Q.defer(),
        count = 0,
        max = 0,
        id;
    function rollHelper() {
        var player = players.getCurrent();
        self.roll(player)
            .spread(function (player, diceValue) {
                if (diceValue > max) {
                    id = player.id;
                    max = diceValue;
                }
                if (++count < playerCount) {
                    players.next();
                    rollHelper();
                } else {
                    players.setStartPlayer(id);
                    deferred.resolve();
                }
            })
            .fail(deferred.reject);
    }
    rollHelper();
    return deferred.promise;
};

Board.prototype.setup = function () {
    var self = this,
        players = self.players,
        resourceMap = self.resourceMap,
        playerCount = players.count(),
        deferred = Q.defer(),
        count = 0;

    function setupHelper() {
        var player = players.getCurrent();
        self.chooseSettlement(player)
            .spread(function (player, intersectionId) {
                var tileIds,
                    resource,
                    i;
                if (count >= playerCount) {
                    tileIds = utils.getTileIdsFromIntersectionId(intersectionId);
                    for (i = 0; i < tileIds.length; i++) {
                        resource = resourceMap[tileIds[i]];
                        if (resource && resource.type !== 'desert') {
                            player.resources[resource.type]++;
                        }
                    }
                    self.updateResources(player);
                }
                return arguments;
            })
            .spread(function (player, intersectionId) {
                return self.chooseRoad(player, intersectionId);
            })
            .then(function () {
                if (++count < 2 * playerCount) {
                    if (count < playerCount) {
                        players.next();
                    } else if (count > playerCount) {
                        players.previous();
                    }
                    setupHelper();
                } else {
                    deferred.resolve();
                }
            })
            .fail(deferred.reject);
    }

    setupHelper();
    return deferred.promise;
};

Board.prototype.roll = function (player) {
    // return a promise. when we receive client response, resolve promise
    var self = this;
    return triggerPlayerResponse(player.socket, 'roll', null, function () {
        var diceValue = self.rollDice();
        self.notify(player.name + ' rolled ' + diceValue);
        return [player, diceValue];
    });
};

Board.prototype.chooseSettlement = function (player) {
    var self = this;
    return triggerPlayerResponse(player.socket, 'settlement', null, function (intersectionId) {
        self.placeSettlement(player, intersectionId);
        return [player, intersectionId];
    });
};

Board.prototype.chooseRoad = function (player, intersectionId) {
    var self = this;
    return triggerPlayerResponse(player.socket, 'road', intersectionId, function (edge) {
        self.placeRoad(player, edge);
        return [player, edge];
    });
};

/**
 * Given a tile id, distributes resources to players
 * who have a settlement adjacent to that tile.
 * @param {number} tileId
 */
Board.prototype.distributeResources = function (player, diceValue) {
    var self = this,
        players = self.players,
        tileIds,
        updateQueue = [],
        i;
    if (diceValue === 7) {
        // take away resources if any player has > 7.
        players.each(function (p) {
            var resources = p.resources,
                count = 0,
                type;
            for (type in resources) {
                if (resources.hasOwnProperty(type)) {
                    count += resources[type];
                }
            }
            if (count > 7) {
                // take away half.
            }
        });
    } else {
        tileIds = self.diceMap[diceValue];
        tileIds.forEach(function (tileId) {
            tileId = +tileId;
            var settlements = self.getAdjacentSettlements(+tileId);
            settlements.forEach(function (settlement) {
                var player = players.getPlayer(settlement.playerId),
                    resource = self.resourceMap[tileId].type;
                player.resources[resource] += settlement.type === 'city' ? 2 : 1;
                if (updateQueue.indexOf(player.id) < 0) {
                    updateQueue.push(player.id);
                }
            });
        });
        for (i = 0; i < updateQueue.length; i++) {
            self.updateResources(players.getPlayer(updateQueue[i]));
        }
    }
    return [player, diceValue];
};

Board.prototype.getAdjacentSettlements = function (tileId) {
    return this.settlements.filter(function (settlement) {
        var intersection = utils.getTileIdsFromIntersectionId(settlement.intersectionId);
        return intersection.indexOf(tileId) >= 0;
    });
};

Board.prototype.updateResources = function (player) {
    player.socket.emit('updateresources', player.resources);
};

Board.prototype.updateDevCards = function (player) {
    player.socket.emit('updatedevcards', player.devCards);
};

Board.prototype.updateVictoryPoints = function (player, points) {
    player.points += points;
    this.updatePlayerInfo(player);
};

Board.prototype.updatePlayerInfo = function (player) {
    this.broadcast('update', {type: 'player', player: player.serialize()});
};

/**
 * main game loop.
 */
Board.prototype.nextTurn = function () {
    var self = this,
        players = self.players,
        player = players.getCurrent();
    self.roll(player)
        .spread(self.distributeResources.bind(self))
        .spread(self.moveRobber.bind(self))
        .spread(self.stealResources.bind(self))
        .spread(self.startTurn.bind(self))
        .fail(console.error);
};

Board.prototype.startTurn = function (player) {
    var self = this,
        socket = player.socket,
        handlers = {
            road: function (edge) {
                self.buildRoad(player, edge);
            },
            settlement: function (intersectionId) {
                self.buildSettlement(player, intersectionId);
            },
            devcard: function () {
                self.buildDevCard(player);
            },
            playdevcard: function () {
                self.playDevCard(player);
                socket.removeAllListeners('playdevcard');
            },
            trade: function (message) {
                self.trade(player, message.resources, message.playerId);
            }
        },
        channel;

    for (channel in handlers) {
        if (handlers.hasOwnProperty(channel)) {
            socket.on(channel, handlers[channel]);
        }
    }
    socket.emit('start');
    socket.once('end', function () {
        self.players.next();
        self.endTurn(player);
        self.nextTurn();
    });
};

Board.prototype.endTurn = function (player) {
    var socket = player.socket;
    socket.removeAllListeners('road');
    socket.removeAllListeners('settlement');
    socket.removeAllListeners('devcard');
    socket.removeAllListeners('playdevcard');
    socket.removeAllListeners('trade');
};

Board.prototype.canPay = function (player, price) {
    var resources = player.resources,
        resource,
        quantity;
    // determine if player has sufficient resources
    for (resource in price) {
        if (price.hasOwnProperty(resource)) {
            quantity = price[resource];
            if (resources[resource] < quantity) {
                return false;
            }
        }
    }
    return true;
};

Board.prototype.pay = function (player, price) {
    var resources = player.resources,
        resource,
        quantity;
    for (resource in price) {
        if (price.hasOwnProperty(resource)) {
            quantity = price[resource];
            resources[resource] -= quantity;
        }
    }
    this.updateResources(player);
};

Board.prototype.buildSettlement = function (player, intersectionId) {
    var cost = components.buildingCosts.settlement;
    if (this.canPay(player, cost) && this.isValidSettlement(player.id, intersectionId)) {
        this.pay(player, cost);
        this.placeSettlement(player, intersectionId);
        return true;
    }
};

Board.prototype.buildCity = function (player, intersectionId) {
    var cost = components.buildingCosts.city;
    if (this.canPay(player, cost) && this.isValidCity(player.id, intersectionId)) {
        this.pay(player, cost);
        this.placeCity(player, intersectionId);
        return true;
    }
};

Board.prototype.buildRoad = function (player, edge) {
    var cost = components.buildingCosts.road;
    if (this.canPay(player, cost) && this.isValidRoad(player.id, edge)) {
        this.pay(player, cost);
        this.placeRoad(player, edge);
        return true;
    }
};

Board.prototype.buildDevCard = function (player) {
    var cost = components.buildingCosts.devCard;
    if (this.canPay(player, cost)) {
        this.pay(player, cost);
        this.drawCard(player);
        return true;
    }
};

Board.prototype.placeSettlement = function (player, intersectionId) {
    var settlement = {
        intersectionId: intersectionId,
        playerId: player.id
    };
    this.settlements.add(settlement);
    this.broadcast('update', {type: 'settlement', settlement: settlement});
    this.updateVictoryPoints(player, 1);
    return settlement;
};

Board.prototype.placeRoad = function (player, edge) {
    var road = {
            edge: edge,
            playerId: player.id
        },
        roads = this.roads,
        longestRoad = this.longestRoad,
        len;
    roads.add(road);
    this.broadcast('update', {type: 'road', road: road});
    this.updateLongestRoad(player);
    return road;
};

Board.prototype.updateLongestRoad = function (player) {
    var longestRoad = this.longestRoad,
        len = this.roads.longestPath(player.id),
        players = this.players,
        old;
    if (len > longestRoad.len) {
        if (longestRoad.playerId) {
            old = players.getPlayer(longestRoad.playerId);
            old.hasLongestRoad = false;
        }
        longestRoad.playerId = player.id;
        longestRoad.len = len;
        player.hasLongestRoad = true;
        if (!old) {
            this.updateVictoryPoints(player, 2);
        } else if (old.id !== player.id) {
            this.updateVictoryPoints(old, -2);
            this.updateVictoryPoints(player, 2);
        }
    }
};

Board.prototype.placeCity = function (playerId, intersectionId) {
    var settlement = this.settlements.byIntersectionId(intersectionId);
    settlement.type = 'city';
    this.broadcast('update', {type: 'city', city: settlement});
    this.updateVictoryPoints(player, 1);
    return settlement;
};

Board.prototype.trade = function (player, resources1, otherId) {
    var self = this,
        otherPlayer = self.players.getPlayer(otherId);
    if (otherPlayer) {
        return triggerPlayerResponse(otherPlayer.socket, 'trade', resources1, function (resources2) {
            triggerPlayerResponse(player.socket, 'confirmtrade', resources2, function () {
                var playerResources = player.resources,
                    otherResources = otherPlayer.resources,
                    resource;
                for (resource in resources1) {
                    if (resources1.hasOwnProperty(resource)) {
                        playerResources[resource] -= resources1[resource];
                        otherResources[resource] += resources1[resource];
                    }
                }
                for (resource in resources2) {
                    if (resources2.hasOwnProperty(resource)) {
                        playerResources[resource] += resources2[resource];
                        otherResources[resource] -= resources2[resource];
                    }
                }
                self.updateResources(player);
                self.updateResources(otherPlayer);
            });
        });
    }
};

Board.prototype.drawCard = function (player) {
    var card = this.devCards.draw();
    player.devCards.push(card);
    this.updateDevCards(player);
};

Board.prototype.playDevCard = function (player, card, data) {
    var self = this,
        cardTable = {
            victory_point: self.victoryPointCard,
            knight: self.knightCard
        };
    cardTable[card](player, data);
};

Board.prototype.victoryPointCard = function (player) {
    this.updateVictoryPoints(player, 1);
};

Board.prototype.knightCard = function (player, tileId) {
    this.robber = tileId;
    player.knights += 1;
    this.updatePlayerInfo(player);
    this.updateLargestArmy(player);
};

Board.prototype.updateLargestArmy = function (player) {
    var largestArmy = this.largestArmy,
        old;
    if (player.knights > largestArmy.count) {
        if (largestArmy.playerId) {
            old = players.getPlayer(largestArmy.playerId);
            old.hasLargestArmy = false;
        }
        largestArmy.count = player.knights;
        largestArmy.playerId = player.id;
        player.hasLargestArmy = true;
        if (!old) {
            this.updateVictoryPoints(player, 2);
        } else if (old.id !== player.id) {
            this.updateVictoryPoints(old, -2);
            this.updateVictoryPoints(player, 2);
        }
    }
};

Board.prototype.monopolyCard = function (player, resourceType) {
};

Board.prototype.roadBuildingCard = function (player) {
};

Board.prototype.yearOfPlentyCard = function (player, resourceType) {
};

/**
 * returns true if player is done with initial setup.
 * @param {string} playerId
 */
Board.prototype.isSetupComplete = function (playerId) {
    // to see if player has completed setup, check to see they have placed
    // at least 2 roads.
    return this.roads.byPlayerId(playerId).length >= 2;
};

Board.prototype.hasConnectedRoad = function (playerId, intersectionId) {
    var roads = this.roads.byPlayerId(playerId);
    return roads.some(function (road) {
        var edge = road.edge;
        if (edge[0] === intersectionId || edge[1] === intersectionId) {
            return true;
        }
    });
};

Board.prototype.isIntersection = function (intersectionId) {
    var intersections = components.intersections;
    return intersections.indexOf(intersectionId) >= 0;
};

/**
 * returns true if there is not a settlement on the given intersection and
 * there are no settlements < 2 roads away.
 * @param {string} intersectionId
 */
Board.prototype.isIntersectionOccupied = function (intersectionId) {
    var settlements = this.settlements,
        intersection = utils.getTileIdsFromIntersectionId(intersectionId);
    return settlements.some(function (settlement) {
        var otherIntersection = utils.getTileIdsFromIntersectionId(settlement.intersectionId),
            count = 0;
        otherIntersection.forEach(function (point) {
            if (intersection.indexOf(point) >= 0) {
                count++;
            }
        });
        return count >= 2;
    });
};

/**
 * checks to see if player can build a settlement at given intersection
 * @param {string} playerId
 * @param {string} intersectionId
 */
Board.prototype.isValidSettlement = function (playerId, intersectionId) {
    var self = this;
    return self.isIntersection(intersectionId) &&
        !self.isIntersectionOccupied(intersectionId) &&
        (self.isSetupComplete(playerId) ?
            self.hasConnectedRoad(playerId, intersectionId) : true);
};

Board.prototype.isEdge = function (edge) {
    // Make sure start and end positions are one edge length apart.
    if (!this.isIntersection(edge[0]) || !this.isIntersection(edge[1])) {
        return false;
    }
    var count = 2,
        startIntersection = utils.getTileIdsFromIntersectionId(edge[0]),
        endIntersection = utils.getTileIdsFromIntersectionId(edge[1]);
    startIntersection.forEach(function (tileId) {
        if (endIntersection.indexOf(tileId) >= 0) {
            count--;
        }
    });
    return !count;
};

Board.prototype.isEdgeOccupied = function (edge) {
    var roads = this.roads,
        startId = edge[0],
        endId = edge[1];

    return roads.some(function (road) {
        var otherEdge = road.edge,
            intersectionId = otherEdge[0];
        if (startId === intersectionId || endId === intersectionId) {
            intersectionId = otherEdge[1];
            if (startId === intersectionId || endId === intersectionId) {
                return true;
            }
        }
    });
};

/**
 * check to see if player can build a road on the given edge.
 * @param {string} playerId
 * @param {array} edge
 */
Board.prototype.isValidRoad = function (playerId, edge) {
    var self = this;
    return self.isEdge(edge) &&
        !self.isEdgeOccupied(edge) &&
        (self.isSetupComplete(playerId) ?
            self.hasConnectedRoad(playerId, edge[0]) || self.hasConnectedRoad(playerId, edge[1]) :
            true);
};

/**
 * check to see if player can build a city on given intersection
 * @param {string} playerId
 * @param {string} intersectionId
 */
Board.prototype.isValidCity = function (playerId, intersectionId) {
    var settlements = this.settlements.byPlayerId(playerId);
    return settlements.some(function (settlement) {
        return settlement.intersectionId === intersectionId &&
            settlement.type !== 'city';
    });
};

Board.prototype.initResourceLocations = function () {
    var resourceMap = {},
        tileIdArray = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
        locations = [],
        i,
        resource;
    while (tileIdArray.length) {
        locations.push(tileIdArray.splice(Math.floor(Math.random() * tileIdArray.length), 1)[0]);
    }
    for (i = 0; i < locations.length - 1; i++) {
        if (i < 4) {
            resource = 'wood';
        } else if (i < 8) {
            resource = 'wheat';
        } else if (i < 12) {
            resource = 'sheep';
        } else if (i < 15) {
            resource = 'stone';
        } else {
            resource = 'brick';
        }
        resourceMap[locations[i]] = {
            type: resource
        };
    }
    resourceMap[locations[18]] = {
        type: 'desert',
        value: 7
    };

    return resourceMap;
};

Board.prototype.initResourceValues = function (resourceMap) {
    var diceMap = {},
        diceValues = [2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12],
        diceValue,
        locationId;
    diceValues = utils.shuffleArray(diceValues);
    for (locationId in resourceMap) {
        if (resourceMap.hasOwnProperty(locationId)) {
            if (resourceMap[locationId].type !== 'desert') {
                diceValue = diceValues.pop();
                if (!diceMap[diceValue]) {
                    diceMap[diceValue] = [];
                }
                diceMap[diceValue].push(locationId);
                resourceMap[locationId].value = diceValue;
            } else {
                diceMap[7] = [locationId];
            }
        }
    }
    return diceMap;
};

/**
 * prompt player to choose robber location
 * returns promise that is resolved with an object containing
 * a player object and a tileId.
 * @param {object} player
 */
Board.prototype.moveRobber = function (player, diceValue) {
    var self = this;
    if (diceValue === 7) {
        return triggerPlayerResponse(player.socket, 'robber', null, function (tileId) {
            tileId = +tileId;
            self.robber = tileId;
            self.broadcast('update', {type: 'robber', tileId: tileId});
            return [player, tileId];
        });
    }
    return [player];
};

Board.prototype.stealResources = function (player, tileId) {
    var self = this,
        players;
    if (tileId >= 0) {
        players = self.getAdjacentSettlements(tileId).map(function (settlement) {
            return settlement.playerId;
        });
        if (players.length) {
            return triggerPlayerResponse(player.socket, 'steal', players, function (playerId) {
                if (players.indexOf(playerId) >= 0) {
                    var other = self.players.getPlayer(playerId),
                        resources = utils.shuffleArray(['brick', 'sheep', 'stone', 'wheat', 'wood']),
                        resource,
                        count;
                    while (resources.length) {
                        resource = resources.pop();
                        count = resources[resource];
                        if (count)
                            break;
                    }
                    other.resources[resource] -= 1;
                    player.resources[resource] += 1;
                    self.updateResources(other);
                    self.updateResources(player);
                }
                return [player];
            });
        }
    }
    return [player];
};

Board.prototype.rollDice = function () {
    return Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2;
};

/**
 * @param {string} msg
 * @param {string} [name]
 */
Board.prototype.notify = function (msg, name) {
    this.broadcast('sendchat', {name: name || '*** server ***', msg: msg});
};

Board.prototype.broadcast = function (channel, data) {
    var players = this.players.players,
        player,
        i;
    for (i = 0; i < players.length; i++) {
        player = players[i];
        player.socket.emit(channel, data);
    }
};

function triggerPlayerResponse(socket, channel, data, fn, context) {
    var deferred = Q.defer();
    socket.emit(channel, data);
    socket.once(channel, function () {
        deferred.resolve(fn.apply(context, arguments));
    });
    return deferred.promise;
}
