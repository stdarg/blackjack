/**
 * @fileOverview
 * Here lies the definition of the Table. The conatiner for a single blackjack
 * game's state.
 *
 * Table inherits from event emitter and emits events when changing states.
 *
 * TableState encapsulates the states, state transtions and enforces valid
 * state transitions.
 */
'use strict';

var is = require('is2');
var assert = require('assert');
var have = require('have');
var _ = require('lodash');
var Cards = require('./cards');
var Players = require('./players');

var nextTableId = 1;
var WAITING = 0;
var BETTING = 1;
var DEALING = 2;
var COMPLETE = 3;
var STATES = {
    '0': 'waiting for players',
    '1': 'betting',
    '2': 'dealing',
    '3': 'hand complete'
};

module.exports = new TableList();

function Table() {
    var self = this;
    self.id = nextTableId++;
    self.players = {};
    self.state = WAITING;
    self.numDecks = config.get('server.numDecksInShoe', 8);
    self.Shoe = new Cards.Shoe(self.numDecks);
    self.betTimeMs = 60000;
    self.betTimer = null;
    self.dealersHand = [];
}

Table.prototype.view = function() {
    var self = this;
    var data = {};
    data.id = self.id;
    data.players = {};
    assert.ok(is.array(self.dealersHand));
    if (self.dealersHand.length) {
        var dealer = { name: 'Dealer' };
        if (self.state === DEALING) {
            dealer.hand = self.dealersHand.slice(0,1);
            dealer.hand.push('face down card');
        } else {
            dealer.hand = self.dealersHand.slice(0);
        }
        data.dealer = dealer;
    }
    var numPlayers = 0;
    for (var p in self.players) {
        data.players[self.players[p].id] = self.players[p].view(self.state);
        numPlayers++;
    }
    data.numPlayers = numPlayers;
    data.state = STATES[self.state];
    return data;
};

Table.prototype.numPlayers = function() {
    var self = this;
    assert.ok(is.obj(self.players));
    return _.keys(self.players).length;
};

Table.prototype.numInterested = function() {
    var self = this;
    if (self.state !== BETTING && self.state !== DEALING) {
        logger.debug('State %d is not betting or dealing, 0 interested.',
                     self.state);
        return 0;
    }
    var numInGame = _.reduce(self.players, function(sum, player) {
        assert.ok(is.nonEmptyObj(player));
        if (player.bet < 1 || player.busted || player.done) {
            logger.debug('numInt bet: %d busted: %j done: %j',
                         player.bet, player.busted, player.done);
            return sum;
        }
        return sum+1;
    }, 0);
    return numInGame;
};

Table.prototype.addPlayer = function(playerId) {
    var self = this;
    have(arguments, { playerId: 'num' });
    assert.ok(is.positiveInt(playerId));
    assert.ok(is.undef(self.players[playerId]));
    self.players[playerId] = Players.getById(playerId);
    assert.ok(is.obj(self.players[playerId]));
    self.players[playerId].tableId = self.id;
    if (self.numPlayers === 1)
        self.players[playerId].controlling = true;
    if (self.state === WAITING)
        self.startBetting();
};

Table.prototype.rmPlayer = function(playerId) {
    var self = this;
    have(arguments, { playerId: 'num' });
    assert.ok(is.positiveInt(playerId));
    assert.ok(is.obj(self.players[playerId]));
    if (self.players[playerId].bet > -1)
        self.players[playerId].credits -= self.players[playerId].bet;
    self.players[playerId].tableId = -1;
    delete self.players[playerId];
    if (self.numPlayers() === 0)
        self.state = WAITING;
};

Table.prototype.startBetting = function() {
    var self = this;
    assert.ok(self.state !== BETTING);
    self.state = BETTING;
    /*
    self.betTimer = setTimeout(function() {
        self.state = DEALING;
        self.dealCards();
    }, self.betTimeMs);
    */
};

Table.prototype.bet = function(playerId, bet) {
    var self = this;
    if (self.state !== BETTING) {
        throw new Error('Attempt to bet when table is in state: '+
                        STATES[self.state]);
    }
    if (!self.players[playerId])
        throw new Error(playerId+' is not at table '+self.tableId);
    if (!is.positiveInt(bet)) {
        throw new Error(self.players[playerId].name+' made an invalid bet: '+
                        bet);
    }

    self.players[playerId].startHandState();
    self.players[playerId].bet = bet;

    // if all players have bet then advance state of game
    var everyOneHasBet = _.all(self.players, function(p) {
        if (p && p.bet && is.positiveInt(p.bet))
            return true;
        return false;
    });

    if (everyOneHasBet) {
        logger.debug('Everyone has bet!');
        self.state = DEALING;
        self.dealCards();
    } else {
        logger.debug('Everyone has NOT bet!');
    }
};

Table.prototype.hit = function(playerId, hand) {
    var self = this;
    if (is.undef(hand))
        hand = 1;
    if (self.state !== DEALING) {
        throw new Error('Attempt to hit when table is in state: '+
                        STATES[self.state]);
    }
    if (!self.players[playerId])
        throw new Error(playerId+' is not at table '+self.tableId);
    if (!is.positiveInt(hand) || hand > 3)
        throw new Error('Invalid hand specified: '+hand);
    if (hand > 1 && is.undef(self.players[playerId].hand2))
        throw new Error('Requested hit to hand2 when none exists');
    logger.debug('In hit, bet is: '+self.players[playerId].bet);
    if (self.players[playerId].bet < 1)
        throw new Error('Requested hit when player has no bet.');
    if (self.players[playerId].done)
        throw new Error('Requested hit when player has no interest in hand.');
    var cardIdx;
    if (hand === 1 || hand === 3) {
        cardIdx = self.Shoe.deal();
        assert.ok(is.int(cardIdx) && cardIdx > -1);
        self.players[playerId].hand.push(cardIdx);
        if (Cards.isBusted(self.players[playerId].hand)) {
            self.players[playerId].busted = true;
            self.players[playerId].done = true;
            self.credits -= self.bet;
        }
    }
    logger.debug('HIT: num interested: '+self.numInterested());
    if (self.numInterested() === 0)
        self.finishHand();
};

Table.prototype.stand = function(playerId, hand) {
    var self = this;
    if (is.undef(hand))
        hand = 1;
    if (self.state !== DEALING) {
        throw new Error('Attempt to stand when table is in state: '+
                        STATES[self.state]);
    }
    if (!self.players[playerId])
        throw new Error(playerId+' is not at table '+self.tableId);
    if (!is.positiveInt(hand) || hand > 3)
        throw new Error('Invalid hand specified: '+hand);
    if (hand > 1 && is.undef(self.players[playerId].hand2))
        throw new Error('Requested stand on hand2 when none exists');
    if (self.players[playerId].bet < 1)
        throw new Error('Requested to stand when player has no bet.');
    if (self.players[playerId].done)
        throw new Error('Requested to stand when player has no interest in '+
                        'hand.');
    if (is.undef(hand))
        hand = 1;
    if (hand === 2 || hand === 3)
        self.players[playerId].done2 = true;
    if (hand === 1 || hand === 3)
        self.players[playerId].done = true;

    logger.info('STAND: num interested: '+self.numInterested());
    if (self.numInterested() === 0)
        self.finishHand();
};

Table.prototype.dealCards = function() {
    var self = this;
    assert.ok(self.state === DEALING);
    self.dealersHand = self.Shoe.deal(2);
    for (var playerId in self.players) {
        var player = self.players[playerId];
        logger.debug('Dealing to '+player.name);
        assert.ok(is.obj(player));
        if (player.bet < 1) {
            logger.debug(player.name+' has not bet!');
            continue;
        }
        player.hand = self.Shoe.deal(2);
        player.openingMove = true;
    }
};

Table.prototype.maxPlayerScore = function() {
    var self = this;
    var max = 0;
    _.each(self.players, function(player) {
        player.score = Cards.scoreHand(player.hand);
        if (player.score > 21) {
            logger.debug('%s busted with %d', player.name, player.score);
            player.busted = true;
            return;
        } else {
            player.busted = false;
        }
        if (player.score > max)
            max = player.score;
    });
    logger.debug('Max player score is %d', max);
    return max;
};

Table.prototype.dealerMustDraw = function(maxScore) {
    var self = this;
    var dealerScore = Cards.scoreHand(self.dealersHand);
    logger.debug('dealerMustDraw: dealerScore %d <= maxScore %d (%j)',
                 dealerScore, maxScore, (dealerScore <= maxScore));
    return (dealerScore <= maxScore);
};

// FIXME: simplify - too complex
Table.prototype.finishHand = function() {
    var self = this;
    self.state = COMPLETE;
    var max = self.maxPlayerScore();

    // Hits if below hard 17
    while (Cards.belowHard17(self.dealersHand) && self.dealerMustDraw(max)) {
        var cardIdx = self.Shoe.deal(1);
        var card = Cards.getCard(cardIdx);
        logger.debug('Dealer draws %s of %s', card.rank, card.suit);
        self.dealersHand.push(cardIdx);
    }

    // were done with the shoe for this hand, check to see if we are past the
    // cut point, if so replace the shoe
    if (self.Shoe.pastCutPoint()) {
        logger.info('Table %d\'s shoe is past the cut-point, replacing shoe.',
                    self.id);
        self.Shoe = new Cards.Shoe(self.numDecks);
    }

    var dealerBusted = Cards.isBusted(self.dealersHand);
    var dealerScore = Cards.scoreHand(self.dealersHand);
    logger.debug('Dealer busted %j, dealer score: %d', dealerBusted,
                 dealerScore);

    // handle bets
    _.each(self.players, function(player) {
        if (dealerBusted) {         // dealer busted
            if (player.busted) {
                // push
                player.win = false;
                player.push = true;
                logger.debug('It\'s a push everyone busted.');
                return;
            } else {
                logger.debug('Players wins, dealer busted.');
                player.win = true;
                player.credits += player.bet;
                return;
            }
        }
        // dealer did not bust
        if (player.busted) {
            logger.debug('Player busted!');
            player.win = false;
            player.credits -= player.bet;
            return;
        } else {
            if (dealerScore > player.score) {
                logger.debug('Dealer score is higher than %s\'s score: %d > %d',
                            player.name, dealerScore, player.score);
                player.win = false;
                player.credits -= player.bet;
                return;
            } else if (dealerScore < player.score) {
                logger.debug('%s\'s score is higher than dealer score: %d > %d',
                            player.name, dealerScore, player.score);
                player.win = true;
                player.credits += player.bet;
                return;
            } else {
                logger.debug('It\'s a push tie score at: %d = %d', dealerScore,
                             player.score);
                player.win = false;
                player.push = true;
                return;
            }
        }
        // should not reach here
        assert.ok(false);
    });

    // store results in results for each player
    _.each(self.players, function(player) {
        player.result = _.cloneDeep(self.view());
        player.bet = -1;
        delete player.push;
        delete player.win;
        player.hand = [];
        player.busted = false;
        player.done = false;
    });
    self.state = BETTING;
};

function TableList() {
    var self = this;
    self.all = {};
    var numTables = config.get('server.numTables', 5);
    for (var i=0; i<numTables; i++) {
        var newTable = new Table();
        self.all[newTable.id] = newTable;
    }
}

TableList.prototype.viewTables = function() {
    var self = this;
    var data = {};
    for (var table in self.all)
        data[table] = self.all[table].view();
    return data;
};

TableList.prototype.getById = function(id) {
    var self = this;
    assert.ok(is.positiveInt(id));
    assert.ok(is.obj(self.all));
    assert.ok(is.def(self.all[id]));
    return self.all[id];
};
