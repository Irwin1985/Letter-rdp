/* 
 * Tokenizer spec.
 */
const Spec = [
    // --------------------------------------
    // Whitespace:
    [/^\s+/, null],

    // --------------------------------------
    // Comments:

    // Skip single-line comments:
    [/^\/\/.*/, null],

    // Skip multi-line comments:
    [/^\/\*[\s\S]*?\*\//, null],

    // --------------------------------------
    // Symbols and delimiters:
    [/^;/, ';'],  // Semicolon
    [/^{/, '{'],  // LeftBrace
    [/^}/, '}'],  // RightBrace
    [/^\(/, '('], // LeftParen
    [/^\)/, ')'], // RightParen
    [/^\[/, '['], // LeftBracket
    [/^\]/, ']'], // RightBracket
    [/^,/, ','],  // Comma
    [/^\./, '.'], // Dot


    // Relational Operators
    // <, >, <=, >=
    [/^[<>]=?/, 'RELATIONAL_OPERATOR'],
    [/^[=!]=/, 'EQUALITY_OPERATOR'],

    // Logical Operators
    // ||, &&, !
    [/^&&/, 'LOGICAL_AND'],
    [/^\|\|/, 'LOGICAL_OR'],
    [/^!/, 'LOGICAL_NOT'],


    // --------------------------------------
    // Keywords
    [/^\blet\b/, 'let'],
    [/^\bif\b/, 'if'],
    [/^\belse\b/, 'else'],
    [/^\btrue\b/, 'true'],
    [/^\bfalse\b/, 'false'],
    [/^\bnull\b/, 'null'],

    // --------------------------------------
    // OOP keywords
    [/^\bclass\b/, 'class'],
    [/^\bthis\b/, 'this'],
    [/^\bextends\b/, 'extends'],
    [/^\bsuper\b/, 'super'],
    [/^\bnew\b/, 'new'],

    // --------------------------------------
    // Iterators
    [/^\bwhile\b/, 'while'],
    [/^\bdo\b/, 'do'],
    [/^\bfor\b/, 'for'],

    [/^\bdef\b/, 'def'],
    [/^\breturn\b/, 'return'],

    // --------------------------------------
    // Assignment operators: =, *=, /=, +=, -=
    [/^=/, 'SIMPLE_ASSIGN'],
    [/^[\*\\/\+\-]=/, 'COMPLEX_ASSIGN'],

    // --------------------------------------
    // Math operators: +, -, *, /
    [/^[+\-]/, 'ADDITIVE_OPERATOR'],
    [/^[*\/]/, 'MULTIPLICATIVE_OPERATOR'],


    // --------------------------------------
    // Numbers:
    [/^\d+/, 'NUMBER'],

    // --------------------------------------
    // Double quoted String:
    [/^"[^"]*"/, 'STRING'],

    // --------------------------------------
    // Single quoted String:
    [/^'[^']*'/, 'STRING'],

    // --------------------------------------
    // Identifier
    [/^\w+/, 'IDENTIFIER'],
];

/*
 * Tokenizer class
 * Lazily pulls a token from a stream.
 */
class Tokenizer {
    /*
     * Initializes the string.
     */
    init(string) {
        this._string = string;
        this._cursor = 0; // track the position of each character
    }
    /*
     * Whether the tokenizer reached EOF.
     */
    isEOF() {
        return this._cursor === this._string.length;
    }
    /**
     * Whether we still have more tokens.
     */
    hasMoreTokens() {
        return this._cursor < this._string.length;
    }
    /*
     * Obtains next token.
     */
    getNextToken() {
        if (!this.hasMoreTokens()) {
            return null;
        }
        const string = this._string.slice(this._cursor); // crea un string desde la posición this._cursor

        for (const [regexp, tokenType] of Spec) {
            const tokenValue = this._match(regexp, string);
            // Couldn't match this rule, continue.
            if (tokenValue == null) {
                continue;
            }

            // Should skip this null token because could be a whitespace or something else
            if (tokenType == null) {
                // no llamamos a continue para que no salte a la siguiente expresión regular
                // sino que llamamos a getNextToken() para que comience de cero con las RegExp.
                return this.getNextToken();
            }

            // We return the token
            return {
                type: tokenType,
                value: tokenValue,
            };
        }

        throw new SyntaxError(`Unexpected token: "${string[0]}"`);
    }

    /*
     * Matches a token for a regular expression.
     */
    _match(regexp, string) {
        const matched = regexp.exec(string);
        if (matched == null) {
            return null;
        }
        this._cursor += matched[0].length;
        return matched[0];
    }
}

module.exports = {
    Tokenizer,
}