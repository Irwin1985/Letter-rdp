/*
 * Main test runner
 */

const { Parser } = require('./Parser')
const { Tokenizer } = require('./Tokenizer');

const tokenizer = new Tokenizer();
const parser = new Parser();

const program = `
    X + 5 > 10;
`;

console.log("==================================");
// ----------------------------
// print all tokens
tokenizer.init(program);
let token = tokenizer.getNextToken();
while (token != null) {
    console.log(token);
    token = tokenizer.getNextToken();
}
console.log("==================================");


const ast = parser.parse(program);
console.log(JSON.stringify(ast, null, 2));

//const prompt = require('prompt-sync')({ sigint: true });
//const { Parser } = require('./Parser');

//// Testing with the REPL
//while (true) {
//    const line = prompt('>>> ');
//    if (line.length === 0) break;
//    const parser = new Parser();
//    const ast = parser.parse("//comentario");
//    console.log(JSON.stringify(ast, null, 2));
//}