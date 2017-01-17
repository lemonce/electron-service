if (typeof window !== 'undefined') {
	module.exports = require('./src/renderer');
} else {
	module.exports = eval('require')('./src/main');
}