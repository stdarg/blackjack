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
var debug = require('debug')('bj:tables');

var nextTableId = 1;

var nextTableId = 1;
var WAITING = 0;
var BETTING = 1;
var DEALING = 2;
var DEALER_FINISH = 3;
var STATES = {
    '0': 'waiting for players',
    '1': 'betting',
    '2': 'dealing',
    '3': 'dealer finishing'
};

module.exports = new TableList();

function Table() {
    var self = this;
    self.id = nextTableId++;
    self.players = {};
    self.state = WAITING;
    console.log('self.state',self.state);
    self.Shoe = new Cards.Shoe(8);
    self.betTimeMs = 60000;
    self.betTimer = null;
    self.dealersHand = [];
}

Table.prototype.view = function() {
    var self = this;
    var data = {};
    data.id = self.id;
    data.players = [];
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

    for (var p in self.players)
        data.players.push(self.players[p].view());

    data.state = STATES[self.state];
    console.log('data.state',DEALER_FINISH);
    return data;
};

Table.prototype.numPlayers = function() {
    var self = this;
    assert.ok(is.obj(self.players));
    return _.keys(self.players).length;
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
    if (!self.players[playerId])
        throw new Error(playerId+' is not at table '+self.tableId);
    if (!is.positiveInt(bet))
        throw new Error(playerId+' made an invalid bet: '+bet);
    self.players[playerId].bet = bet;
    // if all players have bet then advance state of game
    var everyOneHasBet = _.all(self.players, function(p) {
        if (p && p.bet && is.positiveInt(p.bet))
            return true;
        return false;
    });

    if (everyOneHasBet) {
        debug('Everyone has bet!');
        self.state = DEALING;
        self.dealCards();
    } else {
        debug('Everyone has NOT bet!');
    }
};

Table.prototype.dealCards = function() {
    var self = this;
    assert.ok(self.state === DEALING);
    self.dealersHand = self.Shoe.deal(2);
    for (var playerId in self.players) {
        var player = self.players[playerId];
        debug('Dealing to '+player.name);
        assert.ok(is.obj(player));
        if (player.bet < 1) {
            debug(player.name+' has not bet!');
            continue;
        }
        player.hand = self.Shoe.deal(2);
        player.openingMove = true;
    }
};

function TableList() {
    var self = this;
    self.all = {};
    var newTable = new Table();
    self.all[newTable.id] = newTable;
}

TableList.prototype.viewTables = function() {
    var self = this;
    var data = {};
    for (var table in self.all) {
        console.log('view',self.all[table].view());
        data[table] = self.all[table].view();
    }
    return data;
};

TableList.prototype.getById = function(id) {
    var self = this;
    assert.ok(is.positiveInt(id));
    assert.ok(is.obj(self.all));
    assert.ok(is.def(self.all[id]));
    return self.all[id];
};

