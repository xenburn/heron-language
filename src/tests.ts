import * as Myna from "myna-parser";
import { heronGrammar, parseHeron } from './heron-parser';
import { heronToJs } from "./heron-to-js";
import { preprocessAst } from "./heron-ast-rewrite";
import { Package, Scope } from "./heron-scope-analysis";
import { heronToText } from "./heron-to-text";
import { toHeronAst, parseFile, parseModule, createPackage, HeronAstNode } from "./heron-compiler";

const m = Myna.Myna;
const g = heronGrammar;

declare var require;
const assert = require('assert');

// Assure that two ASTs have the same shape
// For example if I generate some text, and re-parse it.
function compareAst(a, b) {
    if (!a && b || a && !b)
        return false;
    if (a.children.length != b.children.length)
        return false;    
    if (a.children.length === 0)
        return a.allText === b.allText;
    if (a.name !== b.name)
        return false;
    for (var i=0; i < a.children.length; ++i)
        if (!compareAst(a.children[i], b.children[i]))
            return false;
    return true;
}

// Tests parsing an individual rule against the input input text, and returns an object 
// representing the result of running the test 
function testParse(rule, assert, text, shouldPass)  {    
    if (shouldPass == undefined) shouldPass = true;
    let result = m.failed;
    let err = undefined;    
    try {        
        let node = m.parse(rule, text);
        if (node)
            result = node.end;            
    }
    catch (e) {
        err = e;
    }

    let testResult = {
        name : rule.toString() + ' with input "' + text + '"',
        description : result + "/" + text.length,
        negative : !shouldPass,
        success : (result === text.length) !== !shouldPass,
        error : err,
        ruleDescr : rule.type + ": " + rule.toString(),
        rule : rule        
    };
    
    if (!testResult.success)
        console.log(testResult);

    assert.ok(testResult.success, testResult.name + (shouldPass ? "" : " should fail"));
}

const ruleTests = [
    [g.comment, ['/* abc */', '// abc \n', '/* abc */ /* def */ '], ['abc', '', '/*']],
    [g.funCall, ['(a, b)', '(a)', '(F )', '()'], []],
    [g.expr, ['42', '3+4', '3 + 4', '3 * (2 + 4)', '3 * 2 + 4', 'a', 'a++', 'f(1,2)', 'f(3, 5)', 'f()', 'f(12)', 'hx > 0.0'], []],
    [g.expr, ['0..1', '0 .. 1', 'f(a .. b)'], ['xs[0:5]', 'xs[4:0:-1]']],
    [g.expr, ['x => 42', '(x) => 13', 'x=>3', 'x => { return 42; }', '(x, y) => x * y'], []],
    [g.expr, ['(3)', '(3 + 2)', '(c)', '(a)+(b)', 'a+(b)', 'a+b+c', 'a?b:c', 'a?b+c:d', 'a?b:c+d','a?(b):c', '(a)?b:c'], []],
    [g.expr, ['a?b:(c)'], ['f > max ? max : (f < min ? min) : f']],    
    [g.expr, ['a?b:c', 'a?b:c?d:e', 'a?b:(c<d?e:f)', 'a>3?b:c', 'a > 3 ? b : c', 'f > max ? max : (f < min ? min : f)'], []],
    [g.statement, [
            'var x = 0;',
            'f();',
            'if (x) f();',
            'if (x) f(); else g();',
            'return;',
            ';',
            'var test = 1;\n /* */',
            'return p;', 
            'if (hx) return p;',
            'if (hx > 0.0) return p;',
            'if(hx > 0.0) return p;',
        ],
        [
            'f()',
            'return 42',
            'g',
            ';;',
        ]]        
];

function testParsingRules() {
    for (let ruleTest of ruleTests) {
        let rule = ruleTest[0]; 
        for (let passInput of ruleTest[1]) 
            testParse(rule, assert, passInput, true);
        for (let failInput of ruleTest[2]) 
            testParse(rule, assert, failInput, false);
    }
}

// TEMP: this needs to be uncommented
// testParsingRules()

declare var require;
const fs = require('fs');

// TODO: add parent pointers to each node, and an ID, and a reverse index lookup. 
// after the rewrite phase

function functionSigToString(node: Myna.AstNode) {
    if (node.name === 'funcDef')
        return "function " + node.children[0].allText;
    if (node.name === 'intrinsicDef')
        return "intrinsic " + node.children[0].allText;
    throw new Error("Node has no signature" + node.name);
}

function outputPackageStats(pkg: Package) {
    console.log("Files: ");
    console.log(pkg.files);
    console.log("# Modules  : " + pkg.modules.length);
    console.log("# Scopes   : " + pkg.scopes.length);
    console.log("# Defs     : " + pkg.defs.length);
    console.log("# Usages   : " + pkg.usages.length);        
}

function tests() {
    // TODO: eventually we need to pre-scan the files    
    let inputs = ['geometry-vector3'];
    let pkg = createPackage(inputs);
    console.log('Done');
}

/*
testParseExpr("2 + 3"); 
testParseCode("2 + 3", g.additiveExpr);
testParseCode("2 + 3", g.relationalExpr);
testParseCode("2 + 3", g.equalityExpr);
testParseCode("2 + 3", g.logicalAndExpr);
testParseCode("2 + 3", g.logicalXOrExpr);
testParseCode("2 + 3", g.logicalOrExpr);
testParseCode("2 + 3", g.rangeExpr);
testParseCode("2 + 3", g.conditionalExpr);
testParseCode("2 + 3", g.assignmentExpr);
*/

//testParseFile('.\\tests\\seascape.heron');
//testParseFile('.\\tests\\stdlib.heron');
//testParseFile('.\\inputs\\geometry-vector3.heron');
//testParseFile('.\\inputs\\intrinsics.heron');
tests();

declare var process;
process.exit();