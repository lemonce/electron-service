const {Logger, transports} = require('winston');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const {app} = require('electron');
const logPath = path.join(app.getPath('appData'), '.config');

fsExtra.ensureDirSync(logPath);
const DEFAULT_LOG = path.join(logPath, 'application.log');
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