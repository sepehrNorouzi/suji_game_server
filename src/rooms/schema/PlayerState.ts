import { Schema, StateView, type, view } from '@colyseus/schema'
import { Board } from "./Board";



class PlayerState extends Schema {
    @view()
    @type(Board)
    private_board: Board

    @type(Board)
    board: Board
    
}

export default PlayerState;
