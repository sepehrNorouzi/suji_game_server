export class SudokuGenerator {
    // Constants
    private static readonly EMPTY_CELL = -1;
    private static readonly GRID_SIZE = 9;
    private static readonly BOX_SIZE = 3;
    private static readonly BOARD_SIZE = 81; // 9x9 = 81 cells
    
    /**
     * Generates a Sudoku puzzle with a unique solution
     * @param difficulty Level between 0.0 (easiest) and 1.0 (hardest)
     * @returns A flat array of 81 elements representing the Sudoku puzzle
     */
    static generate(difficulty = 0.5): number[] {
      // Generate a solved board
      const solution = this.generateSolution();
      
      // Create a puzzle by removing numbers while ensuring uniqueness
      const puzzle = this.createPuzzle(solution, difficulty);
      
      return puzzle;
    }
    
    /**
     * Generate a complete valid solution board
     */
    private static generateSolution(): number[] {
      // Create an empty board
      const board = new Array(this.BOARD_SIZE).fill(this.EMPTY_CELL);
      
      // Fill the board using backtracking
      this.fillBoard(board, 0);
      
      return board;
    }
    
    /**
     * Recursive backtracking algorithm to fill the entire board
     */
    private static fillBoard(board: number[], index: number): boolean {
      // If we've filled all cells, we're done
      if (index >= this.BOARD_SIZE) {
        return true;
      }
      
      // If this cell is already filled, move to next cell
      if (board[index] !== this.EMPTY_CELL) {
        return this.fillBoard(board, index + 1);
      }
      
      // Get shuffled candidates for this cell
      const candidates = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      
      // Try each candidate
      for (const num of candidates) {
        // Check if this number is valid at this position
        if (this.isValid(board, index, num)) {
          // Place the number
          board[index] = num;
          
          // Recursively fill the rest of the board
          if (this.fillBoard(board, index + 1)) {
            return true;
          }
          
          // If we couldn't complete the board, backtrack
          board[index] = this.EMPTY_CELL;
        }
      }
      
      // No valid solution found with this configuration
      return false;
    }
    
    /**
     * Create a puzzle by removing numbers from the solution
     * while ensuring a unique solution remains
     */
    private static createPuzzle(solution: number[], difficulty: number): number[] {
      // Copy the solution
      const puzzle = [...solution];
      
      // Determine how many cells to remove based on difficulty
      // Difficulty 0.0 = ~25 cells removed (easiest)
      // Difficulty 1.0 = ~55 cells removed (hardest)
      const cellsToRemove = Math.floor(25 + difficulty * 30);
      
      // Create a list of all 81 indices
      const indices = Array.from({ length: this.BOARD_SIZE }, (_, i) => i);
      
      // Shuffle the indices for random removal
      this.shuffleArray(indices);
      
      // Track how many cells we've removed
      let removedCells = 0;
      
      // Try removing cells one by one
      for (const index of indices) {
        // Stop if we've removed enough cells
        if (removedCells >= cellsToRemove) {
          break;
        }
        
        // Remember the original value
        const originalValue = puzzle[index];
        
        // Try removing this cell
        puzzle[index] = this.EMPTY_CELL;
        
        // Check if the puzzle still has a unique solution
        const solutionCount = this.countSolutions(puzzle);
        
        if (solutionCount === 1) {
          // Keep the cell empty
          removedCells++;
        } else {
          // Restore the original value
          puzzle[index] = originalValue;
        }
      }
      
      return puzzle;
    }
    
    /**
     * Count solutions using backtracking
     * Stops after finding 2 solutions
     */
    private static countSolutions(puzzle: number[]): number {
      const board = [...puzzle];
      let solutions = 0;
      
      const solve = (idx: number): boolean => {
        // Look for the next empty cell
        while (idx < this.BOARD_SIZE && board[idx] !== this.EMPTY_CELL) {
          idx++;
        }
        
        // If no empty cell found, we've found a solution
        if (idx >= this.BOARD_SIZE) {
          solutions++;
          return solutions >= 2; // Stop after finding 2 solutions
        }
        
        // Try all valid numbers for this cell
        for (let num = 1; num <= 9; num++) {
          if (this.isValid(board, idx, num)) {
            board[idx] = num;
            
            // Recursively check for more solutions
            if (solve(idx + 1)) {
              return true; // Stop if we found 2+ solutions
            }
            
            // Backtrack
            board[idx] = this.EMPTY_CELL;
          }
        }
        
        return false;
      };
      
      solve(0);
      return solutions;
    }
    
    /**
     * Check if placing a number at the given index is valid
     */
    private static isValid(board: number[], index: number, num: number): boolean {
      const row = Math.floor(index / this.GRID_SIZE);
      const col = index % this.GRID_SIZE;
      
      // Check row
      for (let c = 0; c < this.GRID_SIZE; c++) {
        const cellIndex = row * this.GRID_SIZE + c;
        if (board[cellIndex] === num) {
          return false;
        }
      }
      
      // Check column
      for (let r = 0; r < this.GRID_SIZE; r++) {
        const cellIndex = r * this.GRID_SIZE + col;
        if (board[cellIndex] === num) {
          return false;
        }
      }
      
      // Check 3x3 box
      const boxStartRow = Math.floor(row / this.BOX_SIZE) * this.BOX_SIZE;
      const boxStartCol = Math.floor(col / this.BOX_SIZE) * this.BOX_SIZE;
      
      for (let r = 0; r < this.BOX_SIZE; r++) {
        for (let c = 0; c < this.BOX_SIZE; c++) {
          const cellIndex = (boxStartRow + r) * this.GRID_SIZE + (boxStartCol + c);
          if (board[cellIndex] === num) {
            return false;
          }
        }
      }
      
      return true;
    }
    
    /**
     * Fisher-Yates shuffle algorithm
     */
    private static shuffleArray<T>(array: T[]): T[] {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
    
    /**
     * Solve a Sudoku puzzle
     * @returns The solved puzzle or null if no solution exists
     */
    static solve(puzzle: number[]): number[] | null {
      // Make a copy of the puzzle
      const solution = [...puzzle];
      
      // Try to solve it
      if (this.solveRecursive(solution, 0)) {
        return solution;
      }
      
      return null;
    }
    
    /**
     * Recursive helper for solving a puzzle
     */
    private static solveRecursive(board: number[], index: number): boolean {
      // Find the next empty cell
      while (index < this.BOARD_SIZE && board[index] !== this.EMPTY_CELL) {
        index++;
      }
      
      // If we've gone through all cells, we're done
      if (index >= this.BOARD_SIZE) {
        return true;
      }
      
      // Try each possible number
      for (let num = 1; num <= 9; num++) {
        // Check if this number is valid
        if (this.isValid(board, index, num)) {
          // Place the number
          board[index] = num;
          
          // Recursively solve the rest
          if (this.solveRecursive(board, index + 1)) {
            return true;
          }
          
          // Backtrack
          board[index] = this.EMPTY_CELL;
        }
      }
      
      // No solution found
      return false;
    }
    
    /**
     * Print a board to string (for debugging)
     */
    static printBoard(board: number[]): string {
      let result = '';
      
      for (let r = 0; r < this.GRID_SIZE; r++) {
        if (r % this.BOX_SIZE === 0 && r !== 0) {
          result += '------+-------+------\n';
        }
        
        for (let c = 0; c < this.GRID_SIZE; c++) {
          if (c % this.BOX_SIZE === 0 && c !== 0) {
            result += '| ';
          }
          
          const index = r * this.GRID_SIZE + c;
          const cell = board[index] === this.EMPTY_CELL ? '.' : board[index].toString();
          result += cell + ' ';
        }
        
        result += '\n';
      }
      
      return result;
    }
    
    /**
     * Get row, column, and box coordinates from an index
     */
    static getCoordinates(index: number): { row: number, col: number, box: number } {
      const row = Math.floor(index / this.GRID_SIZE);
      const col = index % this.GRID_SIZE;
      const box = Math.floor(row / this.BOX_SIZE) * this.BOX_SIZE + Math.floor(col / this.BOX_SIZE);
      return { row, col, box };
    }
    
    /**
     * Get index from row and column
     */
    static getIndex(row: number, col: number): number {
      return row * this.GRID_SIZE + col;
    }
  }
  
  /**
   * Example usage:
   * 
   * // Generate a puzzle (0.5 = medium difficulty)
   * const puzzle = SudokuGenerator.generate(0.5);
   * console.log(SudokuGenerator.printBoard(puzzle));
   * 
   * // Solve the puzzle
   * const solution = SudokuGenerator.solve(puzzle);
   * if (solution) {
   *   console.log("Solution:");
   *   console.log(SudokuGenerator.printBoard(solution));
   * }
   */