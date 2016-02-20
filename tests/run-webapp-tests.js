'use strict';

var fs = require("fs");
var http = require("http");
var hl = require("../hl");
var HiTTP = require("../HiTTP");
var urlLib = require('url');

var totalFilesTested = 0;

function equal(x, y) { // TODO: DRY with run-tests.js
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

function testEquals(fileName, result, expected) {
    var success = equal(result, expected);
     
    if (success) {
        console.log(fileName + " test ok");
    } else {
        console.log("\t\t" + " ___TEST FAIL___ " + fileName + " Does not match:");
        console.log("result: ", JSON.stringify(result, null, 4));
        console.log("expected: ", JSON.stringify(expected, null, 4));
        throw "Test failed";
    }
}

function testResponse(url, expectedResponse) {
	console.log("testResponse", url, expectedResponse);
	var parsedUrl = urlLib.parse(url);
	
	var options = {
		host: parsedUrl.host.split(":")[0],
		port: parsedUrl.port,
		path: parsedUrl.pathname,
		method: "GET"
	};
	
	console.log("OPTIONS:", options);
	
	var request = http.request(options);
	
	request.on('response', function (response) { // TODO: This has race conditions for the variable expectedResponse.
		var result = "";
		var expectedResponseInner = expectedResponse;
	
		response.setEncoding('utf8');
		response.on('data', function (chunk) {
			console.log("data", chunk);
			result += chunk;
		});
		response.on('end', function () {
			console.log("end");
					
			if (!equal(expectedResponseInner, result))
				throw new Error(url + " DID NOT RETURN CORRECT VALUE. Expected: " + expectedResponseInner + " Actual: " + result);
			else {
				console.log("was equal:", expectedResponseInner, result);
				global.numberOfPassedTests++;
				console.log(global.numberOfPassedTests, "of", global.totalNumberOfTests, "tests completed");
				if (global.numberOfPassedTests == global.totalNumberOfTests) {
					console.log("\n" + "TEST COMPLETED");
					console.log("No errors");
					HiTTP.stopServer();
				}
			}
		});
		response.on('close', function () {
			console.log("close");
		});
	});

	request.on("error", function(err) {
		console.log("ERROR", err);
	});
	
	request.end();
}

function testFile(fileName) {
    try {
        var fileContents = fs.readFileSync(fileName, "utf8");
         
        var responseTuples = getResponseTuples(fileContents);
		
		global.totalNumberOfTests = responseTuples.length;
		global.numberOfPassedTests = 0;
		
		console.log("Performing", global.totalNumberOfTests, "tests asynchronously");
		console.log(JSON.stringify(responseTuples, null, 4));
		
		HiTTP.startServer(fileName);
		
		for (var i in responseTuples) {
			var url = responseTuples[i].url;
			var response = responseTuples[i].response;
			testResponse(url, response);
		}
    } catch (err) {
        console.log("\t\t" + " ___TEST ERROR___ " + fileName + " " + err);
        throw err;
    }
}
 
function getResponseTuples(fileContents) {
	var type = "responses";
    var regex1 = new RegExp("\\/\\*"+type+"([^*]*)\\*\\/", "g");
    var match = regex1.exec(fileContents);
    
	if (!match || !match[1]) return null;

	var lines = match[1].split("\r\n"); // TODO: Make platform independent new line split
	
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

testFile("example-webapp.hl");