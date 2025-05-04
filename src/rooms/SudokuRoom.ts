import { Room, Client, Deferred } from "@colyseus/core";
import { JWT } from "@colyseus/auth"
import { StateView } from "@colyseus/schema"
import { v4 as uuidv4 } from 'uuid';


import SudokuState from "./schema/SudokuState";
import { Board } from "./schema/Board";
import { SudokuGenerator } from "../utils/SudokoGenerator";
import PlayerState from "./schema/PlayerState";
import { SudokuUtil } from "../utils/SudokuUtils";
import { SudokuMatchServer } from "../utils/server_com";

export class SudokuRoom extends Room<SudokuState> {
    maxClients = 2;
    state = new SudokuState();
    patchRate = 20;
    MESSAGES = {
        client: {
            fill: "fill"
        },

        server: {
            player_moved: 'player_moved',
            invalid_move: 'invalid_move',
            match_canceled: 'match_canceled',
            match_started: 'match_started'
        }
        
    }

    static async onAuth (token: string, options: any, context: any) {
        console.log("HERE", process.env.USE_AUTHENTICATION)
        if(process.env.USE_AUTHENTICATION === 'false') {
          return true
        }
        const userdata = await JWT.verify(token);
        return userdata;
    }

    private get_player_state(auth: any) {
        const player_state = new PlayerState();
        player_state.board = new Board(this.state.initial_board.cells.toArray())
        player_state.private_board = new Board(this.state.initial_board.cells.toArray())
        player_state.avatar = JSON.stringify(auth.avatar);
        player_state.profile_name = auth.profile_name
        player_state.id = auth.user_id
        return player_state;
    }
  
    onCreate(options: any) {
        this.state.initial_board = new Board(SudokuGenerator.generate(0.5))
        this.onMessage(this.MESSAGES.client.fill, (client, {index, num}) => {
            const is_valid_move = SudokuUtil.isValidMove(index, this.state.initial_board.cells.toArray(), num);
            if(is_valid_move) {
                this.state.players.get(client.sessionId).private_board.cells[index] = num;
                this.state.players.get(client.sessionId).board.cells[index] = -2;
                this.broadcast(this.MESSAGES.server.player_moved, {player: client.sessionId, index});
            }
            else {
                client.send(this.MESSAGES.server.invalid_move, {error: `${index} index is not a valid move.`})
            }
        })
    }
  
    async onJoin(client: Client, options: any, auth: any) {
        const player_state = this.get_player_state(auth)
        this.state.players.set(client.sessionId, player_state);
        client.view = new StateView();
        client.view.add(player_state);
        if (this.hasReachedMaxClients()) {
            this.state.room_uid = uuidv4();
            const match_server = new SudokuMatchServer(this.state.players, this.state.room_uid);
            const create_match_response = await match_server.createMatch()
            if(!create_match_response) {
                this.broadcast(this.MESSAGES.server.match_canceled);
                return;
            }
            this.lock()
            this.broadcast(this.MESSAGES.server.match_started);
        }
    }
  
    onLeave(client: Client) {
      console.log("player left:", client.sessionId);
      this.allowReconnection(client, 1);
    }

}
