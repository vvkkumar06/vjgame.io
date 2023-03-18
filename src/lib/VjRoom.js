const rooms = {};
const roomsTimer = {};

const MOVE_TYPE = {
    ALTERNATE: 'ALTERNATE',
    ALL: 'ALL'
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
 *        'abckdkj12345': { //}
 *        'sdfs33334455': { //}
 *      },
 *      turn: null,
 *    }
 * }
 */

const initializePlayer = (roomName, clientId, clientInfo, gameState) => {
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


const updateGameState = (roomName, clientId, gameState) => {
    if (!rooms[roomName]['gameState']) {
        rooms[roomName]['gameState'] = {}
    }
    rooms[roomName]['gameState'][clientId] = gameState;
};

const setCurrentTurn = (roomName, moveType) => {
    if(moveType !== MOVE_TYPE.ALL) {
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

const getCurrentTurn = (roomName) =>  rooms[roomName]['turn'];

const getClientIdsFromTurn = (roomName) => {
    let turn = getCurrentTurn();
    if(!turn) {
        return Object.keys(rooms[roomName]['gameState']);
    }
   return [ rooms[roomName]['players'][turn] ];
};

const createTimer = (roomName, server, updateGameStateOnTimeout) => {
    if (!roomsTimer[roomName]) {
        roomsTimer[roomName] = {};
    }
    const currentTurnClients = getClientIdsFromTurn(this.roomName);

    currentTurnClients.forEach(clientId => {
        roomsTimer[roomName][clientId] = setTimeout(() => {
            //Make timeout emit
            server.to(clientId).emit('timeout');
            updateGameState(roomName, clientId, updateGameStateOnTimeout(getGameStateByClientId(clientId)));
            //Automate move from server
        }, this.timePerRound);
    })
}



module.exports = {
    initializePlayer, setCurrentTurn, updateGameState, getCurrentTurn, getClientIdsFromTurn, createTimer,
    rooms,
    roomsTimer,
    MOVE_TYPE
}