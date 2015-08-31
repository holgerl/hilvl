'use strict';

var fs = require("fs");

var hl = {};

hl.tokenize = function(script) {
	function escapeSpacesInStrings(string) {
		return string.replace(/"[^"]*"/g, function(match) {
			return match.replace(/ /g, "%%s%%");
		});
	}
	
	function unescapeSpacesInStrings(string) {
		return string.replace(/%%s%%/g, " ");
	}

	script = script.replace(/\/\/.*/g, ""); // Line comment
	script = script.replace(/\/\*[^*]*\*\//g, " "); // Block comment
	script = script.replace(/(\t*)(.+,.+)+/g, function(match, group1, group2){
		return group1 + group2.split(",").join("\n" + group1);
	});
	var lines = script.split(/(\n)+/);
	var tokenLists = [];
	var inComment = false;
	for (var i in lines) {
		var line = lines[i];
		
		line = escapeSpacesInStrings(line);
		if (/^\s*$/.test(line)) continue;
		
		line = line.replace(/\t/g, " tab ");
		line = line.replace(/[\.:()]/g, " $& ");
		var tokens = line.trim().split(/\s+/);
		
		var tokenList = [];
		for (var i in tokens) {
			tokenList.push(unescapeSpacesInStrings(tokens[i]));
		}
		
		tokenLists.push(tokenList);
	}
	tokenLists.push(["EOF"]);
	//consoleconsole.log(tokenLists);
	return tokenLists;
}

hl.parse = function(tokenLists) {
	function countTabs(tokens) {
		var numberOfTabs = 0;
		for (var j in tokens) {
			if (tokens[j] == "tab") 
				numberOfTabs++;
			else 
				break;
		}
		return numberOfTabs;
	}
	
	function evalLine(tokens, indent) {
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
		
		//console.log("evalLine: ", root, "---", stack);
		
		return root;
	}
	
	var stack = [{args: []}];
	var indent = 0;
	for (var i in tokenLists) {
		var tokens = tokenLists[i];
		var head = stack[stack.length-1];
		var nofTabs = countTabs(tokens);
		
		//console.log("->", tokens, indent, JSON.stringify(stack));
		
		if (nofTabs == indent) {
			head.args.push(evalLine(tokens, indent));
		} else if (nofTabs > indent) {
			indent++;
			stack.push({args: [evalLine(tokens, indent)]});
		} else {
			for (var t = 0; t < indent - nofTabs; t++) {
				var popped = stack.pop();
				var head = stack[stack.length-1];
				head.args[head.args.length-1].args = popped.args;
			}
			indent = nofTabs;
			head.args.push(evalLine(tokens, indent));
		}
	}
	
	stack[0].args.pop(); // Removing EOF
	
	return stack[0].args;
}

hl.setDebug = function(shouldLogDebug) {
	global.oldConsoleLog = global.oldConsoleLog || console.log;
	if (shouldLogDebug) {
		console.log = global.oldConsoleLog
	} else {
		console.log = function() {};
	}
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
	console.log("searching for", key, "from", index, "(" + newValue + ")");
	while (index != undefined) {
		var scope = scopes[index];
		var result = scope[key];
		console.log("index, result =", index, result);
		if (result !== undefined) {
			if (newValue !== undefined) scope[key] = newValue;
			return result;
		}
		index = scope.parent;
	}
	throw new Error("Not found in scope: " + key);
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
	console.log("scopeIndex:", scopeIndex);
	for (var i in scopes) {
		var scope = naiveClone(scopes[i]);
		replaceCode(scope)
		console.log(i + ": " + JSON.stringify(scope));
	}
}

hl.getServiceType = function(service) {
	if (service == undefined || service == null)
		return null;
	
	if (service instanceof Array)
		return "Array";
	else if (service[0] == "\"")
		return "String";
	else if (!isNaN(parseInt(service)))
		return "Number";
	else if (service === true || service === "true" || service === false || service === "false")
		return "Boolean"
	else if (service == "#")
		return "Scope";
	else if (service.type == "ScopeReference")
		return "ScopeReference";
	else  if (service.type == "Variable")
		return "Variable";
	else
		return "Service";
}

hl.evaluate = function(trees, returnLast, makeNewScope) {
	
	function doAction(service, action, args) {
		var serviceType = hl.getServiceType(service);
		
		console.log("");
		console.log("--- doAction:", service, action, args, "(returnLast=" + returnLast + ", scopeIndex="+scopeIndex+")");
		console.log("->" + serviceType);
		hl.printScopes();
		
		if (serviceType == null) return null;
		
		function fail() {
			throw new Error(action + " is not a valid action on " + serviceType);
		}
		
		if (serviceType == "Array") {
			if (action == "loop") {
				for (var i in service) {
					hl.saveToScope("element", service[i]);
					var args = hl.evaluate(tree.args, returnLast);
				}
			} else fail();
		} else if (serviceType == "String") {
			var args = hl.evaluate(tree.args, returnLast);
			var a = service.substring(1, service.length-1);
			var b = args.substring(1, args.length-1);
			if (action == "+") {
				return "\"" + a + b + "\"";
			} else if (action == "==") {
				return a === b;
			} else if (action == "!=") {
				return a !== b;
			} else fail();
		} else if (serviceType == "Number") {
			var a = parseInt(service);
			
			if (action == "until") {
				var result = undefined;
				while(result != a) {
					var result = hl.evaluate(tree.args, returnLast);
				}
				return null;
			} else if (action == "as") {
				if (args == "string")
					return "\"" + a + "\"";
				else 
					throw new Error("Can not convert " + serviceType + " to " + args);
			}
			
			var args = hl.evaluate(tree.args, returnLast);
			
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
			} else fail();
		} else if (serviceType == "Boolean") {
			if (action == "==") {
				var args = hl.evaluate(tree.args, returnLast);
				return (service == "true") === (args == "true");
			} else if (action == "!=") {
				var args = hl.evaluate(tree.args, returnLast);
				return (service == "true") !== (args == "true");
			} else if (action == "then") {
				if (service === true || service === "true") hl.evaluate(args, returnLast);
			} else fail();
		} else if (serviceType == "Scope") {
			var args = hl.evaluate(tree.args, returnLast);
			if (action == "new") {
				hl.saveToScope(args, null);
				return {type: "Variable", name: args};
			} else if (action == "set") {
				return {type: "Variable", name: args};
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
				var args = hl.evaluate(tree.args, false);
				hl.changeInScope(service.name, args);
				return args;
			} else if (action == ":") {
				var newScopeIndex = hl.pushScope(true);
				hl.changeInScope(service.name, {code: tree.args, scope: newScopeIndex});
			} else if (action == "#") {
				var nextScopeIndex = scopes.length+1;
				var args = hl.evaluate(tree.args, false, true);
				hl.changeInScope(service.name, {type: "ScopeReference", scope: nextScopeIndex});
			} else fail();
		} else if (serviceType == "Service") { // TODO: DRY!
			var oldScopeIndex = scopeIndex;
			
			scopeIndex = hl.searchScope(service)["scope"];
			var code = hl.searchScope(action)["code"];
			
			hl.saveToScope("argument", args);
			var result = hl.evaluate(code, true);
			scopeIndex = oldScopeIndex;
			return result;
		} else if (serviceType == "ScopeReference") { // TODO: DRY!
			var oldScopeIndex = scopeIndex;
			
			scopeIndex = service.scope;
			var code = hl.searchScope(action)["code"];
			
			hl.saveToScope("argument", args);
			var result = hl.evaluate(code, true);
			scopeIndex = oldScopeIndex;
			return result;
		}
		
		return null;
	}
	
	makeNewScope = makeNewScope || false;
	if (returnLast == undefined) returnLast = true;
	
	if (!(trees instanceof Array)) {
		trees = [trees];
	}
	
	var result = [];
	
	if (makeNewScope) hl.pushScope();
	
	for (var i in trees) {
		var tree = trees[i];
		
		console.log("");
		console.log("--- evalTree:", tree, "scopeIndex=" + scopeIndex);
		//hl.printScopes();
		
		if (tree != null && tree.service) {
			var evaluatedService = hl.evaluate(tree.service, returnLast);
			var args = tree.args;
			if (!(tree.args instanceof Array)) var args = hl.evaluate(tree.args, returnLast); // If argument is array, it should be possible for the action implementation to choose to evaluate or not. If the argument is not array, we must evaluate it NOW before the scope is changed. Or else #.argument and other values that only exist in THIS scope can not be used as args in function calls.
			result.push(doAction(evaluatedService, tree.action, args));
		} else {
			result.push(tree);
		}
		
		console.log("result " + i + ":", result);
	}
	
	if (makeNewScope) hl.popScope();
	
	if (returnLast)
		return result[result.length-1];
	else if (result.length == 1)
		return result[0];
	else
		return result;
}

hl.execute = function(script) {
	var tokens = hl.tokenize(script);
	var trees = hl.parse(tokens);
	var result = hl.evaluate(trees);
	return result;
}

if (process.argv[2]) {
	var fileName = process.argv[2];
	var fileContents = fs.readFileSync(fileName, "utf8");
	hl.setDebug(false);
	var result = hl.execute(fileContents);
	
	process.stdout.write(JSON.stringify(result));
}

module.exports = hl;
