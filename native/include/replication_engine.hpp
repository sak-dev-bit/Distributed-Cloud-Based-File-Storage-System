#ifndef REPLICATION_ENGINE_HPP
#define REPLICATION_ENGINE_HPP

#include <string>
#include <vector>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <queue>
#include <functional>
#include <atomic>
#include <chrono>

namespace storage {

struct ReplicationJob {
    std::string storageKey;
    std::string targetNodeUrl;
    std::string data; // Assume base64 or similar for simplicity, or dummy data for simulation
    int retriesRemaining;
    int maxRetries;
};

class ReplicationEngine {
public:
    ReplicationEngine(size_t poolSize);
    ~ReplicationEngine();

    void enqueueJob(const ReplicationJob& job);
    void start();
    void stop();

    // Stats
    int getCompletedCount() const { return completedCount.load(); }
    int getFailedCount() const { return failedCount.load(); }

private:
    void threadWorker();
    bool executeReplication(const ReplicationJob& job); // Simulated network call
    void handleFailure(ReplicationJob job);

    size_t poolSize;
    std::vector<std::thread> workers;
    std::queue<ReplicationJob> jobQueue;
    std::mutex queueMutex;
    std::condition_variable condition;
    std::atomic<bool> shouldStop;

    std::atomic<int> completedCount{0};
    std::atomic<int> failedCount{0};
};

} // namespace storage

#endif // REPLICATION_ENGINE_HPP
