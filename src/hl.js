'use strict';

var fs = require("fs");
var util = global.util || require("./util");

var hl = {};

var connectedServices = {};
var actionStack = [];

hl.logLevel = "warning";
//hl.logLevel = "debug";

hl.log = function(level) {
	var levels = ["error", "warning", "info", "debug"];

	var args = util.toArray(arguments);

	if (levels.indexOf(level) < 0) {
		level = "debug";
	} else {
		args.shift();
	}

	if (levels.indexOf(level) > levels.indexOf(hl.logLevel))
		return;

	var levelLetter = level[0].toUpperCase();
	args.unshift(levelLetter);

	console.log.apply(console, args)
}

hl.tokenize = function(script) {

	function removeBlockComments(string) {
		return script.replace(/\/\*(\*(?!\/)|[^*])*\*\//g, " ");
	}

	function lineIsNotEmptyOrJustLineComment(line) {
		return !/^[\s\t]*(\/\/.*)?$/.test(line);
	}

	function generateTabTokensFromLeadingWhitespace(line) {
		var match = line.match(/^[\s\t]+/g);
		if (match) {
			var whitespace = match[0];
			whitespace = whitespace.replace(/\t/g, "    ");
			var numberOfTabs = whitespace.length / 4;
			if (numberOfTabs !== parseInt(numberOfTabs, 10)) throw new Error("Leading spaces not multiple of 4 in\n" + line);
			return "TAB ".repeat(numberOfTabs).trim().split(" ");
		} else {
			return [];
		}
	}

	function tokenizeLine(line) {
		var i = 0, 
			token = "", 
			tokens = generateTabTokensFromLeadingWhitespace(line);

		var pushChar = () => token += line[i++];
		var ignoreChar = () => i++;

		function pushCharUntil(endRegex, escapeChar) {
			var isInEscape = false;

			while (i < line.length) {
				var character = line[i];
				
				if (character.match(endRegex) && !isInEscape) 
					break;
				else if (character == escapeChar)
					ignoreChar();
				else 
					pushChar();
				
				isInEscape = character == escapeChar;
			}
		}

		function consumeToken() {
			if (token.length > 0) {
				if (!isNaN(parseFloat(token, 10))) token = parseFloat(token, 10);
				tokens.push(token);
				token = "";
			}
		}

		while (i < line.length) {
			var character = line[i];

			if (character.match(/[\s\t]/)) {
				consumeToken()
				ignoreChar()
			} else if (character.match(/[()]/)) {
				consumeToken();
				pushChar();
				consumeToken();
			} else if (character.match(/[.,]/)) {
				consumeToken();
				pushCharUntil(/[^.,]/);
				consumeToken();
			} else if (character == "\"") {
				pushChar();
				pushCharUntil(/"/, "\\");
				pushChar();
				consumeToken();
			} else if (line.substring(i).match(/^\/\//)) {
				consumeToken();
				break;
			} else {
				pushChar();
			}
		}
		
		consumeToken();

		return tokens;
	}

	var tokenLists = removeBlockComments(script)
		.split(/\r?\n|\r/)
		.filter(lineIsNotEmptyOrJustLineComment)
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
		
		if (root.args == null) root.args = []; // This makes hilvl interpret missing arguments as empty lists instead of a null sentinel value
		
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

hl.scope = (function() {
	var scopes = [{}];

	return {
		index: 0,

		generateNewIndex: () => scopes.length + 1,

		clear: function() {
			scopes = [{}];
			this.index = 0;
		},

		getRootScopeNames: function() {
			var rootScope = scopes[0], copy = {};
			for (var key in rootScope) copy[key] = rootScope[key];
			return copy;
		},

		saveToCurrent: function(key, value) {
			scopes[this.index][key] = value;
		},

		changeInCurrent: (key, value) => hl.scope.search(key, value),

		pushScope: function(withoutEntering) {
			var newScope = {parent: this.index};
			var newIndex = scopes.length;
			scopes.push(newScope);
			if (withoutEntering == undefined || withoutEntering == false)
				this.index = newIndex;
			else
				return newIndex;
		},

		popScope: function() {
			this.index = scopes[this.index].parent;
		},

		search: function(key, newValue) {
			var index = this.index;
			hl.log("searching for", key, "from", index, "(" + newValue + ")");
			while (index != undefined) {
				var scope = scopes[index];
				var result = scope[key];
				hl.log("\tindex, result =", index, result);
				if (result !== undefined) {
					if (newValue !== undefined) scope[key] = newValue;
					return result;
				}
				index = scope.parent;
			}
			throw new Error("Not found in scope: " + JSON.stringify(key));
		},

		print: function() {
			function naiveClone(obj) { // TODO: Move to util.js
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
			hl.log("Print scopes (scopeIndex:" + this.index + ")");
			for (var i in scopes) {
				var scope = naiveClone(scopes[i]);
				replaceCode(scope)
				hl.log("\t" + i + ": " + JSON.stringify(scope));
			}
		}
	}
})();

hl.getServiceType = function(service) {
	if (service == undefined || service == null)
		return null;
	
	if (service instanceof Array)
		return "Array";
	else if (service[0] == "\"" || service.type == "String")
		return "String";
	else if (!isNaN(parseFloat(service)))
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
	hl.log("--- doAction:", service, action, args, "(serviceType=" + serviceType + ", returnLast=" + returnLast + ", scopeIndex="+hl.scope.index+")");
	hl.scope.print();

	actionStack.push(serviceType + " " + action);
	
	var returnValue;

	function fail() {
		throw new Error(action + " is not a valid action on " + serviceType + " (" + service + ")");
	}

	if (serviceType == null) {
		returnValue = null;
	
	// Connected external services
	} else if (connectedServices[service]) {
		var host = connectedServices[service].host;
		var args = hl.evaluate(args, returnLast);
		var path = host + "/" + service + "/" + action + "?value=" + args;

		var xhttp = new XMLHttpRequest();
		xhttp.open("GET", path, false);
		xhttp.send();
		var result = xhttp.responseText;
		if (result[0] == "[" || result[0] == "{") result = JSON.parse(result); // TODO: Awkward!! This is necessary to handle both string and list returns
		returnValue = result;
	}

	// Standard library services
	else if (standardLibraries[serviceType] && standardLibraries[serviceType][action]) {
		var library = standardLibraries[serviceType][action];
		 // TODO: DRY!
		var oldScopeIndex = hl.scope.index;
		
		hl.scope.index = library.scope;
		var code = library.code;
		
		hl.scope.saveToCurrent("argument", args);
		hl.scope.saveToCurrent("this", service);
		var result = hl.evaluate(code, true);
		hl.scope.index = oldScopeIndex;
		returnValue = result;
	}
	
	// Simple system services:
	else if (serviceType == "Array") {
		if (action == "loop") {
			for (var i in service) {
				hl.scope.saveToCurrent("element", service[i]);
				hl.evaluate(args, returnLast);
			}
		} else if (action == "push") {
			var args = hl.evaluate(args, returnLast);
			service.push(args);
			returnValue = service;
		} else if (action == ",") {
			var args = hl.evaluate(args, returnLast);
			var newArray = service.slice();
			newArray.push(args)
			returnValue = newArray;
		} else if (action == "get") {
			var args = hl.evaluate(args, returnLast);
			var element = service[args];
			if (element == undefined) throw new Error("List index " + args + " does not exist");
			returnValue = element;
		} else fail();
	} else if (serviceType == "String") {
		var args = hl.evaluate(args, returnLast);

		var value = service.value || service;
		var value = value.value || value; // TODO: This unwrapping is awkward

		var a = util.removeQuotes(value);

		var argsIsString = args[0] == "\"";

		var b = util.removeQuotes(args);
		
		if (action == "+") {
			if (!argsIsString) throw new Error("args is not string");
			returnValue = "\"" + a + b + "\"";
		} else if (action == "==") {
			if (!argsIsString) throw new Error("args is not string");
			returnValue = a === b;
		} else if (action == "!=") {
			if (!argsIsString) throw new Error("args is not string");
			returnValue = a !== b;
		} else if (action == "at") {
			returnValue = {type: "String", atIndex: args, value: service};
		} else if (action == "length") {
			returnValue = a.length;
		} else if (action == "substringTo") {
			returnValue = "\"" + a.substring(service.atIndex, args) + "\"";
		} else if (action == ".") {
			returnValue = service[args];
		} else if (action == ",") {
			var args = hl.evaluate(args, returnLast);
			returnValue = [service, args];
		} else fail();
	} else if (serviceType == "Number") {
		var a = parseFloat(service);
		
		if (action == "until") {
			var result = undefined;
			while(result != a) {
				var result = hl.evaluate(args, returnLast);
			}
			returnValue = null;
		} else if (action == "as") {
			if (args == "string")
				returnValue = "\"" + a + "\"";
			else 
				throw new Error("Can not convert " + serviceType + " to " + args);
		} else {
			var args = hl.evaluate(args, returnLast);
			var b = parseFloat(args);
			
			if (action == "+") {
				returnValue = a + b;
			} else if (action == "-") {
				returnValue = a - b;
			} else if (action == "==") {
				returnValue = a === b;
			} else if (action == "<") {
				returnValue = a < b;
			} else if (action == ">") {
				returnValue = a > b;
			} else if (action == ",") {
				returnValue = [a, b];
			} else fail();
		}
	} else if (serviceType == "Boolean") {
		if (action == "==") {
			var args = hl.evaluate(args, returnLast);
			returnValue = (service == "true") === (args == "true");
		} else if (action == "!=") {
			var args = hl.evaluate(args, returnLast);
			returnValue = (service == "true") !== (args == "true");
		} else if (action == "then") {
			if (service === true || service === "true") hl.evaluate(args, returnLast);
		} else if (action == ",") {
			var args = hl.evaluate(args, returnLast);
			returnValue = [service, args];
		} else fail();


	// Scope related services:
	} else if (serviceType == "@") {
		var args = hl.evaluate(args, returnLast);
		if (action == "var") {
			hl.scope.saveToCurrent(args, null);
			returnValue = {type: "Variable", name: args};
		} else if (action == "set") {
			var currentValue = hl.scope.search(args);
			returnValue = {type: "Variable", name: args, currentValue: currentValue};
		} else if (action == ".") {
			returnValue = hl.scope.search(args);
		} else if (action == "connect") {
			var args = hl.evaluate(args, returnLast);
			args = util.removeQuotes(args);
			var xhttp = new XMLHttpRequest();
			xhttp.open("OPTIONS", "/", false);
			xhttp.send();
			var scope = JSON.parse(xhttp.getResponseHeader("scope"));
			console.log("Backend scope: " + JSON.stringify(scope));
			for (var name in scope) {
				connectedServices[name] = {host: args, actions: scope[name]};
			}
		} else { // TODO: DRY!
			var oldScopeIndex = hl.scope.index;
			
			var codeHolder = hl.scope.search(action);
			var code = codeHolder.code ? codeHolder.code : codeHolder;
			hl.scope.index = codeHolder.scope ? codeHolder.scope : hl.scope.index;
			
			hl.scope.saveToCurrent("argument", args);
			var result = hl.evaluate(code, true);
			hl.scope.index = oldScopeIndex;
			returnValue = result;
		}
	} else if (serviceType == "Variable") {
		if (action == "=") {
			var args = hl.evaluate(args, false);
			hl.scope.changeInCurrent(service.name, args);
			returnValue = args;
		} else if (action == ":") { // TODO: Should have an action like this for assigning without evaluating argument, but without making a new scope for the future evaluation. It could be named =>. This way, @ new foo => ($.argument) will not make a new scope when evaluating $.argument (which can be a code block, so we can't use =)
			var newScopeIndex = hl.scope.pushScope(true);
			hl.scope.changeInCurrent(service.name, {code: args, scope: newScopeIndex});
		} else if (action == ":=") {
			var nextScopeIndex = hl.scope.generateNewIndex();
			var args = hl.evaluate(args, false, true);
			hl.scope.changeInCurrent(service.name, {type: "ScopeReference", scope: nextScopeIndex});
		} else if (action == ".") {
			returnValue = service[args];
		} else fail();
	} else if (serviceType == "ScopeReference") { // TODO: DRY!
		var oldScopeIndex = hl.scope.index;
		
		hl.scope.index = service.scope;
		var code = hl.scope.search(action)["code"];
		
		hl.scope.saveToCurrent("argument", args);
		var result = hl.evaluate(code, true);
		hl.scope.index = oldScopeIndex;
		returnValue = result;

	// System service (for system libraries)
	} else if (serviceType == "System") {
		if (action == "extend") {
			returnValue = {type: "System", serviceName: args};
		} else if (action == "with") {
			returnValue = {type: "System", serviceName: service.serviceName, extensionName: args};
		} else if (action == "as") {
			var serviceName = service.serviceName;
			var extensionName = service.extensionName;

			var newScopeIndex = hl.scope.pushScope(true);
			standardLibraries[serviceName] = standardLibraries[serviceName] || {};
			standardLibraries[serviceName][extensionName] = {code: args, scope: newScopeIndex};
		} else fail();

	// IO service
	} else if (serviceType == "IO") {
		if (action == "print") {
			if (args[0] && args[0] == "\"")
				args = util.removeQuotes(args);
			if (typeof args == "object")
				args = JSON.stringify(args)
			console.log(args);
		} else if (action == "readFile") {
			args = util.removeQuotes(args);
			var filePath = process.cwd() + "\\" + args;
			returnValue = "\"" + fs.readFileSync(filePath, "utf8") + "\"";
		} else fail();
	
	// Custom service
	} else { // TODO: DRY!
		var oldScopeIndex = hl.scope.index;
		
		hl.scope.index = hl.scope.search(service)["scope"];
		var code = hl.scope.search(action)["code"];
		
		//hl.scope.saveToCurrent("this", {type:"ScopeReference", scope: hl.scope.index}); // TODO: Standard libararies allrady use the word "this" for something else. Maybe it should be called "currentScope" here, and "extendedService" in standard libraries?
		hl.scope.saveToCurrent("argument", args);
		var result = hl.evaluate(code, true);
		hl.scope.index = oldScopeIndex;
		returnValue = result;
	}

	actionStack.pop();
	
	return returnValue;
}

hl.evaluate = function(trees, returnLast, makeNewScope) {
	makeNewScope = makeNewScope || false;
	if (returnLast == undefined) returnLast = true;
	
	if (!(trees instanceof Array)) {
		trees = [trees];
	}
	
	var result = [];
	
	if (makeNewScope) hl.scope.pushScope();
	
	for (var i in trees) {
		var tree = trees[i];
		
		hl.log("");
		hl.log("-"+i+"- evalTree:", tree, "scopeIndex=" + hl.scope.index);
		
		if (tree != null && tree.service != undefined) {
			var evaluatedService = hl.evaluate(tree.service, returnLast);
			var args = tree.args;
			if (!(tree.args instanceof Array)) {
				var args = hl.evaluate(tree.args, returnLast); // If argument is a list, it should be possible for the action implementation to choose to evaluate or not. If the argument is not array, we must evaluate it NOW before the scope is changed. Or else @.argument and other values that only exist in THIS scope can not be used as args in function calls.
			}
			result.push(hl.doAction(evaluatedService, tree.action, args, returnLast));
		} else {
			result.push(tree);
		}
		
		hl.log("info", "-"+i+"- eval result:", result);
	}
	
	if (makeNewScope) hl.scope.popScope();
	
	if (returnLast)
		return result[result.length-1];
	else if (result.length == 1)
		return result[0];
	else
		return result;
}

var standardLibraries = {};

hl.execute = function(script) {
	try {
		script = script.trim();
		var tokens = hl.tokenize(script);
		var trees = hl.parse(tokens);
		var result = hl.evaluate(trees);
		return result;
	} catch (error) {
		hl.log("error", "#################");
		hl.log("error", "Action stacktrace:");
		for (var action of actionStack) hl.log("error", "\t" + action);
		throw error;
	}
}

hl.loadStandardLibraries = function() {
	var libraries = ["stdlib/Variable.hl", "stdlib/String.hl", "stdlib/Map.hl"];
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
