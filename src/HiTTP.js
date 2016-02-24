'use strict';

var hl = require("./hl")
var http = require('http');
var fs = require("fs");
var url  = require('url');

var server;

var HiTTP = {};
HiTTP.startServer = function(fileName) {
	if (!fileName) throw Error("No args given: webapp filename");
	
	var fileContents = fs.readFileSync(fileName, "utf8");
	var result = hl.execute(fileContents);
	
	server = http.createServer(function (request, response) {
		try {
			var filePath = url.parse(request.url.substring(1)).pathname;
			var query = url.parse(request.url).query;
			console.log(request.url, JSON.stringify(url.parse(request.url)));
			var query = query || "";
			
			if (filePath == null) {
				response.writeHead(404);
				response.end();
				return;
			}
			
			filePath = filePath.split("/");
			console.log("FILEPATH", filePath);
			
			var scopeIndex;
			
			for (var i in filePath) {
				var serviceName = filePath[i];
				
				var scopeIndex = hl.searchScope(serviceName);
				
				if (scopeIndex.scope) scopeIndex = scopeIndex.scope;
				
				console.log("--", serviceName, scopeIndex);
				
				if (scopeIndex == undefined) {
					break;
				}
				
				hl.setScope(scopeIndex);
			}
			
			if (scopeIndex == undefined) {
				result = "Could not find " + serviceName + " in scope";
				var returnCode = 404;
			} else {
				var result = hl.evaluate({service:serviceName, action:"handleRequest", args: "\""+query+"\""}, true, false);
				var returnCode = 200;
			}
		} catch (e) {
			console.log(e.message);
			var result = JSON.stringify(e);
			var returnCode = 503;
		}
		
		if (typeof result != "string") result = JSON.stringify(result);
		
		response.writeHead(returnCode, {"Content-Type": "text/plain"});
		response.end(result);
	});

	server.listen(8080);
	console.log("\n" + "Server running at http://127.0.0.1:8080/");
}

HiTTP.stopServer = function() {
	server.close();
}

if (process.argv[2]) {
	HiTTP.startServer(process.argv[2])
}

module.exports = HiTTP;