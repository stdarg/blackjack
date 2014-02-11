lib
===

This is where the code for the client and server resides:

**Server**

* cards.js - Implements the Shoe, defines the deck and has evaluation functions.
* players.js - Player objects track state of player, e.g. their hand, credits,
  etc. Also here is the player list object that contains all the players.
* restApi.js - Sets up and implements the REST API routes for the server.
* tables.js - The tables store game state for each game.

**Client**

* client.js - The driver for the client, has the main loop and prompts.
* clientRestCalls.js - A simple way to make REST calls to the server using the
  request module.



