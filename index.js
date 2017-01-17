if (typeof window !== 'undefined') {
	module.exports = require('./renderer');
} else {
	module.exports = eval('require')('./main');
}