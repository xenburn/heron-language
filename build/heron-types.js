"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var heron_expr_1 = require("./heron-expr");
var heron_statement_1 = require("./heron-statement");
var heron_ast_rewrite_1 = require("./heron-ast-rewrite");
var heron_defs_1 = require("./heron-defs");
var heron_refs_1 = require("./heron-refs");
var type_system_1 = require("./type-system");
var utils_1 = require("./utils");
var FunctionSet = /** @class */ (function () {
    function FunctionSet(functions) {
        this.functions = functions;
        if (functions.some(function (f) { return !f; }))
            throw new Error("One of the functions is null");
    }
    FunctionSet.prototype.toString = function () {
        return "[" + this.functions.join(" | ") + "]";
    };
    return FunctionSet;
}());
exports.FunctionSet = FunctionSet;
function assure(t) {
    if (!t)
        throw new Error("Value was not defined");
    return t;
}
exports.assure = assure;
var id = 0;
var Types;
(function (Types) {
    // A simplistic HeronType-system for now. 
    // The goal is to distinguish between functions with the same name.
    Types.AnyType = type_system_1.typeConstant('Any');
    Types.ArrayType = type_system_1.typeConstant('Array');
    Types.ObjectType = type_system_1.typeConstant('Object');
    Types.IntType = type_system_1.typeConstant('Int');
    Types.FloatType = type_system_1.typeConstant('Float');
    Types.BoolType = type_system_1.typeConstant('Bool');
    Types.StrType = type_system_1.typeConstant('Str');
    Types.LambdaType = type_system_1.typeConstant('Lambda');
    Types.VoidType = type_system_1.typeConstant('Void');
    Types.TypeType = type_system_1.typeConstant('HeronType');
    Types.FuncType = type_system_1.typeConstant('Func');
})(Types = exports.Types || (exports.Types = {}));
function typeFromNode(node, typeParams) {
    if (!node)
        return null;
    heron_ast_rewrite_1.validateNode(node, "typeExpr", "typeName");
    if (node.name === "typeExpr") {
        if (node.children.length === 1)
            return typeFromNode(node.children[0], typeParams);
        return type_system_1.polyType(node.children.map(function (c) {
            var tmp = typeFromNode(c, typeParams);
            if (!tmp)
                throw new Error("Could not find inner type node");
            return tmp;
        }));
    }
    else if (node.name === "typeName") {
        var text = node.allText;
        if (text in typeParams)
            return type_system_1.typeVariable(typeParams[text]);
        else
            return type_system_1.typeConstant(text);
    }
    return null;
}
exports.typeFromNode = typeFromNode;
var TypeStrategyClass = /** @class */ (function () {
    function TypeStrategyClass() {
        this.casts = {
            'Float': ['Int'],
            'ArrayBuilder': ['Array'],
            'Array': ['Float2', 'Float3', 'Float4'],
            'Float4': ['Float', 'Float2', 'Float3'],
            'Float3': ['Float', 'Float2'],
            'Float2': ['Float'],
        };
    }
    TypeStrategyClass.prototype.chooseConstant = function (a, b) {
        if ((this.casts[a.name] || []).indexOf(b.name) >= 0)
            return a;
        if ((this.casts[b.name] || []).indexOf(a.name) >= 0)
            return b;
        throw new Error("Failed to resolve HeronType constants: " + a + " and " + b);
    };
    TypeStrategyClass.prototype.canCastTo = function (arg, param) {
        if (arg.name === param.name)
            return true;
        if ((this.casts[param.name] || []).indexOf(arg.name) >= 0)
            return true;
        if (param.name === 'Array' && arg.name === 'ArrayBuilder')
            return true;
        return false;
    };
    return TypeStrategyClass;
}());
exports.typeStrategy = new TypeStrategyClass();
function callFunction(funOriginal, args, argTypes, mainUnifier) {
    // TODO: I used to think this but it is not correct 
    // We have to create fresh variable names.
    var fun = funOriginal; // freshVariableNames(funOriginal) as PolyType;
    utils_1.trace("funcType", "New version of function " + fun);
    var paramTypes = getFuncArgTypes(fun);
    // Parameters should match the number of arguments given to it. 
    if (paramTypes.length !== args.length)
        throw new Error("Mismatched number of arguments was " + args.length + " expected " + paramTypes.length);
    // Unify the passed arguments with the parameter types.    
    var finalArgTypes = [];
    for (var i = 0; i < args.length; ++i) {
        var argType = argTypes[i];
        if (!argType)
            throw new Error("illegal argument type");
        var paramType = paramTypes[i];
        var arg = args[i];
        if (argType instanceof FunctionSet) {
            utils_1.trace("chooseFunc", "Function set as argument");
            var n = -1;
            if (!(paramType instanceof type_system_1.PolyType)) {
                n = chooseMostGeneric(argType);
                utils_1.trace("chooseFunc", "Parameter is not a poly-rype: can't figure out best match, defaulting to most generic");
            }
            else {
                // We have to figure out which type is the best here. 
                n = chooseBestFunctionIndex(paramType, argType);
            }
            if (n < 0)
                throw new Error("No function found");
            argType = argType.functions[n];
            if (!argType)
                throw new Error("No function type found");
            arg.functionIndex = n;
        }
        var finalArgType = mainUnifier.unifyTypes(argType, paramType);
        utils_1.trace("funcType", "Unifying argument " + arg + " with " + argType + " and " + paramType + " is " + finalArgType);
        finalArgTypes.push(finalArgType);
    }
    // Create a final function type, and unify it. 
    var finalRetType = mainUnifier.getUnifiedType(getFuncReturnType(fun));
    utils_1.trace("funcType", "Unified return type of " + fun + " is " + finalRetType);
    // We return the unified version of the return HeronType.
    return finalRetType;
}
exports.callFunction = callFunction;
/*
export function callFunction(funOriginal: PolyType, args: Expr[], argTypes: HeronType[], mainUnifier: TypeResolver): HeronType {
    // We have to create fresh variable names.
    const fun = freshVariableNames(funOriginal) as PolyType;
    const u = new TypeResolver(typeStrategy);
    const paramTypes = getFuncArgTypes(fun);
    const returnType = getFuncReturnType(fun);

    // Parameters should match the number of arguments given to it.
    if (paramTypes.length !== args.length)
        throw new Error("Mismatched number of arguments was " + args.length + " expected " + paramTypes.length);

    // Unify the passed arguments with the parameter types.
    const finalArgTypes: Type[] = [];
    for (let i=0; i < args.length; ++i) {
        let argType = argTypes[i];
        if (!argType)
            throw new Error("illegal argument type");

        const paramType = paramTypes[i];
        const arg = args[i];
        if (argType instanceof FunctionSet) {
            trace("chooseFunc", "Function set as argument");
            let n = -1;
            if (!(paramType instanceof PolyType)) {
                n = chooseMostGeneric(argType);
                trace("chooseFunc", "Parameter is not a poly-rype: can't figure out best match, defaulting to most generic");
            }
            else {
                // We have to figure out which type is the best here.
                n = chooseBestFunctionIndex(paramType as PolyType, argType);
            }

            if (n < 0)
                throw new Error("No function found");
            argType = argType.functions[n];
            if (!argType)
                throw new Error("No function type found");
            arg.functionIndex = n;
        }

        // Do the local unification to get the proper return HeronType
        trace("funcType", "Unifying argument " + arg + " of type " + argType + " with type " + paramType);
        const uniType = u.unifyTypes(paramType, argType);
        trace("funcType", "Local unified type " + uniType);

        // Do the unification of the arguments with the types.
        const globalType = mainUnifier.unifyTypes(argType, paramType);
        trace("funcType", "Global unified type " + globalType)
        finalArgTypes.push(globalType);

        // In case the referenced node is a variable or parameter,
        // we are going to unify it with the resulting global HeronType.
        if (arg.node.ref instanceof FuncParamRef || arg.node.ref instanceof VarRef) {
            const refType = arg.node.ref.def.type;
            trace("funcType", "Reference type " + refType);
            const uniRefType = mainUnifier.unifyTypes(refType, globalType);
            trace("funcType", "Reference type after unification " + uniRefType);
            //arg.node.ref.def.type = uniRefType;
        }
    }

    // Create a final function type, and unify it.
    const finalRetType = u.getUnifiedType(returnType);

    // TODO: figure out if I need this.
    //const finalType = funcType(finalArgTypes, finalRetType);
    //mainUnifier.unifyTypes(funOriginal, finalType);

    // We return the unified version of the return HeronType.
    return finalRetType;
}
*/
function computeFuncTypeFromSig(f, genParams) {
    // TODO: rename the genParams 
    var u = new type_system_1.TypeResolver(exports.typeStrategy);
    var t = genericFuncType(f.params.length);
    var hasSpecType = false;
    for (var i = 0; i < f.params.length; ++i) {
        var param = f.params[i];
        var paramType = typeFromNode(f.params[i].typeNode, genParams);
        if (paramType) {
            hasSpecType = true;
            param.type = paramType;
            u.unifyTypes(getFuncArgType(t, i), paramType);
        }
        else {
            param.type = getFuncArgType(t, i);
        }
        utils_1.trace("funcType", "Parameter " + i + " " + param.type);
    }
    var retType = f instanceof heron_defs_1.FuncDef ? typeFromNode(f.retTypeNode, genParams) : null;
    if (retType) {
        hasSpecType = true;
        u.unifyTypes(getFuncReturnType(t), retType);
    }
    if (hasSpecType)
        return u.getUnifiedType(t);
    else
        return t;
}
exports.computeFuncTypeFromSig = computeFuncTypeFromSig;
function genParamsToNewVarLookup(genParams) {
    var r = {};
    for (var _i = 0, genParams_1 = genParams; _i < genParams_1.length; _i++) {
        var p = genParams_1[_i];
        r[p] = type_system_1.newTypeVar().name;
    }
    return r;
}
exports.genParamsToNewVarLookup = genParamsToNewVarLookup;
function computeFuncType(f) {
    if (!f.type) {
        console.log("Computing function type for " + f);
        var sigNode = heron_ast_rewrite_1.validateNode(f.node.children[0], "funcSig");
        var genParamsNode = heron_ast_rewrite_1.validateNode(sigNode.children[1], "genericParams");
        var genParams = genParamsNode.children.map(function (p) { return p.allText; });
        var body = f.body ? (f.body.expr ? f.body.expr || null : f.body.statement || null) : null;
        // This is important, because it is used when a recursive call is made. 
        // Additionally, if types are present in the signature we use those
        f.type = computeFuncTypeFromSig(f, genParamsToNewVarLookup(genParams));
        var u = new type_system_1.TypeResolver(exports.typeStrategy);
        var te = new FunctionTypeEvaluator(f.name, f.params.length, body, exports.typeStrategy, u, f.type);
        f.type = te.result;
        console.log(" " + u.state);
        console.log("Type for " + f + " is " + type_system_1.normalizeType(f.type));
    }
    return f.type;
}
exports.computeFuncType = computeFuncType;
function getLambdaType(l, u, shape) {
    if (!l.type) {
        l.type = shape;
        for (var i = 0; i < l.params.length; ++i)
            l.params[i].type = getFuncArgType(shape, i);
        var te = new FunctionTypeEvaluator('_lambda_', l.params.length, l.body, exports.typeStrategy, u, shape);
        l.type = te.result;
    }
    return l.type;
}
exports.getLambdaType = getLambdaType;
function funcType(args, ret) {
    return type_system_1.polyType([type_system_1.typeConstant('Func')].concat(args, [ret]));
}
exports.funcType = funcType;
function genericFuncType(n) {
    var args = [];
    for (var i = 0; i < n; ++i)
        args.push(type_system_1.newTypeVar());
    return genericFuncTypeFromArgs(args);
}
exports.genericFuncType = genericFuncType;
function genericFuncTypeFromArgs(args) {
    return funcType(args, type_system_1.newTypeVar());
}
exports.genericFuncTypeFromArgs = genericFuncTypeFromArgs;
function makeArrayType(elementType) {
    return type_system_1.polyType([type_system_1.typeConstant('Array'), elementType]);
}
exports.makeArrayType = makeArrayType;
function makeNewTypeVar() {
    return new type_system_1.TypeVariable('$' + id++);
}
exports.makeNewTypeVar = makeNewTypeVar;
function makeNewArrayType() {
    return makeArrayType(makeNewTypeVar());
}
exports.makeNewArrayType = makeNewArrayType;
function getArrayElementType(t) {
    return t.types[1];
}
exports.getArrayElementType = getArrayElementType;
function makeFunctionSet(types) {
    if (types.length === 0)
        throw new Error("Not enough types");
    if (types.length === 1)
        return types[0];
    for (var _i = 0, types_1 = types; _i < types_1.length; _i++) {
        var t = types_1[_i];
        if (!isFunctionType(t))
            throw new Error("Only function types can be used to make a function set");
    }
    return new FunctionSet(types);
}
exports.makeFunctionSet = makeFunctionSet;
function isFunctionType(type) {
    return (type instanceof type_system_1.PolyType) && type_system_1.isTypeConstant(type.types[0], 'Func');
}
exports.isFunctionType = isFunctionType;
function getNumArgTypes(f) {
    return f.types.length - 2;
}
exports.getNumArgTypes = getNumArgTypes;
function getFuncArgCount(f) {
    return f.types.length - 2;
}
exports.getFuncArgCount = getFuncArgCount;
function getFuncArgType(f, n) {
    return getFuncArgTypes(f)[n];
}
exports.getFuncArgType = getFuncArgType;
function getFuncArgTypes(f) {
    return f.types.slice(1, f.types.length - 1);
}
exports.getFuncArgTypes = getFuncArgTypes;
function getFuncReturnType(f) {
    return f.types[f.types.length - 1];
}
exports.getFuncReturnType = getFuncReturnType;
function canCallFunc(f, args, exact) {
    var params = getFuncArgTypes(f);
    if (params.length !== args.length)
        return false;
    for (var i = 0; i < params.length; ++i)
        if (!canPassArg(args[i], params[i], exact))
            return false;
    return true;
}
exports.canCallFunc = canCallFunc;
function canPassArg(arg, param, exact) {
    if (param instanceof type_system_1.TypeVariable || arg instanceof type_system_1.TypeVariable)
        return true;
    if (param instanceof type_system_1.TypeConstant) {
        if (arg instanceof type_system_1.TypeConstant)
            if (exact)
                return type_system_1.isTypeConstant(arg, param.name);
            else
                return exports.typeStrategy.canCastTo(arg, param);
        else
            return false;
    }
    if (param instanceof type_system_1.PolyType) {
        if (!(arg instanceof type_system_1.PolyType))
            return false;
        if (arg.types.length !== param.types.length)
            return false;
        for (var i = 0; i < arg.types.length; ++i)
            if (!canPassArg(arg.types[i], param.types[i], exact))
                return false;
    }
    return true;
}
exports.canPassArg = canPassArg;
function functionSetOptions(f) {
    return f.types[1].types.map(function (t) { return t; });
}
exports.functionSetOptions = functionSetOptions;
// Gives a score to a function based on how many concrete types it has  
function functionSpecificity(func) {
    var args = getFuncArgTypes(func);
    var n = 0;
    for (var _i = 0, args_1 = args; _i < args_1.length; _i++) {
        var a = args_1[_i];
        if (a instanceof type_system_1.PolyType || a instanceof type_system_1.TypeConstant)
            n++;
    }
    return n;
}
exports.functionSpecificity = functionSpecificity;
function chooseMostGeneric(funcSet) {
    var options = funcSet.functions;
    var scores = options.map(functionSpecificity);
    var result = 0, many = false;
    for (var i = 1; i < scores.length; ++i) {
        if (scores[i] < scores[result] && scores[i] >= 0)
            result = i, many = false;
        else if (scores[i] === scores[result])
            many = true;
    }
    return many ? -1 : result;
}
exports.chooseMostGeneric = chooseMostGeneric;
function chooseBestFunctionIndexFromArgs(args, funcSet) {
    utils_1.trace("chooseFunc", "Choosing function using args: " + args.join(", "));
    utils_1.trace("chooseFunc", "Choosing function from choices:");
    for (var _i = 0, _a = funcSet.functions; _i < _a.length; _i++) {
        var opt = _a[_i];
        utils_1.trace("chooseFunc", "    " + opt);
    }
    var tmp = chooseBestFunctionIndexFromArgsHelper(args, funcSet, true);
    if (tmp >= 0)
        return tmp;
    utils_1.trace('chooseFunc', 'No exact match found, trying inexact matches');
    // Try an inexact match (casting)
    tmp = chooseBestFunctionIndexFromArgsHelper(args, funcSet, false);
    if (tmp >= 0)
        return tmp;
    utils_1.trace('chooseFunc', 'No inexact match found, trying generic matches');
    // If nothing else works, just try the most generic option
    tmp = chooseMostGeneric(funcSet);
    if (tmp >= 0)
        return tmp;
    throw new Error("Found no matching function");
}
exports.chooseBestFunctionIndexFromArgs = chooseBestFunctionIndexFromArgs;
function chooseBestFunctionIndexFromArgsHelper(args, funcSet, exact) {
    var options = funcSet.functions;
    var scores = [];
    // First try with exact matching
    for (var i_1 = 0; i_1 < options.length; ++i_1) {
        var g = options[i_1];
        if (canCallFunc(g, args, exact))
            scores.push(functionSpecificity(g));
        else
            scores.push(-1);
    }
    var res = 0;
    var many = false;
    for (var i = 1; i < scores.length; ++i) {
        if (scores[i] > scores[res]) {
            many = false;
            res = i;
        }
        else if (scores[i] === scores[res]) {
            many = true;
        }
    }
    if (res >= 0 && !many)
        return res;
    else
        return -1;
}
exports.chooseBestFunctionIndexFromArgsHelper = chooseBestFunctionIndexFromArgsHelper;
function chooseBestFunctionIndex(f, funcSet) {
    return chooseBestFunctionIndexFromArgs(getFuncArgTypes(f), funcSet);
}
exports.chooseBestFunctionIndex = chooseBestFunctionIndex;
/**
 * This class computes the HeronType for a function. The shape argument says that we have a certain
 * expectation for the form of the lambda (e.g. it is used or passed in different contexts).
 */
var FunctionTypeEvaluator = /** @class */ (function () {
    function FunctionTypeEvaluator(name, argCount, body, typeStrategy, unifier, shape) {
        this.name = name;
        this.argCount = argCount;
        this.body = body;
        this.typeStrategy = typeStrategy;
        this.unifier = unifier;
        this.shape = shape;
        if (!isFunctionType(shape))
            throw new Error("Missing function shape: create a generic function HeronType if you don't know what to pass");
        //this._function = freshParameterNames(shape) as PolyType;
        this._function = shape;
        utils_1.trace('funcType', 'Getting function type for ' + name);
        utils_1.trace('funcType', '  given type ' + this._function);
        if (body)
            this.getType(body);
        if (body instanceof heron_expr_1.Expr)
            this.unifyReturn(body);
        this.result = this.unifier.getUnifiedType(this._function);
        utils_1.trace('funcType', "Final type for " + name + " originally type " + this._function + " is " + this.result);
        //trace('funcType', "Unifier state:");
        //trace('funcType', this.unifier.state);
    }
    Object.defineProperty(FunctionTypeEvaluator.prototype, "numArgs", {
        get: function () {
            return getFuncArgCount(this._function);
        },
        enumerable: true,
        configurable: true
    });
    FunctionTypeEvaluator.prototype.getArgType = function (n) {
        return getFuncArgType(this._function, n);
    };
    FunctionTypeEvaluator.prototype.getReturnType = function () {
        return getFuncReturnType(this._function);
    };
    FunctionTypeEvaluator.prototype.getType = function (x) {
        if (!x)
            throw new Error("Invalid argument");
        if (x.type)
            return x.type;
        try {
            if (x instanceof heron_statement_1.Statement) {
                this.getStatementType(x);
                return x.type = Types.VoidType;
            }
            else {
                var rawType = this.getExprType(x);
                if (rawType instanceof FunctionSet)
                    return x.type = rawType;
                var uniType = this.unifier.getUnifiedType(rawType);
                console.log("Expression     : " + x.toString());
                //console.log("  has raw type : " + rawType);
                console.log("  has type     : " + uniType);
                //return x.type = rawType;
                if (!uniType)
                    throw new Error("Missing unified type");
                return x.type = uniType;
            }
        }
        catch (e) {
            heron_ast_rewrite_1.throwError(x.node, e.message);
        }
        throw new Error("Unexpected code path");
    };
    FunctionTypeEvaluator.prototype.getStatementType = function (statement) {
        if (statement.type)
            return statement.type;
        //console.log("Computing statement HeronType:");
        //console.log(statement.node.allText);
        if (statement instanceof heron_statement_1.CompoundStatement) {
            for (var _i = 0, _a = statement.statements; _i < _a.length; _i++) {
                var st = _a[_i];
                this.getType(st);
            }
        }
        else if (statement instanceof heron_statement_1.IfStatement) {
            this.unifyBool(statement.condition);
            this.getType(statement.onTrue);
            this.getType(statement.onFalse);
        }
        else if (statement instanceof heron_statement_1.ReturnStatement) {
            if (statement.expr)
                this.unifyReturn(statement.expr);
            else
                this.unifyReturn(Types.VoidType);
        }
        else if (statement instanceof heron_statement_1.ContinueStatement) {
            // Do nothing 
        }
        else if (statement instanceof heron_statement_1.ExprStatement) {
            this.getType(statement.expr);
        }
        else if (statement instanceof heron_statement_1.ForStatement) {
            var forLoopVar = statement.node.def;
            if (!forLoopVar) {
                heron_ast_rewrite_1.throwError(statement.node, "Missing for loop variable definition");
                throw new Error("Unexpected code path");
            }
            var arrayType = makeNewArrayType();
            var elementType = getArrayElementType(arrayType);
            if (forLoopVar.type)
                this.unify(forLoopVar.type, elementType);
            else
                forLoopVar.type = elementType;
            this.unify(statement.array, arrayType);
            this.getType(statement.loop);
        }
        else if (statement instanceof heron_statement_1.DoStatement) {
            this.getType(statement.body);
            this.unifyBool(statement.condition);
        }
        else if (statement instanceof heron_statement_1.WhileStatement) {
            this.unifyBool(statement.condition);
            this.getType(statement.body);
        }
        else if (statement instanceof heron_statement_1.VarDeclStatement) {
            for (var _b = 0, _c = statement.vars; _b < _c.length; _b++) {
                var vd = _c[_b];
                if (!vd.exprNode.expr)
                    heron_ast_rewrite_1.throwError(vd.exprNode, "Missing an expression");
                vd.type = this.getType(vd.exprNode.expr);
            }
        }
        else if (statement instanceof heron_statement_1.EmptyStatement) {
            // Do nothing. 
        }
        else {
            throw new Error("Unrecognized statement " + statement);
        }
    };
    FunctionTypeEvaluator.prototype.getExprType = function (expr) {
        if (expr === null)
            throw new Error("No HeronType available on a null expression");
        if (expr.type)
            return expr.type;
        if (expr instanceof heron_expr_1.VarName) {
            if (!expr.node.ref)
                heron_ast_rewrite_1.throwError(expr.node, "Missing ref");
            var ref = expr.node.ref;
            if (ref instanceof heron_refs_1.FuncRef) {
                return makeFunctionSet(ref.defs.map(function (r) { return computeFuncType(r); }));
            }
            else if (ref instanceof heron_refs_1.VarRef) {
                if (!ref.def.type)
                    ref.def.type = this.getType(ref.def.exprNode.expr);
                return assure(ref.def.type);
            }
            else if (ref instanceof heron_refs_1.FuncParamRef) {
                return assure(ref.def.type);
            }
            else if (ref instanceof heron_refs_1.ForLoopVarRef) {
                return assure(ref.def.type);
            }
            else if (ref instanceof heron_refs_1.TypeRef || ref instanceof heron_refs_1.TypeParamRef) {
                // TODO: eventually we might want to support 
                heron_ast_rewrite_1.throwError(expr.node, "HeronType names are not allowed in expressions: " + expr.name);
            }
            // TODO: the reference could be to something else
            //return this.findVar(expr.name);
            throw new Error("Unrecognized expression");
        }
        else if (expr instanceof heron_expr_1.FunCall) {
            var funcType_1 = this.getType(expr.func);
            if (!funcType_1)
                throw new Error("Could not get type of function");
            var argTypes = [];
            for (var _i = 0, _a = expr.args; _i < _a.length; _i++) {
                var a = _a[_i];
                var argType = this.getType(a);
                if (!argType)
                    throw new Error("Could not get type of argument: " + a);
                if (!a.type)
                    throw new Error("Type was not set on argument: " + a);
                argTypes.push(argType);
            }
            utils_1.trace("chooseFunc", "Function call: " + expr);
            utils_1.trace("chooseFunc", "Has function type " + funcType_1);
            utils_1.trace("chooseFunc", "arg types : " + argTypes.join(", "));
            if (funcType_1 instanceof FunctionSet) {
                var funcs = funcType_1.functions;
                //trace('chooseFunc', 'Looking for function match for: ' + expr.toString());
                var n = chooseBestFunctionIndexFromArgs(argTypes, funcType_1);
                expr.func.functionIndex = n;
                funcType_1 = funcs[n];
            }
            if (funcType_1 instanceof type_system_1.PolyType) {
                if (!isFunctionType(funcType_1))
                    throw new Error("Can't call " + funcType_1);
                for (var i = 0; i < expr.args.length; ++i) {
                    var arg = expr.args[i];
                    var exp = getFuncArgType(funcType_1, i);
                    if (argTypes[i].toString() !== arg.type.toString())
                        throw new Error("Mismatch argument types");
                    this.unify(exp, argTypes[i]);
                    /*
                    // I can see this being something we want for arrays as well.
                    if (arg instanceof Lambda && exp instanceof PolyType) {
                        // Recompute the HeronType now based on the expected HeronType.
                        trace("funcType", "Getting an improved lambda type");
                        trace("funcType", "Original: " + arg.type);
                        trace("funcType", "Shape: " + exp);
                        arg.type = getLambdaType(arg, this.unifier, exp);
                        trace("funcType", "Updated: " + arg.type);
                        if (!arg.type)
                            throw new Error("Failed to get a recomputed lambda type");
                        argTypes[i] = arg.type;
                    }

                    // Unify again.
                    this.unify(arg.type, exp);
                    */
                }
                utils_1.trace("chooseFunc", "final arg types : " + argTypes.join(", "));
                // We have to create new HeronType variable names when calling a
                return callFunction(funcType_1, expr.args, argTypes, this.unifier);
            }
            else if (funcType_1 instanceof type_system_1.TypeVariable) {
                utils_1.trace("chooseFunc", "The functionType is a variable: " + funcType_1);
                var genFunc = genericFuncTypeFromArgs(argTypes);
                utils_1.trace("chooseFunc", "Created a generic function: " + genFunc);
                this.unify(funcType_1, genFunc);
                var retType = getFuncReturnType(genFunc);
                var r = callFunction(genFunc, expr.args, argTypes, this.unifier);
                for (var _b = 0, argTypes_1 = argTypes; _b < argTypes_1.length; _b++) {
                    var argType = argTypes_1[_b];
                    utils_1.trace("chooseFunc", "Argument type is " + argType + ", unified is " + this.unifier.getUnifiedType(argType));
                }
                utils_1.trace("chooseFunc", "Final unification for the function " + this.unifier.getUnifiedType(genFunc));
                utils_1.trace("chooseFunc", "Final unification for the variable " + this.unifier.getUnifiedType(funcType_1));
                this.unify(retType, r);
                return r;
            }
            else {
                throw new Error("Can't call " + funcType_1);
            }
        }
        else if (expr instanceof heron_expr_1.ConditionalExpr) {
            this.unifyBool(expr.condition);
            var onTrue = this.getType(expr.onTrue);
            var onFalse = this.getType(expr.onFalse);
            return this.unify(onTrue, onFalse);
        }
        else if (expr instanceof heron_expr_1.ObjectLiteral || expr instanceof heron_expr_1.ObjectField) {
            throw new Error("Object literals not yet supported");
        }
        else if (expr instanceof heron_expr_1.ArrayLiteral) {
            var arrayType = makeNewArrayType();
            var elemType = getArrayElementType(arrayType);
            for (var _c = 0, _d = expr.vals; _c < _d.length; _c++) {
                var v = _d[_c];
                this.unify(v, elemType);
            }
            return arrayType;
        }
        else if (expr instanceof heron_expr_1.BoolLiteral) {
            return Types.BoolType;
        }
        else if (expr instanceof heron_expr_1.IntLiteral) {
            return Types.IntType;
        }
        else if (expr instanceof heron_expr_1.FloatLiteral) {
            return Types.FloatType;
        }
        else if (expr instanceof heron_expr_1.StrLiteral) {
            return Types.StrType;
        }
        else if (expr instanceof heron_expr_1.VarExpr) {
            for (var _e = 0, _f = expr.vars; _e < _f.length; _e++) {
                var v = _f[_e];
                var varExpr = v.exprNode.expr;
                if (!varExpr)
                    heron_ast_rewrite_1.throwError(v.exprNode, "No expression associated with variable: " + v.name);
                v.type = this.getType(varExpr);
            }
            var r = this.getType(expr.expr);
            return r;
        }
        else if (expr instanceof heron_expr_1.Lambda) {
            return getLambdaType(expr, this.unifier, genericFuncType(expr.params.length));
        }
        else if (expr instanceof heron_expr_1.PostfixDec) {
            return this.unifyInt(expr.lvalue);
        }
        else if (expr instanceof heron_expr_1.PostfixInc) {
            return this.unifyInt(expr.lvalue);
        }
        else if (expr instanceof heron_expr_1.VarAssignmentExpr) {
            var ref = expr.node.children[0].ref;
            if (!ref) {
                heron_ast_rewrite_1.throwError(expr.node, "Variable assignment is missing reference");
                throw new Error("Unreachable code");
            }
            if (ref.defs.length > 1)
                heron_ast_rewrite_1.throwError(expr.node, "Multiple defs found");
            if (ref.defs.length < 1)
                heron_ast_rewrite_1.throwError(expr.node, "No defs found");
            var def = ref.defs[0];
            return this.unify(def.type, expr.value);
        }
        else {
            throw new Error("Not a recognized expression " + expr);
        }
    };
    FunctionTypeEvaluator.prototype.unify = function (a, b) {
        if (a instanceof heron_expr_1.Expr)
            a = this.getType(a);
        if (b instanceof heron_expr_1.Expr)
            b = this.getType(b);
        // TODO: unify function sets? 
        if (b instanceof FunctionSet)
            return a;
        if (a instanceof FunctionSet)
            return b;
        var ret = this.unifier.unifyTypes(a, b);
        utils_1.trace("funcType", "Unification of " + a + " and " + b + " is " + ret);
        return ret;
    };
    FunctionTypeEvaluator.prototype.unifyBool = function (x) {
        return this.unify(x, Types.BoolType);
    };
    FunctionTypeEvaluator.prototype.unifyInt = function (x) {
        return this.unify(x, Types.IntType);
    };
    FunctionTypeEvaluator.prototype.unifyReturn = function (x) {
        return this.unify(x, this.getReturnType());
    };
    return FunctionTypeEvaluator;
}());
exports.FunctionTypeEvaluator = FunctionTypeEvaluator;
//# sourceMappingURL=heron-types.js.map