const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuditTrail Contract", function () {
    let auditTrail;
    let owner;
    let sme1;
    let sme2;
    let unauthorized;
    
    // Test data
    const testTransaction = {
        tokenId: "TXN_2024_001",
        transactionType: "PAYMENT",
        amount: ethers.utils.parseEther("100"),
        dataHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test transaction data")),
        ipfsHash: "QmTest123456789"
    };
    
    beforeEach(async function () {
        [owner, sme1, sme2, unauthorized] = await ethers.getSigners();
        
        const AuditTrail = await ethers.getContractFactory("AuditTrail");
        auditTrail = await AuditTrail.deploy();
        await auditTrail.deployed();
        
        // Authorize SME1 and SME2
        await auditTrail.authorizeSME(sme1.address, true);
        await auditTrail.authorizeSME(sme2.address, true);
    });
    
    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await auditTrail.owner()).to.equal(owner.address);
        });
        
        it("Should authorize the owner as SME by default", async function () {
            expect(await auditTrail.authorizedSMEs(owner.address)).to.be.true;
        });
        
        it("Should initialize with zero total transactions", async function () {
            expect(await auditTrail.totalTransactions()).to.equal(0);
        });
    });
    
    describe("SME Authorization", function () {
        it("Should authorize SME correctly", async function () {
            expect(await auditTrail.authorizedSMEs(sme1.address)).to.be.true;
            expect(await auditTrail.authorizedSMEs(sme2.address)).to.be.true;
            expect(await auditTrail.authorizedSMEs(unauthorized.address)).to.be.false;
        });
        
        it("Should emit SMEAuthorized event", async function () {
            await expect(auditTrail.authorizeSME(unauthorized.address, true))
                .to.emit(auditTrail, "SMEAuthorized")
                .withArgs(unauthorized.address, true);
        });
        
        it("Should deauthorize SME", async function () {
            await auditTrail.authorizeSME(sme1.address, false);
            expect(await auditTrail.authorizedSMEs(sme1.address)).to.be.false;
        });
        
        it("Should only allow owner to authorize SMEs", async function () {
            await expect(
                auditTrail.connect(sme1).authorizeSME(unauthorized.address, true)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
        
        it("Should reject zero address authorization", async function () {
            await expect(
                auditTrail.authorizeSME(ethers.constants.AddressZero, true)
            ).to.be.revertedWith("AuditTrail: Invalid SME address");
        });
    });
    
    describe("Transaction Logging", function () {
        it("Should log transaction successfully", async function () {
            await expect(
                auditTrail.connect(sme1).logTransaction(
                    testTransaction.tokenId,
                    testTransaction.transactionType,
                    testTransaction.amount,
                    testTransaction.dataHash,
                    testTransaction.ipfsHash
                )
            ).to.emit(auditTrail, "TransactionLogged")
             .withArgs(
                testTransaction.tokenId,
                sme1.address,
                await time.latest() + 1, // approximate timestamp
                testTransaction.dataHash,
                testTransaction.transactionType,
                testTransaction.amount
             );
        });
        
        it("Should update transaction count and total", async function () {
            await auditTrail.connect(sme1).logTransaction(
                testTransaction.tokenId,
                testTransaction.transactionType,
                testTransaction.amount,
                testTransaction.dataHash,
                testTransaction.ipfsHash
            );
            
            expect(await auditTrail.getTransactionCount(sme1.address)).to.equal(1);
            expect(await auditTrail.totalTransactions()).to.equal(1);
        });
        
        it("Should mark token as existing", async function () {
            await auditTrail.connect(sme1).logTransaction(
                testTransaction.tokenId,
                testTransaction.transactionType,
                testTransaction.amount,
                testTransaction.dataHash,
                testTransaction.ipfsHash
            );
            
            expect(await auditTrail.tokenExists(testTransaction.tokenId)).to.be.true;
        });
        
        it("Should reject duplicate token IDs", async function () {
            await auditTrail.connect(sme1).logTransaction(
                testTransaction.tokenId,
                testTransaction.transactionType,
                testTransaction.amount,
                testTransaction.dataHash,
                testTransaction.ipfsHash
            );
            
            await expect(
                auditTrail.connect(sme2).logTransaction(
                    testTransaction.tokenId,
                    "INVOICE",
                    ethers.utils.parseEther("50"),
                    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("different data")),
                    "QmDifferent123"
                )
            ).to.be.revertedWith("AuditTrail: Token already exists");
        });
        
        it("Should reject unauthorized SME", async function () {
            await expect(
                auditTrail.connect(unauthorized).logTransaction(
                    "TXN_UNAUTHORIZED",
                    testTransaction.transactionType,
                    testTransaction.amount,
                    testTransaction.dataHash,
                    testTransaction.ipfsHash
                )
            ).to.be.revertedWith("AuditTrail: Not authorized SME");
        });
        
        it("Should reject invalid inputs", async function () {
            // Empty token ID
            await expect(
                auditTrail.connect(sme1).logTransaction(
                    "",
                    testTransaction.transactionType,
                    testTransaction.amount,
                    testTransaction.dataHash,
                    testTransaction.ipfsHash
                )
            ).to.be.revertedWith("AuditTrail: Token ID cannot be empty");
            
            // Zero amount
            await expect(
                auditTrail.connect(sme1).logTransaction(
                    "TXN_ZERO_AMOUNT",
                    testTransaction.transactionType,
                    0,
                    testTransaction.dataHash,
                    testTransaction.ipfsHash
                )
            ).to.be.revertedWith("AuditTrail: Amount must be greater than zero");
            
            // Invalid data hash
            await expect(
                auditTrail.connect(sme1).logTransaction(
                    "TXN_INVALID_HASH",
                    testTransaction.transactionType,
                    testTransaction.amount,
                    ethers.constants.HashZero,
                    testTransaction.ipfsHash
                )
            ).to.be.revertedWith("AuditTrail: Invalid data hash");
        });
    });
    
    describe("Audit Trail Retrieval", function () {
        beforeEach(async function () {
            // Add some test transactions
            await auditTrail.connect(sme1).logTransaction(
                "TXN_001",
                "PAYMENT",
                ethers.utils.parseEther("100"),
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes("payment data")),
                "QmPayment123"
            );
            
            await auditTrail.connect(sme1).logTransaction(
                "TXN_002",
                "INVOICE",
                ethers.utils.parseEther("50"),
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes("invoice data")),
                "QmInvoice456"
            );
        });
        
        it("Should retrieve complete audit trail", async function () {
            const trail = await auditTrail.getAuditTrail(sme1.address);
            expect(trail.length).to.equal(2);
            expect(trail[0].tokenId).to.equal("TXN_001");
            expect(trail[1].tokenId).to.equal("TXN_002");
        });
        
        it("Should return empty trail for SME with no transactions", async function () {
            const trail = await auditTrail.getAuditTrail(unauthorized.address);
            expect(trail.length).to.equal(0);
        });
    });
    
    describe("Token Verification", function () {
        beforeEach(async function () {
            await auditTrail.connect(sme1).logTransaction(
                testTransaction.tokenId,
                testTransaction.transactionType,
                testTransaction.amount,
                testTransaction.dataHash,
                testTransaction.ipfsHash
            );
        });
        
        it("Should verify existing token", async function () {
            const [exists, transaction] = await auditTrail.verifyToken(
                testTransaction.tokenId,
                sme1.address
            );
            
            expect(exists).to.be.true;
            expect(transaction.tokenId).to.equal(testTransaction.tokenId);
            expect(transaction.smeAddress).to.equal(sme1.address);
            expect(transaction.amount).to.equal(testTransaction.amount);
        });
        
        it("Should return false for non-existing token", async function () {
            const [exists, transaction] = await auditTrail.verifyToken(
                "NON_EXISTING_TOKEN",
                sme1.address
            );
            
            expect(exists).to.be.false;
        });
        
        it("Should verify data integrity", async function () {
            const isValid = await auditTrail.verifyDataIntegrity(
                testTransaction.tokenId,
                sme1.address,
                testTransaction.dataHash
            );
            
            expect(isValid).to.be.true;
        });
        
        it("Should detect data integrity violation", async function () {
            const wrongHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("wrong data"));
            const isValid = await auditTrail.verifyDataIntegrity(
                testTransaction.tokenId,
                sme1.address,
                wrongHash
            );
            
            expect(isValid).to.be.false;
        });
    });
    
    describe("Batch Operations", function () {
        it("Should batch authorize multiple SMEs", async function () {
            const addresses = [unauthorized.address, sme2.address];
            const statuses = [true, false];
            
            await auditTrail.batchAuthorizeSMEs(addresses, statuses);
            
            expect(await auditTrail.authorizedSMEs(unauthorized.address)).to.be.true;
            expect(await auditTrail.authorizedSMEs(sme2.address)).to.be.false;
        });
        
        it("Should reject mismatched array lengths", async function () {
            const addresses = [unauthorized.address];
            const statuses = [true, false];
            
            await expect(
                auditTrail.batchAuthorizeSMEs(addresses, statuses)
            ).to.be.revertedWith("AuditTrail: Arrays length mismatch");
        });
    });
    
    describe("Pause Functionality", function () {
        it("Should pause and unpause contract", async function () {
            await auditTrail.pause();
            expect(await auditTrail.paused()).to.be.true;
            
            await expect(
                auditTrail.connect(sme1).logTransaction(
                    testTransaction.tokenId,
                    testTransaction.transactionType,
                    testTransaction.amount,
                    testTransaction.dataHash,
                    testTransaction.ipfsHash
                )
            ).to.be.revertedWith("Pausable: paused");
            
            await auditTrail.unpause();
            expect(await auditTrail.paused()).to.be.false;
        });
        
        it("Should only allow owner to pause", async function () {
            await expect(
                auditTrail.connect(sme1).pause()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
    
    describe("Public Lookup Functions", function () {
        beforeEach(async function () {
            await auditTrail.connect(sme1).logTransaction(
                testTransaction.tokenId,
                testTransaction.transactionType,
                testTransaction.amount,
                testTransaction.dataHash,
                testTransaction.ipfsHash
            );
        });
        
        it("Should get transaction by token ID", async function () {
            const [exists, transaction] = await auditTrail.getTransactionByTokenId(
                testTransaction.tokenId
            );
            
            expect(exists).to.be.true;
            expect(transaction.tokenId).to.equal(testTransaction.tokenId);
        });
        
        it("Should check SME authorization status", async function () {
            expect(await auditTrail.isAuthorizedSME(sme1.address)).to.be.true;
            expect(await auditTrail.isAuthorizedSME(unauthorized.address)).to.be.false;
        });
    });
});