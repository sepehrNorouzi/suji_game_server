import { Schema, type, MapSchema } from "@colyseus/schema";
import { Board } from "./Board";
import PlayerState from "./PlayerState";



class SudokuState extends Schema {
    @type("string")
    room_uid: string
    
    @type(Board)
    initial_board: Board

    @type({ map: PlayerState})
    players = new MapSchema<PlayerState>()

    @type("string")
    winnnerId: string
}

export default SudokuState;
