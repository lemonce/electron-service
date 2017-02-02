'use strict';
const EventEmitter = require('events');
const {ipcMain, webContents} = require('electron');
const logger = require('./logger');

const SAFE_IPC_INTERVAL = 50;
/**
 * Service
 */
const serviceManagement = {};
function noLog(method) {
	method.noLog = true;
	return method;
}
const service = function (id, constructor) {
	const service = serviceManagement[id];
	if (constructor) {
		if (service) {
			throw new Error(`Service: ${id} has been defined. Use serivce.override to override.`);
		}
		
		if (typeof constructor === 'function') {
			const $service = serviceManagement[id] = new constructor(noLog);
			return $service;
		}

		throw new Error(`Invalid constructor for defination of Service ${id}. Excepted a function.`);
	}

	if (service) {
		return service;
	}

	throw new Error(`Service (Id: ${id}) is undefined.`);
};

ipcMain.on('application-request', (event, {id, method, args}, $tokenId, webContentsId) => {

	Promise.resolve().then(() => {
		const $service = service(id);
		let noLog = false;

		if (!$service) {
			throw new Error(`Service ${id} has not been registed.`);
		}
		noLog = $service.noLog;

		if (!$service[method]) {
			throw new Error(`Method ${method} of Service ${id} is not defined.`);
		}

		noLog = $service[method].noLog;
		if (!noLog) {
			logger.log('info', '[<<<<<]: Sender=%d Service=%s Method=%s Args=%j Token=%d',
				webContentsId, id, method, args, $tokenId);
		}

		return $service[method](...args);
	}).then(ret => {
		if (!noLog) {
			logger.log('info', '[>>>>>] Return=%j', {ret});
		}
		return {ret};
	}, err => {
		logger.log('error', '[ERROR] Exception=%s', err.toString());
		return {
			err: err.toString()
		};
	}).then(response => setTimeout(() => {
		event.sender.send('application-response', response, $tokenId);
	}, SAFE_IPC_INTERVAL));
});

const main = module.exports = {
	$mainEmitter: new EventEmitter(),
	service,
	$activeWebContents: {},
	on(eventType, listener) {
		main.$mainEmitter.on(eventType, listener);
	},
	off(event, listener) {
		main.$rendererEmitter.removeListener(event, listener);
	},
	emit(eventType, ...args) {
		logger.log('info', '[EVENT]: Event=%s', eventType);
		main.$mainEmitter.emit(eventType, ...args);
		for(let id in main.$activeWebContents) {
			const webContents = main.$activeWebContents[id];
			webContents.send('application-event', eventType, ...args);
		}
	},
	log(level, ...message) {
		logger.log(level, ...message);
	}
};

main.emitter = main;

/**
 * App Service
 */
service('Application', function (noLog) {
	this.$registerWebContents = function (id) {
		const $webContents =
			main.$activeWebContents[id] =
			webContents.fromId(id);

		$webContents.on('destroyed', () => {
			delete main.$activeWebContents[id];
		});
		return true;
	};

	this.$emit = noLog(function (eventType, ...args) {
		main.emit(eventType, ...args);
	});

	this.log = noLog(function (level, ...message) {
		main.log(level, ...message);
	});
});