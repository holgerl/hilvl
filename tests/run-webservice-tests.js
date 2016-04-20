'use strict';

var fs = require("fs");
var http = require("http");
var hl = require("../src/hl");
var HiTTP = require("../src/HiTTP");
var urlLib = require('url');
var utils = require("./utils.js");

var totalFilesTested = 0;

function testResponseAsync(url, expectedResponse, dispatcher) {
	console.log("testResponse", url, expectedResponse);
	var parsedUrl = urlLib.parse(url);

	var options = {
		host: parsedUrl.host.split(":")[0],
		port: parsedUrl.port,
		path: parsedUrl.path,
		method: "GET"
	};
	
	var request = http.request(options);

	var checkReturnValue = function(returnValue) {
		if (expectedResponse[0] == "/") {
			var regex = expectedResponse.substring(1, expectedResponse.length-1);
			var passed = returnValue.match(regex);
		} else {
			var passed = utils.equal(expectedResponse, returnValue);
		}
			
		if (!passed)
			throw new Error(url + " DID NOT RETURN CORRECT VALUE. \nExpected: " + expectedResponse + "\n  Actual: " + returnValue);
		else {
			global.numberOfPassedTests++;
			console.log(global.numberOfPassedTests + " of " + global.totalNumberOfTests + " tests completed");
			if (global.numberOfPassedTests == global.totalNumberOfTests) {
				console.log("No errors");
				HiTTP.stopServer();
				dispatcher.signalFinished();
			}
		}
	}
	
	request.on('response', function (response) {
		var result = "";
	
		response.setEncoding('utf8');
		response.on('data', function (chunk) {
			result += chunk;
		});
		response.on('end', function () {
			checkReturnValue(result);
		});
		response.on('close', function () {
		});
	});

	request.on("error", function(err) {
		console.log("ERROR", err);
	});
	
	request.end();
}

function testFileAsync(fileName, dispatcher) {
    try {
        var fileContents = fs.readFileSync(fileName, "utf8");
         
        var responseTuples = getResponseTuples(fileContents);
		
		global.totalNumberOfTests = responseTuples.length;
		global.numberOfPassedTests = 0;
		
		console.log("Performing", global.totalNumberOfTests, "webapp tests asynchronously");
		
		HiTTP.startServer(fileName);
		
		for (var i in responseTuples) {
			var url = responseTuples[i].url;
			var response = responseTuples[i].response;
			testResponseAsync(url, response, dispatcher);
		}
    } catch (err) {
        console.log("\t\t" + " ___TEST ERROR___ " + fileName + " " + err);
        throw err;
    }
}
 
function getResponseTuples(fileContents) {
	var type = "responses";
    var regex1 = new RegExp("\\/\\*"+type+"((\\*(?!\\/)|[^*])*)\\*\\/", "g");
    var match = regex1.exec(fileContents);
    
	if (!match || !match[1]) return null;

	var lines = match[1].split("\r\n"); // TODO: Make platform independent var line split
	
	var responseTuples = [];
	var tuple = {};
	
	for (var i in lines) {
		var line = lines[i];
		if (line.trim().length == 0) continue;
		if (tuple.url == undefined) tuple.url = line;
		else {
			tuple.response = line;
			responseTuples.push(tuple);
			tuple = {};
		}
	}
	
	return responseTuples;
}

function sequence() {
	var asyncFunctions = util.toArray(arguments);
	var i = 0;
	var dispatcher = {
		signalFinished: () => {
			i++;
			if  (i < asyncFunctions.length) asyncFunctions[i](dispatcher);
			else console.log("\nALL ASYNC TEST SEQUENCES COMPLETE");
		}
	}
	asyncFunctions[i](dispatcher);
}

sequence(
	dispatcher => testFileAsync("examples/simple-webservice/simple-webservice.hl", dispatcher),
	dispatcher => testFileAsync("examples/todo-webapp/backend.hl", dispatcher)
);