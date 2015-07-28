'use strict';

var fs = require("fs");
var hl = require("./hl");

function equal(x, y) {	
	if (typeof x === "string" || y === "string")
		return x.toString() === y.toString();

    if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
    // after this just checking type of one would be enough
    if (x.constructor !== y.constructor) { return false; }
    // if they are functions, they should exactly refer to same one (because of closures)
    if (x instanceof Function) { return x === y; }
    // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
    if (x instanceof RegExp) { return x === y; }
    if (x === y || x.valueOf() === y.valueOf()) { return true; }
    if (Array.isArray(x) && x.length !== y.length) { return false; }

    // if they are dates, they must had equal valueOf
    if (x instanceof Date) { return false; }

    // if they are strictly equal, they both need to be object at least
    if (!(x instanceof Object)) { return false; }
    if (!(y instanceof Object)) { return false; }

    // recursive object equality check
    var p = Object.keys(x);
    return Object.keys(y).every(function (i) { return p.indexOf(i) !== -1; }) &&
        p.every(function (i) { return equal(x[i], y[i]); });
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
 
function testFile(fileName) {
    try {
        hl.clearScope();
         
        var fileContents = fs.readFileSync(fileName, "utf8");
         
        if (getExpected(fileContents, "noDebug") == true)
            hl.setDebug(false);
        else
            hl.setDebug(true);
         
        console.log("\n");
         
        var resultParsed = hl.parse(hl.tokenize(fileContents));
         
        var expectedParsed = getExpected(fileContents, "parsed");
        if (expectedParsed) {
            testEquals(fileName, resultParsed, expectedParsed);
        }
         
        var expectedEvaluated = getExpected(fileContents, "result");
        if (expectedEvaluated != null) {
            var resultEvaluated = hl.evaluate(resultParsed);
            testEquals(fileName, resultEvaluated, expectedEvaluated);
        }
    } catch (err) {
        console.log("\t\t" + " ___TEST ERROR___ " + fileName + " " + err);
        throw err;
    }
}
 
function getExpected(fileContents, type) {
    var regex = new RegExp("\\/\\*"+type+"([^*]*)\\*\\/", "g");
    var match = regex.exec(fileContents);
    if (!match) return null;
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
        //testEquals("testScope6", wasException, true);
    } catch (err) {
        console.log("\t\t" + " ___TEST ERROR___ testScope " + err);
        throw err;
    }
}
 
testScope();
testFile("tests/test-simple1.hl");
testFile("tests/test-simple2.hl");
testFile("tests/test-simple3.hl");
testFile("tests/test-simple4.hl");
testFile("tests/test-simple5.hl");
testFile("tests/test-simple6.hl");
testFile("tests/test-simple7.hl");
testFile("tests/test-simple8.hl");
testFile("tests/test-simple9.hl");
testFile("tests/test-simple10.hl");
testFile("tests/test-eval.hl");
testFile("tests/test-eval2.hl");
testFile("tests/test-eval3.hl");
testFile("tests/test-eval4.hl");
testFile("tests/test-eval5.hl");
testFile("tests/test-eval6.hl");
testFile("tests/test-eval7.hl");
testFile("tests/test-eval8.hl");
testFile("tests/test-eval9.hl");
testFile("tests/test-eval10.hl");
testFile("tests/test-eval11.hl");
testFile("tests/test-eval12.hl");
testFile("tests/test-eval13.hl");
testFile("tests/test-eval14.hl");
testFile("tests/test-eval15.hl");
testFile("tests/test-eval16.hl");
testFile("tests/test-eval17.hl");
testFile("tests/test-eval18.hl");
testFile("tests/test-speed1.hl");
testFile("tests/test-scope1.hl");
testFile("tests/test-scope2.hl");
testFile("tests/test-recursive1.hl");
testFile("tests/test-recursive2.hl");
testFile("tests/test-operators1.hl");
testFile("tests/test-conversion1.hl");
testFile("tests/test-service1.hl");
testFile("tests/test-service2.hl");
testFile("tests/test-service3.hl");