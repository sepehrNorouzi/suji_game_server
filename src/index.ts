import dotenv from 'dotenv';
const env_mode = process.env.NODE_ENV === 'production' ? 'production' : 'developement';
dotenv.config({
    path: `../../.env.${env_mode}`
})

import { listen } from "@colyseus/tools";

import app from "./app.config";

listen(app);
