# Ilia Digital Wallet Challenge

![CI/CD](https://github.com/merijorge/ilia-nodejs-challenge/actions/workflows/test.yml/badge.svg)
![Tests](https://img.shields.io/badge/tests-29%20passing-brightgreen)
![Node](https://img.shields.io/badge/node-18+-green)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)
![Docker](https://img.shields.io/badge/docker-ready-blue)
![NestJS](https://img.shields.io/badge/nestjs-10-E0234E)

A microservices-based digital wallet system with user management and transaction handling, built with NestJS and PostgreSQL.

## Architecture

This project implements a microservices architecture with two independent services:

- **User Service** (Port 3002): User registration, authentication, and profile management
- **Wallet Service** (Port 3001): Wallet management, balance queries, and transaction processing

### Key Features

- **Microservices Architecture**: Independent services with separate databases
- **JWT Authentication**: External (user-facing) and internal (service-to-service) tokens
- **UUID Primary Keys**: Distributed system ready with UUID-based identifiers
- **Idempotency**: Transaction deduplication using idempotency keys
- **Transaction Rollback**: Atomic operations with automatic rollback on failure
- **ACID Compliance**: Race condition protection and double spending prevention
- **IDOR Prevention**: User context from JWT tokens, never from request data
- **Comprehensive Testing**: 29/29 E2E tests passing
- **Docker Support**: Full containerization with Docker Compose

## Tech Stack

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL (separate instance per service)
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: class-validator
- **Testing**: Jest + Supertest
- **Containerization**: Docker + Docker Compose

## Prerequisites

- Node.js 18+ and npm
- Docker & Docker Compose (for containerized setup)
- PostgreSQL 16+ (for local development)

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/merijorge/ilia-nodejs-challenge
cd ilia-nodejs-challenge
docker-compose up -d
```

Services will be available at:

- User Service: http://localhost:3002
- Wallet Service: http://localhost:3001

### Local Development

See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for detailed local setup instructions.

## Running Tests

### Wallet Service E2E Tests

```bash
cd wallet-service
npm run test:e2e
```

**Expected:** 16/16 tests passing

### User Service E2E Tests

**Important:** User Service tests require Wallet Service to be running (for wallet creation during registration).

**Terminal 1 - Start Wallet Service:**

```bash
cd wallet-service
npm run start:dev
```

Keep this terminal running.

**Terminal 2 - Run User Service tests:**

```bash
cd user-service
npm run test:e2e
```

**Expected:** 13/13 tests passing

## API Documentation

### User Service API (Port 3002)

#### POST /auth/register

Register a new user and automatically create a wallet.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response (201):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2026-01-30T18:00:00.000Z"
  }
}
```

#### POST /auth/login

Authenticate and receive JWT token.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

#### GET /user/profile

Get current user's profile. Requires authentication.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "created_at": "2026-01-30T18:00:00.000Z"
}
```

#### PUT /user/profile

Update user profile (partial updates supported). Requires authentication.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request:**

```json
{
  "first_name": "Jane",
  "last_name": "Smith"
}
```

### Wallet Service API (Port 3001)

#### GET /wallet/balance

Get current user's wallet balance. Requires authentication.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "balance": 1000.5,
  "createdAt": "2026-01-30T18:00:00.000Z",
  "updatedAt": "2026-01-30T18:30:00.000Z"
}
```

#### POST /transactions

Create a new transaction (credit or debit). Requires authentication.

**Headers:**

```
Authorization: Bearer <access_token>
Idempotency-Key: <unique-uuid>
```

**Request (Credit):**

```json
{
  "amount": 100.5,
  "type": "CREDIT",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Request (Debit):**

```json
{
  "amount": 50.25,
  "type": "DEBIT",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440002"
}
```

**Response (201):**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 100.5,
  "type": "CREDIT",
  "createdAt": "2026-01-30T18:30:00.000Z"
}
```

#### GET /transactions

Get transaction history for current user. Requires authentication.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 100.5,
    "type": "CREDIT",
    "createdAt": "2026-01-30T18:30:00.000Z"
  }
]
```

**For complete API examples with cURL and code snippets, see [docs/API_EXAMPLES.md](docs/API_EXAMPLES.md)**

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: External (1h) and internal (5min) with separate secrets
- **Input Validation**: class-validator with whitelist and transform
- **SQL Injection Prevention**: Prisma ORM with prepared statements
- **Service Authentication**: Internal JWT validation for service-to-service calls
- **IDOR Prevention**: User context from JWT tokens, not request data

## Design Decisions

### Microservices Architecture

Separate services with independent databases for scalability, fault isolation, and team autonomy.

### UUID Primary Keys

Non-sequential identifiers prevent enumeration attacks and enable distributed system scaling.

### Dual JWT Strategy

Separate secrets for user-facing and internal APIs provide better security isolation.

### Idempotency Keys

Transaction deduplication prevents duplicate charges from network retries.

### Transaction Rollback

User deletion on wallet creation failure maintains data consistency.

## Technical Implementation

### Consistency & Concurrency

**Race Condition Protection:** All financial operations use Prisma transactions to ensure atomicity. Balance checks and updates occur within the same transaction, preventing race conditions.

**Double Spending Prevention:** Idempotency keys with unique database constraints prevent duplicate transactions. The system returns 409 Conflict for retry attempts.

**ACID Compliance:** User registration demonstrates transaction rollback - if wallet creation fails, the user is deleted to maintain data consistency across services.

### Performance & Scalability

**Balance Storage:** Wallet balances are stored and updated incrementally using `increment`/`decrement` operations. No aggregation queries over transaction history, ensuring O(1) balance lookups.

**Database Optimization:** Indexes on foreign keys (`transactions.user_id`), unique constraints on idempotency keys, and efficient Prisma queries.

### Idempotency & Resilience

**Duplicate Handling:** Supports idempotency keys in both headers and request body. Unique constraints prevent duplicate processing.

**Network Failures:** Internal JWT tokens expire in 5 minutes. Rollback mechanisms handle partial failures, preventing orphaned records.

### Microservices Architecture

**Service Isolation:** Separate codebases and databases. No cross-database access. Each service owns its domain completely.

**Communication:** REST/HTTP with internal JWT authentication. 5-minute token expiry with separate secret from user-facing tokens.

**Responsibility Separation:**

- **User Service:** Authentication, user management, registration
- **Wallet Service:** Balance management, transactions, wallet operations

### Security

**Authentication:** All endpoints (except login/register) require JWT validation via guards. User ID extracted from token, never from request body.

**IDOR Prevention:** User context comes from JWT token. All operations scoped to authenticated user. Authorization checks on every operation.

**Password Security:** bcrypt with 10 salt rounds. Passwords never stored in plain text or included in responses.

### Code Quality

**Separation of Concerns:** Controllers (HTTP), Services (business logic), Prisma (data access), Guards (auth), DTOs (validation). Each layer has single responsibility.

**Configuration:** All secrets in `.env` files. ConfigService used throughout. No hardcoded values.

**Error Handling:** Try-catch blocks on critical operations. Proper HTTP status codes (401, 404, 409, 400, 500). Rollback on failure.

**Transaction Lifecycle:** Prisma handles connection pooling. Transactions automatically committed or rolled back. No hanging connections.

**Code Formatting:** ESLint and Prettier configured with recommended rules.

## Database Schema

### User Service Database

```sql
users:
  id           UUID PRIMARY KEY
  email        VARCHAR UNIQUE NOT NULL
  password     VARCHAR NOT NULL
  first_name   VARCHAR NOT NULL
  last_name    VARCHAR NOT NULL
  created_at   TIMESTAMP
  updated_at   TIMESTAMP
```

### Wallet Service Database

```sql
wallets:
  user_id      UUID PRIMARY KEY
  balance      DECIMAL(10,2) DEFAULT 0
  created_at   TIMESTAMP
  updated_at   TIMESTAMP

transactions:
  id                UUID PRIMARY KEY
  user_id           UUID NOT NULL
  amount            DECIMAL(10,2) NOT NULL
  type              ENUM('CREDIT', 'DEBIT')
  idempotency_key   VARCHAR UNIQUE NOT NULL
  created_at        TIMESTAMP

  INDEX idx_transactions_user_id (user_id)
```

## Environment Variables

See `.env.example` files in each service directory.

**Important:** `JWT_PRIVATE_KEY` and `JWT_INTERNAL_KEY` must be identical across both services.

## Future Improvements

- Add rate limiting and refresh tokens
- Implement email verification
- Add wallet-to-wallet transfers
- Implement event-driven architecture (Kafka/RabbitMQ)
- Add Swagger/OpenAPI documentation
- Implement monitoring and logging (Prometheus/Grafana)
- Add circuit breaker pattern for resilience
- Implement distributed tracing (Jaeger/Zipkin)

## Project Structure

```
ilia-nodejs-challenge/
├── docker-compose.yml
├── README.md
├── docs/
│   ├── LOCAL_DEVELOPMENT.md
│   ├── API_EXAMPLES.md
│   └── challenge/
│       ├── Original_Challenge_README.md
│       ├── diagram.png
│       ├── ms-transactions.yaml
│       └── ms-users.yaml
├── wallet-service/
│   ├── src/
│   │   ├── auth/              # JWT guards and strategies
│   │   ├── transaction/       # Transaction handling
│   │   ├── wallet/            # Wallet management
│   │   └── prisma/            # Database client
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── test/                  # E2E tests
│   └── .env.example
└── user-service/
    ├── src/
    │   ├── auth/              # Authentication logic
    │   ├── user/              # User management
    │   ├── wallet-client/     # Inter-service communication
    │   └── prisma/            # Database client
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/
    ├── test/                  # E2E tests
    └── .env.example
```

## License

This project is part of the Ilia Digital technical challenge.

---

Built with ❤️ for Ilia Digital
