import hashlib
import uuid
from datetime import datetime
from typing import Dict, Any
import json
import logging

logger = logging.getLogger(__name__)

class TokenizationService:
    """Service for generating unique tokens and data hashes for transactions"""
    
    def __init__(self):
        self.prefix = "TXN"
        
    def generate_token_id(
        self, 
        sme_id: int, 
        transaction_type: str, 
        timestamp: datetime = None
    ) -> str:
        """Generate a unique token ID for a transaction"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        # Create components for token ID
        date_str = timestamp.strftime("%Y%m%d")
        time_str = timestamp.strftime("%H%M%S")
        
        # Generate short UUID for uniqueness
        short_uuid = str(uuid.uuid4())[:8].upper()
        
        # Combine components
        token_id = f"{self.prefix}_{date_str}_{sme_id}_{transaction_type}_{time_str}_{short_uuid}"
        
        logger.info(f"Generated token ID: {token_id}")
        return token_id
    
    def create_data_hash(self, data: Dict[str, Any]) -> str:
        """Create a SHA256 hash of transaction data for integrity verification"""
        try:
            # Convert data to JSON string with sorted keys for consistency
            data_string = json.dumps(data, sort_keys=True, separators=(',', ':'))
            
            # Create SHA256 hash
            hash_object = hashlib.sha256(data_string.encode('utf-8'))
            data_hash = hash_object.hexdigest()
            
            logger.info(f"Created data hash for: {list(data.keys())}")
            return f"0x{data_hash}"
            
        except Exception as e:
            logger.error(f"Failed to create data hash: {str(e)}")
            raise ValueError(f"Failed to create data hash: {str(e)}")
    
    def create_file_hash(self, file_content: bytes) -> str:
        """Create a SHA256 hash of file content"""
        try:
            hash_object = hashlib.sha256(file_content)
            file_hash = hash_object.hexdigest()
            
            logger.info(f"Created file hash: {file_hash[:16]}...")
            return file_hash
            
        except Exception as e:
            logger.error(f"Failed to create file hash: {str(e)}")
            raise ValueError(f"Failed to create file hash: {str(e)}")
    
    def verify_token_format(self, token_id: str) -> bool:
        """Verify that a token ID follows the expected format"""
        try:
            parts = token_id.split('_')
            
            # Expected format: TXN_YYYYMMDD_SME_ID_TYPE_HHMMSS_UUID
            if len(parts) != 6:
                return False
            
            # Check prefix
            if parts[0] != self.prefix:
                return False
            
            # Check date format (YYYYMMDD)
            if len(parts[1]) != 8 or not parts[1].isdigit():
                return False
            
            # Check SME ID is numeric
            if not parts[2].isdigit():
                return False
            
            # Check transaction type is not empty
            if not parts[3]:
                return False
            
            # Check time format (HHMMSS)
            if len(parts[4]) != 6 or not parts[4].isdigit():
                return False
            
            # Check UUID format (8 characters)
            if len(parts[5]) != 8:
                return False
            
            return True
            
        except Exception:
            return False
    
    def extract_token_metadata(self, token_id: str) -> Dict[str, Any]:
        """Extract metadata from a token ID"""
        if not self.verify_token_format(token_id):
            raise ValueError("Invalid token ID format")
        
        parts = token_id.split('_')
        
        # Parse date and time
        date_str = parts[1]
        time_str = parts[4]
        
        try:
            timestamp = datetime.strptime(f"{date_str}{time_str}", "%Y%m%d%H%M%S")
        except ValueError:
            timestamp = None
        
        return {
            "sme_id": int(parts[2]),
            "transaction_type": parts[3],
            "timestamp": timestamp,
            "uuid": parts[5],
            "date": date_str,
            "time": time_str
        }
    
    def generate_api_key(self, sme_id: int) -> str:
        """Generate an API key for SME access"""
        # Create a unique identifier
        unique_data = f"{sme_id}_{datetime.utcnow().isoformat()}_{uuid.uuid4()}"
        
        # Hash it
        hash_object = hashlib.sha256(unique_data.encode('utf-8'))
        api_key = f"ak_{hash_object.hexdigest()[:32]}"
        
        logger.info(f"Generated API key for SME {sme_id}")
        return api_key
    
    def hash_api_key(self, api_key: str) -> str:
        """Hash an API key for secure storage"""
        hash_object = hashlib.sha256(api_key.encode('utf-8'))
        return hash_object.hexdigest()
    
    def validate_data_integrity(
        self, 
        original_data: Dict[str, Any], 
        provided_hash: str
    ) -> bool:
        """Validate that provided data matches the hash"""
        try:
            calculated_hash = self.create_data_hash(original_data)
            return calculated_hash.lower() == provided_hash.lower()
        except Exception as e:
            logger.error(f"Data integrity validation failed: {str(e)}")
            return False