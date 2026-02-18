# Local Development Guide

Complete guide for running the project locally without Docker.

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Git

## Setup

### 1. Clone and Setup Databases

```bash
git clone https://github.com/merijorge/ilia-nodejs-challenge
cd ilia-nodejs-challenge

# Create databases (both on the same PostgreSQL instance)
psql -U postgres
CREATE DATABASE wallet_db;
CREATE DATABASE user_db;
\q
```

### 2. Wallet Service

```bash
cd wallet-service
npm install
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wallet_db"
JWT_PRIVATE_KEY="ILIACHALLENGE"
JWT_INTERNAL_KEY="ILIACHALLENGE_INTERNAL"
PORT=3001
```

Run migrations and start:

```bash
npx prisma migrate dev
npx prisma generate
npm run start:dev
```

Wallet Service: http://localhost:3001
Swagger UI: http://localhost:3001/api/docs

### 3. User Service

Open new terminal:

```bash
cd user-service
npm install
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/user_db"
JWT_PRIVATE_KEY="ILIACHALLENGE"
JWT_INTERNAL_KEY="ILIACHALLENGE_INTERNAL"
WALLET_SERVICE_URL="http://localhost:3001"
PORT=3002
```

Run migrations and start:

```bash
npx prisma migrate dev
npx prisma generate
npm run start:dev
```

User Service: http://localhost:3002

### 4. Frontend

Open new terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

The `.env` defaults point to the local backend services and require no changes:

```env
VITE_USER_SERVICE_URL=http://localhost:3002
VITE_WALLET_SERVICE_URL=http://localhost:3001
```

Start the development server:

```bash
npm run dev
```

Frontend: http://localhost:5173

**Note:** CORS is already configured in both backend services to allow requests from `http://localhost:5173`. Both services must be running before using the frontend.

## Running Tests

### Wallet Service

Unit tests (no external dependencies required):

```bash
cd wallet-service
npm test
```

Expected: 7 tests passing (IdempotencyKey decorator)

E2E tests (requires a running PostgreSQL instance):

```bash
cd wallet-service
npm run test:e2e
```

Expected: 38 tests passing across 4 test suites

### User Service

**Important:** Start Wallet Service first (user registration triggers wallet creation).

```bash
# Terminal 1
cd wallet-service
npm run start:dev

# Terminal 2
cd user-service
npm run test:e2e
```

Expected: 30 tests passing across 2 test suites

### Frontend

```bash
cd frontend
npm run test:run
```

Expected: 18 tests passing across 3 test suites

## Common Issues

**Port already in use:**

```bash
lsof -i :3001          # macOS/Linux
netstat -ano | findstr :3001  # Windows
kill -9 <PID>
```

**Database connection failed:**
Make sure PostgreSQL is running and credentials in `.env` are correct.

**Prisma client not found:**

```bash
npx prisma generate
```

**Frontend cannot reach backend:**
Ensure both services are running before starting the frontend. Check that `VITE_USER_SERVICE_URL` and `VITE_WALLET_SERVICE_URL` in `frontend/.env` match the ports the services are running on.

## Development

### Database Changes

After editing `schema.prisma`:

```bash
npx prisma migrate dev --name your_change_name
npx prisma generate
```

### Debugging

View database in GUI:

```bash
npx prisma studio
```

Opens at http://localhost:5555

## Quick Commands

```bash
# Check services
curl http://localhost:3001
curl http://localhost:3002

# Reset database (destructive!)
npx prisma migrate reset
```

---

**For API examples, see [API_EXAMPLES.md](API_EXAMPLES.md)**
