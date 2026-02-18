# API Examples

Quick reference for testing the API with cURL and code.

## Quick Test Flow

```bash
# 1. Register
curl -X POST http://localhost:3002/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123",
    "first_name": "John",
    "last_name": "Doe"
  }'

# Save the access_token

# 2. Get balance
curl http://localhost:3001/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Add money
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440001" \
  -d '{
    "amount": 100,
    "type": "CREDIT"
  }'

# 4. Withdraw
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440002" \
  -d '{
    "amount": 50,
    "type": "DEBIT"
  }'

# 5. Transaction history
curl http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## User Service

### POST /auth/register

```bash
curl -X POST http://localhost:3002/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123",
    "first_name": "Jane",
    "last_name": "Doe"
  }'
```

Response:

```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "first_name": "Jane",
    "last_name": "Doe"
  }
}
```

### POST /auth/login

```bash
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123"
  }'
```

### GET /user/profile

```bash
curl http://localhost:3002/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### PUT /user/profile

```bash
curl -X PUT http://localhost:3002/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Janet",
    "last_name": "Smith"
  }'
```

## Wallet Service

### GET /wallet/balance

```bash
curl http://localhost:3001/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "balance": 1000.5,
  "createdAt": "2026-01-30T21:00:00.000Z",
  "updatedAt": "2026-01-30T22:00:00.000Z"
}
```

### POST /transactions

The `Idempotency-Key` header is required on every transaction request. The value must be a valid UUID v4.

Credit:

```bash
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 7c9e6679-7425-40de-944b-e07fc1f90ae7" \
  -d '{
    "amount": 250.75,
    "type": "CREDIT"
  }'
```

Debit:

```bash
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: a3bb189e-8bf9-3888-9912-ace4e6543002" \
  -d '{
    "amount": 50.25,
    "type": "DEBIT"
  }'
```

### GET /transactions

```bash
curl http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## JavaScript Examples

### Using axios

```javascript
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

async function example() {
  // Register
  const { data } = await axios.post("http://localhost:3002/auth/register", {
    email: "dev@example.com",
    password: "Password123",
    first_name: "Dev",
    last_name: "User",
  });

  const token = data.access_token;

  // Get balance
  const balance = await axios.get("http://localhost:3001/wallet/balance", {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log("Balance:", balance.data.balance);

  // Add funds
  const txn = await axios.post(
    "http://localhost:3001/transactions",
    {
      amount: 500,
      type: "CREDIT",
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": uuidv4(),
      },
    },
  );

  console.log("Transaction:", txn.data);
}

example();
```

### Using fetch

```javascript
async function example() {
  // Login
  const loginRes = await fetch("http://localhost:3002/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "dev@example.com",
      password: "Password123",
    }),
  });

  const { access_token } = await loginRes.json();

  // Get transactions
  const txnRes = await fetch("http://localhost:3001/transactions", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const transactions = await txnRes.json();
  console.log(transactions);
}

example();
```

## Testing Idempotency

First request succeeds:

```bash
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 7c9e6679-7425-40de-944b-e07fc1f90ae8" \
  -d '{
    "amount": 100,
    "type": "CREDIT"
  }'
```

```json
{
  "id": "abc-123",
  "userId": "user-456",
  "amount": 100,
  "type": "CREDIT",
  "createdAt": "2026-02-16T22:00:00Z"
}
```

Second request with same key returns 201 + same transaction (idempotent):

```bash
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 7c9e6679-7425-40de-944b-e07fc1f90ae8" \
  -d '{
    "amount": 100,
    "type": "CREDIT"
  }'
```

```json
{
  "id": "abc-123",
  "userId": "user-456",
  "amount": 100,
  "type": "CREDIT",
  "createdAt": "2026-02-16T22:00:00Z"
}
```

## Common Errors

**401 Unauthorized:** Missing or invalid token  
**400 Bad Request:** Validation error (invalid input), insufficient funds, or missing/invalid Idempotency-Key header
**404 Not Found:** Wallet not found  
**409 Conflict:** Duplicate email on registration  
**422 Unprocessable Entity:** Idempotency key reused with a different payload

---

**For local setup, see [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)**
