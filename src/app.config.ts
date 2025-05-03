import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import { RedisDriver,  } from "@colyseus/redis-driver";
import { RedisPresence } from "@colyseus/redis-presence";
import { logger } from '@colyseus/core'

import { SudokuRoom } from "./rooms/SudokuRoom";

export default config({
    options: {
        presence: new RedisPresence({
            host: "localhost",
            port: 6379,
            db: 5
        }),
        driver: new RedisDriver({
            host: "localhost",
            port: 6379,
            db: 4
        }),
        greet: true,
        logger: logger 
    },
    initializeGameServer: (gameServer) => {
        gameServer.define("sudoku", SudokuRoom);

    },

    initializeExpress: (app) => {
        app.get("/hello_world", (req, res) => {
            res.send("It's time to kick ass and chew bubblegum!");
        });
        if (process.env.NODE_ENV !== "production") {
            app.use("/", playground());
        }
        app.use("/monitor", monitor());
    },


    beforeListen: () => {
    },
    
});
