const { VjGame } = require("./lib/VjGame");
const logger = require('./logger');

function setupGames(io, socket) {
  let roomSize =2;
  logger.success('***************** Setting up new connection ***************')
  /***
   * args = {
   *    availableCards: [],
   *    move: null
   *  }
   */
  
  const updateGameStateOnTimeout = (gameState) =>{
    const getRandomCard = gameState.availableCards[Math.floor(Math.random()*roomSize)];
    gameState.move = getRandomCard;
    return gameState;
  }


  const cricketGame = new VjGame(io, socket,
    {
      roomSize: 2,
      name: 'cricket',
      updateGameStateOnTimeout, 
      timePerRound: 10000,
      moveType: 'ALL'
    }
  );
  // cricketGame.newGameHandler();

}

module.exports = {
  setupGames
}