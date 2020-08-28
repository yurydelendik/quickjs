/*
 * QuickJS sandbox
 */
#include <stdlib.h>
#include <stdio.h>
#include <stdarg.h>
#include <inttypes.h>
#include <string.h>
#include <assert.h>
#include <unistd.h>
#include <errno.h>
#include <fcntl.h>
#include <time.h>
#if defined(__APPLE__)
#include <malloc/malloc.h>
#elif defined(__linux__)
#include <malloc.h>
#endif

#include "cutils.h"
#include "quickjs-libc.h"

__attribute__((import_module("qjs_sink")))
__attribute__((import_name("callback")))
int callback(JSContext *ctx, const char *data, size_t data_len, const char **out, size_t *out_len);

static JSValue wasm_callback(JSContext *ctx, JSValueConst this_val,
                        int argc, JSValueConst *argv)
{
    JSValue json;
    const char *p, *out;
    size_t len, out_len;

    json = JS_JSONStringify(ctx, argv[0], JS_UNDEFINED, JS_UNDEFINED);
    
    p = JS_ToCString(ctx, json);
    len = strlen(p);
    callback(ctx, p, len, &out, &out_len);
    JS_FreeCString(ctx, p);
    JS_FreeValue(ctx, json);

    if (!out) {
        return JS_UNDEFINED;
    }
    json = JS_ParseJSON(ctx, out, out_len, NULL);
    return json;
}

JSRuntime *rt;

__attribute__((export_name("new_context")))
JSContext *new_context()
{
    JSContext *ctx;
    ctx = JS_NewContext(rt);

    JSValue global_obj;
    
    global_obj = JS_GetGlobalObject(ctx);

    JS_SetPropertyStr(ctx, global_obj, "callback",
                      JS_NewCFunction(ctx, wasm_callback, "callback", 1));

    return ctx;
}

__attribute__((export_name("free_context")))
void free_context(JSContext *ctx)
{
    JS_FreeContext(ctx);
}

__attribute__((export_name("eval")))
void eval(JSContext *ctx, const char *str, size_t len, const char **out, size_t *out_len)
{
    JSValue ret;
    *out = NULL;
    *out_len = 0;
    ret = JS_Eval(ctx, str, len, "<evalScript>", JS_EVAL_TYPE_GLOBAL);
    if (JS_IsException(ret)) {
        JS_FreeValue(ctx, ret);
        return;
    }
    if (out) {
        JSValue json;
        const char *p;

        json = JS_JSONStringify(ctx, ret, JS_UNDEFINED, JS_UNDEFINED);
        
        p = JS_ToCString(ctx, json);
        *out = p;
        *out_len = strlen(p);
        JS_FreeValue(ctx, json);
    }
    JS_FreeValue(ctx, ret);
}


__attribute__((import_module("qjs_sink")))
__attribute__((import_name("load_module")))
int load_module(JSContext *ctx, const char *name, size_t name_len, const char **out, size_t *out_len);

JSModuleDef *wasm_module_loader(JSContext *ctx,
                                const char *module_name, void *opaque)
{
    const char *script = NULL;
    size_t script_len = 0;
    load_module(ctx, module_name, strlen(module_name), &script, &script_len);
    abort();
}

void _initialize()
{
    rt = JS_NewRuntime();
    if (!rt) {
        abort();
    }
    /* loader for ES6 modules */
    JS_SetModuleLoaderFunc(rt, NULL, wasm_module_loader, NULL);
}
