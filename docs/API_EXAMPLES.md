# API Examples

Complete examples for testing the Ilia Digital Wallet API with cURL, Postman, and code snippets.

## Quick Test Flow

```bash
# 1. Register a user
curl -X POST http://localhost:3002/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePass123",
    "first_name": "John",
    "last_name": "Doe"
  }'

# Save the access_token from response

# 2. Login (optional - registration already returns token)
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePass123"
  }'

# 3. Check wallet balance
curl http://localhost:3001/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 4. Add money (credit)
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.50,
    "type": "CREDIT",
    "idempotencyKey": "txn-001"
  }'

# 5. Check balance again
curl http://localhost:3001/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 6. Withdraw money (debit)
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 25.00,
    "type": "DEBIT",
    "idempotencyKey": "txn-002"
  }'

# 7. View transaction history
curl http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## User Service Examples

### POST /auth/register

**Request:**

```bash
curl -X POST http://localhost:3002/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "myPassword123",
    "first_name": "Jane",
    "last_name": "Smith"
  }'
```

**Response (201 Created):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImphbmVAZXhhbXBsZS5jb20iLCJpYXQiOjE3MDY2MzA0MDAsImV4cCI6MTcwNjYzNDAwMH0.xxx",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "created_at": "2026-01-30T21:00:00.000Z"
  }
}
```

**Error: Email Already Exists (409 Conflict):**

```json
{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict"
}
```

### POST /auth/login

**Request:**

```bash
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "myPassword123"
  }'
```

**Response (200 OK):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Smith"
  }
}
```

**Error: Invalid Credentials (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

### GET /user/profile

**Request:**

```bash
curl http://localhost:3002/user/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "jane@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "created_at": "2026-01-30T21:00:00.000Z"
}
```

**Error: Missing Token (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### PUT /user/profile

**Request:**

```bash
curl -X PUT http://localhost:3002/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Janet",
    "last_name": "Johnson"
  }'
```

**Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "jane@example.com",
  "first_name": "Janet",
  "last_name": "Johnson",
  "updated_at": "2026-01-30T22:00:00.000Z"
}
```

## Wallet Service Examples

### GET /wallet/balance

**Request:**

```bash
curl http://localhost:3001/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "balance": 1000.50,
  "createdAt": "2026-01-30T21:00:00.000Z",
  "updatedAt": "2026-01-30T22:00:00.000Z"
}
```

**Error: Wallet Not Found (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Wallet not found"
}
```

### POST /transactions (Credit)

**Request:**

```bash
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250.75,
    "type": "CREDIT",
    "idempotencyKey": "deposit-2026-01-30-001"
  }'
```

**Response (201 Created):**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 250.75,
  "type": "CREDIT",
  "createdAt": "2026-01-30T22:00:00.000Z"
}
```

### POST /transactions (Debit)

**Request:**

```bash
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.25,
    "type": "DEBIT",
    "idempotencyKey": "withdrawal-2026-01-30-001"
  }'
```

**Response (201 Created):**

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 50.25,
  "type": "DEBIT",
  "createdAt": "2026-01-30T22:05:00.000Z"
}
```

**Error: Insufficient Funds (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": "Insufficient funds"
}
```

**Error: Duplicate Idempotency Key (409 Conflict):**

```json
{
  "statusCode": 409,
  "message": "Duplicate transaction detected"
}
```

### POST /transactions (Using Header for Idempotency)

**Request:**

```bash
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Idempotency-Key: payment-abc-123" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "type": "DEBIT",
    "idempotencyKey": "this-will-be-overridden"
  }'
```

**Note:** Header takes precedence. The actual idempotency key used will be `payment-abc-123`.

### GET /transactions

**Request:**

```bash
curl http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**

```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 50.25,
    "type": "DEBIT",
    "createdAt": "2026-01-30T22:05:00.000Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 250.75,
    "type": "CREDIT",
    "createdAt": "2026-01-30T22:00:00.000Z"
  }
]
```

## JavaScript/Node.js Examples

### Using axios

```javascript
const axios = require('axios');

async function example() {
  // Register
  const registerResponse = await axios.post('http://localhost:3002/auth/register', {
    email: 'dev@example.com',
    password: 'testPass123',
    first_name: 'Dev',
    last_name: 'User'
  });

  const token = registerResponse.data.access_token;

  // Check balance
  const balanceResponse = await axios.get('http://localhost:3001/wallet/balance', {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('Balance:', balanceResponse.data.balance);

  // Add funds
  const txnResponse = await axios.post('http://localhost:3001/transactions', {
    amount: 500,
    type: 'CREDIT',
    idempotencyKey: `txn-${Date.now()}`
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('Transaction:', txnResponse.data);
}

example();
```

### Using fetch

```javascript
async function fetchExample() {
  // Login
  const loginResponse = await fetch('http://localhost:3002/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'dev@example.com',
      password: 'testPass123'
    })
  });

  const { access_token } = await loginResponse.json();

  // Get transactions
  const txnResponse = await fetch('http://localhost:3001/transactions', {
    headers: { Authorization: `Bearer ${access_token}` }
  });

  const transactions = await txnResponse.json();
  console.log(transactions);
}

fetchExample();
```

## Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "Ilia Digital Wallet",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "User Service",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\",\n  \"first_name\": \"Test\",\n  \"last_name\": \"User\"\n}"
            },
            "url": "http://localhost:3002/auth/register"
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\"\n}"
            },
            "url": "http://localhost:3002/auth/login"
          }
        },
        {
          "name": "Get Profile",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": "http://localhost:3002/user/profile"
          }
        },
        {
          "name": "Update Profile",
          "request": {
            "method": "PUT",
            "header": [
              {"key": "Authorization", "value": "Bearer {{token}}"},
              {"key": "Content-Type", "value": "application/json"}
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"first_name\": \"Updated\",\n  \"last_name\": \"Name\"\n}"
            },
            "url": "http://localhost:3002/user/profile"
          }
        }
      ]
    },
    {
      "name": "Wallet Service",
      "item": [
        {
          "name": "Get Balance",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": "http://localhost:3001/wallet/balance"
          }
        },
        {
          "name": "Create Transaction (Credit)",
          "request": {
            "method": "POST",
            "header": [
              {"key": "Authorization", "value": "Bearer {{token}}"},
              {"key": "Content-Type", "value": "application/json"}
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"amount\": 100,\n  \"type\": \"CREDIT\",\n  \"idempotencyKey\": \"test-credit-001\"\n}"
            },
            "url": "http://localhost:3001/transactions"
          }
        },
        {
          "name": "Create Transaction (Debit)",
          "request": {
            "method": "POST",
            "header": [
              {"key": "Authorization", "value": "Bearer {{token}}"},
              {"key": "Content-Type", "value": "application/json"}
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"amount\": 50,\n  \"type\": \"DEBIT\",\n  \"idempotencyKey\": \"test-debit-001\"\n}"
            },
            "url": "http://localhost:3001/transactions"
          }
        },
        {
          "name": "Get Transactions",
          "request": {
            "method": "GET",
            "header": [{"key": "Authorization", "value": "Bearer {{token}}"}],
            "url": "http://localhost:3001/transactions"
          }
        }
      ]
    }
  ]
}
```

**Setup:**
1. Import collection into Postman
2. After login/register, copy `access_token`
3. Create Postman variable: `token` = `<your_access_token>`
4. All requests will use `{{token}}` automatically

## Testing Idempotency

**Test that duplicate requests with same idempotency key don't create duplicate transactions:**

```bash
# First request - should succeed
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "type": "CREDIT",
    "idempotencyKey": "test-idempotency-123"
  }'

# Second request with SAME idempotency key - should return 409 Conflict
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "type": "CREDIT",
    "idempotencyKey": "test-idempotency-123"
  }'
```

## Testing Error Cases

### Insufficient Funds

```bash
# Try to debit more than available balance
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 999999.99,
    "type": "DEBIT",
    "idempotencyKey": "test-insufficient-funds"
  }'

# Expected: 400 Bad Request
```

### Invalid Token

```bash
# Use invalid/expired token
curl http://localhost:3001/wallet/balance \
  -H "Authorization: Bearer invalid_token_here"

# Expected: 401 Unauthorized
```

### Missing Required Fields

```bash
# Missing amount field
curl -X POST http://localhost:3001/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CREDIT",
    "idempotencyKey": "test-missing-field"
  }'

# Expected: 400 Bad Request
```

---

**For local development setup, see [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)**
