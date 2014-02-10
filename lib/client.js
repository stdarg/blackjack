/**
 * This file drives the client.
 */
'use strict';

var assert = require('assert');
var is = require('is2');
var prompt = require('prompt');
var clientCall = require('./clientRestCalls');
//var Cards = require('./cards');
var _ = require('lodash');
var async = require('async');
require('colors');

var playerId = false;
var tableId = false;
var tableState = false;
prompt.message = '';
prompt.delimiter = '';

function handleCommand(cmd, cb) {
    assert.ok(is.nonEmptyArray(cmd));
    assert.ok(is.func(cb));
    assert.ok(is.nonEmptyStr(cmd[0]));
    logger.info('Processing command: %s', cmd[0]);

    switch (cmd[0]) {
        case 'viewTables':
            viewTables(cb);
            break;
        case 'joinTable':
            joinTable(cmd[1], cb);
            break;
        case 'leaveTable':
            leaveTable(cb);
            break;
        case 'bet':
            bet(cmd[1], cb);
            break;
        case 'hit':
            hit(cb);
            break;
        case 'stand':
            stand(cb);
            break;
        case 'quit':
            quit(cb);
            break;
        default:
            logger.error('Unknown command: %s', cmd[0]);
            break;
    }
}

function handlePromptCb(err, result, cb) {
    // Log the results.
    if (err) {
        logger.error('%s', err.message);
        logger.error('stack: ', err.stack);
        return cb(err);
    }
    var cmdAry = result.cmd.split(' ');
    assert.ok(is.nonEmptyArray(cmdAry));
    if (cmdAry.length === 2)
        cmdAry[1] = Math.floor(cmdAry[1]);
    handleCommand(cmdAry, cb);
}

function bettingPrompt(cb) {
    console.log('You may "bet #", "quit" or "leaveTable".');
    var schema = {
        properties: {
            cmd: {
                description: 'Enter your command'.bold.white+':',
                type: 'string',
                pattern: /^bet [0-9]+$|^quit$|^leaveTable$/,
                message: 'Either "bet #", "leaveTable" or "quit".'.red,
                required: true,
            }
        }
    };

    prompt.start();     // Start the prompt

    // Get two properties from the user: email, password
    prompt.get(schema, function (err, result) {
        handlePromptCb(err, result, cb);
    });
}

function playingPrompt(cb) {
    console.log('You may "hit", "stand" "quit" or "leaveTable".');
    var schema = {
        properties: {
            cmd: {
                description: 'Enter your command'.bold.white+':',
                type: 'string',
                pattern: /^hit$|^stand$|^quit$|^leaveTable$/,
                message: 'Either "hit", "stand", "quit" or "leaveTable".'.red,
                required: true,
            }
        }
    };

    prompt.start();     // Start the prompt

    // Get two properties from the user: email, password
    prompt.get(schema, function (err, result) {
        handlePromptCb(err, result, cb);
    });
}

function tablePrompt(cb) {
    console.log('You are seated at table #%d.', tableId);
    switch (tableState) {
        case 'betting':
            bettingPrompt(cb);
            break;
        case 'dealing':
            playingPrompt(cb);
            break;
        default:
            assert.ok(false);
            break;
    }
}

function lobbyPrompt(cb) {
    console.log('You are in the lobby. You may "joinTable #" or "quit".');
    var schema = {
        properties: {
            cmd: {
                description: 'Enter your command'.bold.white+':',
                type: 'string',
                pattern: /^joinTable [0-9]+$|^quit$/,
                message: 'Either "joinTable #" or "quit".'.red,
                required: true,
            }
        }
    };

    prompt.start();     // Start the prompt

    // Get two properties from the user: email, password
    prompt.get(schema, function (err, result) {
        handlePromptCb(err, result, cb);
    });
}

function gamePrompt(cb) {
    assert.ok(is.positiveInt(playerId));
    assert.ok(is.int(tableId));
    logger.warn('tableId %j', tableId);
    if (tableId === -1) {
        lobbyPrompt(cb);
    } else {
        tablePrompt(cb);
    }
}

function gameLoop() {
    async.whilst(
        // sync continue test
        function() {
            return true;
        },

        // action to do while true
        gamePrompt,

        // handle errors, also executes when done
        function(err) {
            if (err) {
                logger.error('%s',err.message);
                logger.error('stack: ',err.stack);
            }
        }
    );
}

function getUserName(cb) {
    var schema = {
        properties: {
            name: {
                description: 'Enter your name'.bold.white+':',
                type: 'string',
                pattern: /^[a-zA-Z\s\-]+$/,
                message: 'Name must be only letters, spaces, or dashes.'.red,
                required: true,
                default: process.env.USER
            }
        }
    };

    prompt.start();     // Start the prompt

    // Get two properties from the user: email, password
    prompt.get(schema, function (err, result) {
        // Log the results.
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        cb(null, result.name);
    });
}

function loginSequence(cb) {
    async.waterfall([
        getUserName,
        function(name, cb) {
            return cb(null, { playerName: name });
        },
        clientCall.login
    ],
    function(err, json) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        cb(null, json);
    });
}

function displayTables(tables) {
    assert.ok(is.nonEmptyObj(tables));
    printf('%12s %15s\n', 'table #', 'num players');
    printf('%12s %15s\n', '=======', '===========');
    _.forEach(tables, function(table) {
        printf('%9d %13d\n', table.id, table.numPlayers);
    });
}

loginSequence(function(err, json) {
    if (err) {
        logger.error('%s', err.message);
        logger.error('stack: ', err.stack);
        return;
    }
    logger.info('logged in: %j', json);
    playerId = json.playerId;
    tableId = json.player.tableId;
    displayTables(json.tables);
    gameLoop();
});

function displayHand(txt, hand) {
    assert.ok(is.str(txt));
    assert.ok(is.nonEmptyArray(hand));
    console.log(txt);
    _.forEach(hand, function(card) {
        if (is.str(card)) {
            printf('    %s\n', card);
        } else if (is.nonEmptyObj(card)) {
            printf('    %s of %s\n', card.rank, card.suit);
        }
    });
}

function displayHands(table, player) {
    assert.ok(is.nonEmptyObj(table));
    var dealerHand = table.dealer.hand;
    var yourHand;
    displayHand('Dealers hand:', dealerHand);
    if (is.positiveInt(player.bet)) {
        yourHand = table.players[playerId].hand;
        displayHand('Your hand:', yourHand);
    } else if (player.bet === -1 && is.obj(player.result)) {
        yourHand = player.result.players[playerId].hand;
        displayHand('Your hand:', yourHand);
        if (player.result.players[playerId].push) {
            console.log('Push. You have %s credits.', player.credits);
        } else {
            console.log('You %s %s and currently have %s credits.',
                    (player.result.players[playerId].win ? 'won' : 'lost'),
                    player.result.players[playerId].bet,
                    player.credits);
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// commands

function viewTables(cb) {
    assert.ok(is.func(cb));
    clientCall.viewTables(function(err, json) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        assert.ok(is.nonEmptyObj(json));
        assert.ok(is.nonEmptyObj(json.tables));
        displayTables(json.tables);
        cb();
    });
}

function joinTable(table, cb) {
    assert.ok(is.positiveInt(table));
    assert.ok(is.func(cb));
    var body = { playerId: playerId, tableId: table };
    clientCall.joinTable(body, function(err, json) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        assert.ok(json.player.tableId === table);
        tableId = json.player.tableId;
        tableState = json.table.state;
        cb();
    });
}

function leaveTable(cb) {
    assert.ok(is.func(cb));
    var body = { playerId: playerId };
    clientCall.leaveTable(body, function(err, json) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        assert.ok(is.nonEmptyObj(json));
        assert.ok(is.nonEmptyObj(json.tables));
        displayTables(json.tables);
        tableId = -1;
        cb();
    });
}

function bet(amt, cb) {
    assert.ok(is.positiveInt(amt));
    assert.ok(is.func(cb));
    var body = { playerId: playerId, bet: amt };
    clientCall.bet(body, function(err, json) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        assert.ok(json.player.bet === amt);
        tableId = json.player.tableId;
        tableState = json.table.state;
        assert.ok(is.obj(json.player));
        assert.ok(is.array(json.player.hand));
        displayHands(json.table, json.player);
        cb();
    });
}

function hit(cb) {
    assert.ok(is.func(cb));
    var body = { playerId: playerId };
    clientCall.hit(body, function(err, json) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        tableId = json.player.tableId;
        tableState = json.table.state;
        assert.ok(is.obj(json.player));
        assert.ok(is.array(json.player.hand));
        displayHands(json.table, json.player);
        cb();
    });
}

function stand(cb) {
    assert.ok(is.func(cb));
    var body = { playerId: playerId };
    clientCall.stand(body, function(err, json) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        tableId = json.player.tableId;
        tableState = json.table.state;
        assert.ok(is.obj(json.player));
        assert.ok(is.array(json.player.hand));
        displayHands(json.table, json.player);
        cb();
    });
}

function quit() {
    console.log('\nGoodbye!');
    process.exit(0);
}
