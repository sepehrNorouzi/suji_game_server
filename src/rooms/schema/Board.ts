import { Schema, ArraySchema, type } from "@colyseus/schema";

export class Board extends Schema {
  @type(["number"])
  cells = new ArraySchema<number>();  

  constructor(initial_board: Array<number> | null = null) {
    super();
    if(!initial_board)
        for (let i = 0; i < 81; i++) {
            this.cells.push(0);
        }
    else {
        for (let i = 0; i < initial_board.length; i++) {
            this.cells.push(initial_board[i]);
        } 
    }
  }
}