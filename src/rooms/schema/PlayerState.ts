import { Schema, StateView, type, view,  } from '@colyseus/schema'
import { Board } from "./Board";



class PlayerState extends Schema {
    @view()
    @type(Board)
    private_board: Board

    @type("number")
    id: number

    @type(Board)
    board: Board
    
    @type("string")
    profile_name = ""

    @type("string")
    avatar = ""
}

export default PlayerState;
