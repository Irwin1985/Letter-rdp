/**
 * Letter parser: recursive descent implementation.
 */

const { Tokenizer } = require('./Tokenizer');

class Parser {

    /**
     * Initializes the parser
     */
    constructor() {
        this._string = ''; // string es lo mismo que input o source.
        this._tokenizer = new Tokenizer(); // Tokenizer es lo mismo que Scanner o Lexer.
    }

    /**
     * Parses a string into an AST
     */
    parse(string) {
        this._string = string;
        this._tokenizer.init(this._string);

        // Prime the tokenizer to obtain the first
        // token which is our lookahead. The lookahead is
        // used for predective parsing.

        this._lookahead = this._tokenizer.getNextToken();

        // Parse recursively starting from the main
        // entry point, the Program:
        return this.Program();
    }

    /**
     * Main entry point.
     * 
     * Program
     *  : StatementList
     *  ;
     */
    Program() {
        return {
            type: 'Program',
            body: this.StatementList(),
        };
    }

    /**
     * StatementList
     *  : (Statement)*
     *  ;
     */
    StatementList(stopLookAhead = null) {
        const statementList = [this.Statement()];
        while (this._lookahead != null && this._lookahead.type !== stopLookAhead) {
            statementList.push(this.Statement());
        }
        return statementList;
    }

    /**
     * Statement
     *  : ExpressionStatement
     *  | BlockStatement
     *  | EmptyStatement
     *  | VariableStatement
     *  | IfStatement
     *  | IterationStatement
     *  | FunctionStatement
     *  | ReturnStatement
     *  | ClassDeclaration
     *  ;
     */
    Statement() {
        switch (this._lookahead.type) {
            case '{':
                return this.BlockStatement();
            case ';':
                return this.EmptyStatement();
            case 'let':
                return this.VariableStatement();
            case 'if':
                return this.IfStatement();
            case 'def':
                return this.FunctionDeclaration();
            case 'return':
                return this.ReturnStatement();
            case 'class':
                return this.ClassDeclaration();
            case 'while':
            case 'do':
            case 'for':
                return this.IterationStatement(this._lookahead.type);
            default:
                return this.ExpressionStatement();
        }
    }

    /**
     * IfStatement
     *  : 'if' '(' Expression ')' Statement ('else' Statement)?
     *  ;
     */
    IfStatement() {
        this._eat('if');
        this._eat('(');
        const test = this.Expression();
        this._eat(')');
        const consequent = this.Statement();
        const alternate = (this._lookahead != null && this._lookahead.type === 'else') ? this._eat('else') && this.Statement() : null;

        return {
            type: 'IfStatement',
            test,
            consequent,
            alternate,
        };
    }

    /**
     * FunctionDeclaration
     *  : 'def' Identifier '(' OptFormalParameterList ')' BlockStatement
     *  ;
     */
    FunctionDeclaration() {
        this._eat('def');
        const name = this.Identifier();

        this._eat('(');
        const params = this._lookahead.type !== ')' ? this.FormalParameterList() : [];
        this._eat(')');

        const body = this.BlockStatement();

        return {
            type: 'FunctionDeclaration',
            name,
            params,
            body,
        }
    }

    /**
     * FormalParameterList
     *  : Identifier
     *  | FormalParameterList ',' Identifier
     *  ;
     */
    FormalParameterList() {
        const params = [];
        do {
            params.push(this.Identifier());
        } while (this._lookahead.type === ',' && this._eat(','));

        return params;
    }

    /**
     * ReturnStatement
     *  : 'return' OptExpression ';'
     *  ;
     */
    ReturnStatement() {
        this._eat('return');
        let argument = (this._lookahead.type !== ';') ? this.Expression() : null;
        this._eat(';');
        return {
            type: 'ReturnStatement',
            argument,
        }
    }

    /**
     * ClassDeclaration
     *  : 'class' Identifier OptClassExtends BlockStatement
     *  ;
     */
    ClassDeclaration() {
        this._eat('class');
        const id = this.Identifier();
        const superClass = (this._lookahead.type === 'extends') ? this.ClassExtends() : null;

        const body = this.BlockStatement();

        return {
            type: 'ClassDeclaration',
            id,
            superClass,
            body,
        }

    }

    /**
     * ClassExtends
     *  : 'extends' Identifier
     *  ;
     */
    ClassExtends() {
        this._eat('extends');
        return this.Identifier();
    }

    /**
     * IterationStatement
     *  : WhileStatement
     *  | DoStatement
     *  | ForStatement
     *  ;
     */
    IterationStatement() {
        switch (this._lookahead.type) {
            case 'while':
                return this.WhileStatement();
            case 'do':
                return this.DoStatement();
            case 'for':
                return this.ForStatement();
            default:
                return null;
        }
    }

    /*
     * WhileStatement
     *  : 'while' '(' Expression ')' Statement
     *  ;
     */
    WhileStatement() {
        this._eat('while');
        this._eat('(');
        const test = this.Expression();
        this._eat(')');
        const body = this.Statement();

        return {
            type: 'WhileStatement',
            test,
            body,
        };

    }

    /*
     * DoStatement
     *  : 'do' Statement 'while' '(' Expression ')' ';'
     *  ;
     */
    DoStatement() {
        this._eat('do');
        const body = this.Statement();
        this._eat('while');

        this._eat('(');
        const test = this.Expression();
        this._eat(')');
        this._eat(';');


        return {
            type: 'DoStatement',
            body,
            test,
        };
    }

    /**
     * ForStatement
     *  : 'for' '(' OptForStatementInit ';' OptExpression ';' OptExpression)' Statement
     *  ;
     */
    ForStatement() {
        this._eat('for');
        this._eat('(');

        // Initializer
        const init = this._lookahead.type !== ';' ? this.ForStatementInit() : null;
        this._eat(';');

        // Test
        const test = this._lookahead.type !== ';' ? this.Expression() : null;
        this._eat(';');

        // Updater
        const update = this._lookahead.type !== ')' ? this.Expression() : null;
        this._eat(')');

        const body = this.Statement();

        return {
            type: 'ForStatement',
            init,
            test,
            update,
            body,
        };
    }


    /**
     * ForStatementInit
     *  : VariableStatementInit
     *  | Expression
     *  ;
     */
    ForStatementInit() {
        if (this._lookahead.type === 'let') {
            return this.VariableStatementInit();
        }
        return this.Expression();
    }

    /**
     * VariableStatementInit
     *  : 'let' VariableDeclarationList
     *  ;
     */
    VariableStatementInit() {
        this._eat('let');
        const declarations = this.VariableDeclarationList();

        return {
            type: 'VariableStatement',
            declarations,
        }
    }
    /**
     * VariableStatement
     *  : 'let' VariableDeclarationList ';'
     *  ;
     */
    VariableStatement() {
        const variableStatement = this.VariableStatementInit();
        this._eat(';');

        return variableStatement;
    }

    /**
     * VariableDeclarationList
     *  : VariableDeclaration
     *  | VariableDeclarationList ',' VariableDeclaration
     *  ;
     */
    VariableDeclarationList() {
        const declarations = [];

        do {
            declarations.push(this.VariableDeclaration())
        } while (this._lookahead.type === ',' && this._eat(','));

        return declarations;
    }

    /**
     * VariableDeclaration
     *  : Identifier OptVariableInitializer
     */
    VariableDeclaration() {
        const id = this.Identifier();
        // OptVariableInitializer
        const init = (this._lookahead.type !== ';' && this._lookahead.type !== ',') ? this.VariableInitializer() : null;

        return {
            type: 'VariableDeclaration',
            id,
            init,
        };
    }

    /**
     * VariableInitializer
     *  : SIMPLE_ASSIGN AssignmentExpression
     *  ;
     */
    VariableInitializer() {
        this._eat('SIMPLE_ASSIGN');
        return this.AssignmentExpression();
    }

    /**
     * ExpressionStatement
     *  : Expression ';'
     *  ;
     */
    ExpressionStatement() {
        const expression = this.Expression();
        this._eat(';');
        return {
            type: 'ExpressionStatement',
            expression,
        };
    }

    /**
     * BlockStatement
     *  : '{' OptStatementList '}'
     *  ;
     */
    BlockStatement() {
        this._eat('{');
        const body = this._lookahead.type !== '}' ? this.StatementList('}') : [];
        this._eat('}');
        return {
            type: 'BlockStatement',
            body,
        };
    }

    /**
     * EmptyStatement
     *   : ';'
     *   ;
     */
    EmptyStatement() {
        this._eat(';');
        return {
            type: 'EmptyStatement',
        };
    }


    /**
     * Expression
     *  : AssignmentExpression
     *  ;
     */
    Expression() {
        return this.AssignmentExpression();
    }

    /**
     * AssignmentExpression
     *  : LogicalORExpression
     *  | LeftHandSideExpression AssigmentOperator AssignmentExpression
     * */
    AssignmentExpression() {
        const left = this.LogicalORExpression();
        // Si el token actual es distinto de (=, +=, -=, *=, /=)
        // entonces no es un nodo Assignment así que retornamos.
        if (!this._isAssignmentOperator(this._lookahead.type)) {
            return left;
        }
        // Es un nodo assignment
        return {
            type: 'AssignmentExpression',
            operator: this.AssignmentOperator().value,
            left: this._checkValidAssignmentTarget(left),
            right: this.AssignmentExpression(),
        };
    }

    /**
     * LogicalORExpression
     *  : LogicalANDExpression
     *  | LogicalANDExpression LOGICAL_OR LogicalANDExpression
     *  ;
     */
    LogicalORExpression() {
        let left = this.LogicalANDExpression();

        while (this._lookahead.type === 'LOGICAL_OR') {
            const operator = this._eat('LOGICAL_OR').value;
            const right = this.LogicalANDExpression();
            left = {
                type: 'LogicalExpression',
                operator,
                left,
                right,
            };
        }
        return left;
    }

    /**
     * LogicalANDExpression
     *  : EqualityExpression
     *  | EqualityExpression LOGICAL_AND EqualityExpression
     *  ;
     */
    LogicalANDExpression() {
        let left = this.EqualityExpression();

        while (this._lookahead.type === 'LOGICAL_AND') {
            const operator = this._eat('LOGICAL_AND').value;
            const right = this.EqualityExpression();
            left = {
                type: 'LogicalExpression',
                operator,
                left,
                right,
            };
        }
        return left;
    }

    /**
     * EqualityExpression
     *  : RelationalExpression
     *  | RelationalExpression EQUALITY_OPERATOR RelationalExpression
     *  ;
     */
    EqualityExpression() {
        let left = this.RelationalExpression();

        while (this._lookahead.type === 'EQUALITY_OPERATOR') {
            const operator = this._eat('EQUALITY_OPERATOR').value;
            const right = this.RelationalExpression();
            left = {
                type: 'BinaryExpression',
                operator,
                right,
            }
        }

        return left;
    }

    /**
     * RelationalExpression
     *  : AdditiveExpression
     *  | AdditiveExpression RELATIONAL_OPERATOR AdditiveExpression
     */
    RelationalExpression() {
        let left = this.AdditiveExpression();

        while (this._lookahead.type === 'RELATIONAL_OPERATOR') {
            const operator = this._eat('RELATIONAL_OPERATOR').value;
            const right = this.AdditiveExpression();
            left = {
                type: 'BinaryExpression',
                operator,
                left,
                right,
            }
        }

        return left;
    }

    /**
     * Identifier
     *  : IDENTIFIER
     *  ;
     */
    Identifier() {
        const name = this._eat('IDENTIFIER').value;
        return {
            type: 'Identifier',
            name,
        };
    }

    /**
     * Extra check whether it's a valid assignment target.
     * foo = bar // target ok
     * 52 = 42   // wrong target
     */
    _checkValidAssignmentTarget(node) {
        if (node.type === 'Identifier' || node.type == 'MemberExpression') {
            return node;
        }
        throw new SyntaxError('Invalid left-hand side in assignment expression');
    }

    /**
     * Whether the token is an assignment operator.
     */
    _isAssignmentOperator(tokenType) {
        return tokenType === 'SIMPLE_ASSIGN' || tokenType === 'COMPLEX_ASSIGN';
    }

    /**
     * AssignmentOperator
     *  : SIMPLE_ASSIGN
     *  | COMPLEX_ASSIGN
     *  ;
     */
    AssignmentOperator() {
        if (this._lookahead.type === 'SIMPLE_ASSIGN') {
            return this._eat('SIMPLE_ASSIGN');
        }
        return this._eat('COMPLEX_ASSIGN');
    }

    /**
     * AdditiveExpression
     *  : MultiplicativeExpression (ADDITIVE_OPERATOR MultiplicativeExpression)*
     *  ;
     */
    AdditiveExpression() {
        let left = this.MultiplicativeExpression();

        while (this._lookahead.type === 'ADDITIVE_OPERATOR') {
            // Operator: +, -
            const operator = this._eat('ADDITIVE_OPERATOR').value;
            const right = this.MultiplicativeExpression();
            left = {
                type: 'BinaryExpression',
                operator,
                left,
                right,
            }
        }

        return left;
    }

    /** 
     *  MultiplicativeExpression
     *   : UnaryExpression (MULTIPLICATIVE_OPERATOR UnaryExpression)*
     *   ;
     */
    MultiplicativeExpression() {
        let left = this.UnaryExpression();
        while (this._lookahead.type === 'MULTIPLICATIVE_OPERATOR') {
            // Operator: *, /
            const operator = this._eat('MULTIPLICATIVE_OPERATOR').value;
            const right = this.UnaryExpression();
            left = {
                type: 'BinaryExpression',
                operator,
                left,
                right,
            }
        }
        return left;
    }

    /**
     * UnaryExpression
     *  : LeftHandSideExpression
     *  | ADDITIVE_OPERATOR UnaryExpression
     *  | LOGICAL_NOT UnaryExpression
     *  ;
     */
    UnaryExpression() {
        let operator;
        switch (this._lookahead.type) {
            case 'ADDITIVE_OPERATOR':
                operator = this._eat('ADDITIVE_OPERATOR').value;
                break;
            case 'LOGICAL_NOT':
                operator = this._eat('LOGICAL_NOT').value;
                break;
        }
        if (operator != null) {
            return {
                type: 'UnaryExpression',
                operator,
                argument: this.UnaryExpression(), // right recursive e.g: --x, ++5, etc
            };
        }
        return this.LeftHandSideExpression();
    }

    /**
     * LeftHandSideExpression
     *  : CallMemberExpression
     *  ;
     */
    LeftHandSideExpression() {
        return this.CallMemberExpression();
    }

    /**
     * CallMemberExpression
     *  : MemberExpression
     *  | CallExpression
     *  ;
     */
    CallMemberExpression() {
        // Super call:
        if (this._lookahead.type === 'super') {
            return this._CallExpression(this.Super());
        }

        // Member part, might be part of a call:
        const member = this.MemberExpression();

        // See if we have a call expression:
        if (this._lookahead.type === '(') {
            return this._CallExpression(member);
        }

        // Simple member expression:
        return member;
    }

    /**
     * Generic call expression helper.
     * 
     * CallExpression
     *  : Callee Arguments
     *  ;
     *  
     *  Callee
     *  : MemberExpression
     *  | CallExpression
     *  ;
     */
    _CallExpression(callee) {
        let callExpression = {
            type: 'CallExpression',
            callee,
            arguments: this.Arguments(),
        }
        if (this._lookahead.type === '(') {
            callExpression = this._CallExpression(callExpression);
        }
        return callExpression;
    }

    /**
     * Arguments
     *  : '(' OptArgumentList ') '
     *  ;
     */
    Arguments() {
        this._eat('(');
        const argumentList = (this._lookahead.type !== ')') ? this.ArgumentList() : [];
        this._eat(')');

        return argumentList;
    }

    /**
     * ArgumentList
     *  : AssignmentExpression
     *  | ArgumentList ',' AssignmentExpression e.g: foo(bar = z, baz = 2)
     *  ;
     */
    ArgumentList() {
        const argumentList = [];
        do {
            argumentList.push(this.AssignmentExpression());
        } while (this._lookahead.type === ',' && this._eat(','));

        return argumentList;
    }

    /**
     * MemberExpression
     *  : PrimaryExpression
     *  | MemberExpression '.' Identifier
     *  | MemberExpression '[' Expression ']'
     *  ;
     */

    MemberExpression() {
        let object = this.PrimaryExpression();
        while (this._lookahead.type === '.' || this._lookahead.type === '[') {
            if (this._lookahead.type === '.') {
                this._eat('.');
                const property = this.Identifier();
                object = {
                    type: 'MemberExpression',
                    computed: false,
                    object,
                    property,
                }
            } else {
                this._eat('[');
                const property = this.Expression();
                this._eat(']');
                object = {
                    type: 'MemberExpression',
                    computed: true,
                    object,
                    property,
                }
            }
        }

        return object;
    }

    /** 
     *  PrimaryExpression
     *    : Literal
     *    | ParenthesizedExpression
     *    | Identifier
     *    | ThisExpression
     *    | NewExpression
     *    ;
     */
    PrimaryExpression() {
        if (this._isLiteral(this._lookahead.type)) {
            return this.Literal();
        }
        switch (this._lookahead.type) {
            case '(': return this.ParenthesizedExpression();
            case 'IDENTIFIER':
                return this.Identifier();
            case 'this':
                return this.ThisExpression();
            case 'new':
                return this.NewExpression();
            default:
                throw new SyntaxError(`Unexpected primary expression.`);
        }
    }

    /**
     * ThisExpression
     *  : 'this'
     *  ;
     */
    ThisExpression() {
        this._eat('this');
        return {
            type: 'ThisExpression',
        };
    }

    /**
     * Super
     *  : 'super'
     *  ;
     */
    Super() {
        this._eat('super');
        return {
            type: 'Super',
        };
    }

    /**
     * NewExpression
     *  : 'new' MemberExpression Arguments -> e.g: new MyNamespace.MyClass(1, 2);
     *  ;
     */
    NewExpression() {
        this._eat('new');
        return {
            type: 'NewExpression',
            callee: this.MemberExpression(),
            arguments: this.Arguments(),
        }
    }

    /**
     * Whether the token is a literal.
     */
    _isLiteral(tokenType) {
        return tokenType === 'NUMBER' || tokenType === 'STRING' ||
            tokenType === 'true' || tokenType === 'false' || tokenType === 'null';
    }

    /** 
     *  ParenthesizedExpression
     *    : '(' Expression ')'
     *    ;
     */
    ParenthesizedExpression() {
        this._eat('(');
        const expression = this.Expression();
        this._eat(')');
        return expression;
    }

    /*
     * Literal
     *  : NumericLiteral
     *  | StringLiteral
     *  | BooleanLiteral
     *  | NullLiteral
     *  ;
     */
    Literal() {
        switch (this._lookahead.type) {
            case 'NUMBER':
                return this.NumericLiteral();
            case 'STRING':
                return this.StringLiteral();
            case 'true':
                return this.BooleanLiteral(true);
            case 'false':
                return this.BooleanLiteral(false);
            case 'null':
                return this.NullLiteral();
        }
        throw new SyntaxError(`Literal: unexpected literal production.`);
    }

    /*
     * NumericLiteral
     *  : NUMBER
     *  ;
     */
    NumericLiteral() {
        const token = this._eat('NUMBER');
        return {
            type: 'NumericLiteral',
            value: Number(token.value),
        };
    }

    /**
     * StringLiteral
     *   : STRING
     *   ;
     */
    StringLiteral() {
        const token = this._eat('STRING');
        return {
            type: 'StringLiteral',
            value: token.value.slice(1, -1), // extrae pepe de "pepe"
        };
    }

    /**
     * BooleanLiteral
     *  : TRUE
     *  | FALSE
     *  ;
     */
    BooleanLiteral(value) {
        this._eat(value ? 'true' : 'false');
        return {
            type: 'BooleanLiteral',
            value,
        };
    }

    /**
     * NullLiteral
     *  : 'null'
     *  ;
     */
    NullLiteral() {
        this._eat('null');
        return {
            type: 'NullLiteral',
            value: null,
        };
    }

    /*
     * Expects a token of a given type.
     */
    _eat(tokenType) {
        const token = this._lookahead;

        if (token == null) { // un token nulo es como un token EOF.
            throw new SyntaxError(`Unexpected end of input, expected: "${tokenType}"`);
        }

        if (token.type !== tokenType) {
            throw new SyntaxError(`Unexpected token: "${token.value}", expected: "${tokenType}"`);
        }

        // Advance to next token.
        this._lookahead = this._tokenizer.getNextToken();

        return token;
    }
}

module.exports = {
    Parser,
}