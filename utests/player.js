/**
 *
 *
 */
'use strict';

module.exports = Player;


var randomName = require('names');
var is = require('is2');
var restApi = require('./restApi');
var assert = require('assert');

var PREPLAY = 0;
var PLAY = 1;
var POSTPLAY = 2;

function Player(pre, during, post) {
    var self = this;
    self.name = randomName();
    self.next = 0;
    self.pre = pre;
    self.during = during;
    self.post = post;

    self.loggedIn = false;
    self.tableid = -1;
}

Player.prototype.act = function(cb) {
    var self = this;
    switch(self.next) {
        case PREPLAY:
            self.next = PLAY;
            self.prePlayBehavior(cb);
            break;
        case PLAY:
            self.next = POSTPLAY;
            self.playBehavior(cb);
            break;
        case POSTPLAY:
            self.next = PREPLAY;
            self.postPlayBehavior(cb);
            break;
        default:
            assert.ok(false);
    }
};

Player.prototype.prePlayBehavior = function(cb) {
    var self = this;
    if (self.pre < 0)
        return cb();
    logger.info('%s doing pre-play behavior',self.name);
    // randomly select behavior if num is udef
    switch (self.pre) {
        case 1:
            var body = {playerName: self.name};
            restApi.login(body, function(err, json) {
                if (err)
                    return cb(err);
                assert.ok(is.nonEmptyObj(json));
                assert.ok(json.success);
                assert.ok(json.cmd === 'login');
                assert.ok(json.cmd === 'login');
                assert.ok(is.positiveInt(json.playerId));
                assert.ok(is.nonEmptyObj(json.tables));
                self.playerId = json.playerIdl;
                self.loggedIn = true;
                self.tables = json.tables;
            });
            break;
    }
    cb();
};

Player.prototype.playBehavior = function(cb) {
    var self = this;
    if (self.play < 0)
        return cb();
    logger.info('%s doing play behavior',self.name);
    // randomly select behavior if num is udef
    cb();
};

Player.prototype.postPlayBehavior = function(cb) {
    var self = this;
    if (self.play < 0)
        return cb();
    logger.info('%s doing post-play behavior',self.name);
    // randomly select behavior if num is udef
    cb();
};


////////////////////////////////////////////////////////////////////////////////
// REST API methods

Player.prototype.login = function(success, cb) {
    var self = this;
    var body = {playerName: self.name};
    restApi.login(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'login');
        assert.ok(is.positiveInt(json.playerId));
        assert.ok(is.nonEmptyObj(json.tables));
        self.playerId = json.playerIdl;
        self.loggedIn = true;
        self.tables = json.tables;
        cb(null, json);
    });
};

Player.prototype.viewTables = function(success, cb) {
    var self = this;
    restApi.viewTables(function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'viewTables');
        assert.ok(is.nonEmptyObj(json.tables));
        self.tables = json.tables;
        cb(null, json);
    });
};

Player.prototype.joinTable = function(tableId, success, cb) {
    var self = this;
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(tableId));
    assert.ok(is.positiveInt(self.playerId));
    var body = {playerId: self.playerId, tableId: tableId};
    restApi.joinTable(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'viewTables');
        assert.ok(is.nonEmptyObj(json.table));
        self.tableId = json.table.id;
        self.table = json.table;
        cb(null, json);
    });
};

Player.prototype.leaveTable = function(success, cb) {
    var self = this;
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(self.playerId));
    var body = {playerId: self.playerId};
    restApi.leaveTable(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'leaveTable');
        assert.ok(is.nonEmptyObj(json.tables));
        self.tables = json.tables;
        cb(null, json);
    });
};

Player.prototype.bet = function(bet, success, cb) {
    var self = this;
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(self.playerId));
    assert.ok(is.positiveInt(bet));
    var body = {playerId: self.playerId, bet: bet};
    restApi.bet(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'bet');
        assert.ok(bet === json.bet);
        self.bet = json.bet;
        assert.ok(is.nonEmptyObj(json.table));
        self.table = json.table;
        assert.ok(is.nonEmptyObj(json.hand));
        self.hand = json.hand;
        cb(null, json);
    });
};

Player.prototype.hit = function(success, cb) {
    var self = this;
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(self.playerId));
    var body = {playerId: self.playerId};
    restApi.hit(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'hit');
        assert.ok(is.nonEmptyObj(json.table));
        self.table = json.table;
        assert.ok(is.nonEmptyObj(json.hand));
        self.hand = json.hand;
        cb(null, json);
    });
};

Player.prototype.stand = function(success, cb) {
    var self = this;
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(self.playerId));
    var body = {playerId: self.playerId};
    restApi.stand(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'stand');
        assert.ok(is.nonEmptyObj(json.table));
        self.table = json.table;
        assert.ok(is.nonEmptyObj(json.hand));
        self.hand = json.hand;
        cb(null, json);
    });
};

Player.prototype.debugCredits = function(credits, success, cb) {
    var self = this;
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(self.playerId));
    assert.ok(is.positiveInt(credits));
    var body = {playerId: self.playerId, credits: credits};
    restApi.debugCredits(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'debug/credits');
        assert.ok(is.nonEmptyObj(json.player));
        self.player = json.player;
        cb(null, json);
    });
};

Player.prototype.debugGetplayer = function(success, cb) {
    var self = this;
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(self.playerId));
    var body = {playerId: self.playerId};
    restApi.debugGetPlayer(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'debug/getPlayer');
        assert.ok(is.nonEmptyObj(json.player));
        self.player = json.player;
        cb(null, json);
    });
};
