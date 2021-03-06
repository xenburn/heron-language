import { FuncDef, FuncParamDef, VarDef } from "./heron-defs";
import { normalizeType, PolyType } from "./type-system";
import { CodeBuilder } from "./code-builder";
import { VarName, FunCall, ConditionalExpr, ObjectLiteral, ArrayLiteral, BoolLiteral, IntLiteral, FloatLiteral, StrLiteral, VarExpr, PostfixDec, Lambda, PostfixInc, Expr, ObjectField, VarAssignmentExpr } from "./heron-expr";
import { Statement, CompoundStatement, IfStatement, EmptyStatement, VarDeclStatement, WhileStatement, DoStatement, ForStatement, ExprStatement, ContinueStatement, ReturnStatement } from "./heron-statement";
import { Module } from "./heron-package";
import { identifierToString } from "./heron-ast-rewrite";
import { FuncRef } from "./heron-refs";
import { getFuncReturnType, HeronType } from "./heron-types";
import { toHeronTypeString } from "./heron-to-html";

// https://www.khronos.org/opengl/wiki/Core_Language_(GLSL)
// https://www.khronos.org/opengl/wiki/Data_Type_(GLSL)
// http://www.shaderific.com/glsl-statements

let id = 0;

export function toGlsl(x: Statement|Expr|FuncDef|VarDef|Module): string {
    const toGlsl = new HeronToGlsl();
    toGlsl.visit(x);
    return toGlsl.cb.toString();
}

export function funcDefName(f: FuncDef) {
    return identifierToString(f.name) + '_' + f.node.id;
}

function funcParamString(p: FuncParamDef) {
    return toTypeString(p.type) + " " + p.name;
}

function toTypeString(t: HeronType): string {
    switch (t.toString()) 
    {
        case "":
        default:
            return "???"
    }
}

// This class computes the type for a function
export class HeronToGlsl 
{    
    cb = new CodeBuilder();

    visit(x: Statement|Expr|FuncDef|VarDef|Module) {
        if (x instanceof Statement)
            this.visitStatement(x);
        else if (x instanceof Expr)
            this.visitExpr(x);
        else if (x instanceof FuncDef)
            this.visitFuncDef(x);
        else if (x instanceof VarDef)
            this.visitVarDef(x);
        else 
            this.visitModule(x);
    }

    visitModule(m: Module) {
        this.cb.pushLine('// Module ' + m.name);
        this.cb.pushLine('// file ' + m.file.filePath);
        for (const i of m.imports)
            this.cb.pushLine('// imports ' + i);
        for (const v of m.vars)
            this.visit(v);
        for (const f of m.functions)
            this.visit(f);
    }

    functionSig(f: FuncDef): string {
        const ret = toTypeString(getFuncReturnType(f.type as PolyType));
        return ret + ' ' + funcDefName(f) + '(' + f.params.map(funcParamString).join(', ') + ')';
    }

    visitVarDef(v: VarDef) {        
        this.cb.push(toTypeString(v.type) + " " + v.name + ' = ');
        this.visit(v.exprNode.expr);
        this.cb.pushLine(';');
    }

    intrinsicName(f: FuncDef): string {
        let name = identifierToString(f.name);
        /*
        for (const p of f.params) {
            name += '_' + p.type.toString();
        }
        */
        return name;
    }

    visitFuncDef(f: FuncDef) {        
        if (f.isIntrinsic) 
            return;

        this.cb.pushLine(this.functionSig(f));
        if (f.body.statement) 
        {
            this.visit(f.body.statement);
        }
        else if (f.body.expr) {
            this.cb.pushLine('{');
            this.cb.push('return ');
            this.visit(f.body.expr);
            this.cb.pushLine(';');
            this.cb.pushLine('}');
        }   
        else 
            throw new Error("No body statement or expression");
    }

    visitStatement(statement: Statement)
    {
        if (statement instanceof CompoundStatement) 
        {
            if (statement.statements.length === 0)
                this.cb.pushLine('{ }');
            else 
            {
                this.cb.pushLine('{');
                for (const st of statement.statements)
                    this.visit(st);
                this.cb.pushLine('}');
            }
        }
        else if (statement instanceof IfStatement) {
            this.cb.push('if (')
            this.visit(statement.condition);
            this.cb.pushLine(')');
            this.visit(statement.onTrue);
            this.cb.pushLine('else');
            this.visit(statement.onFalse);
        }
        else if (statement instanceof ReturnStatement) {
            this.cb.push('return ');
            if (statement.expr)
                this.visit(statement.expr);
            this.cb.pushLine(';');
        }
        else if (statement instanceof ContinueStatement) {
            this.cb.pushLine('continue;')
        }
        else if (statement instanceof ExprStatement) {
            this.visit(statement.expr);
            this.cb.pushLine(';')
        }
        else if (statement instanceof ForStatement) {
            const i = "i" + id++;
            const t = toTypeString(statement.type);
            const e = statement.identifier;
            const n = "n" + id++;
            this.cb.push(`${n} = `)
            this.visit(statement.array);
            this.cb.pushLine(".length;");
            this.cb.push(`for (int ${i}=0; ${i} < ${n}; ++${i})`);
            this.cb.pushLine('{');
            this.cb.push(`${t} ${e} = `);
            this.visit(statement.array);
            this.cb.pushLine(`[${i}];`);
            this.visit(statement.loop);
            this.cb.pushLine('}');
        }
        else if (statement instanceof DoStatement) {
            this.cb.pushLine('do');
            this.visit(statement.body);
            this.cb.push('while (');
            this.visit(statement.condition);
            this.cb.pushLine(')');
        }
        else if (statement instanceof WhileStatement) {
            this.cb.push('while (');
            this.visit(statement.condition);
            this.cb.pushLine(')');
            this.visit(statement.body);
        }
        else if (statement instanceof VarDeclStatement) {
            for (const vd of statement.vars) {
                const t = toHeronTypeString(vd.type);
                this.cb.push(t + ' ' + vd.name + ' = ');
                this.visit(vd.exprNode.expr);
                this.cb.pushLine(';');
            }
        }
        else if (statement instanceof EmptyStatement) {
            // Do nothing. 
        }
        else {
            throw new Error("Unrecognized statement " + statement);
        }
    }

    visitDelimited(xs: Expr[], delim = ',') {
        for (let i=0; i < xs.length; ++i) {
            if (i > 0) this.cb.push(delim);
            this.visit(xs[i])
        }
    }

    visitExpr(expr: Expr, noType = false)
    {
        if (expr instanceof VarName) {
            if (expr.node.ref instanceof FuncRef)
            {
                if (expr.node.ref.defs.length === 1) {
                    this.cb.push(funcDefName(expr.node.ref.defs[0]));                       
                } 
                else {
                    // TODO: if I could find a better way to compute this, so it was nearly impossible to screw up,
                    // that would be great.
                    if (expr.functionIndex === -1) {
                        throw new Error("No function index was computed for expression: " + expr);
                    }
                    else {
                        this.cb.push(funcDefName(expr.node.ref.defs[expr.functionIndex]));
                    }
                }
            }
            else 
            {
                this.cb.push(identifierToString(expr.name));
            }
        }
        else if (expr instanceof FunCall) {
            // TODO: this will fail when used with a lambda in the calling position.
            const fd = expr.func.node.ref.defs[expr.functionIndex];
            if (fd instanceof FuncDef)
            {
                // If this is a known reference to a funcion
                this.cb.push(funcDefName(fd));
            }
            else 
            {
                // We just visit it like an ordinary function
                this.visit(expr.func);
            }
            this.cb.push('(');
            this.visitDelimited(expr.args);
            this.cb.push(')');
        }
        else if (expr instanceof ConditionalExpr) {
            this.visit(expr.condition);
            this.cb.push(' ? ');    
            this.visit(expr.onTrue);
            this.cb.push(' : ');
            this.visit(expr.onFalse);
        }
        else if (expr instanceof ObjectLiteral || expr instanceof ObjectField) {
            throw new Error("Object literals not yet supported");
        }
        else if (expr instanceof ArrayLiteral) {
            this.cb.push('[');
            this.visitDelimited(expr.vals);
            this.cb.push(']');
        }
        else if (expr instanceof BoolLiteral) {
            this.cb.push(expr.value ? "true" : "false");
        }
        else if (expr instanceof IntLiteral) {            
            this.cb.push(expr.value.toString());
        }
        else if (expr instanceof FloatLiteral) {            
            this.cb.push(expr.value.toString());
        }
        else if (expr instanceof StrLiteral) {
            // TODO: escape the special charaters in value
            this.cb.push('"' + expr.value + '"');
        }
        else if (expr instanceof VarExpr) {
            let vars = expr.vars.slice();
            for (let i=0; i<vars.length; ++i) {
                const vd=vars[i];
                this.cb.push('((');
                this.cb.push(vd.name);
                this.cb.push(') => ');
            }
            this.visit(expr.expr);
            for (let i=vars.length-1; i >= 0; --i) {
                const vd=vars[i];
                this.cb.push(')(');
                this.visit(vd.exprNode.expr);
                this.cb.push(')');
            }
            this.cb.pushLine();
        }
        else if (expr instanceof Lambda) {
            this.cb.push('(')
            this.cb.push(expr.params.map(p => p.name).join(', '));
            this.cb.push(') => ')
            if (expr.bodyNode.expr) 
                this.visit(expr.bodyNode.expr);
            else    
                this.visit(expr.bodyNode.statement);
        }
        else if (expr instanceof PostfixDec) {
            this.visitExpr(expr.lvalue, true);
            this.cb.push('--');
        }
        else if (expr instanceof PostfixInc) {
            this.visitExpr(expr.lvalue, true);
            this.cb.push('++');
        }
        else if (expr instanceof VarAssignmentExpr) {
            this.cb.push(expr.name + ' = ');
            this.visit(expr.value);
        }
        else {
            throw new Error("Not a recognized expression " + expr);
        }

        if (expr.type && !noType) {
            this.cb.pushLine(' // ' + expr.type);
        }
    }
}