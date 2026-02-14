# Input Validation & Sanitization

This document describes all validation rules, sanitization processes, and security measures implemented in the Ilia Digital Wallet system.

## Overview

All input validation uses `class-validator` with global configuration:
- `whitelist: true` - Automatically strips unknown properties
- `forbidNonWhitelisted: true` - Rejects requests with unknown properties
- `transform: true` - Automatically transforms and sanitizes inputs

## User Service Validation

### Registration (`POST /auth/register`)

#### Email
- **Type**: String
- **Required**: Yes
- **Format**: Valid email address
- **Max Length**: 255 characters
- **Sanitization**: Converted to lowercase, whitespace trimmed
- **Example**: `"Test@Example.COM  "` → `"test@example.com"`

#### Password
- **Type**: String
- **Required**: Yes
- **Min Length**: 6 characters
- **Max Length**: 128 characters
- **Strength Requirements**:
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
- **Valid Examples**: `Password123`, `MyP@ssw0rd`

#### First Name & Last Name
- **Type**: String
- **Required**: Yes
- **Length**: 1-100 characters
- **Allowed Characters**: Letters (A-Z, a-z, including accented characters), spaces, hyphens (-), apostrophes (')
- **Sanitization**: Whitespace trimmed
- **Valid Examples**: `John`, `Mary-Anne`, `O'Connor`, `José`

### Login (`POST /auth/login`)

#### Email
- Same rules as registration

#### Password
- **Type**: String
- **Required**: Yes
- **Max Length**: 128 characters
- Note: No strength validation on login (only on registration)

### Profile Update (`PUT /user/profile`)

#### First Name & Last Name (Optional)
- Same validation rules as registration
- Both fields are optional (partial updates supported)

## Wallet Service Validation

### Create Transaction (`POST /transactions`)

#### Amount
- **Type**: Number
- **Required**: Yes
- **Min Value**: 0.01
- **Max Value**: 1,000,000
- **Decimal Places**: Maximum 2 (currency precision)
- **Auto-rounding**: Values with more than 2 decimals are automatically rounded
- **Valid Examples**: `100`, `50.50`, `0.01`, `999999.99`
- **Invalid Examples**: `0` (too small), `1000001` (exceeds max), `-50` (negative)
- **Note**: `100.999` is automatically rounded to `101.00`

#### Type
- **Type**: Enum
- **Required**: Yes
- **Allowed Values**: `CREDIT`, `DEBIT`
- **Case Sensitive**: Yes
- **Valid Examples**: `"CREDIT"`, `"DEBIT"`
- **Invalid Examples**: `"credit"`, `"Credit"`, `"DEPOSIT"`

#### Idempotency Key
- **Type**: String (UUID v4)
- **Required**: Yes
- **Format**: Valid UUID version 4
- **Valid Example**: `"550e8400-e29b-41d4-a716-446655440000"`
- **Invalid Examples**: `"not-a-uuid"`, `"123456"`, `"550e8400"` (incomplete)

### Create Wallet (`POST /wallet/internal/create`)

#### User ID
- **Type**: String (UUID v4)
- **Required**: Yes
- **Format**: Valid UUID version 4

## Security Features

### XSS Prevention
- Name fields reject HTML tags and special characters
- All string inputs are trimmed to remove leading/trailing whitespace
- Database queries use Prisma ORM with parameterized queries

### SQL Injection Prevention
- Prisma ORM automatically uses prepared statements
- No raw SQL queries in application code
- All user inputs validated before database operations

### DoS Prevention
- Maximum length constraints on all string fields
- Maximum value constraints on numeric fields
- Request size limits enforced at application level

### Input Sanitization
- Email addresses normalized to lowercase (prevents duplicate accounts)
- Whitespace automatically trimmed from all string inputs
- Unknown properties automatically stripped from requests

## Error Responses

### Validation Error Format

```json
{
  "statusCode": 400,
  "message": [
    "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    "First name can only contain letters, spaces, hyphens, and apostrophes"
  ],
  "error": "Bad Request"
}
