const { VjGame } = require("./lib/VjGame");
const logger = require('./logger');
const winStatus = {};

function setupGames(io, socket) {
  let roomSize = 2;
  logger.success('***************** Setting up new connection ***************')
  /***
   * args = {
   *    availableCards: [],
   *    move: null
   *  }
   */
  // Auto Move logc for a client
  /**
   * gameState is for a single client
   * @param {*} gameState  a game state for a client which got timed out
   * @param {*} round round for which it got timed out
   * @returns 
   */
  const updateGameStateOnTimeout = (gameState, round) => {
    const getRandomCard = gameState.availableCards[Math.floor(Math.random() * roomSize)];
    gameState.move = { ...gameState.move, ...{ [round]: getRandomCard } };
    return gameState;
  }

  /**
   * Modify State according to winner
   * @param {*} state Game State of all clients
   * @param {*} round Current Round
   * @returns Return clients array if it is final winner otherwise return undefined or false
   */
  const verifyWinState = (state, round) => {
    const clients = Object.keys(state);
    const roundWinner = getWinnerClient(state, clients, round);
    if (!state[clients[0]]['result']) {
      state[clients[0]]['result'] = [];
    }
    if (!state[clients[1]]['result']) {
      state[clients[1]]['result'] = [];
    }
    if (!roundWinner) {
      return false;
    } else if (roundWinner.length === 2) {
      state[clients[0]]['result'].push('T');
      state[clients[1]]['result'].push('T');
    } else {
      const anotherClient = clients.find(client => client !== roundWinner[0])
      state[roundWinner[0]]['result'].push('W');
      state[anotherClient]['result'].push('L');
    }
    return getFinalWinner(state, clients[0], clients[1], round);
  }

  const getWinnerClient = (state, clients, round) => {
    if (state[clients[0]]['move'] && state[clients[1]]['move'] && state[clients[0]]['move'][round] && state[clients[1]]['move'][round]) {
      if (getCardPropFromId(state[clients[0]]['move'][round]) > getCardPropFromId(state[clients[1]]['move'][round])) {
        return [clients[0]]
      } else if (getCardPropFromId(state[clients[0]]['move'][round]) < getCardPropFromId(state[clients[1]]['move'][round])) {
        return [clients[1]]
      } else {
        return clients;
      }
    } else {
      return undefined;
    }
  }

  const getFinalWinner = (state, client1, client2, round) => {
    if (round <= 3 && round > 1 &&
      state[client1].result &&
      state[client2].result &&
      state[client1]['move'] &&
      state[client2]['move'] &&
      state[client1]['move'][round] &&
      state[client1]['move'][round]
    ) {
      const client1Result = state[client1].result.filter(round => round === 'W').length;
      const client2Result = state[client2].result.filter(round => round === 'W').length;
      if(round === 2) {
        if(client1Result === 2) {
          return [client1];
        } else if(client2Result === 2){
          return [client2];
        }
      } else {
        if(client1Result === 1) {
          return [client1]
        } else if(client2Result === 1){
          return [client2]
        } else {
          return [client1, client2]
        }
      }
    }
    return undefined;
  }

  const getCardPropFromId = (value) => value;

  const cricketGame = new VjGame(io, socket,
    {
      roomSize: 2,
      name: 'cricket',
      updateGameStateOnTimeout,
      verifyWinState,
      timePerRound: 30000,
      moveType: 'ALL'
    }
  );
  // cricketGame.newGameHandler();

}

module.exports = {
  setupGames
}