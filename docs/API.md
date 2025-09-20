# API Documentation

## Overview

The Tokenized Audit Trail API provides comprehensive endpoints for managing SME registration, transaction logging, and audit trail retrieval. This API is built with FastAPI and includes automatic OpenAPI documentation.

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://your-domain.com/api`

## Authentication

The API uses blockchain-based authentication through wallet signatures. Most endpoints require a valid Ethereum wallet address and signature.

## Core Endpoints

### SME Management

#### Register SME
```http
POST /sme/register
```

**Request Body:**
```json
{
  "name": "string",
  "wallet_address": "string",
  "business_license": "string",
  "contact_email": "string"
}
```

**Response:**
```json
{
  "id": "integer",
  "name": "string",
  "wallet_address": "string",
  "registration_date": "datetime",
  "is_authorized": "boolean"
}
```

#### Get SME Details
```http
GET /sme/{wallet_address}
```

**Response:**
```json
{
  "id": "integer",
  "name": "string",
  "wallet_address": "string",
  "business_license": "string",
  "contact_email": "string",
  "registration_date": "datetime",
  "is_authorized": "boolean",
  "total_transactions": "integer"
}
```

### Transaction Management

#### Upload Transaction
```http
POST /transaction/upload
```

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: File (PDF, images, or documents)
- `transaction_data`: JSON string with transaction details

**Transaction Data Schema:**
```json
{
  "sme_wallet": "string",
  "amount": "number",
  "description": "string",
  "transaction_type": "string",
  "metadata": "object"
}
```

**Response:**
```json
{
  "transaction_id": "string",
  "ipfs_hash": "string",
  "blockchain_tx_hash": "string",
  "token_id": "integer",
  "timestamp": "datetime"
}
```

#### Get Transaction Details
```http
GET /transaction/{transaction_id}
```

**Response:**
```json
{
  "id": "string",
  "sme_wallet": "string",
  "amount": "number",
  "description": "string",
  "transaction_type": "string",
  "ipfs_hash": "string",
  "blockchain_tx_hash": "string",
  "token_id": "integer",
  "timestamp": "datetime",
  "verification_status": "string",
  "metadata": "object"
}
```

### Audit Trail

#### Get Audit Trail
```http
GET /audit-trail/{sme_wallet}
```

**Query Parameters:**
- `page`: integer (default: 1)
- `limit`: integer (default: 10, max: 100)
- `start_date`: date (YYYY-MM-DD)
- `end_date`: date (YYYY-MM-DD)
- `transaction_type`: string

**Response:**
```json
{
  "transactions": [
    {
      "id": "string",
      "amount": "number",
      "description": "string",
      "transaction_type": "string",
      "timestamp": "datetime",
      "verification_status": "string",
      "token_id": "integer"
    }
  ],
  "total": "integer",
  "page": "integer",
  "limit": "integer",
  "total_pages": "integer"
}
```

### Verification

#### Verify Transaction
```http
POST /verify/{transaction_id}
```

**Response:**
```json
{
  "is_valid": "boolean",
  "verification_details": {
    "blockchain_verified": "boolean",
    "ipfs_verified": "boolean",
    "data_integrity": "boolean",
    "timestamp_verified": "boolean"
  },
  "verification_timestamp": "datetime"
}
```

#### Bulk Verify Transactions
```http
POST /verify/bulk
```

**Request Body:**
```json
{
  "transaction_ids": ["string", "string", "..."]
}
```

**Response:**
```json
{
  "results": [
    {
      "transaction_id": "string",
      "is_valid": "boolean",
      "verification_details": "object"
    }
  ],
  "summary": {
    "total": "integer",
    "valid": "integer",
    "invalid": "integer"
  }
}
```

## File Management

### Upload File to IPFS
```http
POST /file/upload
```

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: File to upload

**Response:**
```json
{
  "ipfs_hash": "string",
  "file_name": "string",
  "file_size": "integer",
  "upload_timestamp": "datetime"
}
```

### Retrieve File from IPFS
```http
GET /file/{ipfs_hash}
```

**Response:** File content with appropriate MIME type

## Analytics

### Get SME Statistics
```http
GET /analytics/sme/{wallet_address}
```

**Response:**
```json
{
  "total_transactions": "integer",
  "total_amount": "number",
  "transaction_types": {
    "payment": "integer",
    "invoice": "integer",
    "contract": "integer"
  },
  "monthly_activity": [
    {
      "month": "string",
      "transaction_count": "integer",
      "total_amount": "number"
    }
  ],
  "verification_rate": "number"
}
```

### System Analytics
```http
GET /analytics/system
```

**Response:**
```json
{
  "total_smes": "integer",
  "total_transactions": "integer",
  "total_volume": "number",
  "average_verification_time": "number",
  "system_uptime": "number",
  "blockchain_status": {
    "latest_block": "integer",
    "network": "string",
    "gas_price": "number"
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "object"
  },
  "timestamp": "datetime",
  "path": "string"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `SME_NOT_FOUND` | 404 | SME not registered |
| `INVALID_WALLET` | 400 | Invalid wallet address format |
| `UNAUTHORIZED_SME` | 403 | SME not authorized for operation |
| `TRANSACTION_NOT_FOUND` | 404 | Transaction ID not found |
| `FILE_UPLOAD_FAILED` | 500 | IPFS upload failed |
| `BLOCKCHAIN_ERROR` | 500 | Smart contract interaction failed |
| `VALIDATION_ERROR` | 422 | Input validation failed |

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **General endpoints**: 100 requests per minute
- **File upload**: 10 requests per minute
- **Authentication**: 5 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Window reset time (Unix timestamp)

## Webhook Support

### Register Webhook
```http
POST /webhooks/register
```

**Request Body:**
```json
{
  "url": "string",
  "events": ["string"],
  "secret": "string"
}
```

**Supported Events:**
- `transaction.created`
- `transaction.verified`
- `sme.registered`
- `sme.authorized`

### Webhook Payload Example
```json
{
  "event": "transaction.created",
  "data": {
    "transaction_id": "string",
    "sme_wallet": "string",
    "amount": "number",
    "timestamp": "datetime"
  },
  "webhook_id": "string",
  "timestamp": "datetime"
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

// Register SME
async function registerSME(smeData) {
  try {
    const response = await axios.post('/sme/register', smeData);
    return response.data;
  } catch (error) {
    console.error('Registration failed:', error.response.data);
  }
}

// Upload transaction
async function uploadTransaction(file, transactionData) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('transaction_data', JSON.stringify(transactionData));
  
  const response = await axios.post('/transaction/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  
  return response.data;
}
```

### Python
```python
import requests

# Get audit trail
def get_audit_trail(wallet_address, page=1, limit=10):
    params = {'page': page, 'limit': limit}
    response = requests.get(f'/audit-trail/{wallet_address}', params=params)
    return response.json()

# Verify transaction
def verify_transaction(transaction_id):
    response = requests.post(f'/verify/{transaction_id}')
    return response.json()
```

## Testing

### Test Wallet Addresses

For development and testing:
- SME Test Wallet: `0x742d35Cc64C000000000000000000000000000000`
- Admin Wallet: `0x123d35Cc64C000000000000000000000000000000`

### Sample Test Data

```json
{
  "test_sme": {
    "name": "Test Corporation",
    "wallet_address": "0x742d35Cc64C000000000000000000000000000000",
    "business_license": "TEST123456",
    "contact_email": "test@example.com"
  },
  "test_transaction": {
    "amount": 1000.50,
    "description": "Test payment transaction",
    "transaction_type": "payment",
    "metadata": {
      "invoice_number": "INV-001",
      "customer": "Test Customer"
    }
  }
}
```

## Interactive Documentation

Visit the following URLs when the API is running:

- **Swagger UI**: `/docs` - Interactive API documentation
- **ReDoc**: `/redoc` - Alternative documentation interface
- **OpenAPI JSON**: `/openapi.json` - Machine-readable API specification

These interfaces allow you to test API endpoints directly from your browser.