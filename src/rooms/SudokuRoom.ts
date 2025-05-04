import { Room, Client, Deferred, ClientState } from "@colyseus/core";
import { JWT } from "@colyseus/auth"
import { StateView } from "@colyseus/schema"
import { v4 as uuidv4 } from 'uuid';


import SudokuState from "./schema/SudokuState";
import { Board } from "./schema/Board";
import { SudokuGenerator } from "../utils/SudokoGenerator";
import PlayerState from "./schema/PlayerState";
import { SudokuUtil } from "../utils/SudokuUtils";
import { SudokuMatchServer } from "../utils/server_com";

export class SudokuRoomConfig {
    static readonly DEFAULT_DIFFICULTY = 0.01;
    static readonly DEFAULT_MAX_CLIENTS = 2;
    static readonly DEFAULT_PATCH_RATE = 20;
    static readonly DEFAULT_DISPOSAL_DELAY = 1000;
    static readonly DEFAULT_RECONNECTION_DELAY = 5;
}

enum GamePhase {
    WAITING_FOR_PLAYERS,
    MATCH_ACTIVE,
    MATCH_ENDED
}

class PlayerResultSchema {
    private board: number[];
    private result: string;
    private id: number;

    constructor(board: number[], result: string, id: number) {
        this.board = board;
        this.result = result;
        this.id = id;
    }

    toJson() {
        return {
            id: this.id,
            board: this.board,
            result: this.result,
        }
    }
}

class ResultSchema {
    private winner: number;
    private playerResults: PlayerResultSchema[];
    private endTime: number;

    constructor(winner: number, playerResults: PlayerResultSchema[], endTime: number) {
        this.endTime = endTime;
        this.winner = winner;
        this.playerResults = playerResults;
    }

    toJson() {
        const playerResultsList: Object[] = [];
        this.playerResults.forEach(result => {
            playerResultsList.push(result.toJson())
        })
        return {
            end_time: this.endTime,
            winner: this.winner,
            players: playerResultsList
        }
    }
}

export class SudokuRoom extends Room<SudokuState> {
    private isDisposing: boolean = false;
    private readonly DISPOSAL_DELAY = SudokuRoomConfig.DEFAULT_DISPOSAL_DELAY;
    private readonly RECONNECTION_DELAY = SudokuRoomConfig.DEFAULT_RECONNECTION_DELAY;
    private readonly difficulity: number;
    private gameState: GamePhase;

    constructor() {
        super()
        this.difficulity = SudokuRoomConfig.DEFAULT_DIFFICULTY;
        this.maxClients = SudokuRoomConfig.DEFAULT_MAX_CLIENTS;
        this.patchRate = SudokuRoomConfig.DEFAULT_PATCH_RATE;
        this.gameState = GamePhase.WAITING_FOR_PLAYERS;
        this.state = new SudokuState();
    }

    readonly MESSAGES = {
        client: {
            fill: "fill",
            complete: "complete"
        },
        server: {
            player: {
                moved: 'player_moved',
                invalidMove: 'invalid_move'
            },
            match: {
                canceled: 'match_canceled',
                started: 'match_started',
                completed: 'completed'
            },
            error: 'error'
        }
    };

    static async onAuth (token: string, options: any, context: any) {
        console.log("HERE", process.env.USE_AUTHENTICATION)
        if(process.env.USE_AUTHENTICATION === 'false') {
          return true
        }
        const userdata = await JWT.verify(token);
        return userdata;
    }

    private createPlayerState(auth: any) {
        const player_state = new PlayerState();
        player_state.avatar = JSON.stringify(auth.avatar);
        player_state.profile_name = auth.profile_name
        player_state.id = auth.user_id
        return player_state;
    }

    private initializePlayerBoard(client: Client) {
        const player_state = this.state.players.get(client.sessionId);
        player_state.board = new Board(this.state.initial_board.cells.toArray());
        player_state.private_board = new Board(this.state.initial_board.cells.toArray());
        client.view = new StateView();
        client.view.add(player_state);
    }

    private setUpInitialBoard() {
        this.state.initial_board = new Board(SudokuGenerator.generate(this.difficulity));
    }

    private registerMessageHandlers() {
        this.onMessage(this.MESSAGES.client.fill, this.handleFillMessage.bind(this));
        this.onMessage(this.MESSAGES.client.complete, this.handleSolutionSubmissionMessage.bind(this))
    }

    private applyValidMove(client: Client, index: number, num: number) {
        const player = this.state.players.get(client.sessionId);
        player.private_board.cells[index] = num;
        player.board.cells[index] = -2;
        this.broadcast(this.MESSAGES.server.player.moved, {
            player: client.sessionId, 
            index
        });
    }
    
    private notifyInvalidMove(client: Client, index: number) {
        client.send(this.MESSAGES.server.player.invalidMove, {
            error: `${index} index is not a valid move.`
        });
    }

    private notifyInvalidStateMove(client: Client) {
        client.send(this.MESSAGES.server.error, "Game is not running.")
    }
    
    private handleFillMessage(client: Client, data: { index: number, num: number }) {
        if(this.gameState !== GamePhase.MATCH_ACTIVE) {
            this.notifyInvalidStateMove(client)
            return;
        }
        const { index, num } = data;
        const isValidMove = SudokuUtil.isValidMove(
            index, 
            this.state.initial_board.cells.toArray(), 
            num
        );
        
        if (isValidMove) {
            this.applyValidMove(client, index, num);
        } else {
            this.notifyInvalidMove(client, index);
        }
    }

    private async handleMatchEnd() {
        const winner = this.state.players.get(this.state.winnnerId).id;
        const playerResults: PlayerResultSchema[] = [];
        const endTime = Date.now();
        this.clients.forEach(client => {
            const clientSessionId = client.sessionId;
            const result = this.state.winnnerId === clientSessionId ? 'win':'lose'
            const clientState = this.state.players.get(clientSessionId);
            const board = clientState.private_board.cells.toArray();
            const cliendId = clientState.id;
            const playerResult = new PlayerResultSchema(board, result, cliendId);
            playerResults.push(playerResult);
        })
        const result = new ResultSchema(winner, playerResults, endTime);
        const matchServer = new SudokuMatchServer(this.state.players, this.state.room_uid);
        try {
            const response = await matchServer.finishMatch(result.toJson());
        }
        catch (err) {
            console.log(err)
        }

    }

    private async handleSolvedBoard(client: Client) {
        const player_state = this.state.players.get(client.sessionId);
        this.gameState = GamePhase.MATCH_ENDED;
        this.state.winnnerId = client.sessionId;
        this.broadcast(this.MESSAGES.server.match.completed, {
            winnerId: client.sessionId,
            playerName: player_state.profile_name
        });

        await this.handleMatchEnd();

    }

    private handleIncorectSubmission(client: Client) {

    }

    private handleSolutionSubmissionMessage(client: Client) {
        if(this.gameState !== GamePhase.MATCH_ACTIVE) {
            this.notifyInvalidStateMove(client)
            return;
        }
        const board = this.state.players.get(client.sessionId).private_board.cells;
        const isSolved = SudokuUtil.isSudokuSolved(board.toArray());
        if(isSolved) {
            this.handleSolvedBoard(client);
        }
        else {
            this.handleIncorectSubmission(client);
        }

    }

    private scheduleRoomDisposal() {
        this.clock.setTimeout(() => {
            this.isDisposing = true;
            this.disconnect();
            this._events.emit('dispose');
        }, this.DISPOSAL_DELAY);
    }

    private async createAndStartMatch() {
        this.state.room_uid = uuidv4();
        const match_server = new SudokuMatchServer(this.state.players, this.state.room_uid);
        const create_match_response = await match_server.createMatch();
        
        if (!create_match_response) {
            throw new Error("Failed to create match. Insufficient funds or other issue.");
        }
        
        await this.lock();
        this.broadcast(this.MESSAGES.server.match.started);
    }

    private handleMatchCreationError(err: any) {
        const errorMessage = err?.message || "Unknown error";
        console.error("Match creation failed:", errorMessage);
        
        this.broadcast(this.MESSAGES.server.match.canceled, { 
            reason: errorMessage 
        });
        
        this.scheduleRoomDisposal();
    }

    private async handleCreateMatch() {
        try {
            await this.createAndStartMatch();
            return true;
        } catch (err) {
            this.handleMatchCreationError(err);
            return false;
        }
    }

    onCreate(options: any) {
        this.registerMessageHandlers()
    }

    private initializeGame() {
        this.setUpInitialBoard();
        console.log(SudokuGenerator.printBoard(this.state.initial_board.cells.toArray()));
        this.clients.forEach(client => {
            this.initializePlayerBoard(client);
        })
        this.gameState = GamePhase.MATCH_ACTIVE;

    }

    async onJoin(client: Client, options: any, auth: any) {
        const player_state = this.createPlayerState(auth);
        this.state.players.set(client.sessionId, player_state);
        
        if (this.hasReachedMaxClients()) {
            this.handleCreateMatch();
            this.initializeGame();
        }
    }

    onLeave(client: Client) {
      console.log("player left:", client.sessionId);
      if(this.isDisposing) {
        return;
      }
      this.state.players.delete(client.sessionId);

      this.allowReconnection(client, this.RECONNECTION_DELAY);
    }

    onUncaughtException(err: Error, methodName: string) {
        console.error(`Error in ${methodName}:`, err.message);
        console.error("Stack trace:", err.stack);
        
        if (this.state?.players) {
          this.broadcast(this.MESSAGES.server.error, { message: "Server encountered an error" });
        }
    }

    onDispose() {
        console.log("Room disposed with id:", this.roomId);
        this.clock.clear();
    }

}
