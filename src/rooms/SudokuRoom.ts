import { Room, Client, Deferred } from "@colyseus/core";
import { JWT } from "@colyseus/auth"
import { StateView } from "@colyseus/schema"

import SudokuState from "./schema/SudokuState";
import { Board } from "./schema/Board";
import { SudokuGenerator } from "../utils/SudokoUtility";
import PlayerState from "./schema/PlayerState";


export class SudokuRoom extends Room<SudokuState> {
    maxClients = 2;
    minClients = 2;
    state = new SudokuState();

    static async onAuth (token: string, options: any, context: any) {
        console.log("HERE", process.env.USE_AUTHENTICATION)
        if(process.env.USE_AUTHENTICATION === 'false') {
          return true
        }
        const userdata = await JWT.verify(token);
        return userdata;
    }
  
    onCreate(options: any) {
        this.state = new SudokuState();
        this.state.initial_board = new Board(SudokuGenerator.generate(0.5))
        this.onMessage("fill", (client, {row, col, num}) => {
            const index = SudokuGenerator.getIndex(row, col);
            const is_available = this.state.initial_board.cells[index] === -1;
            if(is_available) {
                this.state.players.get(client.sessionId).private_board.cells[index] = num;
                this.state.players.get(client.sessionId).board.cells[index] = -2;
                this.broadcast("player_moved", {player: client.sessionId, row, col});
            }
        })
    }
  
    onJoin(client: Client, options: any) {
        const player_state = new PlayerState();
        player_state.board = new Board(this.state.initial_board.cells.toArray())
        player_state.private_board = new Board(this.state.initial_board.cells.toArray())
        this.state.players.set(client.sessionId, player_state);
        client.view = new StateView();
        client.view.add(player_state);
    }
  
    onLeave(client: Client) {
      console.log("player left:", client.sessionId);
      this.allowReconnection(client, 20);
    }

}
