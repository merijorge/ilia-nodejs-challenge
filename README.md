# Ília Digital NodeJS Challenge - Financial Microservices

> **Implementation Timeline:** Jan 29 - Feb 2, 2026  
> **Tech Stack:** NestJS + TypeScript + Prisma + PostgreSQL + Docker

## 🏗️ Architecture Overview

Dual microservices architecture implementing a digital wallet system with secure inter-service communication following DDD and Clean Architecture principles.

### Services

- **Wallet Service** (Port 3001): Transaction management, balance tracking, idempotency controls
- **User Service** (Port 3002): User authentication, registration, profile management
- **Communication**: HTTP REST with dual JWT authentication (external + internal)
- **Databases**: Separate PostgreSQL instances per service (database-per-service pattern)

### Architecture Diagram

![Architecture Diagram](./docs/diagram.png)

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Git

### Running with Docker (Production)

```bash
# Clone your fork
git clone https://github.com/[your-username]/ilia-nodejs-challenge.git
cd ilia-nodejs-challenge

# Start all services
docker-compose up --build

# Services will be available at:
# - Wallet Service: http://localhost:3001
# - User Service: http://localhost:3002
```
