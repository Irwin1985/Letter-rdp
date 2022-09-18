/*
 * Main test runner
 */

const { Parser } = require('./Parser')
const { Tokenizer } = require('./Tokenizer');

const tokenizer = new Tokenizer();
const parser = new Parser();

const program = `
    // Base class
    class Point {
      def constructor(x, y) {
        this.x = x;
        this.y = y;
      }

      def calc() {
        return this.x + this.y;
      }
    }
    
    // Inheritance
    class Point3D extends Point {
      def constructor(x, y, z) {
        super(x, y);
        this.z = z;
      }

      def calc() {
        return super() + this.z;
      }
    }

    // Instance
    let p = new Point3D(10, 20, 30);

    // Call
    p.calc();
    
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