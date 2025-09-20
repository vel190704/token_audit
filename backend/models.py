from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, DECIMAL, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class SME(Base):
    """SME (Small and Medium Enterprise) model"""
    __tablename__ = "smes"
    
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False, index=True)
    wallet_address = Column(String(42), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    registration_number = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    registration_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    subscription_tier = Column(String(50), default="basic", nullable=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    transactions = relationship("Transaction", back_populates="sme")
    audit_logs = relationship("AuditLog", back_populates="sme")

class Transaction(Base):
    """Transaction model for audit trail entries"""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(String(255), unique=True, nullable=False, index=True)
    sme_id = Column(Integer, ForeignKey("smes.id"), nullable=False, index=True)
    transaction_type = Column(String(100), nullable=False, index=True)
    amount = Column(DECIMAL(15, 2), nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    description = Column(Text, nullable=True)
    
    # Blockchain related fields
    blockchain_hash = Column(String(66), nullable=True, index=True)  # Ethereum tx hash
    block_number = Column(Integer, nullable=True)
    gas_used = Column(Integer, nullable=True)
    
    # IPFS and data integrity
    ipfs_hash = Column(String(255), nullable=True, index=True)
    data_hash = Column(String(66), nullable=False)  # SHA256 hash of original data
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    file_type = Column(String(50), nullable=True)
    
    # Status and metadata
    verification_status = Column(String(20), default="pending", nullable=False, index=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_timestamp = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    sme = relationship("SME", back_populates="transactions")
    audit_logs = relationship("AuditLog", back_populates="transaction")

class AuditLog(Base):
    """Audit log for tracking all system activities"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True, index=True)
    sme_id = Column(Integer, ForeignKey("smes.id"), nullable=True, index=True)
    
    # Action details
    action = Column(String(100), nullable=False, index=True)
    action_type = Column(String(50), nullable=False, index=True)  # CREATE, UPDATE, DELETE, VERIFY
    entity_type = Column(String(50), nullable=False, index=True)  # TRANSACTION, SME, USER
    entity_id = Column(String(100), nullable=True, index=True)
    
    # Actor information
    actor_address = Column(String(42), nullable=True, index=True)
    actor_type = Column(String(20), default="SME", nullable=False)  # SME, ADMIN, SYSTEM
    
    # Additional data
    previous_values = Column(Text, nullable=True)  # JSON of previous state
    new_values = Column(Text, nullable=True)  # JSON of new state
    notes = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Status
    status = Column(String(20), default="success", nullable=False)  # success, failed, pending
    error_message = Column(Text, nullable=True)
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    transaction = relationship("Transaction", back_populates="audit_logs")
    sme = relationship("SME", back_populates="audit_logs")

class SystemConfig(Base):
    """System configuration and settings"""
    __tablename__ = "system_config"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class APIKey(Base):
    """API keys for external service integrations"""
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    key_hash = Column(String(255), nullable=False)  # Hashed API key
    sme_id = Column(Integer, ForeignKey("smes.id"), nullable=True, index=True)
    permissions = Column(Text, nullable=False)  # JSON array of permissions
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    last_used = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)