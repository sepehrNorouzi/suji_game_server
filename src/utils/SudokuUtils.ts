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
}