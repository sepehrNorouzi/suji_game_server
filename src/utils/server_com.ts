import PlayerState from "../rooms/schema/PlayerState";
import { MapSchema } from '@colyseus/schema'

class SudokuRequestHandler {
    private readonly SERVER_URL = process.env.SERVER_URL;
    private readonly match_type_name: string = 'Sudoku';
    private readonly SERVER_KEY = process.env.SERVER_KEY;
    private readonly SERVER_MATCH_CREATE_URL = process.env.SERVER_MATCH_CREATE_URL;

    async getMatchType() {
        const url = `${this.SERVER_URL}/match_type/get_by_name/?name=${this.match_type_name}`;
        return fetch(url, {
            headers: {
                "X-Suji-Server-Key": this.SERVER_KEY,
            }
        });
    }

    async createMatch(body: string) {
        const url = this.SERVER_MATCH_CREATE_URL;
        return await fetch(url, {
            method: "POST",
            body: body,
            headers: {
                "Content-Type": "application/json",
                "X-Suji-Server-Key": this.SERVER_KEY
            }
            
        });
    }

    async finishMatch(body: any, uuid: string) {
        const url = `${this.SERVER_URL}/match/${uuid}/finish/`
        return await fetch(url, {
            method: "POST",
            body: body,
            headers: {
                "Content-Type": "application/json",
                "X-Suji-Server-Key": this.SERVER_KEY
            }
            
        });
    }

}

export class SudokuMatchServer {
    private requestHandler = new SudokuRequestHandler()
    private players: MapSchema<PlayerState>;
    private match_uuid: string;

    constructor(players: MapSchema<PlayerState>, match_uuid: string) {
        this.players = players;
        this.match_uuid = match_uuid;
    }

    async createMatch() {
        const players: number[] = []
        let match_response = null;
        try{
            const match_type_id = await this.getMatchType();
            console.log(match_type_id)
            this.players.keys().forEach(element => {
                players.push(this.players.get(element).id)
            });
            const request_body = {
                players,
                uuid: this.match_uuid,
                match_type: match_type_id
            }
            match_response = await this.requestHandler.createMatch(JSON.stringify(request_body))
            if(!match_response.ok) {
                console.log(await match_response.json())
                return null;
            }
        }
        catch (err){
            console.log(err);
            return null;
        }
            
        return await match_response.json();
    }

    async getMatchType() {
        const res = await this.requestHandler.getMatchType()
        if(!res.ok) {
            console.log(await res.json())
            return null;
        }
        const json = await res.json();
        return json.id;
    }

    async finishMatch(results: Object) {

        try {
            const res = await this.requestHandler.finishMatch(JSON.stringify(results), this.match_uuid);
            return res;
        }
        catch (err) {
            console.log(err)
        }
    }
}