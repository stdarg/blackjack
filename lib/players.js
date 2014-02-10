/**
 * @fileOverview
 * Defines the players and the container for player tables and lobby.
 */
'use strict';
module.exports = new PlayerList();

var is = require('is2');
var assert = require('assert');
var have = require('have');

var COMPLETE = 3;     // table states
var nextPlayerId = 1; // player id should be next id after highest player

/**
 * Constructor for the Player. Which stores, credits (money) and name,
 * @constructor
 * @param {String} name player name
 * @param {Number} credits amount of money the player has
 */
function Player(name, credits) {
    var self = this;
    have(arguments, { name: 'str', creditis: 'opt num' });
    assert.ok(is.nonEmptyStr(name));

    if (is.undef(credits))
        credits = 1000;

    self.id = nextPlayerId++;
    self.name = name;
    self.credits = credits;
    self.online = false;
    self.tableId = -1;      // lobby
    self.bet = -1;          // not playing hand
    self.hand = [];
    self.busted = false;
    self.done = false;
}

Player.prototype.view = function(state) {
    var self = this;
    var data = {
        name: self.name,
        bet: self.bet,
        hand: self.hand,
        done: self.done,
        busted: self.busted
    };
    if (self.hand2)
        data.hand2 = self.hand2;
    if (state === COMPLETE) {
        if (self.push)
            data.push = self.push;
        data.win = self.win;
    }
    return data;
};

Player.prototype.startHandState = function() {
    var self = this;
    assert.ok(is.positiveInt(self.tableId));
    delete self.won;
    delete self.result;
    delete self.push;
    self.openingMove = true;
    self.done = false;
    self.hand = [];
    self.bet = -1;
};

////////////////////////////////////////////////////////////////////////////////

function PlayerList() {
    var self = this;
    self.all = {};              // all players
    self.nameToId = {};    // map name to id
    self.online= {};         // players online
}

PlayerList.prototype.addPlayer = function(name) {
    var self = this;
    assert.ok(is.nonEmptyStr(name));
    var playerId = self.nameToId[name];
    assert.ok(is.undef(playerId));
    // we must create the player
    var player = new Player(name, 1000);
    self.nameToId[name] = player.id;
    self.all[player.id] = player;
    return player.id;
};

PlayerList.prototype.login = function(name) {
    var self = this;
    assert.ok(is.nonEmptyStr(name));
    var playerId = self.nameToId[name];
    if (!playerId)
        playerId = self.addPlayer(name);
    self.online[playerId] = self.all[playerId];
    self.online[playerId].online = true;
    return playerId;
};

PlayerList.prototype.logout = function(id) {
    var self = this;
    assert.ok(is.positiveInt(id));
    var player = self.online[id];
    assert.ok(is.def(player));
    player.online = false;
    delete self.online[id];
    return player.credits;
};

PlayerList.prototype.getByName = function(name) {
    var self = this;
    assert.ok(is.nonEmptyStr(name));
    var playerId = self.nameToId[name];
    if (is.undef(playerId))
        return false;
    assert.ok(self.all[playerId]);
    return self.all[playerId];
};

PlayerList.prototype.getById = function(playerId) {
    var self = this;
    assert.ok(is.positiveInt(playerId));
    if (is.undef(self.all[playerId]))
        return false;
    return self.all[playerId];
};
