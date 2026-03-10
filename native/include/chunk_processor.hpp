#ifndef CHUNK_PROCESSOR_HPP
#define CHUNK_PROCESSOR_HPP

#include <string>
#include <vector>
#include <cstddef>

namespace storage {

struct ChunkInfo {
    int index;
    std::string hash;
    size_t sizeBytes;
};

class ChunkProcessor {
public:
    static std::vector<ChunkInfo> processFile(const std::string& filePath, size_t chunkSize);
    static bool validateFile(const std::string& filePath, const std::vector<ChunkInfo>& expectedChunks);
private:
    static std::string computeHash(const void* data, size_t length);
};

} // namespace storage

#endif // CHUNK_PROCESSOR_HPP
