#include "replication_engine.hpp"
#include <iostream>
#include <cmath>
#include <random>

namespace storage {

ReplicationEngine::ReplicationEngine(size_t poolSize) : poolSize(poolSize), shouldStop(false) {
    for (size_t i = 0; i < poolSize; ++i) {
        workers.emplace_back(&ReplicationEngine::threadWorker, this);
    }
}

ReplicationEngine::~ReplicationEngine() {
    stop();
}

void ReplicationEngine::stop() {
    {
        std::unique_lock<std::mutex> lock(queueMutex);
        shouldStop = true;
    }
    condition.notify_all();
    for (auto& worker : workers) {
        if (worker.joinable()) worker.join();
    }
}

void ReplicationEngine::enqueueJob(const ReplicationJob& job) {
    {
        std::unique_lock<std::mutex> lock(queueMutex);
        jobQueue.push(job);
    }
    condition.notify_one();
}

void ReplicationEngine::threadWorker() {
    while (true) {
        ReplicationJob job;
        {
            std::unique_lock<std::mutex> lock(queueMutex);
            condition.wait(lock, [this] { return shouldStop || !jobQueue.empty(); });
            if (shouldStop && jobQueue.empty()) return;
            job = jobQueue.front();
            jobQueue.pop();
        }

        if (executeReplication(job)) {
            completedCount++;
        } else {
            handleFailure(job);
        }
    }
}

bool ReplicationEngine::executeReplication(const ReplicationJob& job) {
    // Simulated low-level I/O or network call (libcurl would go here)
    std::cout << "[Replication] Thread " << std::this_thread::get_id() << " replicating: " << job.storageKey << " to node " << job.targetNodeUrl << std::endl;
    
    // Random failure for simulation
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_real_distribution<> dis(0, 1.0);
    
    // Simulate some work
    std::this_thread::sleep_for(std::chrono::milliseconds(200));

    // 0.8 success rate for demonstration of retry logic
    return dis(gen) < 0.8;
}

void ReplicationEngine::handleFailure(ReplicationJob job) {
    if (job.retriesRemaining > 0) {
        // Exponential Backoff: Wait duration = base * 2^(max - retriesRemaining)
        int attempt = job.maxRetries - job.retriesRemaining + 1;
        int waitTimeMs = static_cast<int>(std::pow(2, attempt) * 100);
        
        std::cout << "[Replication] Failure on " << job.storageKey << ". Retrying (Attempt " << attempt << ") in " << waitTimeMs << "ms..." << std::endl;
        
        std::this_thread::sleep_for(std::chrono::milliseconds(waitTimeMs));
        
        job.retriesRemaining--;
        enqueueJob(job);
    } else {
        std::cerr << "[Replication] Max retries reached for " << job.storageKey << ". MARKING AS FAILED." << std::endl;
        failedCount++;
    }
}

} // namespace storage
