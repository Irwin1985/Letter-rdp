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
        }
    }


    /**
     * VariableStatement
     *  : 'let' VariableDeclarationList ';'
     *  ;
     */
    VariableStatement() {
        this._eat('let');
        const declarations = this.VariableDeclarationList();
        this._eat(';');

        return {
            type: 'VariableStatement',
            declarations,
        }
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
        }
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
        }
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
        }
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
        }
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
     *  : RelationalExpression
     *  | LeftHandSideExpression AssigmentOperator AssignmentExpression
     * */
    AssignmentExpression() {
        const left = this.RelationalExpression();
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
        }
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
     * LeftHandSideExpression
     *  : Identifier
     *  ;
     */
    LeftHandSideExpression() {
        return this.Identifier();
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
        }
    }

    /**
     * Extra check whether it's a valid assignment target.
     * foo = bar // target ok
     * 52 = 42   // wrong target
     */
    _checkValidAssignmentTarget(node) {
        if (node.type === 'Identifier') {
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
     *   : PrimaryExpression (MULTIPLICATIVE_OPERATOR PrimaryExpression)*
     *   ;
     */
    MultiplicativeExpression() {
        let left = this.PrimaryExpression();
        while (this._lookahead.type === 'MULTIPLICATIVE_OPERATOR') {
            // Operator: *, /
            const operator = this._eat('MULTIPLICATIVE_OPERATOR').value;
            const right = this.PrimaryExpression();
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
     *  PrimaryExpression
     *    : Literal
     *    | ParenthesizedExpression
     *    | LeftHandSideExpression
     *    ;
     */
    PrimaryExpression() {
        if (this._isLiteral(this._lookahead.type)) {
            return this.Literal();
        }
        switch (this._lookahead.type) {
            case '(': return this.ParenthesizedExpression();
            default:
                return this.LeftHandSideExpression();                
        }
    }

    /**
     * Whether the token is a literal.
     */
    _isLiteral(tokenType) {
        return tokenType === 'NUMBER' || tokenType === 'STRING';
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
     *  ;
     */
    Literal() {
        switch (this._lookahead.type) {
            case 'NUMBER':
                return this.NumericLiteral();
            case 'STRING':
                return this.StringLiteral()
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
        }
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
        }
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