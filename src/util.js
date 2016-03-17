'use strict';

var util = {
	removeQuotes: function(string) {
		var isDefined = string != null && string != undefined;
		if (isDefined && string[0] === "\"") string = string.substring(1);
		if (isDefined && string[string.length - 1] === "\"") string = string.substring(0, string.length - 1);
		return string;
	}
}

module.exports = util