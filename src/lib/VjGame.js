const logger = require('./../logger');
const { updateGameState, initializePlayer, MOVE_TYPE, clearTimer, requestMove, createTimer, isTimerRunning } = require('./VjRoom');

class VjGame {
    _defaultOptions = {
        name: 'vj',
        roomSize: 2,
        customEvents: {},
        updateGameStateOnTimeout: () => { },
        verifyWinState: () => {},
        moveType: MOVE_TYPE.ALTERNATE,
        timePerRound: 10000
    }
    constructor(io, socket, options = this._defaultOptions) {
        this.server = io;
        this.client = socket;
        this.roomSize = options.roomSize;
        this.name = options.name;
        this.customEvents = options.customEvents;
        this.clientInfo = options.clientInfo;
        this.updateGameStateOnTimeout = options.updateGameStateOnTimeout;
        this.verifyWinState = options.verifyWinState;
        this.gameState = options.gameState;
        this.moveType = options.moveType;
        this.timePerRound = options.timePerRound;

        //Will be set once game starts
        this.roomName = undefined;
        this.connectedClients = [];

        this.intializeEvents();
    }

    info(message) {
        logger.info(`(Client: ${this.client.id}): ${message}`);
    }
    warn(message) {
        logger.warning(`(Client: ${this.client.id}): ${message}`);
    }

    //intialize events of game
    intializeEvents() {
        this.info('Initializing Events');
        this.client.on('new-game', (args, cb) => this.newGameHandler(args, cb));
        this.client.on('end-game', (args, cb) => this.endGameHandler(args, cb));
        this.client.on('move', (args, cb) => this.moveHandler(args, cb));
        this.client.on('disconnect', () => this.disconnectHandler());
        for (let eventName in this.customEvents) {
            this.info('Setting up custom events');
            this.client.on(eventName, (args, cb) => this.customEvents[eventName](args, cb));
        }
    }

    /**
     * Get socket id of connected client
     * @returns clientId
     */
    getClientId() {
        return this.client.id;
    }

    /**
     * Get all room names of client already in
     * @returns RoomNames[]
     */
    getConnectedRooms() {
        this.info('Getting connected rooms');
        const rooms = this.client.rooms;
        const roomNames = Array.from(rooms);
        return roomNames.filter(name => name.startsWith(this.name));
    }

    /**
     * Get total rooms count 
     * @returns RoomsCount
     */
    getConnectedRoomsCount() {
        this.info('Getting connected rooms count');
        return this.getConnectedRooms().length;
    }

    /**
    * Get all room names for this game
    * @returns RoomNames[]
    */
    getAllRooms() {
        this.info('Getting all rooms');
        const rooms = this.server.sockets.adapter.rooms;
        const roomNames = Array.from(rooms.keys());
        return roomNames.filter(name => name.startsWith(this.name));
    }

    /**
     * Get total rooms count 
     * @returns RoomsCount
     */
    getAllRoomsCount() {
        this.info('Getting all rooms count');
        return this.getAllRooms().length;
    }

    /**
     * Get all connected clients' socket ids
     * @param {string} roomId or socketId
     * @returns clientIds[]
     */
    getConnectedClients(roomId) {
        this.info(`Getting connected clients for Room: ${roomId}`);
        let roomName = roomId.startsWith(this.name) ? roomId : `${this.name}-${roomId}`;
        const clients = this.server.sockets.adapter.rooms.get(roomName);
        return Array.from(clients);
    }

    /**
     * Get total connected clients for a room
     * @param {number} roomId 
     * @returns totalClients
     */
    getConnectedClientsCount(roomId) {
        this.info(`Getting total connected clients count for Room: ${roomId}`);
        return this.getConnectedClients(roomId).length;
    }

    /**
     * Join a room
     * @param {string} roomId or roomName
     */
    joinRoom(roomId, args) {
        const { gameState, clientInfo } = args;
        let roomName = roomId.startsWith(this.name) ? roomId : `${this.name}-${roomId}`;
        this.client.join(roomName);
        initializePlayer(roomName, this.client.id, clientInfo);
        updateGameState(roomName, this.client.id, gameState);
        this.info(`Joining Room: ${roomId}`);
        this.roomName = roomName;
        this.connectedClients = this.getConnectedClients(roomName);
        // If room is full then start game
        if (this.getConnectedClientsCount(roomId) === this.roomSize) {
            this._startGame(roomName);
        }
    }

    /**
     * Get available room
     * @returns roomName
     */
    getWaitingRoom() {
        this.info('Getting available room');
        const allRooms = this.getAllRooms();
        for (let roomName of allRooms) {
            let connectedClients = this.getConnectedClientsCount(roomName);
            if (connectedClients < this.roomSize) {
                return roomName;
            }
        }
        return undefined;
    }

    /**
     * Event handlers
     */

    /**
     * Start new game and join a new or existing available room
     * On game start collect essential data for the client needs to be displayed while matching
     */
    newGameHandler(args, cb) {
        const roomsLength = this.getConnectedRoomsCount();
        if (roomsLength) {
            this.warn('Already in another room');
        } else {
            let roomName = this.getWaitingRoom();
            if (roomName) {
                this.info(`Room found: ${roomName}`);
                this.joinRoom(roomName, args);
            } else {
                //Create new room
                this.warn(`No room found, creating new room`);
                roomName = `${this.name}-${this.client.id}`;
                this.joinRoom(roomName, args)
            }
        }
    }

    /**
    * Game Over event
    */
    endGameHandler() {
        info('(Server): cleaning room');
        this.server.socketsLeave(this.getConnectedRooms());
    }

    moveHandler(args, cb) {
        this.info('Move received');
        this._makeMove(args);
    }

    disconnectHandler(args, cb) {
        this.warn('Disconnected');
        clearTimer(this.roomName, this.client.id);
    }

    //private methods
    _startGame = (roomName) => {
        this.info(`Starting Game for Room: ${roomName}`);
        this.server.in(roomName).emit('start-game');
        this._makeMove();
    }
    _makeMove = (gameState) => {
        this.info(this.roomName);
        clearTimer(this.roomName, this.client.id);
        gameState && updateGameState(this.roomName, this.client.id, gameState, this.server, this.verifyWinState);
        if(!isTimerRunning(this.roomName)) {
            requestMove(this.roomName, this.server, this.moveType);
            createTimer(this.roomName, this.server, this.timePerRound, this.updateGameStateOnTimeout, this.moveType, this.verifyWinState);
        }  
    }
}

module.exports = {
    VjGame
}