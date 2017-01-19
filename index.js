if (typeof window !== 'undefined' && window['ELECTRON_SERVICE_MODULE']) {
	module.exports = require('./src/renderer');
	window['ELECTRON_SERVICE_MODULE'] = true;
} else {
	module.exports = eval('require')('./src/main');
}