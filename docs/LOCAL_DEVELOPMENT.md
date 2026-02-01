# Local Development Guide

Complete guide for running the project locally without Docker.

## Prerequisites

- Node.js 18+
- PostgreSQL 16+
- Git

## Setup

### 1. Clone and Setup Databases

```bash
git clone https://github.com/merijorge/ilia-nodejs-challenge
cd ilia-nodejs-challenge

# Create databases
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

## Running Tests

### Wallet Service

```bash
cd wallet-service
npm run test:e2e
```

Expected: 16/16 passing

### User Service

**Important:** Start Wallet Service first.

```bash
# Terminal 1
cd wallet-service
npm run start:dev

# Terminal 2
cd user-service
npm run test:e2e
```

Expected: 13/13 passing

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
