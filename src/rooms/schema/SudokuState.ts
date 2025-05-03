import { Schema, type, MapSchema } from "@colyseus/schema";
import { Board } from "./Board";
import PlayerState from "./PlayerState";



class SudokuState extends Schema {
    @type(Board)
    initial_board = new Board()

    @type({ map: PlayerState})
    players = new MapSchema<PlayerState>()
}

export default SudokuState;
