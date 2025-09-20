from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

class SMERegistration(BaseModel):
    """Model for SME registration request"""
    company_name: str
    wallet_address: str
    email: EmailStr
    phone: Optional[str] = None
    registration_number: Optional[str] = None
    address: Optional[str] = None
    subscription_tier: Optional[str] = "basic"
    
    @validator('wallet_address')
    def validate_wallet_address(cls, v):
        if not v.startswith('0x') or len(v) != 42:
            raise ValueError('Invalid Ethereum wallet address format')
        return v.lower()
    
    @validator('company_name')
    def validate_company_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Company name must be at least 2 characters long')
        return v.strip()
    
    @validator('subscription_tier')
    def validate_subscription_tier(cls, v):
        if v and v not in ['basic', 'premium', 'enterprise']:
            raise ValueError('Invalid subscription tier')
        return v or 'basic'

class SMEResponse(BaseModel):
    """Model for SME data response"""
    id: int
    company_name: str
    wallet_address: str
    email: str
    registration_date: datetime
    is_active: bool
    subscription_tier: str
    
    class Config:
        from_attributes = True

class TransactionUpload(BaseModel):
    """Model for transaction upload metadata"""
    sme_id: int
    wallet_address: str
    transaction_type: str
    amount: float
    currency: str = "USD"
    description: Optional[str] = None
    
    @validator('transaction_type')
    def validate_transaction_type(cls, v):
        valid_types = ['PAYMENT', 'INVOICE', 'EXPENSE', 'RECEIPT', 'REFUND', 'CONTRACT', 'OTHER']
        if v.upper() not in valid_types:
            raise ValueError(f'Invalid transaction type. Must be one of: {", ".join(valid_types)}')
        return v.upper()
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than zero')
        if v > 999999999.99:
            raise ValueError('Amount too large')
        return round(v, 2)
    
    @validator('currency')
    def validate_currency(cls, v):
        valid_currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY']
        if v.upper() not in valid_currencies:
            raise ValueError(f'Invalid currency. Must be one of: {", ".join(valid_currencies)}')
        return v.upper()

class TransactionResponse(BaseModel):
    """Model for transaction data response"""
    id: int
    token_id: str
    transaction_type: str
    amount: float
    currency: str
    description: Optional[str]
    file_name: Optional[str]
    file_size: Optional[int]
    verification_status: str
    is_verified: bool
    blockchain_hash: Optional[str]
    ipfs_hash: Optional[str]
    created_at: str
    blockchain_verified: bool = False
    
    class Config:
        from_attributes = True

class UploadResponse(BaseModel):
    """Model for file upload response"""
    success: bool
    message: str
    token_id: str
    transaction_id: int
    blockchain_hash: Optional[str]
    ipfs_hash: Optional[str]
    verification_status: str

class AuditTrailResponse(BaseModel):
    """Model for audit trail response"""
    sme_address: str
    company_name: str
    total_transactions: int
    returned_transactions: int
    transactions: List[TransactionResponse]

class VerificationRequest(BaseModel):
    """Model for transaction verification request"""
    token_id: str
    wallet_address: str
    
    @validator('token_id')
    def validate_token_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Token ID cannot be empty')
        return v.strip()

class VerificationResponse(BaseModel):
    """Model for transaction verification response"""
    token_id: str
    is_verified: bool
    verification_status: str
    blockchain_verified: bool
    transaction_data: Optional[Dict[str, Any]]
    verification_timestamp: str

class DataIntegrityRequest(BaseModel):
    """Model for data integrity verification request"""
    token_id: str
    wallet_address: str
    expected_hash: str
    
    @validator('expected_hash')
    def validate_hash(cls, v):
        if not v.startswith('0x') or len(v) != 66:
            raise ValueError('Invalid hash format. Must be 0x followed by 64 hex characters')
        return v.lower()

class DataIntegrityResponse(BaseModel):
    """Model for data integrity verification response"""
    token_id: str
    is_valid: bool
    provided_hash: str
    calculated_hash: Optional[str]
    verification_timestamp: str

class SMEStatsResponse(BaseModel):
    """Model for SME statistics response"""
    sme_id: int
    company_name: str
    wallet_address: str
    registration_date: str
    subscription_tier: str
    statistics: Dict[str, Any]

class NetworkInfoResponse(BaseModel):
    """Model for blockchain network information response"""
    network_id: str
    chain_id: int
    latest_block: int
    gas_price: int
    contract_address: str
    connected: bool

class AuditLogResponse(BaseModel):
    """Model for audit log response"""
    id: int
    action: str
    action_type: str
    entity_type: str
    entity_id: Optional[str]
    actor_address: Optional[str]
    timestamp: str
    status: str
    notes: Optional[str]

class PaginatedResponse(BaseModel):
    """Generic model for paginated responses"""
    total_count: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool
    data: List[Any]

class ErrorResponse(BaseModel):
    """Model for error responses"""
    error: bool = True
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: str = datetime.utcnow().isoformat()

class SuccessResponse(BaseModel):
    """Model for success responses"""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: str = datetime.utcnow().isoformat()

class BlockchainTransactionResponse(BaseModel):
    """Model for blockchain transaction response"""
    token_id: str
    sme_address: str
    timestamp: int
    transaction_type: str
    amount: int
    data_hash: str
    ipfs_hash: str
    is_verified: bool

class IPFSUploadResponse(BaseModel):
    """Model for IPFS upload response"""
    success: bool
    ipfs_hash: Optional[str]
    file_size: int
    file_name: str
    error: Optional[str] = None

class APIKeyRequest(BaseModel):
    """Model for API key generation request"""
    sme_id: int
    permissions: List[str]
    expires_in_days: Optional[int] = 365
    
    @validator('permissions')
    def validate_permissions(cls, v):
        valid_permissions = [
            'transaction.create',
            'transaction.read',
            'transaction.verify',
            'audit_trail.read',
            'sme.read',
            'sme.update'
        ]
        for permission in v:
            if permission not in valid_permissions:
                raise ValueError(f'Invalid permission: {permission}')
        return v

class APIKeyResponse(BaseModel):
    """Model for API key response"""
    api_key: str
    expires_at: datetime
    permissions: List[str]
    is_active: bool

class BatchOperationRequest(BaseModel):
    """Model for batch operations request"""
    operation_type: str
    items: List[Dict[str, Any]]
    
    @validator('operation_type')
    def validate_operation_type(cls, v):
        valid_operations = ['authorize_smes', 'verify_transactions', 'upload_transactions']
        if v not in valid_operations:
            raise ValueError(f'Invalid operation type: {v}')
        return v

class BatchOperationResponse(BaseModel):
    """Model for batch operations response"""
    operation_type: str
    total_items: int
    successful_items: int
    failed_items: int
    results: List[Dict[str, Any]]
    errors: List[Dict[str, Any]]