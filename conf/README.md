Conf
====

This is where the configuration for the project resides.

Node.js source files make good config files, in my opinion, because:

* Comments (JSON has none, thanks Crockford)
* Variables to remain DRY
* Functions - like macros

The config-js module is something I made a while ago. I wanted an easy way to
specify properties (e.g. 'client.logging.level') with a means to provide a
default value. Also, I felt the properties, once loaded should be constant, so I
also made the const-obj module to handle that.

One of these days, I'll add environment targets, keyed off NODE_ENV, that changes
which file is loaded.

Each part of the project has its config in `./config.js`: 

* client
* server
* utests

They could have each had their own file, and it could change, but there was so
little content, having it all in one file made sense.
