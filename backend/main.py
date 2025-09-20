from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import os
import json
import logging
from datetime import datetime, timedelta
import ipfshttpclient
from contextlib import asynccontextmanager

# Import our modules
from models import Base, SME, Transaction, AuditLog
from database import engine, get_db, init_database
from blockchain_service import BlockchainService
from tokenization_service import TokenizationService
from pydantic_models import (
    SMERegistration, 
    SMEResponse, 
    TransactionResponse, 
    AuditTrailResponse,
    VerificationResponse,
    UploadResponse
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize services
blockchain_service = None
tokenization_service = TokenizationService()
security = HTTPBearer()

# IPFS client
ipfs_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global blockchain_service, ipfs_client
    
    logger.info("🚀 Starting SME Audit Trail API...")
    
    # Initialize database
    try:
        init_database()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
    
    # Initialize blockchain service
    try:
        blockchain_service = BlockchainService()
        logger.info("✅ Blockchain service initialized")
    except Exception as e:
        logger.error(f"❌ Blockchain service initialization failed: {e}")
    
    # Initialize IPFS client
    try:
        ipfs_api = os.getenv('IPFS_API_URL', '/ip4/127.0.0.1/tcp/5001')
        ipfs_client = ipfshttpclient.connect(ipfs_api)
        logger.info("✅ IPFS client initialized")
    except Exception as e:
        logger.error(f"❌ IPFS client initialization failed: {e}")
        ipfs_client = None
    
    yield
    
    # Cleanup
    if ipfs_client:
        ipfs_client.close()
    logger.info("🛑 Application shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="SME Audit Trail API",
    description="Blockchain-based audit trail system for Small and Medium Enterprises",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React development server
        "http://localhost:3001",  # Alternative React port
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Helper functions
async def log_audit_action(
    db: Session,
    action: str,
    action_type: str,
    entity_type: str,
    entity_id: str = None,
    actor_address: str = None,
    sme_id: int = None,
    transaction_id: int = None,
    notes: str = None
):
    """Log an audit action to the database"""
    try:
        audit_log = AuditLog(
            action=action,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_address=actor_address,
            sme_id=sme_id,
            transaction_id=transaction_id,
            notes=notes,
            status="success"
        )
        db.add(audit_log)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log audit action: {str(e)}")

# API Routes

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "SME Audit Trail API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    health_status = {
        "api": "healthy",
        "database": "unknown",
        "blockchain": "unknown",
        "ipfs": "unknown",
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Check database
    try:
        db = next(get_db())
        db.execute("SELECT 1")
        health_status["database"] = "healthy"
        db.close()
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
    
    # Check blockchain
    if blockchain_service:
        try:
            network_info = blockchain_service.get_network_info()
            if network_info.get("connected"):
                health_status["blockchain"] = "healthy"
            else:
                health_status["blockchain"] = "disconnected"
        except Exception as e:
            health_status["blockchain"] = f"error: {str(e)}"
    
    # Check IPFS
    if ipfs_client:
        try:
            ipfs_client.version()
            health_status["ipfs"] = "healthy"
        except Exception as e:
            health_status["ipfs"] = f"error: {str(e)}"
    
    return health_status

@app.post("/api/sme/register", response_model=SMEResponse)
async def register_sme(
    sme_data: SMERegistration, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Register a new SME"""
    try:
        logger.info(f"Registering new SME: {sme_data.company_name}")
        
        # Check if wallet address already exists
        existing_sme = db.query(SME).filter(
            SME.wallet_address == sme_data.wallet_address
        ).first()
        
        if existing_sme:
            raise HTTPException(
                status_code=400, 
                detail="SME with this wallet address already registered"
            )
        
        # Check if email already exists
        existing_email = db.query(SME).filter(SME.email == sme_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=400,
                detail="SME with this email already registered"
            )
        
        # Create new SME
        new_sme = SME(
            company_name=sme_data.company_name,
            wallet_address=sme_data.wallet_address,
            email=sme_data.email,
            phone=sme_data.phone,
            registration_number=sme_data.registration_number,
            address=sme_data.address,
            subscription_tier=sme_data.subscription_tier or "basic"
        )
        
        db.add(new_sme)
        db.commit()
        db.refresh(new_sme)
        
        # Authorize SME on blockchain (background task)
        if blockchain_service:
            background_tasks.add_task(
                authorize_sme_on_blockchain,
                sme_data.wallet_address,
                new_sme.id,
                db
            )
        
        # Log audit action
        await log_audit_action(
            db=db,
            action="SME Registration",
            action_type="CREATE",
            entity_type="SME",
            entity_id=str(new_sme.id),
            actor_address=sme_data.wallet_address,
            sme_id=new_sme.id,
            notes=f"Registered company: {sme_data.company_name}"
        )
        
        logger.info(f"✅ SME registered successfully: {new_sme.id}")
        
        return SMEResponse(
            id=new_sme.id,
            company_name=new_sme.company_name,
            wallet_address=new_sme.wallet_address,
            email=new_sme.email,
            registration_date=new_sme.registration_date,
            is_active=new_sme.is_active,
            subscription_tier=new_sme.subscription_tier
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ SME registration failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

async def authorize_sme_on_blockchain(wallet_address: str, sme_id: int, db: Session):
    """Background task to authorize SME on blockchain"""
    try:
        result = await blockchain_service.authorize_sme(wallet_address, True)
        
        # Log the result
        await log_audit_action(
            db=db,
            action="Blockchain Authorization",
            action_type="CREATE",
            entity_type="SME",
            entity_id=str(sme_id),
            actor_address="system",
            sme_id=sme_id,
            notes=f"Blockchain authorization result: {result}"
        )
        
        if result["success"]:
            logger.info(f"✅ SME {sme_id} authorized on blockchain: {result['transaction_hash']}")
        else:
            logger.error(f"❌ SME {sme_id} blockchain authorization failed: {result['error']}")
            
    except Exception as e:
        logger.error(f"❌ Background blockchain authorization failed: {str(e)}")

@app.post("/api/transaction/upload", response_model=UploadResponse)
async def upload_transaction(
    file: UploadFile = File(...),
    sme_id: int = Form(...),
    wallet_address: str = Form(...),
    transaction_type: str = Form(...),
    amount: float = Form(...),
    currency: str = Form("USD"),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload transaction with file to blockchain and IPFS"""
    try:
        logger.info(f"Processing transaction upload for SME {sme_id}")
        
        # Validate SME exists and is active
        sme = db.query(SME).filter(
            SME.id == sme_id,
            SME.wallet_address == wallet_address,
            SME.is_active == True
        ).first()
        
        if not sme:
            raise HTTPException(
                status_code=404,
                detail="SME not found or inactive"
            )
        
        # Verify SME is authorized on blockchain
        if blockchain_service:
            is_authorized = await blockchain_service.is_sme_authorized(wallet_address)
            if not is_authorized:
                raise HTTPException(
                    status_code=403,
                    detail="SME not authorized on blockchain"
                )
        
        # Read and process file
        file_content = await file.read()
        file_size = len(file_content)
        
        # Create file hash
        file_hash = tokenization_service.create_file_hash(file_content)
        
        # Upload to IPFS
        ipfs_hash = None
        if ipfs_client:
            try:
                ipfs_result = ipfs_client.add_bytes(file_content)
                ipfs_hash = ipfs_result['Hash']
                logger.info(f"📎 File uploaded to IPFS: {ipfs_hash}")
            except Exception as e:
                logger.warning(f"IPFS upload failed: {str(e)}")
                ipfs_hash = f"local_storage_{file_hash[:16]}"
        
        # Generate token ID
        token_id = tokenization_service.generate_token_id(
            sme_id,
            transaction_type,
            datetime.utcnow()
        )
        
        # Create comprehensive data hash
        transaction_data = {
            "token_id": token_id,
            "sme_id": sme_id,
            "wallet_address": wallet_address,
            "transaction_type": transaction_type,
            "amount": amount,
            "currency": currency,
            "description": description or "",
            "file_hash": file_hash,
            "file_name": file.filename,
            "file_size": file_size,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        data_hash = tokenization_service.create_data_hash(transaction_data)
        
        # Store in database first
        new_transaction = Transaction(
            token_id=token_id,
            sme_id=sme_id,
            transaction_type=transaction_type,
            amount=amount,
            currency=currency,
            description=description or "",
            ipfs_hash=ipfs_hash or "",
            data_hash=data_hash,
            file_name=file.filename,
            file_size=file_size,
            file_type=file.content_type,
            verification_status="pending"
        )
        
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)
        
        # Submit to blockchain
        blockchain_result = None
        if blockchain_service:
            try:
                blockchain_result = await blockchain_service.log_transaction(
                    token_id=token_id,
                    transaction_type=transaction_type,
                    amount=int(amount * 100),  # Convert to cents
                    data_hash=data_hash,
                    ipfs_hash=ipfs_hash or "",
                    sme_address=wallet_address
                )
                
                if blockchain_result["success"]:
                    # Update transaction with blockchain info
                    new_transaction.blockchain_hash = blockchain_result["transaction_hash"]
                    new_transaction.block_number = blockchain_result["block_number"]
                    new_transaction.gas_used = blockchain_result["gas_used"]
                    new_transaction.verification_status = "verified"
                    new_transaction.is_verified = True
                    new_transaction.verification_timestamp = datetime.utcnow()
                    
                    db.commit()
                    logger.info(f"✅ Transaction logged to blockchain: {blockchain_result['transaction_hash']}")
                else:
                    # Mark as failed but keep database record
                    new_transaction.verification_status = "failed"
                    db.commit()
                    logger.error(f"❌ Blockchain logging failed: {blockchain_result['error']}")
                    
            except Exception as e:
                new_transaction.verification_status = "failed"
                db.commit()
                logger.error(f"❌ Blockchain submission error: {str(e)}")
        
        # Log audit action
        await log_audit_action(
            db=db,
            action="Transaction Upload",
            action_type="CREATE",
            entity_type="TRANSACTION",
            entity_id=token_id,
            actor_address=wallet_address,
            sme_id=sme_id,
            transaction_id=new_transaction.id,
            notes=f"File: {file.filename}, Amount: {amount} {currency}"
        )
        
        return UploadResponse(
            success=True,
            message="Transaction uploaded successfully",
            token_id=token_id,
            transaction_id=new_transaction.id,
            blockchain_hash=new_transaction.blockchain_hash,
            ipfs_hash=ipfs_hash,
            verification_status=new_transaction.verification_status
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Transaction upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/api/audit-trail/{wallet_address}", response_model=AuditTrailResponse)
async def get_audit_trail(
    wallet_address: str,
    limit: Optional[int] = 100,
    offset: Optional[int] = 0,
    db: Session = Depends(get_db)
):
    """Get complete audit trail for an SME"""
    try:
        logger.info(f"Retrieving audit trail for: {wallet_address}")
        
        # Get SME info
        sme = db.query(SME).filter(SME.wallet_address == wallet_address).first()
        if not sme:
            raise HTTPException(status_code=404, detail="SME not found")
        
        # Get transactions from database with pagination
        transactions_query = db.query(Transaction).filter(
            Transaction.sme_id == sme.id
        ).order_by(Transaction.created_at.desc())
        
        total_count = transactions_query.count()
        transactions = transactions_query.offset(offset).limit(limit).all()
        
        # Get blockchain data if available
        blockchain_trail = []
        if blockchain_service:
            try:
                blockchain_trail = await blockchain_service.get_audit_trail(wallet_address)
            except Exception as e:
                logger.warning(f"Failed to fetch blockchain trail: {str(e)}")
        
        # Combine and format data
        combined_transactions = []
        for tx in transactions:
            # Find corresponding blockchain data
            blockchain_tx = next(
                (btx for btx in blockchain_trail if btx["tokenId"] == tx.token_id),
                None
            )
            
            transaction_data = {
                "id": tx.id,
                "token_id": tx.token_id,
                "transaction_type": tx.transaction_type,
                "amount": float(tx.amount),
                "currency": tx.currency,
                "description": tx.description,
                "file_name": tx.file_name,
                "file_size": tx.file_size,
                "verification_status": tx.verification_status,
                "is_verified": tx.is_verified,
                "blockchain_hash": tx.blockchain_hash,
                "ipfs_hash": tx.ipfs_hash,
                "created_at": tx.created_at.isoformat(),
                "blockchain_verified": blockchain_tx is not None if blockchain_tx else False
            }
            
            combined_transactions.append(transaction_data)
        
        return AuditTrailResponse(
            sme_address=wallet_address,
            company_name=sme.company_name,
            total_transactions=total_count,
            returned_transactions=len(combined_transactions),
            transactions=combined_transactions
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to retrieve audit trail: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve audit trail: {str(e)}")

@app.post("/api/verify/{token_id}", response_model=VerificationResponse)
async def verify_transaction(
    token_id: str,
    wallet_address: str,
    db: Session = Depends(get_db)
):
    """Verify transaction authenticity"""
    try:
        logger.info(f"Verifying transaction: {token_id}")
        
        # Get from database
        transaction = db.query(Transaction).filter(
            Transaction.token_id == token_id
        ).first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Get SME info
        sme = db.query(SME).filter(SME.id == transaction.sme_id).first()
        if not sme or sme.wallet_address != wallet_address:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Verify on blockchain
        blockchain_verification = None
        if blockchain_service:
            try:
                blockchain_verification = await blockchain_service.verify_token(
                    token_id, wallet_address
                )
            except Exception as e:
                logger.warning(f"Blockchain verification failed: {str(e)}")
        
        # Log verification attempt
        await log_audit_action(
            db=db,
            action="Transaction Verification",
            action_type="READ",
            entity_type="TRANSACTION",
            entity_id=token_id,
            actor_address=wallet_address,
            sme_id=sme.id,
            transaction_id=transaction.id,
            notes="Verification request"
        )
        
        return VerificationResponse(
            token_id=token_id,
            is_verified=transaction.is_verified,
            verification_status=transaction.verification_status,
            blockchain_verified=blockchain_verification["exists"] if blockchain_verification else False,
            transaction_data={
                "id": transaction.id,
                "transaction_type": transaction.transaction_type,
                "amount": float(transaction.amount),
                "currency": transaction.currency,
                "created_at": transaction.created_at.isoformat(),
                "blockchain_hash": transaction.blockchain_hash,
                "ipfs_hash": transaction.ipfs_hash
            },
            verification_timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Transaction verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@app.get("/api/sme/{wallet_address}/stats")
async def get_sme_stats(wallet_address: str, db: Session = Depends(get_db)):
    """Get SME statistics"""
    try:
        sme = db.query(SME).filter(SME.wallet_address == wallet_address).first()
        if not sme:
            raise HTTPException(status_code=404, detail="SME not found")
        
        # Get transaction statistics
        total_transactions = db.query(Transaction).filter(Transaction.sme_id == sme.id).count()
        verified_transactions = db.query(Transaction).filter(
            Transaction.sme_id == sme.id,
            Transaction.is_verified == True
        ).count()
        
        pending_transactions = db.query(Transaction).filter(
            Transaction.sme_id == sme.id,
            Transaction.verification_status == "pending"
        ).count()
        
        # Get blockchain transaction count
        blockchain_count = 0
        if blockchain_service:
            try:
                blockchain_count = await blockchain_service.get_transaction_count(wallet_address)
            except Exception as e:
                logger.warning(f"Failed to get blockchain count: {str(e)}")
        
        return {
            "sme_id": sme.id,
            "company_name": sme.company_name,
            "wallet_address": wallet_address,
            "registration_date": sme.registration_date.isoformat(),
            "subscription_tier": sme.subscription_tier,
            "statistics": {
                "total_transactions": total_transactions,
                "verified_transactions": verified_transactions,
                "pending_transactions": pending_transactions,
                "blockchain_transactions": blockchain_count,
                "verification_rate": (verified_transactions / total_transactions * 100) if total_transactions > 0 else 0
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get SME stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )