# API Examples

Quick reference for testing the API with cURL and code.

## Quick Test Flow

```bash
# 1. Register
curl -X POST http://localhost:3002/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
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
  -d '{
    "amount": 100,
    "type": "CREDIT",
    "idempotencyKey": "txn-001"
  }'

# 4. Withdraw
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50,
    "type": "DEBIT",
    "idempotencyKey": "txn-002"
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
    "password": "password123",
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
    "password": "password123"
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
  "balance": 1000.50,
  "createdAt": "2026-01-30T21:00:00.000Z",
  "updatedAt": "2026-01-30T22:00:00.000Z"
}
```

### POST /transactions

Credit:
```bash
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250.75,
    "type": "CREDIT",
    "idempotencyKey": "deposit-001"
  }'
```

Debit:
```bash
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.25,
    "type": "DEBIT",
    "idempotencyKey": "withdrawal-001"
  }'
```

Idempotency key can be in header:
```bash
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Idempotency-Key: payment-abc-123" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
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
const axios = require('axios');

async function example() {
  // Register
  const { data } = await axios.post('http://localhost:3002/auth/register', {
    email: 'dev@example.com',
    password: 'password123',
    first_name: 'Dev',
    last_name: 'User'
  });

  const token = data.access_token;

  // Get balance
  const balance = await axios.get('http://localhost:3001/wallet/balance', {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('Balance:', balance.data.balance);

  // Add funds
  const txn = await axios.post(
    'http://localhost:3001/transactions',
    {
      amount: 500,
      type: 'CREDIT',
      idempotencyKey: `txn-${Date.now()}`
    },
    { headers: { Authorization: `Bearer ${token}` }}
  );

  console.log('Transaction:', txn.data);
}

example();
```

### Using fetch

```javascript
async function example() {
  // Login
  const loginRes = await fetch('http://localhost:3002/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'dev@example.com',
      password: 'password123'
    })
  });

  const { access_token } = await loginRes.json();

  // Get transactions
  const txnRes = await fetch('http://localhost:3001/transactions', {
    headers: { Authorization: `Bearer ${access_token}` }
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
  -d '{
    "amount": 100,
    "type": "CREDIT",
    "idempotencyKey": "test-123"
  }'
```

Second request with same key returns 409 Conflict:
```bash
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "type": "CREDIT",
    "idempotencyKey": "test-123"
  }'
```

## Common Errors

**401 Unauthorized:** Missing or invalid token  
**400 Bad Request:** Insufficient funds or validation error  
**409 Conflict:** Duplicate idempotency key or email  
**404 Not Found:** Wallet not found  

---

**For local setup, see [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)**
