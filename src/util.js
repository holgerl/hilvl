'use strict';

// Makes the code run on both node.js and in a browser:
if (typeof(global) == 'undefined') {window.global = window; global.isBrowser = true;}
global.require = global.require || function(file) {};
global.process = global.process || {argv: []};
global.module = global.module || {};

var util = {
	removeQuotes: function(string) {
		var isDefined = string != null && string != undefined;
		if (isDefined && string[0] === "\"") string = string.substring(1);
		if (isDefined && string[string.length - 1] === "\"") string = string.substring(0, string.length - 1);
		return string;
	},

	toArray: function(arrayLike) {
		return Array.prototype.slice.call(arrayLike).slice();
	}
}

module.exports = util;