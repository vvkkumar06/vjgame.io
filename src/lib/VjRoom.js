const logger = require("../logger");
const _ = require('lodash');

const rooms = {};
const roomsTimer = {};

const MOVE_TYPE = {
    ALTERNATE: 'ALTERNATE',
    ALL: 'ALL'
}

function info(roomName, message) {
    logger.roomInfo(`(Room: ${roomName}): ${message}`);
}
function warn(roomName, message) {
    logger.warning(`(Room: ${roomName}): ${message}`);
}

/***
 * {
 *    'room-1': {
 *      'players': {
 *         '1': {
 *            clientId: 'abckdkj12345',
 *            clientInfo: {
 *               username: 'vvkkumar06',
 *               picture: 'https://abckd/vvkumar06.png' 
 *            }, 
 *         },
 *         '2': {
 *             // 
 *          }
 *      },
 *      gameState: {
 *        'abckdkj12345': { //
 *           move: {
 *             1: 45,
 *             2: 34
 *           },
 *           result: ['W']
 *        }
 *        'sdfs33334455': { //}
 *      },
 *      turn: null,
 *      round: 0
 *    }
 * }
 * 
 * 
 */

const initializePlayer = (roomName, clientId, clientInfo) => {
    info(roomName, `Intializing players`);
    if (!rooms[roomName]) {
        rooms[roomName] = {
            players: {}
        };
    }
    if (rooms[roomName] && !rooms[roomName]['players']) {
        rooms[roomName]['players'] = {};
    }
    const playerNo = Object.keys(rooms[roomName]['players']).length + 1;
    rooms[roomName]['players'][playerNo] = { clientId, clientInfo };
};

const getGameStateByClientId = (roomName, clientId) => rooms[roomName]['gameState'][clientId];


const updateGameState = (roomName, clientId, gameState, server, verifyWinState) => {

    info(roomName, `Updating game state`);
    if (!rooms[roomName]['gameState']) {
        rooms[roomName]['gameState'] = {}
    }

    rooms[roomName]['gameState'][clientId] = _.merge(rooms[roomName]['gameState'][clientId], gameState);
    if (verifyWinState) {
        const winner = verifyWinState(rooms[roomName]['gameState'], rooms[roomName].round);
        if (winner) {
            rooms[roomName].finished = true;
            server && server.in(roomName).emit('game-status', {
                gameState: rooms[roomName].gameState,
                winner: winner
            });
            let t = setTimeout(() => {
                closeRoom(roomName, server);
            }, 2000);
            clearTimeout(t);
        } else {
            server && server.in(roomName).emit('game-status', rooms[roomName].gameState)
        }
    }
};

const setCurrentTurn = (roomName, moveType) => {
    info(roomName, `Setting current turn`);
    if (rooms[roomName] && !rooms[roomName]['round'] && rooms[roomName]['round'] !== 0) {
        rooms[roomName]['round'] = 1;
    } else {
        rooms[roomName]['round'] = rooms[roomName]['round'] + 1;
    }
    if (moveType !== MOVE_TYPE.ALL) {
        if (rooms[roomName] && !rooms[roomName]['lastTurn']) {
            rooms[roomName]['turn'] = 0;
        }
        let turn = 0;
        if (turn > Object.keys(rooms[roomName]['players']).length) {
            turn = 1;
        } else {
            turn = rooms[roomName]['turn'] + 1;
        }
        rooms[roomName]['turn'] = turn;
    } else {
        rooms[roomName]['turn'] = null;
    }
};

const getCurrentTurn = (roomName) => rooms[roomName]['turn'];

const getClientIdsFromTurn = (roomName) => {
    info(roomName, `Getting client id from given turn`);
    let turn = getCurrentTurn(roomName);
    if (!turn) {
        return Object.keys(rooms[roomName]['gameState']);
    }
    return [rooms[roomName]['players'][turn]];
};

const createTimer = (roomName, server, timePerRound, updateGameStateOnTimeout, moveType, verifyWinState) => {
    info(roomName, `Creating timer`);
    if (!roomsTimer[roomName]) {
        roomsTimer[roomName] = {};
    }
    const currentTurnClients = getClientIdsFromTurn(roomName);

    currentTurnClients.forEach(clientId => {
        roomsTimer[roomName][clientId] = setTimeout(() => {
            //Make timeout emit
            info(roomName, `Client timeout - sending message to client`);
            //Automate move from server
            updateGameState(roomName,
                clientId,
                updateGameStateOnTimeout(
                    getGameStateByClientId(roomName, clientId),
                    rooms[roomName].round),
                server,
                verifyWinState
            );
            clearTimer(roomName, clientId);
            if (!isTimerRunning(roomName) && !rooms[roomName].finished) {
                requestMove(roomName, server, moveType);
                createTimer(roomName, server, timePerRound, updateGameStateOnTimeout, moveType, verifyWinState);
            }
        }, timePerRound);
    })
}

const isTimerRunning = (roomName) => {
    let timer = roomsTimer[roomName] ? Object.values(roomsTimer[roomName]).find(timer => timer) : false;
    return Boolean(timer);
}

const clearTimer = (roomName, clientId) => {
    info(roomName, `Clearing timeout for client ${clientId}`);
    if (roomsTimer[roomName]) {
        clearTimeout(roomsTimer[roomName][clientId]);
        roomsTimer[roomName][clientId] = null;
    }
}

const requestMove = (roomName, server, moveType) => {
    if (!rooms[roomName].finished) {
        info(roomName, 'Requesting a move');
        setCurrentTurn(roomName, moveType);
        server.in(roomName).emit('request-move', { nextRound: rooms[roomName].round });
    }
}


const closeRoom = (roomName, server) => {
    const clients = Object.keys(rooms[roomName].gameState);
    clients.forEach((client) => {
        clearTimer(roomName, client);
        server.in(client).socketsLeave(roomName);
        info(roomName, 'Removing clients from room');
    });
    delete rooms[roomName];
    delete roomsTimer[roomName];
}

module.exports = {
    initializePlayer, setCurrentTurn, updateGameState,
    getCurrentTurn, getClientIdsFromTurn, createTimer, clearTimer,
    requestMove, isTimerRunning,
    rooms,
    roomsTimer,
    MOVE_TYPE
}