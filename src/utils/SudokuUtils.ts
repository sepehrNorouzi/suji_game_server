export class SudokuUtil {
    static readonly EMPTY_CELL = -1;
    static readonly BOARD_SIZE = 81;
    static readonly MIN_INDEX = 0;
    static readonly MIN_NUMBER = 1;
    static readonly MAX_NUMBER = 9;

    static isValidIndex(index: number) {
        return index >= this.MIN_INDEX && index < this.BOARD_SIZE
    }

    static isEmptyCell(cell: number) {
        return cell === this.EMPTY_CELL
    }

    static isNumberInRange(num: number) {
        return num >= this.MIN_NUMBER && num <= this.MAX_NUMBER;
    }

    static isValidMove(index: any, board: number[], num: number) {
        const is_valid_index = this.isValidIndex(index);
        const is_cell_empty = this.isEmptyCell(board[index]);
        const is_in_range = this.isNumberInRange(num);
        return  is_valid_index && is_cell_empty && is_in_range
    }

    static isSudokuSolved(board: number[]): boolean {
        if (board.length !== 81) {
          return false;
        }
      
        const rows: Set<number>[] = Array(9).fill(null).map(() => new Set<number>());
        const cols: Set<number>[] = Array(9).fill(null).map(() => new Set<number>());
        const boxes: Set<number>[] = Array(9).fill(null).map(() => new Set<number>());
      
        for (let i = 0; i < 81; i++) {
          const value = board[i];
          
          if (value <= 0 || value > 9) {
            return false;
          }
          
          const row = Math.floor(i / 9);
          const col = i % 9;
          const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
          
          if (rows[row].has(value) || cols[col].has(value) || boxes[box].has(value)) {
            return false;
          }          
          rows[row].add(value);
          cols[col].add(value);
          boxes[box].add(value);
        }
        
        return true;
      }

}