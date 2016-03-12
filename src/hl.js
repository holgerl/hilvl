'use strict';

// Makes the code run on both node.js and in a browser:
if (typeof(global) == 'undefined') {window.global = window; global.isBrowser = true;}
global.require = global.require || function() {};
global.process = global.process || {argv: []};
global.module = global.module || {};

var fs = require("fs");

var hl = {};

function argumentsToArray(args) {
	var array = [];
	for (var i in args) array.push(args[i]);
	return array;
}

//hl.logLevel = "debug";
//hl.logLevel = "info";
hl.logLevel = "warning";

hl.setLogLevel = function(level) {
	hl.logLevel = level;
}

hl.log = function(level) {
	var levels = ["error", "warning", "info", "debug"];

	var args = argumentsToArray(arguments);

	if (levels.indexOf(level) < 0) {
		level = "debug";
	} else {
		args.shift();
	}

	if (levels.indexOf(level) > levels.indexOf(hl.logLevel)) return;

	var levelLetter = level[0].toUpperCase();

	args.unshift(levelLetter);

	console.log.apply({}, args)
}

hl.tokenize = function(script) {
	function iterateLine(line, iteratorFun) {
		var isInString = false;
		var isInEscape = false;
		var result = "";
		
		for (var character of line) {
			result += iteratorFun(character, isInString);
			
			var isCharacterQuote = character == "\"" && !isInEscape;
			isInEscape = isInEscape ? false : character == "\\";
			isInString = isInString ? !isCharacterQuote	: isCharacterQuote;
		}
		
		return result;
	}
	
	function escapeSpacesInStrings(line) {
		return iterateLine(line, function(character, isInString) {
			if (isInString && character == " ") 
				return "\uFFFF";
			else 
				return character;
		});
	}
	
	function unescapeSpacesInStrings(string) {
		return string.replace(/\uFFFF/g, " ");
	}

	function removeLineComments(string) {
		return string.replace(/\/\/.*/g, "");
	}

	function removeBlockComments(string) {
		return script.replace(/\/\*(\*(?!\/)|[^*])*\*\//g, " ");
	}

	function lineIsNotEmpty(line) {
		return !/^[\s\t]*$/.test(line);
	}
	
	function addSpacesAroundCharacters(line) {
		var characters = Array.prototype.slice.call(arguments).slice(1);
		
		return iterateLine(line, function(character, isInString) {
			if (!isInString && characters.indexOf(character) >= 0)
				return " " + character + " ";
			else 
				return character;
		});
	}

	function replaceLeadingWhitespaceWithTabTokens(line) {
		return line.replace(/^[\s\t]+/g, function(match) {
			match = match.replace(/\t/g, "    ");
			var numberOfTabs = match.length / 4;
			if (numberOfTabs !== parseInt(numberOfTabs, 10)) throw new Error("Leading spaces not multiple of 4 in\n" + line);
			return "TAB ".repeat(numberOfTabs);
		});
	}

	function tokenizeLine(line) {
		line = replaceLeadingWhitespaceWithTabTokens(line);
		line = addSpacesAroundCharacters(line, ".", ":", "(", ")", ",");
		line = escapeSpacesInStrings(line);
		
		return line.trim().split(/\s+/).map(unescapeSpacesInStrings);
	}

	script = removeLineComments(script);
	script = removeBlockComments(script);

	var tokenLists = script
		.split(/\r?\n|\r/)
		.filter(lineIsNotEmpty)
		.map(tokenizeLine);

	tokenLists.push(["EOF"]);
	return tokenLists;
}

hl.parse = function(tokenLists) {
	function countTabs(tokens) {
		var numberOfTabs = 0;
		for (var j in tokens) {
			if (tokens[j] == "TAB") 
				numberOfTabs++;
			else 
				break;
		}
		return numberOfTabs;
	}
	
	function parseLine(tokens, indent) {
		if (indent == tokens.length-1) return tokens[indent];
		
		var stack = [{service: null, action: null, args: null}];
		var types = ["service", "action", "args"];
		var root = stack[0];
		var typeCounter = 0;
		
		for (var i = indent; i < tokens.length; i++) {
			var symbol = tokens[i];
			if (symbol == "(") {
				stack.push({root: root, typeCounter: typeCounter});
				root = {service: null, action: null, args: null};
				typeCounter = 0;
			} else if (symbol == ")") {
				if (root.action == null) root = root.service; // This makes parantheses not followed by an action work TODO: This is not elegant!
				var popped = stack.pop();
				typeCounter = popped.typeCounter;
				popped.root[types[typeCounter]] = root;
				root = popped.root;
				typeCounter++;
			} else {
				if (typeCounter >= 3 && typeCounter%2==1) {
					var newRoot = {service: root, action: symbol, args: null};
					root = newRoot;
					typeCounter = 2;
				} else {
					root[types[typeCounter]] = symbol;
					typeCounter++;
				}
			}
		}
		
		if (root.args == null) root.args = []; // This makes hilvl interpret missing arguments as empty arrays instead of a null sentinel value
		
		if (root.action == null) root = root.service; // This makes parantheses not followed by an action work TODO: This is not elegant!

		hl.log("parseLine: ", root, "---", stack);
		
		return root;
	}
	
	var stack = [{args: []}];
	var indent = 0;
	for (var i in tokenLists) {
		var tokens = tokenLists[i];
		var head = stack[stack.length-1];
		var nofTabs = countTabs(tokens);
		
		hl.log("->", tokens, indent, JSON.stringify(stack));
		
		if (nofTabs == indent) {
			head.args.push(parseLine(tokens, indent));
		} else if (nofTabs > indent) {
			indent++;
			stack.push({args: [parseLine(tokens, indent)]});
		} else {
			for (var t = 0; t < indent - nofTabs; t++) {
				var popped = stack.pop();
				var head = stack[stack.length-1];
				head.args[head.args.length-1].args = popped.args;
			}
			indent = nofTabs;
			head.args.push(parseLine(tokens, indent));
		}
	}
	
	stack[0].args.pop(); // Removing EOF
	
	var result = stack[0].args;

	hl.log("info", JSON.stringify(result, null, 4));

	return result;
}

var scopes = [{}];
var scopeIndex = 0;

hl.clearScope = function() {
	scopes = [{}];
	scopeIndex = 0;
}

hl.setScope = function(scopeIdx) {
	scopeIndex = scopeIdx;
}

hl.getScopes = function() {
	return scopes;
}

hl.saveToScope = function(key, value) {
	scopes[scopeIndex][key] = value;
}

hl.changeInScope = function(key, value) {
	var result = hl.searchScope(key, value);
}

hl.pushScope = function(withoutEntering) {
	var newScope = {parent: scopeIndex};
	var newIndex = scopes.length;
	scopes.push(newScope);
	if (withoutEntering == undefined || withoutEntering == false)
		scopeIndex = newIndex;
	else
		return newIndex;
}

hl.popScope = function() {
	scopeIndex = scopes[scopeIndex].parent;
}

hl.searchScope = function(key, newValue) {
	var index = scopeIndex;
	hl.log("searching for", key, "from", index, "(" + newValue + ")");
	while (index != undefined) {
		var scope = scopes[index];
		var result = scope[key];
		hl.log("index, result =", index, result);
		if (result !== undefined) {
			if (newValue !== undefined) scope[key] = newValue;
			return result;
		}
		index = scope.parent;
	}
	throw new Error("Not found in scope: " + JSON.stringify(key));
}

hl.printScopes = function() {
	function naiveClone(obj) {
		if (null == obj || "object" != typeof obj) return obj;
		var copy = obj.constructor();
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = naiveClone(obj[attr]);
		}
		return copy;
	}

	function replaceCode(obj) {
		for (var i in obj) {
			var field = obj[i];
			if (field && field.code) {
				field.code = "(..)";
			}
		}
	}
	hl.log("scopeIndex:", scopeIndex);
	for (var i in scopes) {
		var scope = naiveClone(scopes[i]);
		replaceCode(scope)
		hl.log(i + ": " + JSON.stringify(scope));
	}
}

hl.getServiceType = function(service) {
	if (service == undefined || service == null)
		return null;
	
	if (service instanceof Array)
		return "Array";
	else if (service[0] == "\"" || service.type == "String")
		return "String";
	else if (!isNaN(parseInt(service)))
		return "Number";
	else if (service === true || service === "true" || service === false || service === "false")
		return "Boolean"
	else if (service.type)
		return service.type
	else
		return service
}

hl.doAction = function(service, action, args, returnLast) {
	var serviceType = hl.getServiceType(service);
	
	hl.log("");
	hl.log("--- doAction:", service, action, args, "(returnLast=" + returnLast + ", scopeIndex="+scopeIndex+")");
	hl.log("->" + serviceType);
	hl.printScopes();
	
	if (serviceType == null) return null;
	
	function fail() {
		throw new Error(action + " is not a valid action on " + serviceType + " (" + service + ")");
	}

	// Standard library services
	if (standardLibraries[serviceType] && standardLibraries[serviceType][action]) {
		var library = standardLibraries[serviceType][action];
		 // TODO: DRY!
		var oldScopeIndex = scopeIndex;
		
		scopeIndex = library.scope;
		var code = library.code;
		
		hl.saveToScope("argument", args);
		hl.saveToScope("this", service);
		var result = hl.evaluate(code, true);
		scopeIndex = oldScopeIndex;
		return result;
	}
	
	// Simple system services:
	if (serviceType == "Array") {
		if (action == "loop") {
			for (var i in service) {
				hl.saveToScope("element", service[i]);
				hl.evaluate(args, returnLast);
			}
		} else if (action == "push") {
			var args = hl.evaluate(args, returnLast);
			service.push(args);
			return service;
		} else if (action == ",") {
			var args = hl.evaluate(args, returnLast);
			var newArray = service.slice();
			newArray.push(args)
			return newArray;
		} else if (action == "get") {
			var args = hl.evaluate(args, returnLast);
			var element = service[args];
			if (element == undefined) throw new Error("array index " + args + " does not exist");
			return element;
		} else fail();
	} else if (serviceType == "String") {
		var args = hl.evaluate(args, returnLast);

		var value = service.value || service;
		var value = value.value || value; // TODO: This unwrapping is awkward

		var a = value.substring(1, value.length-1);
		var argsIsString = args[0] == "\""; 
		var b = argsIsString ? args.substring(1, args.length-1) : null;
		
		if (action == "+") {
			if (!argsIsString) throw new Error("args is not string");
			return "\"" + a + b + "\"";
		} else if (action == "==") {
			if (!argsIsString) throw new Error("args is not string");
			return a === b;
		} else if (action == "!=") {
			if (!argsIsString) throw new Error("args is not string");
			return a !== b;
		} else if (action == "at") {
			return {type: "String", atIndex: args, value: service};
		} else if (action == "length") {
			return a.length;
		} else if (action == "substringTo") {
			return "\"" + a.substring(service.atIndex, args) + "\"";
		} else if (action == ".") {
			return service[args];
		} else if (action == ",") {
			var args = hl.evaluate(args, returnLast);
			return [service, args];
		} else fail();
	} else if (serviceType == "Number") {
		var a = parseInt(service);
		
		if (action == "until") {
			var result = undefined;
			while(result != a) {
				var result = hl.evaluate(args, returnLast);
			}
			return null;
		} else if (action == "as") {
			if (args == "string")
				return "\"" + a + "\"";
			else 
				throw new Error("Can not convert " + serviceType + " to " + args);
		}
		
		var args = hl.evaluate(args, returnLast);
		
		var b = parseInt(args);
		
		if (action == "+") {
			return a + b;
		} else if (action == "-") {
			return a - b;
		} else if (action == "==") {
			return a === b;
		} else if (action == "<") {
			return a < b;
		} else if (action == ">") {
			return a > b;
		} else if (action == ",") {
			return [a, b];
		} else fail();
	} else if (serviceType == "Boolean") {
		if (action == "==") {
			var args = hl.evaluate(args, returnLast);
			return (service == "true") === (args == "true");
		} else if (action == "!=") {
			var args = hl.evaluate(args, returnLast);
			return (service == "true") !== (args == "true");
		} else if (action == "then") {
			if (service === true || service === "true") hl.evaluate(args, returnLast);
		} else if (action == ",") {
			var args = hl.evaluate(args, returnLast);
			return [service, args];
		} else fail();


	// Scope related services:
	} else if (serviceType == "@") {
		var args = hl.evaluate(args, returnLast);
		if (action == "new") {
			hl.saveToScope(args, null);
			return {type: "Variable", name: args};
		} else if (action == "set") {
			var currentValue = hl.searchScope(args);
			return {type: "Variable", name: args, currentValue: currentValue};
		} else if (action == ".") {
			return hl.searchScope(args);
		} else { // TODO: DRY!
			var oldScopeIndex = scopeIndex;
			
			var codeHolder = hl.searchScope(action);
			var code = codeHolder.code ? codeHolder.code : codeHolder;
			scopeIndex = codeHolder.scope ? codeHolder.scope : scopeIndex;
			
			hl.saveToScope("argument", args);
			var result = hl.evaluate(code, true);
			scopeIndex = oldScopeIndex;
			return result;
		}
	} else if (serviceType == "Variable") {
		if (action == "=") {
			var args = hl.evaluate(args, false);
			hl.changeInScope(service.name, args);
			return args;
		} else if (action == ":") { // TODO: Should have an action like this for assigning without evaluating argument, but without making a new scope for the future evaluation. It could be named =>. This way, @ new foo => ($.argument) will not make a new scope when evaluating $.argument (which can be a code block, so we can't use =)
			var newScopeIndex = hl.pushScope(true);
			hl.changeInScope(service.name, {code: args, scope: newScopeIndex});
		} else if (action == "@") {
			var nextScopeIndex = scopes.length+1;
			var args = hl.evaluate(args, false, true);
			hl.changeInScope(service.name, {type: "ScopeReference", scope: nextScopeIndex});
		} else if (action == ".") {
			return service[args];
		} else fail();
	} else if (serviceType == "ScopeReference") { // TODO: DRY!
		var oldScopeIndex = scopeIndex;
		
		scopeIndex = service.scope;
		var code = hl.searchScope(action)["code"];
		
		hl.saveToScope("argument", args);
		var result = hl.evaluate(code, true);
		scopeIndex = oldScopeIndex;
		return result;

	// System service (for system libraries)
	} else if (serviceType == "System") {
		if (action == "extend") {
			return {type: "System", serviceName: args};
		} else if (action == "with") {
			return {type: "System", serviceName: service.serviceName, extensionName: args};
		} else if (action == "as") {
			var serviceName = service.serviceName;
			var extensionName = service.extensionName;

			var newScopeIndex = hl.pushScope(true);
			standardLibraries[serviceName] = standardLibraries[serviceName] || {};
			standardLibraries[serviceName][extensionName] = {code: args, scope: newScopeIndex};
		} else fail();

	// IO service
	} else if (serviceType == "IO") {
		if (action == "print") {
			if (args[0] && args[0] == "\"")
				args = args.substring(1, args.length-1);
			if (typeof args == "object")
				args = JSON.stringify(args)
			console.log(args);
		} else if (action == "readFile") {
			args = args.substring(1, args.length-1);
			var filePath = process.cwd() + "\\" + args;
			return fs.readFileSync(filePath, "utf8");
		} else fail();
	
	// Custom service
	} else { // TODO: DRY!
		var oldScopeIndex = scopeIndex;
		
		scopeIndex = hl.searchScope(service)["scope"];
		var code = hl.searchScope(action)["code"];
		
		hl.saveToScope("argument", args);
		var result = hl.evaluate(code, true);
		scopeIndex = oldScopeIndex;
		return result;
	}
	
	return null;
}

hl.evaluate = function(trees, returnLast, makeNewScope) {
	makeNewScope = makeNewScope || false;
	if (returnLast == undefined) returnLast = true;
	
	if (!(trees instanceof Array)) {
		trees = [trees];
	}
	
	var result = [];
	
	if (makeNewScope) hl.pushScope();
	
	for (var i in trees) {
		var tree = trees[i];
		
		hl.log("");
		hl.log("--- evalTree:", tree, "scopeIndex=" + scopeIndex);
		//hl.printScopes();
		
		if (tree != null && tree.service) {
			var evaluatedService = hl.evaluate(tree.service, returnLast);
			var args = tree.args;
			if (!(tree.args instanceof Array)) {
				var args = hl.evaluate(tree.args, returnLast); // If argument is array, it should be possible for the action implementation to choose to evaluate or not. If the argument is not array, we must evaluate it NOW before the scope is changed. Or else @.argument and other values that only exist in THIS scope can not be used as args in function calls.
			}
			result.push(hl.doAction(evaluatedService, tree.action, args, returnLast));
		} else {
			result.push(tree);
		}
		
		hl.log("info", "result " + i + ":", result);
	}
	
	if (makeNewScope) hl.popScope();
	
	if (returnLast)
		return result[result.length-1];
	else if (result.length == 1)
		return result[0];
	else
		return result;
}

var standardLibraries = {};

hl.execute = function(script) {
	script = script.trim();
	var tokens = hl.tokenize(script);
	var trees = hl.parse(tokens);
	var result = hl.evaluate(trees);
	return result;
}

hl.loadStandardLibraries = function() {
	var libraries = ["stdlib/Variable.hl", "stdlib/String.hl"];
	for (var i in libraries) {
		var fileName = libraries[i];
		var fileContents = fs.readFileSync(fileName, "utf8");
		var result = hl.execute(fileContents);
	}
}

if (!global.isBrowser) hl.loadStandardLibraries();

if (require.main === module && process.argv[2]) {
	var fileName = process.argv[2];
	var fileContents = fs.readFileSync(fileName, "utf8");
	var result = hl.execute(fileContents);
	
	process.stdout.write(JSON.stringify(result));
}

module.exports = hl;
