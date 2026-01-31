# Local Development Guide

Complete guide for running the Ilia Digital Wallet Challenge locally without Docker.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 16+
- Git

## Initial Setup

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd ilia-nodejs-challenge
```

### 2. Setup PostgreSQL Databases

```bash
# Connect to PostgreSQL
psql -U postgres

# Create databases
CREATE DATABASE wallet_db;
CREATE DATABASE user_db;

# Verify
\l

# Exit
\q
```

### 3. Setup Wallet Service

```bash
cd wallet-service

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

**Edit `wallet-service/.env`:**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wallet_db"
JWT_PRIVATE_KEY="ILIACHALLENGE"
JWT_INTERNAL_KEY="ILIACHALLENGE_INTERNAL"
PORT=3001
NODE_ENV=development
```

**Run migrations:**

```bash
npx prisma migrate dev
npx prisma generate
```

**Start service:**

```bash
npm run start:dev
```

Service runs on http://localhost:3001

### 4. Setup User Service

**Open a new terminal:**

```bash
cd user-service

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

**Edit `user-service/.env`:**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/user_db"
JWT_PRIVATE_KEY="ILIACHALLENGE"
JWT_INTERNAL_KEY="ILIACHALLENGE_INTERNAL"
WALLET_SERVICE_URL="http://localhost:3001"
PORT=3002
NODE_ENV=development
```

**Run migrations:**

```bash
npx prisma migrate dev
npx prisma generate
```

**Start service:**

```bash
npm run start:dev
```

Service runs on http://localhost:3002

## Running Tests

### Wallet Service Tests

```bash
cd wallet-service

# Unit tests
npm run test

# E2E tests (requires running database)
npm run test:e2e

# Test coverage
npm run test:cov
```

**Expected:** 16/16 E2E tests passing

### User Service Tests

**Important:** Wallet Service must be running!

**Terminal 1 - Start Wallet Service:**

```bash
cd wallet-service
npm run start:dev
```

**Terminal 2 - Run User Tests:**

```bash
cd user-service
npm run test:e2e
```

**Expected:** 13/13 E2E tests passing

## Common Issues & Solutions

### Issue: Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**

```bash
# Find process using port
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Issue: Database Connection Failed

**Error:**
```
Can't reach database server at localhost:5432
```

**Solutions:**

1. **Verify PostgreSQL is running:**

```bash
# macOS
brew services list

# Linux
sudo systemctl status postgresql

# Windows
services.msc (check PostgreSQL service)
```

2. **Check DATABASE_URL format:**

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

3. **Test connection:**

```bash
psql -U postgres -d wallet_db
```

### Issue: Prisma Client Not Generated

**Error:**
```
Cannot find module '@prisma/client'
```

**Solution:**

```bash
cd wallet-service  # or user-service
npx prisma generate
```

### Issue: Migration Failed

**Error:**
```
Migration failed: relation "users" already exists
```

**Solution - Reset database:**

```bash
npx prisma migrate reset
# ⚠️ WARNING: This deletes all data!
```

**Or manually drop tables:**

```bash
psql -U postgres -d wallet_db
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
\q

# Then run migrations
npx prisma migrate dev
```

### Issue: JWT Token Invalid

**Error:**
```
401 Unauthorized
```

**Solutions:**

1. **Verify JWT secrets match in both services:**

```bash
# wallet-service/.env
JWT_PRIVATE_KEY="ILIACHALLENGE"
JWT_INTERNAL_KEY="ILIACHALLENGE_INTERNAL"

# user-service/.env
JWT_PRIVATE_KEY="ILIACHALLENGE"  # Must be identical
JWT_INTERNAL_KEY="ILIACHALLENGE_INTERNAL"  # Must be identical
```

2. **Check token hasn't expired** (default: 1 hour)

3. **Verify Authorization header format:**

```
Authorization: Bearer <token>
```

### Issue: Wallet Service Unreachable from User Service

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:3001
```

**Solutions:**

1. **Verify Wallet Service is running:**

```bash
curl http://localhost:3001
# Should not return "Connection refused"
```

2. **Check WALLET_SERVICE_URL in user-service/.env:**

```env
WALLET_SERVICE_URL="http://localhost:3001"  # Not http://wallet-service:3001
```

## Development Workflow

### 1. Database Changes

**After modifying `schema.prisma`:**

```bash
# Create migration
npx prisma migrate dev --name describe_your_change

# Regenerate client
npx prisma generate

# Restart service
npm run start:dev
```

### 2. Adding New Dependencies

```bash
# Install package
npm install package-name

# Or dev dependency
npm install -D package-name

# Restart service
npm run start:dev
```

### 3. Code Changes

NestJS watches for file changes automatically with `npm run start:dev`. Just save and the service reloads.

**If auto-reload fails:**

```bash
# Stop service (Ctrl+C)
# Restart
npm run start:dev
```

## Debugging

### Enable Prisma Query Logging

**Add to `.env`:**

```env
DEBUG="prisma:query"
```

**Restart service to see all SQL queries in console.**

### NestJS Debug Mode

**Start with debug flag:**

```bash
npm run start:debug
```

**Attach debugger:**
- VS Code: Use "Attach to Node" configuration
- Chrome DevTools: Navigate to `chrome://inspect`

### Database Inspection

**Prisma Studio (GUI):**

```bash
cd wallet-service  # or user-service
npx prisma studio
```

Opens browser at http://localhost:5555 with database GUI.

**Command line:**

```bash
psql -U postgres -d wallet_db

# Useful queries
SELECT * FROM wallets;
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;
\d wallets  -- Show table structure
```

## Performance Optimization

### Database Connection Pooling

Prisma default connection limit: 10

**Increase if needed in `schema.prisma`:**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connectionLimit = 20
}
```

### Enable Production Mode

```env
NODE_ENV=production
```

**Build for production:**

```bash
npm run build
npm run start:prod
```

## Switching Between Local and Docker

### From Local → Docker

```bash
# Stop local services (Ctrl+C in both terminals)

# Start Docker
docker-compose up -d

# Services now on same ports (3001, 3002)
```

### From Docker → Local

```bash
# Stop Docker
docker-compose down

# Start local services
cd wallet-service && npm run start:dev
# (new terminal) cd user-service && npm run start:dev
```

## Quick Reference

### Service URLs (Local)
- User Service: http://localhost:3002
- Wallet Service: http://localhost:3001
- Prisma Studio: http://localhost:5555

### Database Ports (Local)
- PostgreSQL: localhost:5432
  - Database: wallet_db
  - Database: user_db

### Useful Commands

```bash
# Check service health
curl http://localhost:3001
curl http://localhost:3002

# View logs (if running in background)
tail -f wallet-service/logs/*.log

# Reset everything
cd wallet-service && npx prisma migrate reset
cd user-service && npx prisma migrate reset
```

---

**For API examples and cURL commands, see [API_EXAMPLES.md](API_EXAMPLES.md)**
