User Tests
==========

These tests simulate an arbitrary number of users playing the game. Upon
creation, each user randomly adopts a strategy. A strategy is a pattern of play,
each a player has a strategy. Valid strategies might be:

* Do only the following: login, view tables, join table, leave table, logout
* Do only the following: login, join table, leave table, logout
* Do only the following: login, join table, logout
* Do only the following: login and logout
* Do only the following: login, join table
* Do only the following: login
* Do a random command
* During each hand, randomly decide to hit or stand.
* During each hand, hit on 17 or less.
* During each hand, continue to hit until busting on every hand
* During each hand, stand on every hand
* During each hand, hit once, then stand
* During each hand, randomize the bet amount
* During each hand, constant bet amount every time
* During each hand, do a random action
* After every hand, change tables
* After every hand, logout and then log back in

Though only 2 strategies were implemented, adding more from this point would be
easy. Once you have a framework for clients that can easily interact with the
server, building comprehesive system tests and load tests is straightforward.

# Running The Tests

First, start the server in debug mode. To do so, do the following:

1. cd to the root directory, where the package.json file resides
2. run the shell script: `./bin/debug_server.sh`

Next, start the user tests

1. cd to the ./utests directory
2. run the following command `node ./main.js`

