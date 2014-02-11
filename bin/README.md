bin Directory
=============

This where the scripts are that start the client and the server. The shell
scripts set up the environment with environment variables while the JavaScript
files set-up the global environment within JavaScript.

There are 2 scripts to start the server:

* debug_server.sh
* server.sh

The difference is the NODE_ENV environment variable. When NODE_ENV is not
'PRODUCTION' (case doesn't matter), the following debug routes are added:

* /debugCredits - sets a player's credits to any amount
* /debugGetPlayer - gets the player object for a player id
* /debugGameState - gets the player object, player's table and a list of all
  tables

**NOTE**

The bash scripts should run from the root directory, where the package.json is.

