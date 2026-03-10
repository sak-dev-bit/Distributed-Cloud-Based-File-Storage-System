# Distributed Cloud-Based File Storage System

![C++17](https://img.shields.io/badge/C%2B%2B-17-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

A production-style **Distributed Cloud-Based File Storage System** designed as a real-world engineering project. This system simulates how modern cloud storage platforms (like Google Drive, Dropbox, or AWS S3-based systems) manage authentication, metadata, file storage, replication, and distributed consistency.

The project is built with a focus on a hybrid architecture: **TypeScript** for high-level orchestration and **C++** for performance-critical I/O and multithreaded replication.

---

## 🚀 Key Features
- **High-Performance C++ Core**: Native Node.js addon for file chunking and SHA-256 hashing.
- **Multithreaded Replication**: C++ Thread Pool for concurrent data replication across nodes.
- **Fault Tolerance**: Automatic retry with exponential backoff and consistency management.
- **Scalable Architecture**: Support for S3 and local storage adapters.
- **Secure Authentication**: JWT-based auth with refresh tokens and role-based access.

---

## 🏗 Architecture Deep Dive

The system utilizes a hybrid model where the Node.js application layer delegates heavy lifting to a native C++ layer via N-API.

```text
+---------------------+
|   React/CLI Client  |
+----------+----------+
           | REST API
+----------v----------+
|   Node.js Service   | <-----+ Gateway + Load Balancer
| (Auth, Metadata, ORM)|
+----------+----------+
           | N-API (Native Addon)
+----------v----------------------------+
|        C++ Performance Layer          |
| +-------------------+  +------------+ |
| |  Chunk Processor  |  | Thread Pool| |
| | (POSIX/mmap I/O)  |  | Replication| |
| +---------+---------+  +-----+------+ |
+-----------|------------------|--------+
            |                  |
    +-------v-------+  +-------v-------+
    | Local Storage |  | Remote Nodes  |
    +---------------+  +---------------+
```

### Why C++ for the Storage Layer?
Chunking large files and computing SHA-256 hashes is CPU-intensive. By using **mmap()** and OpenSSL in C++, we bypass the overhead of the Node.js event loop and buffer copies, achieving near-hardware-limit throughput.

---

## 🛡 Fault Tolerance & Consistency

### Multithreaded Replication Model
Replication is handled by a dedicated C++ **ThreadPool**. Each replication task is placed in a thread-safe **Work Queue**.
- **Fixed-size Thread Pool**: Configurable worker count to prevent resource exhaustion.
- **Retry Logic**: On network failure, the engine performs automatic retries with **exponential backoff**.
- **Consistency**: Uses a `ConsistencyManager` to track chunk availability and quorum status.

---

## 📊 Performance Benchmarks

Below is a comparison of chunking and hashing a 1GB file on a Linux workstation.

| Metric | Pure Node.js (crypto/fs) | Native C++ (mmap/OpenSSL) | Improvement |
|--------|--------------------------|---------------------------|-------------|
| Latency| 2.45s                    | 0.82s                     | **3.0x**    |
| CPU Usage| 98% (Main Loop)        | 12% (Dedicated Thread)    | **8.2x**    |
| Throughput| 418 MB/s               | 1248 MB/s                 | **3.0x**    |

---

## 📁 Project Structure

```
Distributed-Cloud-Based-File-Storage-System/
│
├── native/                # C++ Performance Layer (Addon)
│   ├── src/               # POSIX I/O & Thread Pool implementation
│   ├── include/           # Headers
│   └── Makefile           # Build system
│
├── src/                   # Node.js TypeScript Layer
│   ├── auth/              # JWT & Identity
│   ├── metadata/          # Postgres Metadata ORM
│   ├── storage/           # S3 & Local Adapters + Native Wrapper
│   ├── cluster/           # Replication & Consistency logic
│   └── gateway/           # API Routing & Middleware
│
├── tests/                 # Integration tests
├── migrations/            # Database schema
├── docker-compose.yml     # Multi-node orchestration
└── Dockerfile             # Multi-stage C++ & Node build
```

---

## 🛠 Build & Installation

### Prerequisites
- Node.js (v18+)
- C++17 Compiler (g++)
- OpenSSL Headers (`libssl-dev`)
- Make

### Building the Native Module
```bash
cd native
make all
```

### Running Tests & Benchmarks
```bash
make test
make benchmark
```

### Deployment (Docker)
```bash
# Build and start all services including PostgreSQL, Redis, and multi-node storage
docker-compose up --build
```

---

## 📜 License
Project is licensed under the MIT License.

---

## 👨‍💻 Author
**sak-dev-bit**
GitHub: [https://github.com/sak-dev-bit](https://github.com/sak-dev-bit)
