'use strict';
const {ipcRenderer, remote} = require('electron');
const EventEmmiter = require('events');

const IPC_LIMIT = 10000;
const TIMEOUT_ERROR = new Error('Proxy calling timeout.');
const localWebContentsId = remote.getCurrentWebContents().id;

let tokenId = 0;
const proxyCallingPool = {};

function timeoutPromiseFactory() {
	return new Promise((resolve, reject) => {
		setTimeout(() => reject(TIMEOUT_ERROR), IPC_LIMIT);
	});
}

function clearProxyCalling($tokenId) {
	delete proxyCallingPool[$tokenId];
}

const serviceUriReg = /^([$\w]+)\.([$\w]+)$/;
function resolveURI(uri) {
	const [$, id, method] = uri.match(serviceUriReg) || [];
	return {id, method};
}

const call = function (uri, ...args) {
	const $tokenId = tokenId++;
	const {id, method} = resolveURI(uri);

	return Promise.race([
		timeoutPromiseFactory(),
		new Promise((resolve, reject) => {
			
			ipcRenderer.send('application-request', {id, method, args},
				$tokenId, localWebContentsId);

			// Register to calling pool by token
			proxyCallingPool[$tokenId] = function ({err, ret}) {
				clearProxyCalling($tokenId);
				if (err) {
					return reject(err);
				}
				return resolve(ret);
			};
		})
	]);
};

ipcRenderer.on('application-response', (event, response, $tokenId) => {
	proxyCallingPool[$tokenId](response);
});

const app = module.exports = {
	call, $rendererEmitter: new EventEmmiter(),
	on(eventType, listener) {
		app.$rendererEmitter.on(eventType, listener);
	},
	off(event, listener) {
		app.$rendererEmitter.removeListener(event, listener);
	},
	emit(eventType, ...args) {
		call('Application.$emit', eventType, ...args);
	},
	log(level, ...message) {
		call('Application.log', level, ...message);
	}
};
app.initPromise = call('Application.$registerWebContents', localWebContentsId);

ipcRenderer.on('application-event', (event, eventType, ...args) => {
	app.$rendererEmitter.emit(eventType, ...args);
});