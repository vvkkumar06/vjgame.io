const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { setupGames } = require('./setup');
const logger = require('./logger');

const app = express();
app.use(cors());



const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: '*',
    }
});

io.on('connection', (socket) => {
    setupGames(io, socket);
});

httpServer.listen(3000);



