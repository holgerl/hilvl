function equal(x, y) {	
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
}

module.exports = {equal}