import PlayerState from "../rooms/schema/PlayerState";
import { MapSchema } from '@colyseus/schema'

export class SudokuMatchServer {
    private readonly SERVER_MATCH_CREATE_URL = process.env.SERVER_MATCH_CREATE_URL;
    private readonly SERVER_URL = process.env.SERVER_URL;
    private players: MapSchema<PlayerState>;
    private match_uuid: string;
    private readonly match_type_name: string = 'Sudoku'

    constructor(players: MapSchema<PlayerState>, match_uuid: string) {
        this.players = players;
        this.match_uuid = match_uuid;
    }

    async createMatch() {
        const players: number[] = []
        let match_response = null;
        try{
            const match_type_id = await this.getMatchType();
            this.players.keys().forEach(element => {
                players.push(this.players.get(element).id)
            });
            const request_body = {
                players,
                uuid: this.match_uuid,
                match_type: match_type_id
            }
            console.log(this.SERVER_MATCH_CREATE_URL);
            match_response = await fetch(this.SERVER_MATCH_CREATE_URL, {
                method: "POST",
                body: JSON.stringify(request_body),
                headers: {
                    "Content-Type": "application/json"
                }
                
            });
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
        const url = `${this.SERVER_URL}/match_type/get_by_name/?name=${this.match_type_name}`
        const res = await fetch(url);
        if(!res.ok) {
            return null;
        }
        const json = await res.json();
        return json.id;
    }
}