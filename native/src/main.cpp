#include <node_api.h>
#include "chunk_processor.hpp"
#include "replication_engine.hpp"
#include <vector>
#include <string>

using namespace storage;

// Global engine instance for simple integration
static ReplicationEngine* g_engine = nullptr;

napi_value ProcessFile(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value args[2];
    napi_get_cb_info(env, info, &argc, args, NULL, NULL);

    char path[1024];
    size_t path_len;
    napi_get_value_string_utf8(env, args[0], path, sizeof(path), &path_len);

    int64_t chunkSize;
    napi_get_value_int64(env, args[1], &chunkSize);

    auto result = ChunkProcessor::processFile(path, (size_t)chunkSize);

    napi_value array;
    napi_create_array_with_length(env, result.size(), &array);

    for (size_t i = 0; i < result.size(); ++i) {
        napi_value obj;
        napi_create_object(env, &obj);

        napi_value index, hash, size;
        napi_create_int32(env, result[i].index, &index);
        napi_create_string_utf8(env, result[i].hash.c_str(), NAPI_AUTO_LENGTH, &hash);
        napi_create_int64(env, result[i].sizeBytes, &size);

        napi_set_named_property(env, obj, "index", index);
        napi_set_named_property(env, obj, "hash", hash);
        napi_set_named_property(env, obj, "sizeBytes", size);

        napi_set_element(env, array, i, obj);
    }

    return array;
}

napi_value Replicate(napi_env env, napi_callback_info info) {
    size_t argc = 3;
    napi_value args[3];
    napi_get_cb_info(env, info, &argc, args, NULL, NULL);

    if (g_engine == nullptr) {
        g_engine = new ReplicationEngine(4); // Default to 4 threads
    }

    char key[512];
    size_t key_len;
    napi_get_value_string_utf8(env, args[0], key, sizeof(key), &key_len);

    // Get nodes array
    uint32_t nodes_len;
    napi_get_array_length(env, args[1], &nodes_len);

    for (uint32_t i = 0; i < nodes_len; ++i) {
        napi_value node_url_val;
        napi_get_element(env, args[1], i, &node_url_val);
        char node_url[512];
        napi_get_value_string_utf8(env, node_url_val, node_url, sizeof(node_url), NULL);

        ReplicationJob job;
        job.storageKey = key;
        job.targetNodeUrl = node_url;
        job.data = "dummy"; // In real usage, pass data from TS
        job.maxRetries = 3;
        job.retriesRemaining = 3;

        g_engine->enqueueJob(job);
    }

    napi_value status;
    napi_create_string_utf8(env, "queued", NAPI_AUTO_LENGTH, &status);
    return status;
}

napi_value Init(napi_env env, napi_value exports) {
    napi_property_descriptor desc[] = {
        {"processFile", NULL, ProcessFile, NULL, NULL, NULL, napi_default, NULL},
        {"replicate", NULL, Replicate, NULL, NULL, NULL, napi_default, NULL}
    };
    napi_define_properties(env, exports, 2, desc);
    return exports;
}

NAPI_MODULE(storage_native, Init)
