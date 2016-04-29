'use strict';

var hl = require("./hl")
var http = require('http');
var fs = require("fs");
var url  = require('url');
var util  = require('./util');

var server;

var HiTTP = {};

HiTTP.buildScope = function(scopes) {
	var scopesBuilt = {};
	var rootScope = scopes[0];
	for (var key in rootScope) {
		var field = rootScope[key]
		if (field.scope) {
			scopesBuilt[key] = {};
		}
	}
	return scopesBuilt;
}

HiTTP.startServer = function(fileName) {
	if (!fileName) throw Error("No args given: webapp filename");
	
	var fileContents = fs.readFileSync(fileName, "utf8");
	hl.loadStandardLibraries();
	var result = hl.execute(fileContents);
	
	server = http.createServer(function (request, response) {
		try {
			if (request.method === "OPTIONS") {
				var scope = hl.scope.getRootScopeNames();
				var responseHeaders = {scope: JSON.stringify(scope)};
				response.writeHead(200, responseHeaders);
				response.end();
			}

			var filePath = url.parse(request.url.substring(1)).pathname;
			var query = url.parse(request.url, true).query;
			
			console.log(request.url, JSON.stringify(url.parse(request.url, true)));
						
			if (filePath == null) {
				response.writeHead(404);
				response.end();
				return;
			}
			
			filePath = filePath.split("/");
			console.log("FILEPATH", filePath);
			
			var scopeIndex = 0;
			hl.scope.index = scopeIndex; // Important to reset to root scope between all requests
			
			for (var i in filePath) {
				var serviceName = filePath[i];
				
				var scopeIndex = hl.scope.search(serviceName);
				
				if (scopeIndex.scope) scopeIndex = scopeIndex.scope;
				
				console.log("--", serviceName, scopeIndex);
				
				if (scopeIndex == undefined) {
					break;
				}
				
				hl.scope.index = scopeIndex;
			}
			
			if (scopeIndex == undefined) {
				result = "Could not find " + serviceName + " in scope";
				var returnCode = 404;
			} else {
				var script = "@ var queryMap = (Map of) with\n\t\n";
				for (var key in query) {
					script += "@.queryMap put (\"" + key + "\" , \"" + query[key] + "\")\n";
				}
				script += serviceName + " handleRequest (@.queryMap)";
				var result = hl.execute(script);
				var returnCode = 200;
			}
		} catch (e) {
			console.log("ERROR: " + e.message);
			var result = JSON.stringify(e.message);
			var returnCode = 503;
		}

		result = util.removeQuotes(result);
		
		if (typeof result != "string") result = JSON.stringify(result);
		
		response.writeHead(returnCode, {"Content-Type": "text/html"});
		response.end(result);
	});

	server.listen(8080);
	console.log("\n" + "Server running at http://127.0.0.1:8080/");
}

HiTTP.stopServer = function() {
	server.close();
	hl.scope.clear();
}

if (process.argv[2]) {
	HiTTP.startServer(process.argv[2])
}

module.exports = HiTTP;