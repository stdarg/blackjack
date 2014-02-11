/**
 * @fileOverview
 * I like to use JavaScript files, rather than JSON, for conf files due to
 * comments, functions and variables, which lead to a DRY and easy-to-understand
 * file.
 */

// FuzeLog supports layouts like log4js - we use the same pattern for each log
var logMessagePattern = '[%d{ISO8601}] [%p] %c - %m{1}';

module.exports = {
    port : 4201,
    host : 'localhost',

    client : {
        logging : {
            level: 'debug',             // Logging level
            name: 'blackjack_client',   // Category name, shows as %c in pattern
            file:  './client.log',      // log file path
            fileFlags: 'w',             // Flags used in fs.createWriteStream 
            consoleLogging: false,      // Flag to direct output to console
            logMessagePattern: logMessagePattern
        }
    },

    server : {
        numDecksInShoe: 8,
        numTables: 6,
        logging : {
            level: 'debug',             // Logging level
            name: 'blackjack_server',   // Category name, shows as %c in pattern
            file:  './server.log',      // Log file path
            fileFlags: 'w',             // Flags used in fs.createWriteStream to
            consoleLogging: true,       // Flag to direct output to console
            colorConsoleLogging: true,  // Flag to color output to console
            logMessagePattern: logMessagePattern
        }
    },

    utests : {
        logging : {
            level: 'debug',             // Logging level
            name: 'utests',             // Category name, shows as %c in pattern
            file:  './utest.log',       // Log file path
            fileFlags: 'w',             // Flags used in fs.createWriteStream to
            consoleLogging: true,       // Flag to direct output to console
            colorConsoleLogging: true,  // Flag to color output to console
            logMessagePattern: logMessagePattern
        }
    }
};
