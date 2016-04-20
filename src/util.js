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
	},

	equal: function equal(x, y) {	
		if (typeof x === "string" || y === "string")
			return x.toString() === y.toString();

	    if (x === null || x === undefined || y === null || y === undefined)
			return x === y;
		
	    if (x.constructor !== y.constructor) 
			return false;
		
	    if (x instanceof Function) 
			return x === y;
		
	    if (x instanceof RegExp) 
			return x === y;
	    if (x === y || x.valueOf() === y.valueOf()) 
			return true;
	    if (Array.isArray(x) && x.length !== y.length) 
			return false;

	    if (x instanceof Date) 
			return false;

	    if (!(x instanceof Object)) 
			return false;
	    if (!(y instanceof Object)) 
			return false;

	    var p = Object.keys(x);
	    return Object.keys(y).every(function (i) {return p.indexOf(i) !== -1; }) && p.every(function (i) { return equal(x[i], y[i]); });
	},


	clone: function naiveClone(obj) {
		if (null == obj || "object" != typeof obj) return obj;
		var copy = obj.constructor();
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr))
				copy[attr] = naiveClone(obj[attr]);
		}
		return copy;
	}
}

module.exports = util;