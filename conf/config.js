

module.exports = {
    port : 4201,
    host : 'localhost',

    client : {

        logging : {
            level: 'debug',
            name: 'blackjack_client',  // Category name, shows as %c in pattern

            // FileStream to log to (can be file name or a stream)
            file:  './client.log',
            fileFlags: 'w',             // Flags used in fs.createWriteStream to
                                        //   create log file
            consoleLogging: false,       // Flag to direct output to console

            // Usage of the log4js layout
            logMessagePattern: '[%d{ISO8601}] [%p] %c - %m{1}'
        }
    },

    server : {

        numDecksInShoe: 8,
        numTables: 6,

        logging : {
            level: 'debug',
            name: 'blackjack_server',  // Category name, shows as %c in pattern

            // FileStream to log to (can be file name or a stream)
            file:  './server.log',
            fileFlags: 'w',             // Flags used in fs.createWriteStream to
                                        //   create log file
            consoleLogging: true,       // Flag to direct output to console
            colorConsoleLogging: true,  // Flag to color output to console

            // Usage of the log4js layout
            logMessagePattern: '[%d{ISO8601}] [%p] %c - %m{1}'
        }
    },
};
