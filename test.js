// TODO wasi
// node --experimental-wasm-bigint --experimental-wasi-unstable-preview1 test.js
let buf = require('fs').readFileSync("qjss.wasm");
let { QJSS } = require('./qjss.js');
let qjss = new QJSS();
WebAssembly.instantiate(buf, qjss.wasmImport).then(m => {
    
    let { _initialize, memory, new_context, malloc, free, eval } = m.instance.exports;
    qjss.defineMemory({memory, malloc, free});
    _initialize();
    qjss.callback = (e) => `4${e}2`;
    
    let ctx = new_context();
    let script = (new TextEncoder()).encode("callback('test');\n");
    let p = malloc(script.length);
    new Uint8Array(memory.buffer, p, script.length).set(script);
    let out = malloc(8);
    eval(ctx, p, script.length, out, out + 4);
    let t = new Uint32Array(memory.buffer, out, 2);
    console.log((new TextDecoder()).decode(new Uint8Array(memory.buffer, t[0], t[1])))

}, console.error);
