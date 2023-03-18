const chalk = require('chalk');

const log = console.log;

const error = chalk.red;
const warning = chalk.hex('#FFA500'); 
const info = chalk.blue;
const roomInfo = chalk.hex('#882299'); ;
const success = chalk.green;

const logger = {
    error: (cb) => log(error(cb)),
    warning: (cb) => log(warning(cb)),
    info: (cb) => log(info(cb)),
    success: (cb) => log(success(cb)),
    roomInfo: (cb) => log(roomInfo(cb)),
}

module.exports = logger;