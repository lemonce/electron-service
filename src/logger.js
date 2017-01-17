const {Logger, transports} = require('winston');
const fs = require('fs');
const fsExtra = require('fs-extra');

fsExtra.ensureDirSync('logs');
const DEFAULT_LOG = 'logs/application.log';
fs.unlink(DEFAULT_LOG, err => err);
// Init default log
const {Console, File} = transports;
const logger = module.exports = new Logger({
	transports: [
		new Console(),
		new File({
			filename: DEFAULT_LOG
		})
	]
});

logger.Logger = Logger;