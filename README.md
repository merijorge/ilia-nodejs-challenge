# Ilia Digital Wallet Challenge

![CI/CD](https://github.com/merijorge/ilia-nodejs-challenge/actions/workflows/test.yml/badge.svg)
![Tests](https://img.shields.io/badge/tests-73%20passing-brightgreen)
![Node](https://img.shields.io/badge/node-20+-green)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)
![Docker](https://img.shields.io/badge/docker-ready-blue)
![NestJS](https://img.shields.io/badge/nestjs-11-E0234E)

A microservices-based digital wallet system with user management and transaction handling, built with NestJS and PostgreSQL.

## Architecture

This project implements a microservices architecture with two independent services:

- **User Service** (Port 3002): User registration, authentication, and profile management
- **Wallet Service** (Port 3001): Wallet management, balance queries, and transaction processing

### Key Features

- **Microservices Architecture**: Independent services with separate databases
- **JWT Authentication**: External (user-facing) and internal (service-to-service) tokens
- **UUID Primary Keys**: Distributed system ready with UUID-based identifiers
- **Idempotency**: IETF-compliant transaction deduplication via required header
- **Transaction Rollback**: Atomic operations with automatic rollback on failure
- **ACID Compliance**: Race condition protection and double spending prevention
- **IDOR Prevention**: User context from JWT tokens, never from request data
- **Separation of Concerns**: Clean architecture with distinct service responsibilities
- **Comprehensive Testing**: 73 tests passing across 7 test suites
- **Docker Support**: Full containerization with Docker Compose
- **OpenAPI Documentation**: Swagger UI available at `/api/docs` on the Wallet Service

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

- Node.js 20+ and npm
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
- Swagger UI: http://localhost:3001/api/docs

### Local Development

See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for detailed local setup instructions.

## Running Tests

### Wallet Service Tests

Unit tests (decorator):

```bash
cd wallet-service
npm test
```

**Expected:** 7 tests passing (IdempotencyKey decorator)

E2E tests:

```bash
cd wallet-service
npm run test:e2e
```

**Expected:** 38 tests passing across 4 test suites:

- wallet-e2e-spec.ts - Core wallet operations

- performance.e2e-spec.ts - O(1) complexity verification

- concurrent-transactions.e2e-spec.ts - Race condition testing

- validation.e2e-spec.ts - Input validation rules

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

**Expected:** 28 tests passing across 2 test suites:

- user-e2e-spec.ts - User management and authentication

- validation.e2e-spec.ts - Input validation and security

## Test Coverage

Total: **73 tests** across **7 test suites**

### Wallet Service (45 tests)
- **Unit** - IdempotencyKey decorator (7 tests)
- **Core Operations** - Balance queries, transaction creation, wallet management
- **Performance** - O(1) complexity verification (10-10,000 transaction scale)
- **Concurrency** - Race condition protection, idempotency under load
- **Validation** - Input sanitization, boundary conditions, error handling

### User Service (28 tests)
- **User Management** - Registration, authentication, profile operations
- **Validation** - Password strength, email format, XSS prevention
- **Integration** - Cross-service wallet creation, rollback mechanisms
- **Security** - JWT validation, IDOR prevention, authorization checks

## API Documentation

Interactive documentation is available via Swagger UI at `http://localhost:3001/api/docs` when the Wallet Service is running.

### User Service API (Port 3002)

#### POST /auth/register

Register a new user and automatically create a wallet.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "Password123",
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
    "last_name": "Doe"
  }
}
```

#### POST /auth/login

Authenticate and receive JWT token.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "Password123"
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
  "createdAt": "2026-01-30T18:00:00.000Z",
  "updatedAt": "2026-01-30T18:00:00.000Z"
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

The `Idempotency-Key` header is required and must be a valid UUID v4. Sending the key in the request body is rejected.

**Headers:**

```
Authorization: Bearer <access_token>
Idempotency-Key: <uuid-v4>
```

**Request (Credit):**

```json
{
  "amount": 100.5,
  "type": "CREDIT"
}
```

**Request (Debit):**

```json
{
  "amount": 50.25,
  "type": "DEBIT"
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
- **JWT Tokens**: External (24h) and internal (5min) with separate secrets
- **Input Validation**: class-validator with whitelist and transform
- **SQL Injection Prevention**: Prisma ORM with prepared statements
- **Service Authentication**: Internal JWT validation for service-to-service calls
- **IDOR Prevention**: User context from JWT tokens, not request data
- **Input Validation & Sanitization**: Comprehensive validation with length limits, format checks, XSS prevention, and automatic sanitization. See [docs/VALIDATION.md](docs/VALIDATION.md) for complete rules.

## Design Decisions

### Microservices Architecture

Separate services with independent databases for scalability, fault isolation, and team autonomy.

### UUID Primary Keys

Non-sequential identifiers prevent enumeration attacks and enable distributed system scaling.

### Dual JWT Strategy

Separate secrets for user-facing and internal APIs provide better security isolation.

### Idempotency Keys

Transaction deduplication prevents duplicate charges from network retries. Keys are required via header (UUID v4), scoped per user, and validated against IETF idempotency key semantics.

### Transaction Rollback

User deletion on wallet creation failure maintains data consistency.

### Compensating Transactions

Cross-service operations use compensation rather than distributed transactions. User creation attempts
wallet creation; on failure, the user is deleted. This saga pattern maintains service independence
while ensuring best-effort cross-service consistency.

### Separation of Concerns

Clean architectural boundaries ensure each service and layer has a single, well-defined responsibility. User creation logic resides in UserService, authentication logic in AuthService, and orchestration in controllers.

## Technical Implementation

### Consistency & Concurrency

**Race Condition Protection:** All financial operations use Prisma transactions to ensure atomicity.
Balance checks and updates occur within the same transaction, preventing race conditions.

**ACID Guarantees:** Each service maintains ACID properties within its own database. All financial
operations (transaction creation + balance update) execute atomically via Prisma transactions.

**Cross-Service Consistency:** User registration uses a compensating transaction pattern - if wallet
creation fails, the user is automatically deleted to maintain eventual consistency across services.
This provides best-effort consistency without requiring distributed transactions.

### Performance & Scalability

**Balance Operations:** All balance operations are **O(1)** constant-time, regardless of transaction count. Balance is stored and updated atomically using database-level `increment`/`decrement` operations—no recalculation from transaction history.

**Empirical Proof:** Balance lookup remains constant at 6-7ms whether a user has 10 or 10,000 transactions (variance: 11ms, well below 100ms threshold).

**Database Optimization:** Indexes on foreign keys (`transactions.user_id`), composite unique constraints on idempotency keys scoped per user, atomic operations, and efficient Prisma queries.

**Integrity Verification:** Balance integrity verification endpoint available for auditing (O(N) operation, used only for debugging).

For detailed performance analysis, test results, and scalability design, see **[docs/PERFORMANCE.md](docs/PERFORMANCE.md)**.

### Idempotency & Resilience

**True Idempotency Pattern:** Transaction creation returns identical responses (201 + same transaction) for duplicate requests. Duplicate detection is atomic at database level via composite unique constraint on `(user_id, idempotency_key)`, eliminating race conditions. Concurrent duplicate requests all receive the same transaction.

**Duplicate Handling:** Idempotency keys are required via the `Idempotency-Key` header. Reusing a key with a different payload returns 422. Database unique constraints prevent duplicate processing.

**Network Failures:** Internal JWT tokens expire in 5 minutes. Rollback mechanisms handle partial failures, preventing orphaned records.

For implementation details, client usage examples, and concurrency testing results, see **[docs/IDEMPOTENCY.md](docs/IDEMPOTENCY.md)**.

### Microservices Architecture

**Service Isolation:** Separate codebases and databases. No cross-database access. Each service owns its domain completely.

**Communication:** REST/HTTP with internal JWT authentication. 5-minute token expiry with separate secret from user-facing tokens.

**Responsibility Separation:**

- **User Service:**
  - **UserService**: User creation, profile management, wallet orchestration
  - **AuthService**: Authentication, token generation and validation
  - **AuthController**: Orchestrates UserService and AuthService for registration flow

- **Wallet Service:**
  - Balance management and queries
  - Transaction processing (credit/debit)
  - Wallet lifecycle operations

### Security

**Authentication:** All endpoints (except login/register) require JWT validation via guards. User ID extracted from token, never from request body.

**IDOR Prevention:** User context comes from JWT token. All operations scoped to authenticated user. Authorization checks on every operation.

**Password Security:** bcrypt with 10 salt rounds. Passwords never stored in plain text or included in responses.

### Code Quality

**Separation of Concerns:** Controllers (HTTP), Services (business logic), Prisma (data access), Guards (auth), DTOs (validation). Each layer has single responsibility.

**Configuration:** All secrets in `.env` files. ConfigService used throughout. No hardcoded values.

**Error Handling:** Try-catch blocks on critical operations. Proper HTTP status codes (401, 404, 409, 400, 422, 500). Rollback on failure.

**Transaction Lifecycle:** Prisma handles connection pooling. Transactions automatically committed or rolled back. No hanging connections.

**Transaction Guarantees:**
- Within wallet-service: ACID compliance via Prisma transactions (transaction creation + balance update atomic)
- Within user-service: ACID compliance via Prisma for user operations
- Cross-service: Eventual consistency via compensating transactions (no distributed ACID)

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
  idempotency_key   VARCHAR NOT NULL
  created_at        TIMESTAMP

  UNIQUE (user_id, idempotency_key)
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
│   ├── IDEMPOTENCY.md
│   ├── PERFORMANCE.md
│   ├── VALIDATION.md
│   └── challenge/
│       ├── Original_Challenge_README.md
│       ├── diagram.png
│       ├── ms-transactions.yaml
│       └── ms-users.yaml
├── wallet-service/
│   ├── src/
│   │   ├── auth/              # JWT guards and strategies
│   │   ├── common/            # Shared decorators and filters
│   │   ├── transaction/       # Transaction handling
│   │   ├── wallet/            # Wallet management
│   │   └── prisma/            # Database client
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── test/                  # E2E and unit tests
│   └── .env.example
└── user-service/
    ├── src/
    │   ├── auth/              # Authentication logic (token generation/validation)
    │   ├── user/              # User management (creation, profile, wallet orchestration)
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