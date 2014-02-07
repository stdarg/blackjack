'use strict';
var request = require('request');
//var debug = require('debug')('bj:restApi');
var assert = require('assert');
var async = require('async');
var is = require('is2');

var playerId;
var tables;

async.series([
        login,
        viewTables,
        joinTable,
        leaveTable,
        joinTable,
        bet,
        hit,
        stand
    ],
    function(err) {
        if (err)
            console.log('Error',err);
        else
            console.log('Success.');
    }
);

// login
function login(cb) {
    var data = { playerName: 'Edmond' };

    request({method:'POST', json:data, uri: 'http://localhost:4201/login'},
    function(err, res, json) {
        if (err)
            return cb(err);
        console.log('login',JSON.stringify(json));
        playerId = json.playerId;
        assert.ok(json.success === true);
        assert.ok(is.positiveInt(json.playerId));
        cb();
    });
}

// view Tables
function viewTables(cb) {
    request({method:'GET', json:true, uri: 'http://localhost:4201/viewTables'},
    function(err, res, json) {
        if (err)
            return cb(err);
        console.log('viewTables',JSON.stringify(json));
        assert.ok(json.success === true);
        tables = json.tables;
        assert.ok(is.nonEmptyObj(tables));
        cb();
    });
}

function joinTable(cb) {
    var data = { playerId: playerId, tableId: 1 };
    request({method:'POST', json:data, uri: 'http://localhost:4201/joinTable'},
    function(err, res, json) {
        if (err)
            return cb(err);
        console.log('joinTable',JSON.stringify(json));
        assert.ok(json.success === true);
        cb();
    });
}

function leaveTable(cb) {
    var data = { playerId: playerId };
    request({method:'POST', json:data, uri: 'http://localhost:4201/leaveTable'},
    function(err, res, json) {
        if (err)
            return cb(err);
        console.log('leaveTable',JSON.stringify(json));
        assert.ok(json.success === true);
        cb();
    });
}

function bet(cb) {
    var data = { playerId: playerId, bet: 10 };
    request({method:'POST', json:data, uri: 'http://localhost:4201/bet'},
    function(err, res, json) {
        if (err)
            return cb(err);
        console.log('bet',JSON.stringify(json));
        assert.ok(json.success === true);
        cb();
    });
}

function hit(cb) {
    var data = { playerId: playerId, hand: 1 };
    request({method:'POST', json:data, uri: 'http://localhost:4201/hit'},
     function(err, res, json) {
        if (err)
            return cb(err);
        console.log('hit',JSON.stringify(json));
        cb();
    });
}

function stand(cb) {
    var data = { playerId: playerId, hand: 1 };
    request({method:'POST', json:data, uri: 'http://localhost:4201/stand'},
     function(err, res, json) {
        if (err)
            return cb(err);
        console.log('stand',JSON.stringify(json));
        assert.ok(json.success === true);
        cb();
    });
}
