'use strict';
const EventEmitter = require('events');
const {ipcMain, webContents} = require('electron');
const logger = require('./logger');

/**
 * Service
 */
const serviceManagement = {};
const service = function (id, constructor) {
	const service = serviceManagement[id];
	if (constructor) {
		if (service) {
			throw new Error(`Service: ${id} has been defined. Use serivce.override to override.`);
		}
		
		if (typeof constructor === 'function') {
			return serviceManagement[id] = new constructor();
		}

		throw new Error(`Invalid constructor for defination of Service ${id}. Excepted a function.`);
	}

	if (service) {
		return service;
	}

	throw new Error(`Service (Id: ${id}) is undefined.`);
};

ipcMain.on('application-request', (event, {id, method, args}, $tokenId, webContentsId) => {
	logger.log('info', '[MAIN.Call]: Sender=%d Service=%s Method=%s Args=%j Token=%d',
		webContentsId, id, method, args, $tokenId);

	Promise.resolve().then(() => {
		const $service = service(id);

		if (!$service[method]) {
			throw new Error(`Method ${method} of Service ${id} is not defined.`);
		}

		return $service[method](...args);
	}).then(ret => {
		logger.log('info', '[MAIN.Return] Return=%j', {ret});
		return {ret};
	}, err => {
		logger.log('error', '[MAIN.Error] Exception=%s', err.toString());
		return {
			err: err.toString()
		};
	}).then(response => {
		event.sender.send('application-response', response, $tokenId);
	});
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
		logger.log('info', '[APP.Emit]: Event=%s Args=%j', eventType, args);
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
service('Application', function () {
	this.$registerWebContents = function (id) {
		const $webContents =
			main.$activeWebContents[id] =
			webContents.fromId(id);

		$webContents.on('destroyed', () => {
			delete main.$activeWebContents[id];
		});
		return true;
	};

	this.$emit = function (eventType, ...args) {
		main.emit(eventType, ...args);
	};

	this.log = function (level, ...message) {
		main.log(level, ...message);
	};
});