#!/bin/bash
WASI_PREFIX_TEST=${WASI_PREFIX:?"Specify a WASI_PREFIX"}
make qjss.wasm CC=$WASI_PREFIX/bin/clang
