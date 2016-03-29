'use strict';

var fs = require("fs");
var hl = require("../src/hl");
var utils = require("./utils.js");

var totalFilesTested = 0;

function testEquals(fileName, result, expected) {
    var success = utils.equal(result, expected);
     
    if (success) {
        console.log(fileName + " test ok");
    } else {
        console.log("\t\t" + " ___TEST FAIL___ " + fileName + " Does not match:");
        console.log("result: ", JSON.stringify(result, null, 4));
        console.log("expected: ", JSON.stringify(expected, null, 4));
        throw "Test failed";
    }
}
 
function testFile(fileName, logLevel) {
    try {
        hl.clearScope();
         
        var fileContents = fs.readFileSync(fileName, "utf8");
         
        if (logLevel)
            hl.setLogLevel(logLevel);
        else if (getExpected(fileContents, "noDebug") == true)
            hl.setLogLevel("error");
        else
            hl.setLogLevel("warning");
         
        var resultParsed = hl.parse(hl.tokenize(fileContents));
         
        var expectedParsed = getExpected(fileContents, "parsed");
        if (expectedParsed) {
            testEquals(fileName, resultParsed, expectedParsed);
        }
         
        var expectedEvaluated = getExpected(fileContents, "result");
        if (expectedEvaluated != null) {
            hl.loadStandardLibraries();
            var resultEvaluated = hl.evaluate(resultParsed);
            testEquals(fileName, resultEvaluated, expectedEvaluated);
        }

        totalFilesTested++;

    } catch (err) {
        console.log("\t\t" + " ___TEST ERROR___ " + fileName + " " + err);
        throw err;
    }
    
}
 
function getExpected(fileContents, type) {
    var regex1 = new RegExp("\\/\\*"+type+"([^*]*)\\*\\/", "g"); // TODO: Not possible to use * in the contents of expected
    var match = regex1.exec(fileContents);
    
    if (!match) {
        var regex2 = new RegExp("\\/\\/"+type+": (.*)", "g");
        match = regex2.exec(fileContents);
        if (!match) return null;
    }

    if (match[1]) {
        var blockComment = match[1];
        return eval(blockComment);
    } else
        return true;
}
 
function testScope() {
    try {
        console.log("\n");
         
        hl.clearScope();
         
        hl.saveToScope("foo", 42);
        hl.saveToScope("bar", 123);
         
        hl.pushScope();
         
        hl.saveToScope("foo", 24);
        hl.saveToScope("foobar", 12);
         
        var results1 =  [
            hl.searchScope("foo"),
            hl.searchScope("bar"),
            hl.searchScope("foobar")
        ];
         
        hl.popScope();
         
        var results2 =  [
            hl.searchScope("foo"),
            hl.searchScope("bar")
        ];
         
        try {
            hl.searchScope("foobar")
        } catch (e) {
            var wasException = true;
        }
         
        hl.pushScope();
         
        hl.saveToScope("foo", 50);
        hl.saveToScope("baz", 100);
         
        var results3 =  [
            hl.searchScope("foo"),
            hl.searchScope("bar"),
            hl.searchScope("baz")
        ];
         
        hl.changeInScope("baz", 55);
         
        var results4 =  [
            hl.searchScope("foo"),
            hl.searchScope("bar"),
            hl.searchScope("baz")
        ];
         
        hl.changeInScope("bar", 33);
         
        var results5 =  [
            hl.searchScope("foo"),
            hl.searchScope("bar"),
            hl.searchScope("baz")
        ];
         
        testEquals("testScope1", results1, [24, 123, 12]);
        testEquals("testScope2", results2, [42, 123]);
        testEquals("testScope3", results3, [50, 123, 100]);
        testEquals("testScope4", results4, [50, 123, 55]);
        testEquals("testScope5", results5, [50, 33, 55]);
        testEquals("testScope6", wasException, true);
    } catch (err) {
        console.log("\t\t" + " ___TEST ERROR___ testScope " + err);
        throw err;
    }
}

if (process.argv[2]) {
    var file = process.argv[2]
    testFile(file, "debug");
} else {
	testScope();
    fs.readdir('tests', function(err, files) {
        files.filter(function(file) {return file.substr(-3) === '.hl';}).forEach(function(file) {testFile("tests/" + file);});
		
        console.log("\n" + totalFilesTested + " UNIT TESTS COMPLETED");
		console.log("No errors\n");

		var webappTests = require("./run-webservice-tests");
    });
}
