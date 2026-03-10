#include "chunk_processor.hpp"
#include <iostream>
#include <chrono>
#include <vector>
#include <fstream>

void runBenchmark(const std::string& filename, size_t fileSize) {
    std::cout << "Benchmarking with " << fileSize / (1024 * 1024) << "MB file..." << std::endl;
    
    // Create large dummy file
    std::ofstream ofs(filename, std::ios::binary);
    std::vector<char> buffer(1024 * 1024, 'A');
    for (size_t i = 0; i < fileSize / (1024 * 1024); ++i) {
        ofs.write(buffer.data(), buffer.size());
    }
    ofs.close();

    auto start = std::chrono::high_resolution_clock::now();
    auto chunks = storage::ChunkProcessor::processFile(filename, 1024 * 1024);
    auto end = std::chrono::high_resolution_clock::now();
    
    std::chrono::duration<double> diff = end - start;
    std::cout << "C++ mmap + SHA-256 took: " << diff.count() << "s" << std::endl;
    std::cout << "Throughput: " << (fileSize / (1024 * 1024)) / diff.count() << " MB/s" << std::endl;

    remove(filename.c_str());
}

int main() {
    runBenchmark("bench.tmp", 100 * 1024 * 1024); // 100MB
    return 0;
}
