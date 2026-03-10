#include "chunk_processor.hpp"
#include <fcntl.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/mman.h>
#include <unistd.h>
#include <openssl/sha.h>
#include <iomanip>
#include <sstream>
#include <stdexcept>
#include <iostream>
#include <cstring>

namespace storage {

std::string ChunkProcessor::computeHash(const void* data, size_t length) {
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256_CTX sha256;
    SHA256_Init(&sha256);
    SHA256_Update(&sha256, data, length);
    SHA256_Final(hash, &sha256);

    std::stringstream ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; ++i) {
        ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    return ss.str();
}

std::vector<ChunkInfo> ChunkProcessor::processFile(const std::string& filePath, size_t chunkSize) {
    std::vector<ChunkInfo> chunks;
    
    // Using POSIX open()
    int fd = open(filePath.c_str(), O_RDONLY);
    if (fd == -1) {
        throw std::runtime_error("Failed to open file: " + filePath);
    }

    struct stat sb;
    if (fstat(fd, &sb) == -1) {
        close(fd);
        throw std::runtime_error("Failed to fstat file: " + filePath);
    }

#ifdef __linux__
    // Performance optimization: hint sequential access to the kernel
    posix_fadvise(fd, 0, sb.st_size, POSIX_FADV_SEQUENTIAL);
#endif

    size_t fileSize = sb.st_size;

    if (fileSize == 0) {
        close(fd);
        return chunks;
    }

    // Using mmap for performance (low-level systems optimization)
    void* mappedData = mmap(NULL, fileSize, PROT_READ, MAP_PRIVATE, fd, 0);
    if (mappedData == MAP_FAILED) {
        close(fd);
        throw std::runtime_error("Failed to mmap file: " + filePath);
    }

    uint8_t* ptr = static_cast<uint8_t*>(mappedData);
    size_t offset = 0;
    int index = 0;

    while (offset < fileSize) {
        size_t actualChunkSize = std::min(chunkSize, fileSize - offset);
        std::string hash = computeHash(ptr + offset, actualChunkSize);
        
        chunks.push_back({index++, hash, actualChunkSize});
        offset += actualChunkSize;
    }

    // Cleanup
    munmap(mappedData, fileSize);
    close(fd);

    return chunks;
}

bool ChunkProcessor::validateFile(const std::string& filePath, const std::vector<ChunkInfo>& expectedChunks) {
    auto actualChunks = processFile(filePath, expectedChunks[0].sizeBytes); // Assume constant chunk size
    if (actualChunks.size() != expectedChunks.size()) return false;

    for (size_t i = 0; i < actualChunks.size(); ++i) {
        if (actualChunks[i].hash != expectedChunks[i].hash) return false;
    }
    return true;
}

} // namespace storage
