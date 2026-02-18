# Idempotency Guarantees

## Overview

Transaction creation is idempotent using unique idempotency keys. Duplicate requests return the same transaction with identical responses, preventing duplicate charges under network retry scenarios.

## Implementation

### Idempotency Key Requirement

Every transaction request requires an `Idempotency-Key` header containing a valid UUID v4. The key must be provided as a header — sending it in the request body is rejected with `400 Bad Request`.

```
POST /transactions
Authorization: Bearer <token>
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "amount": 100,
  "type": "CREDIT"
}
```

The header enforces IETF idempotency key semantics: duplicate header values (sent as an array) are rejected with `400 Bad Request`.

### Atomic Duplicate Detection

Duplicate detection occurs inside the database transaction via a composite unique constraint on `(user_id, idempotency_key)`. This scopes idempotency per user — the same key used by two different users creates two independent transactions.

On a `P2002` constraint violation, the system fetches and returns the existing transaction. The balance is not modified a second time.

### Payload Validation on Duplicate

If the same idempotency key is reused with a different `amount` or `type`, the request is rejected with `422 Unprocessable Entity`. This prevents silent corruption from mismatched retries.

| Scenario                    | Response                        |
| --------------------------- | ------------------------------- |
| Same key, same payload      | `201` + original transaction    |
| Same key, different payload | `422 Unprocessable Entity`      |
| Same key, different user    | Independent transaction created |
| Duplicate header values     | `400 Bad Request`               |
| Invalid UUID v4 format      | `400 Bad Request`               |
| Missing header              | `400 Bad Request`               |

## Behavior

### Original Request

```
POST /transactions
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

{ "amount": 100, "type": "CREDIT" }
```

```json
HTTP/1.1 201 Created

{
  "id": "abc-123",
  "userId": "user-456",
  "amount": 100,
  "type": "CREDIT",
  "createdAt": "2026-02-15T19:00:00Z"
}
```

### Duplicate Request (Same Key, Same Payload)

Returns `201` with the original transaction — status code and body are identical to the first response. The client cannot distinguish between the original and a duplicate.

### Payload Mismatch (Same Key, Different Payload)

```json
HTTP/1.1 422 Unprocessable Entity

{
  "statusCode": 422,
  "timestamp": "2026-02-15T19:00:00.000Z",
  "path": "/transactions",
  "method": "POST",
  "message": "Idempotency key was previously used with a different request",
  "error": "Unprocessable Entity"
}
```

## Database Schema

```sql
CREATE TABLE transactions (
  id              UUID PRIMARY KEY,
  user_id         UUID NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  type            VARCHAR(6) CHECK (type IN ('CREDIT', 'DEBIT')),
  idempotency_key TEXT NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),

  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
```

## Client Usage

The idempotency key must be generated once before the first attempt and reused on every retry of the same operation:

```typescript
// Generate once — before the request, not inside the retry loop
const idempotencyKey = uuidv4();

await fetch("/transactions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
  },
  body: JSON.stringify({ amount, type }),
});
```

On network failure, retry with the same `idempotencyKey`. Generating a new key per attempt defeats idempotency.

## Concurrency Testing

System verified with:

- 5 concurrent requests, same key — all return same transaction (201), balance updated once
- 10 concurrent requests, different keys — all succeed independently
- 3 concurrent DEBITs exceeding balance — exactly one succeeds, remainder return 400
- 50 concurrent mixed operations — balance consistency maintained

## Guarantees

- **Atomicity:** Transaction creation and balance update execute within a single database transaction
- **Consistency:** Duplicate requests never create multiple transactions or update the balance twice
- **Isolation:** Concurrent duplicate requests are serialized by the database unique constraint
- **Idempotency:** Same key and payload always returns 201 with the original transaction data
- **IDOR prevention:** Idempotency scope is per user — keys cannot be reused across users
- **Payload integrity:** Reusing a key with a different payload returns 422, preventing silent mismatch

## Key Management

Idempotency keys must be:

- Generated once per logical operation before the first attempt
- Persisted client-side before making the request
- Reused for all retries of the same operation
- Never reused across different operations
- Valid UUID v4 format
