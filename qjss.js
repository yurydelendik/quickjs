class QJSS {
    constructor() {
        let qjss = this;
        this.wasmImport = {
            wasi_snapshot_preview1: {
                fd_seek() { throw new Error("fd_seek"); },
                fd_write(fd, iovs_ptr, iovs_len, nwritten) {
                    let total = 0;
                    for (let i = 0; i < iovs_len; i++) {
                      let buf = qjss.read32(iovs_ptr); iovs_ptr += 4;
                      let len = qjss.read32(iovs_ptr); iovs_ptr += 4;
                      console.error(qjss.readStr(buf, len));
                      total += len;
                    }
                    this.write32(nwritten, total);
                    return 0;
                },
                fd_close() { throw new Error("fd_close"); },
                fd_fdstat_get() { throw new Error("fd_fdstat_get"); },
                clock_time_get(a, b, c) {
                    let memory = qjss.mem.memory;
                    let t = process.hrtime.bigint();
                    (new Uint32Array(memory.buffer, c, 1))[0] = Number(t & 0xFFFFFFFFn);
                    (new Uint32Array(memory.buffer, c, 1))[1] = Number(t >> 32n);
                    return 0; 
                },
            },
            qjs_sink: {
                load_module(ctx, name, name_len, out, out_len) {
                    throw new Error("load_module");
                },
                callback(ctx, data, data_len, out, out_len) {
                    let s = JSON.parse(qjss.readStr(data, data_len));
                    let r = qjss.callback(s);
                    let result = (new TextEncoder()).encode(JSON.stringify(r));
                    let p = qjss.mem.alloc(result.length + 1);
                    let memory = qjss.mem.memory;
                    new Uint8Array(memory.buffer, p, result.length).set(result);
                    new Uint8Array(memory.buffer, p + result.length, 1)[0] = 0;
                    qjss.write32(out, p);
                    qjss.write32(out_len, result.length);
                    return 0;
                }
            }
        };
        this.mem = null;
        this.callback = null;
    }

    defineMemory({memory, malloc, free}) {
        this.mem = {
            memory,
            alloc: malloc,
            free,
        };
    }

    read32(p) { return (new Uint32Array(this.mem.memory.buffer, p, 4))[0]; }
    write32(p, v) { (new Uint32Array(this.mem.memory.buffer, p, 4))[0] = v; }
    readStr(p, len) { 
        return (new TextDecoder()).decode(new Uint8Array(this.mem.memory.buffer, p, len));
    }
}

module.exports = {
    QJSS
};