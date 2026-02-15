# Idempotency Guarantees

## Overview

Transaction creation is idempotent using unique idempotency keys. Duplicate requests return the same transaction with identical responses, preventing duplicate charges under retry scenarios.

## Implementation

### Idempotency Key Requirement

Every transaction requires a unique idempotency key (UUID v4 format):

```typescript
POST /transactions
{
  "amount": 100,
  "type": "CREDIT",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
}
```

Alternative via header:
```
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

### Atomic Duplicate Detection

Duplicate detection occurs inside the database transaction via unique constraint:

```typescript
await prisma.$transaction(async (tx) => {
  // Transaction creation fails atomically if key exists
  const transaction = await tx.transaction.create({
    data: { idempotency_key: key }
  });

  // Balance only updated if transaction creation succeeded
  await tx.wallet.update({ data: { balance: { increment } } });
});
```

If duplicate detected (P2002 constraint violation), system fetches and returns existing transaction.

## Behavior

### Original Request
```json
POST /transactions
Status: 201 Created

{
  "id": "abc-123",
  "userId": "user-456",
  "amount": 100,
  "type": "CREDIT",
  "createdAt": "2026-02-15T19:00:00Z"
}
```

### Duplicate Request (Same Idempotency Key)
```json
POST /transactions
Status: 201 Created

{
  "id": "abc-123",
  "userId": "user-456",
  "amount": 100,
  "type": "CREDIT",
  "createdAt": "2026-02-15T19:00:00Z"
}
```

Same status code, same transaction data. Client cannot distinguish between original and duplicate.

## Database Schema

```sql
CREATE TABLE transactions (
  id              UUID PRIMARY KEY,
  user_id         UUID NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  type            VARCHAR(6) CHECK (type IN ('CREDIT', 'DEBIT')),
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

Unique constraint on `idempotency_key` enforces idempotency at database level.

## Client Usage

```typescript
import { v4 as uuidv4 } from 'uuid';

async function createTransaction(amount: number, type: string) {
  const idempotencyKey = uuidv4();

  const response = await fetch('/transactions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ amount, type, idempotencyKey })
  });

  // Same handling for original and duplicate
  if (response.ok) {
    return await response.json();
  }

  throw new Error('Transaction failed');
}
```

On network error, retry with same idempotency key:
```typescript
async function createTransactionWithRetry(amount: number, type: string) {
  const idempotencyKey = uuidv4();

  for (let i = 0; i < 3; i++) {
    try {
      return await createTransaction(amount, type, idempotencyKey);
    } catch (error) {
      if (i === 2) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

## Concurrency Testing

System verified with:
- 5 concurrent requests, same key → All return same transaction (201)
- 10 concurrent requests, different keys → All succeed independently
- 50 concurrent mixed operations → Balance consistency maintained

## Guarantees

- **Atomicity:** Transaction creation and balance update are atomic
- **Consistency:** Duplicate requests never create multiple transactions
- **Isolation:** Concurrent requests serialized by database constraint
- **Idempotency:** Same request returns same response (201 + same data)
- **Race-condition free:** No timing window for duplicates

## Key Management

Idempotency keys should be:
- Generated once per logical operation
- Persisted before making request
- Reused for retries of same operation
- Never reused across different operations
- Valid UUID v4 format
