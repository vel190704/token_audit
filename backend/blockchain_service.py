from web3 import Web3
import json
import os
from typing import Dict, List, Optional
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BlockchainService:
    """Service for interacting with the AuditTrail smart contract"""
    
    def __init__(self):
        # Connect to Ethereum network
        self.rpc_url = os.getenv('ETHEREUM_RPC_URL', 'http://127.0.0.1:8545')
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        
        # Check connection
        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to Ethereum network at {self.rpc_url}")
        
        logger.info(f"✅ Connected to Ethereum network: {self.rpc_url}")
        logger.info(f"Latest block: {self.w3.eth.block_number}")
        
        # Load contract deployment info
        self._load_contract_info()
        
        # Set default account
        self._setup_account()
        
    def _load_contract_info(self):
        """Load smart contract ABI and address from deployment file"""
        deployment_file = os.path.join(
            os.path.dirname(__file__), 
            '../smart-contracts/deployment-info.json'
        )
        
        try:
            with open(deployment_file, 'r') as f:
                deployment_info = json.load(f)
            
            self.contract_address = deployment_info['address']
            self.contract_abi = deployment_info['abi']
            
            # Initialize contract instance
            self.contract = self.w3.eth.contract(
                address=self.contract_address,
                abi=self.contract_abi
            )
            
            logger.info(f"📋 Contract loaded: {self.contract_address}")
            
        except FileNotFoundError:
            raise FileNotFoundError(
                "Smart contract deployment file not found. "
                "Please deploy the contract first using: cd smart-contracts && npm run deploy:local"
            )
        except json.JSONDecodeError:
            raise ValueError("Invalid deployment file format")
            
    def _setup_account(self):
        """Setup the default account for transactions"""
        private_key = os.getenv('PRIVATE_KEY')
        
        if private_key:
            # Use private key from environment
            self.account = self.w3.eth.account.from_key(private_key)
            logger.info(f"🔑 Using account from private key: {self.account.address}")
        else:
            # Use first available account (for local development)
            accounts = self.w3.eth.accounts
            if accounts:
                self.account_address = accounts[0]
                self.account = None  # Will use direct address for local development
                logger.info(f"🔑 Using local account: {self.account_address}")
            else:
                raise ValueError("No accounts available and no private key provided")
    
    def _get_transaction_params(self) -> Dict:
        """Get standard transaction parameters"""
        if self.account:
            # Using private key account
            return {
                'from': self.account.address,
                'gas': 500000,
                'gasPrice': self.w3.to_wei('20', 'gwei')
            }
        else:
            # Using local account
            return {
                'from': self.account_address,
                'gas': 500000
            }
    
    def _send_transaction(self, transaction):
        """Send and wait for transaction confirmation"""
        if self.account:
            # Sign and send transaction with private key
            signed_txn = self.w3.eth.account.sign_transaction(transaction, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        else:
            # Send transaction directly (local development)
            tx_hash = self.w3.eth.send_transaction(transaction)
        
        # Wait for transaction receipt
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return receipt
    
    async def authorize_sme(self, sme_address: str, status: bool = True) -> Dict:
        """Authorize or deauthorize an SME on the blockchain"""
        try:
            logger.info(f"🔐 Authorizing SME: {sme_address} -> {status}")
            
            # Build transaction
            tx_params = self._get_transaction_params()
            transaction = self.contract.functions.authorizeSME(
                sme_address, status
            ).build_transaction(tx_params)
            
            # Send transaction
            receipt = self._send_transaction(transaction)
            
            logger.info(f"✅ SME authorization successful: {receipt.transactionHash.hex()}")
            
            return {
                "success": True,
                "transaction_hash": receipt.transactionHash.hex(),
                "gas_used": receipt.gasUsed,
                "block_number": receipt.blockNumber,
                "status": status
            }
            
        except Exception as e:
            logger.error(f"❌ SME authorization failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def log_transaction(
        self,
        token_id: str,
        transaction_type: str,
        amount: int,
        data_hash: str,
        ipfs_hash: str,
        sme_address: str
    ) -> Dict:
        """Log a transaction to the blockchain"""
        try:
            logger.info(f"📝 Logging transaction: {token_id} for SME: {sme_address}")
            
            # Convert data_hash to bytes32
            if isinstance(data_hash, str):
                if data_hash.startswith('0x'):
                    data_hash_bytes = bytes.fromhex(data_hash[2:])
                else:
                    # Convert string to bytes32
                    data_hash_bytes = self.w3.keccak(text=data_hash)
            else:
                data_hash_bytes = data_hash
            
            # Build transaction
            tx_params = self._get_transaction_params()
            tx_params['from'] = sme_address  # Transaction should come from SME
            
            transaction = self.contract.functions.logTransaction(
                token_id,
                transaction_type,
                amount,
                data_hash_bytes,
                ipfs_hash
            ).build_transaction(tx_params)
            
            # Send transaction
            receipt = self._send_transaction(transaction)
            
            logger.info(f"✅ Transaction logged successfully: {receipt.transactionHash.hex()}")
            
            return {
                "success": True,
                "transaction_hash": receipt.transactionHash.hex(),
                "gas_used": receipt.gasUsed,
                "block_number": receipt.blockNumber,
                "data_hash": data_hash_bytes.hex() if isinstance(data_hash_bytes, bytes) else data_hash_bytes
            }
            
        except Exception as e:
            logger.error(f"❌ Transaction logging failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_audit_trail(self, sme_address: str) -> List[Dict]:
        """Retrieve complete audit trail for an SME from blockchain"""
        try:
            logger.info(f"📖 Retrieving audit trail for SME: {sme_address}")
            
            trail = self.contract.functions.getAuditTrail(sme_address).call()
            
            formatted_trail = []
            for tx in trail:
                formatted_tx = {
                    "tokenId": tx[0],
                    "smeAddress": tx[1],
                    "timestamp": tx[2],
                    "transactionType": tx[3],
                    "amount": tx[4],
                    "dataHash": tx[5].hex() if isinstance(tx[5], bytes) else tx[5],
                    "ipfsHash": tx[6],
                    "isVerified": tx[7]
                }
                formatted_trail.append(formatted_tx)
            
            logger.info(f"📊 Retrieved {len(formatted_trail)} transactions")
            return formatted_trail
            
        except Exception as e:
            logger.error(f"❌ Failed to retrieve audit trail: {str(e)}")
            return []
    
    async def verify_token(self, token_id: str, sme_address: str) -> Dict:
        """Verify a token's existence and authenticity on blockchain"""
        try:
            logger.info(f"🔍 Verifying token: {token_id} for SME: {sme_address}")
            
            result = self.contract.functions.verifyToken(token_id, sme_address).call()
            exists = result[0]
            transaction_data = result[1] if exists else None
            
            if exists and transaction_data:
                formatted_transaction = {
                    "tokenId": transaction_data[0],
                    "smeAddress": transaction_data[1],
                    "timestamp": transaction_data[2],
                    "transactionType": transaction_data[3],
                    "amount": transaction_data[4],
                    "dataHash": transaction_data[5].hex() if isinstance(transaction_data[5], bytes) else transaction_data[5],
                    "ipfsHash": transaction_data[6],
                    "isVerified": transaction_data[7]
                }
            else:
                formatted_transaction = None
            
            logger.info(f"🔍 Token verification result: {exists}")
            
            return {
                "exists": exists,
                "transaction": formatted_transaction
            }
            
        except Exception as e:
            logger.error(f"❌ Token verification failed: {str(e)}")
            return {"exists": False, "error": str(e)}
    
    async def verify_data_integrity(
        self, 
        token_id: str, 
        sme_address: str, 
        expected_hash: str
    ) -> Dict:
        """Verify data integrity of a transaction"""
        try:
            logger.info(f"🔐 Verifying data integrity for token: {token_id}")
            
            # Convert expected_hash to bytes32 if needed
            if isinstance(expected_hash, str):
                if expected_hash.startswith('0x'):
                    expected_hash_bytes = bytes.fromhex(expected_hash[2:])
                else:
                    expected_hash_bytes = self.w3.keccak(text=expected_hash)
            else:
                expected_hash_bytes = expected_hash
            
            is_valid = self.contract.functions.verifyDataIntegrity(
                token_id, sme_address, expected_hash_bytes
            ).call()
            
            logger.info(f"🔐 Data integrity check result: {is_valid}")
            
            return {
                "is_valid": is_valid,
                "token_id": token_id,
                "sme_address": sme_address
            }
            
        except Exception as e:
            logger.error(f"❌ Data integrity verification failed: {str(e)}")
            return {"is_valid": False, "error": str(e)}
    
    async def get_transaction_count(self, sme_address: str) -> int:
        """Get total number of transactions for an SME"""
        try:
            count = self.contract.functions.getTransactionCount(sme_address).call()
            return count
        except Exception as e:
            logger.error(f"❌ Failed to get transaction count: {str(e)}")
            return 0
    
    async def is_sme_authorized(self, sme_address: str) -> bool:
        """Check if an SME is authorized on the blockchain"""
        try:
            is_authorized = self.contract.functions.isAuthorizedSME(sme_address).call()
            return is_authorized
        except Exception as e:
            logger.error(f"❌ Failed to check SME authorization: {str(e)}")
            return False
    
    def get_network_info(self) -> Dict:
        """Get current network information"""
        try:
            return {
                "network_id": self.w3.net.version,
                "chain_id": self.w3.eth.chain_id,
                "latest_block": self.w3.eth.block_number,
                "gas_price": self.w3.eth.gas_price,
                "contract_address": self.contract_address,
                "connected": self.w3.is_connected()
            }
        except Exception as e:
            logger.error(f"❌ Failed to get network info: {str(e)}")
            return {"connected": False, "error": str(e)}