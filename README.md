# Distributed Cloud-Based File Storage System

A production-style **Distributed Cloud-Based File Storage System** designed as a real-world engineering project. This system simulates how modern cloud storage platforms (like Google Drive, Dropbox, or AWS S3-based systems) manage authentication, metadata, file storage, replication, and distributed consistency.

The project is built with a focus on:

* Real-world architecture
* Scalable system design
* Practical engineering tradeoffs
* Production-like structure

---

## 🚀 Project Goals

* Build a **distributed storage architecture**
* Implement **secure authentication**
* Support **chunked file uploads**
* Enable **cloud + local hybrid storage**
* Maintain **file metadata and versioning**
* Simulate **replication and failover**
* Provide **scalable APIs**
* Apply **real-world backend engineering practices**

---

## 🧱 System Architecture

**Architecture Style:** Modular Monolith (Microservice-inspired)

```
Client
  ↓
API Gateway
  ↓
-----------------------------------
| Auth Service                     |
| Metadata Service                 |
| Storage Service                  |
| Replication Service              |
| Monitoring Service               |
-----------------------------------
  ↓
Cloud Storage (AWS S3 / Local FS)
  ↓
Database (PostgreSQL)
  ↓
Cache (Redis)
```

---

## ⚙ Tech Stack

### Backend

* Node.js
* Express.js
* TypeScript

### Storage

* AWS S3 (Primary)
* Local File System (Fallback)

### Database

* PostgreSQL

### Cache

* Redis

### Auth

* JWT
* Refresh Tokens

### DevOps

* Docker
* Docker Compose
* Nginx

### Testing

* Jest
* Supertest

---

## 📁 Project Structure

```
Distributed-Cloud-Based-File-Storage-System/
│
├── src/
│   ├── auth/
│   ├── metadata/
│   ├── storage/
│   ├── replication/
│   ├── gateway/
│   ├── monitoring/
│   ├── security/
│   └── app.ts
│
├── tests/
├── migrations/
├── scripts/
├── nginx/
├── docker-compose.yml
├── Dockerfile
├── tsconfig.json
├── jest.config.cjs
└── package.json
```

---

## 🔐 Core Features

### Authentication

* User registration & login
* JWT authentication
* Refresh tokens
* Token blacklist
* Role-based access control

### File Storage

* Chunked uploads
* Multipart uploads
* Cloud storage integration
* Local fallback storage
* File hashing
* Integrity validation

### Metadata Management

* File metadata
* Folder structure
* Ownership mapping
* Permissions
* File versioning
* Soft deletes

### Distribution

* Replication factor
* Multi-node storage
* Eventual consistency
* Node health checks
* Failover handling
* Rebalancing

### Security

* Signed URLs
* Input sanitization
* File type validation
* Rate limiting
* Expiring access links

### Monitoring

* Request logging
* Error tracking
* Performance metrics
* Storage usage metrics
* Health checks

---

## 🔁 File Upload Flow

1. Client authenticates
2. Upload session created
3. File split into chunks
4. Chunks uploaded
5. Integrity verification
6. Storage allocation
7. Replication triggered
8. Metadata stored
9. Upload confirmed

---

## 🔄 Consistency Model

* **Eventual Consistency**
* Asynchronous replication
* Metadata-first consistency
* Storage reconciliation
* Conflict resolution via versioning

---

## 🧪 Testing Strategy

* Unit tests for services
* Integration tests for APIs
* Storage flow testing
* Failure simulation
* Load testing (basic)

---

## 🐳 Deployment

```bash
# Build containers
docker-compose build

# Start services
docker-compose up
```

Services:

* API Gateway
* Auth Service
* Storage Service
* Metadata Service
* Redis
* PostgreSQL
* Nginx

---

## 🔐 Security Design

* JWT-based authentication
* Token rotation
* Signed file URLs
* Expiring access tokens
* Rate limiting
* Input validation
* File scanning hooks

---

## 📈 Scalability Strategy

* Horizontal scaling of services
* Stateless API layer
* Distributed storage nodes
* Async replication
* Load-balanced gateway
* Cache-first reads

---

## 📚 Learning Outcomes

This project demonstrates:

* Distributed systems concepts
* Cloud storage architecture
* Backend system design
* Database modeling
* API engineering
* Security implementation
* DevOps practices
* Real-world software architecture

---

## 🔮 Future Enhancements

* Web UI dashboard
* Mobile client
* Blockchain audit logs
* AI-based storage optimization
* Geo-distributed replication
* Smart caching
* Auto-scaling policies
* CDN integration

---

## 👨‍💻 Author

**sak-dev-bit**
GitHub: [https://github.com/sak-dev-bit](https://github.com/sak-dev-bit)
