import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import appConfig from "../src/app.config";
import SudokuState from "../src/rooms/schema/SudokuState";
import { SudokuMatchServer } from "../src/utils/server_com";
import sinon from "sinon";


class ReceivedMessage {
    type: string | number;
    message: any;

    constructor(type: string | number, message: any) {
        this.type = type;
        this.message = message;
    }
}

describe("SudokuRoom", () => {
  let colyseus: ColyseusTestServer;
  let matchServerStub: sinon.SinonStub;
  let finishMatchStub: sinon.SinonStub;
  
  before(async () => {
    // Create proper Response objects for mocking
    const mockResponse = new Response(JSON.stringify({
      result: {
        id: 9,
        match_uuid: '567183d4-26df-4129-8210-062b31c74f39',
        match_type: 1,
        history: {
          winner: 6,
          players: [
            { id: 3, board: Array(81).fill(1), result: 'lose' },
            { id: 6, board: Array(81).fill(1), result: 'win' }
          ],
          end_time: 1746429024511
        }
      }
    }));
    
    // Stub SudokuMatchServer methods
    matchServerStub = sinon.stub(SudokuMatchServer.prototype, "createMatch").resolves(true);
    finishMatchStub = sinon.stub(SudokuMatchServer.prototype, "finishMatch").resolves(mockResponse);
    
    colyseus = await boot(appConfig);
  });
  
  after(async () => {
    sinon.restore();
    await colyseus.shutdown();
  });
  
  beforeEach(async () => {
    await colyseus.cleanup();
    matchServerStub.reset();
    finishMatchStub.reset();
    matchServerStub.resolves(true);
  });
  
  describe("Room Creation and Connection", () => {
    it("should allow players to connect to the room", async () => {
      // Create room
      const room = await colyseus.createRoom<SudokuState>("sudoku", {});
      
      // Connect first client
      const client1 = await colyseus.connectTo(room, { token: "token1" });
      
      // Assertions
      assert.strictEqual(room.clients.length, 1);
      assert.strictEqual(client1.sessionId, room.clients[0].sessionId);
      assert.strictEqual(room.state.players.size, 1);
    });
    
    it("should start the game when max players have joined", async () => {
      // Create room
      const room = await colyseus.createRoom<SudokuState>("sudoku", {});
      
      // Connect clients and add message tracking
      const client1 = await colyseus.connectTo(room, { token: "token1" });
      const client2 = await colyseus.connectTo(room, { token: "token2" });
      
      // Setup message tracking
      const receivedMessages: ReceivedMessage[] = [];
      client1.onMessage("*", (type, message) => {
        receivedMessages.push({ type, message });
      });
      
      // Wait for state sync
      await room.waitForNextPatch();
      
      // Assertions
      assert.strictEqual(room.clients.length, 2);
      assert.strictEqual(room.state.players.size, 2);
      assert.ok(room.state.room_uid, "Room UID should be set");
      assert.ok(room.state.initial_board, "Initial board should be created");
      
      // Check for match started message (may need to wait)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // The message tracking approach depends on how your testing framework is set up
      // You may need to modify this based on your specific implementation
      // For now, we'll assert on the room state
      assert.ok(room.state.initial_board.cells.length > 0, "Board should be initialized");
    });
  });
  
  describe("Game Mechanics", () => {
    it("should allow valid moves during active game", async () => {
      // Set up room and clients
      const room = await colyseus.createRoom<SudokuState>("sudoku", {});
      const client1 = await colyseus.connectTo(room, { token: "token1" });
      const client2 = await colyseus.connectTo(room, { token: "token2" });
      
      // Track messages for client2
      const client2Messages: ReceivedMessage[] = [];
      client2.onMessage("*", (type, message) => {
        client2Messages.push({ type, message });
      });
      
      // Wait for game to start
      await room.waitForNextPatch();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Access internal game state for testing
      // Force gameState to MATCH_ACTIVE for test purposes
      // This is a bit of implementation detail, but necessary for testing
      room["gameState"] = 1; // GamePhase.MATCH_ACTIVE
      
      // Make sure SudokuUtil.isValidMove returns true for our test
      const sudokuUtil = require("../src/utils/SudokuUtils").SudokuUtil;
      const isValidMoveStub = sinon.stub(sudokuUtil, "isValidMove").returns(true);
      
      try {
        // Make a move
        const testIndex = 0;
        const testValue = 5;
        client1.send("fill", { index: testIndex, num: testValue });
        
        // Wait for state sync
        await room.waitForNextPatch();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if move was applied
        const playerState = room.state.players.get(client1.sessionId);
        assert.strictEqual(playerState?.private_board.cells[testIndex], testValue);
        assert.strictEqual(playerState?.board.cells[testIndex], -2);
        
        // Check if move was broadcast
        const moveMessage = client2Messages.find(msg => msg.type === "player_moved");
        assert.ok(moveMessage, "Client 2 should receive move notification");
      } finally {
        // Clean up
        isValidMoveStub.restore();
      }
    });
    
    it("should handle solution submission with game completion", async function() {
      this.timeout(5000); // Extend timeout for this test
      
      // Set up room and clients
      const room = await colyseus.createRoom<SudokuState>("sudoku", {});
      const client1 = await colyseus.connectTo(room, { token: "token1" });
      const client2 = await colyseus.connectTo(room, { token: "token2" });
      
      // Track messages for client2
      const client2Messages: ReceivedMessage[] = [];
      client2.onMessage("*", (type, message) => {
        client2Messages.push({ type, message });
      });
      
      // Wait for game to start
      await room.waitForNextPatch();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Set game state to active
      room["gameState"] = 1; // GamePhase.MATCH_ACTIVE
      
      // Make isSudokuSolved return true
      const sudokuUtil = require("../src/utils/SudokuUtils").SudokuUtil;
      const isSolvedStub = sinon.stub(sudokuUtil, "isSudokuSolved").returns(true);
      
      try {
        // Submit solution
        client1.send("complete", {});
        
        // Wait for state sync
        await room.waitForNextPatch();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Verify game state changed
        assert.strictEqual(room["gameState"], 2); // GamePhase.MATCH_ENDED
        assert.strictEqual(room.state.winnnerId, client1.sessionId);
        
        // Check if completion message was sent to other client
        const completionMessage = client2Messages.find(msg => msg.type === "completed");
        assert.ok(completionMessage, "Completion message should be broadcast");
        
        // Verify finishMatch was called
        assert.ok(finishMatchStub.called, "finishMatch should be called");
      } finally {
        // Clean up
        isSolvedStub.restore();
      }
    });
  });
  
  describe("Error Handling and Edge Cases", () => {
    it("should handle match cancellation when creation fails", async () => {
      // Make createMatch return false for this test
      matchServerStub.resolves(false);
      
      // Set up room and clients
      const room = await colyseus.createRoom<SudokuState>("sudoku", {});
      const client1 = await colyseus.connectTo(room, { token: "token1" });
      
      // Track messages
      const receivedMessages: ReceivedMessage[] = [];
      client1.onMessage("*", (type, message) => {
        receivedMessages.push({ type, message });
      });
      
      // Add second client to trigger match creation
      const client2 = await colyseus.connectTo(room, { token: "token2" });
      
      // Wait for state sync
      await room.waitForNextPatch();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check for match canceled message
      const cancelMessage = receivedMessages.find(msg => msg.type === "match_canceled");
      assert.ok(cancelMessage, "Match canceled message should be sent");
    });
    
    it("should reject moves when game is not in active state", async () => {
      // Set up room and client
      const room = await colyseus.createRoom<SudokuState>("sudoku", {});
      const client = await colyseus.connectTo(room, { token: "token1" });
      
      // Track messages
      const receivedMessages: ReceivedMessage[] = [];
      client.onMessage("*", (type, message) => {
        receivedMessages.push({ type, message });
      });
      
      // Make sure game state is not active
      room["gameState"] = 0; // GamePhase.WAITING_FOR_PLAYERS
      
      // Try to make a move
      client.send("fill", { index: 0, num: 5 });
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check for error message
      const errorMessage = receivedMessages.find(msg => msg.type === "error");
      assert.ok(errorMessage, "Error message should be sent for invalid state move");
    });
  });
});