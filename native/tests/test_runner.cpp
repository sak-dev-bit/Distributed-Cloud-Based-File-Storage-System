#include "chunk_processor.hpp"
#include "replication_engine.hpp"
#include <iostream>
#include <cassert>
#include <fstream>
#include <vector>

void testChunkProcessor() {
    std::cout << "Testing ChunkProcessor..." << std::endl;
    std::string testFile = "test_data.tmp";
    std::ofstream ofs(testFile, std::ios::binary);
    std::string data = "Hello World! This is a test for chunking. 1234567890";
    ofs << data;
    ofs.close();

    auto chunks = storage::ChunkProcessor::processFile(testFile, 10);
    assert(chunks.size() > 0);
    std::cout << "Chunked into " << chunks.size() << " chunks." << std::endl;
    
    bool valid = storage::ChunkProcessor::validateFile(testFile, chunks);
    assert(valid);
    std::cout << "Validation PASSED." << std::endl;
    
    remove(testFile.c_str());
}

void testReplicationEngine() {
    std::cout << "Testing ReplicationEngine..." << std::endl;
    storage::ReplicationEngine engine(2);
    
    storage::ReplicationJob job;
    job.storageKey = "test_key";
    job.targetNodeUrl = "http://localhost:8001";
    job.maxRetries = 2;
    job.retriesRemaining = 2;
    
    engine.enqueueJob(job);
    
    // Wait for jobs to process
    std::this_thread::sleep_for(std::chrono::seconds(1));
    
    std::cout << "Completed: " << engine.getCompletedCount() << std::endl;
    std::cout << "Failed: " << engine.getFailedCount() << std::endl;
    
    assert(engine.getCompletedCount() + engine.getFailedCount() == 1);
}

int main() {
    try {
        testChunkProcessor();
        testReplicationEngine();
        std::cout << "ALL TESTS PASSED!" << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Test failed with exception: " << e.what() << std::endl;
        return 1;
    }
    return 0;
}
