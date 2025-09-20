// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title AuditTrail
 * @dev Smart contract for managing tokenized audit trails for SMEs
 */
contract AuditTrail is Ownable, ReentrancyGuard, Pausable {
    struct Transaction {
        string tokenId;
        address smeAddress;
        uint256 timestamp;
        string transactionType;
        uint256 amount;
        bytes32 dataHash;
        string ipfsHash;
        bool isVerified;
    }
    
    // Mappings
    mapping(address => Transaction[]) public auditTrails;
    mapping(string => bool) public tokenExists;
    mapping(address => bool) public authorizedSMEs;
    mapping(string => address) public tokenToSME;
    
    // Counters
    mapping(address => uint256) public transactionCounts;
    uint256 public totalTransactions;
    
    // Events
    event TransactionLogged(
        string indexed tokenId,
        address indexed sme,
        uint256 timestamp,
        bytes32 dataHash,
        string transactionType,
        uint256 amount
    );
    
    event SMEAuthorized(address indexed sme, bool status);
    event TransactionVerified(string indexed tokenId, address indexed verifier);
    
    // Modifiers
    modifier onlyAuthorizedSME() {
        require(authorizedSMEs[msg.sender], "AuditTrail: Not authorized SME");
        _;
    }
    
    modifier validTokenId(string memory _tokenId) {
        require(bytes(_tokenId).length > 0, "AuditTrail: Token ID cannot be empty");
        require(bytes(_tokenId).length <= 64, "AuditTrail: Token ID too long");
        _;
    }
    
    modifier validAmount(uint256 _amount) {
        require(_amount > 0, "AuditTrail: Amount must be greater than zero");
        _;
    }
    
    /**
     * @dev Constructor - grants owner initial authorization
     */
    constructor() {
        authorizedSMEs[msg.sender] = true;
        emit SMEAuthorized(msg.sender, true);
    }
    
    /**
     * @dev Authorize or deauthorize an SME
     * @param _sme Address of the SME to authorize/deauthorize
     * @param _status Authorization status
     */
    function authorizeSME(address _sme, bool _status) external onlyOwner {
        require(_sme != address(0), "AuditTrail: Invalid SME address");
        authorizedSMEs[_sme] = _status;
        emit SMEAuthorized(_sme, _status);
    }
    
    /**
     * @dev Log a new transaction to the audit trail
     * @param _tokenId Unique identifier for the transaction
     * @param _transactionType Type of transaction (e.g., PAYMENT, INVOICE)
     * @param _amount Transaction amount in wei equivalent
     * @param _dataHash Hash of the transaction data
     * @param _ipfsHash IPFS hash of associated documents
     */
    function logTransaction(
        string memory _tokenId,
        string memory _transactionType,
        uint256 _amount,
        bytes32 _dataHash,
        string memory _ipfsHash
    ) 
        external 
        onlyAuthorizedSME 
        nonReentrant 
        whenNotPaused
        validTokenId(_tokenId)
        validAmount(_amount)
        returns (bool) 
    {
        require(!tokenExists[_tokenId], "AuditTrail: Token already exists");
        require(_dataHash != bytes32(0), "AuditTrail: Invalid data hash");
        require(bytes(_transactionType).length > 0, "AuditTrail: Transaction type required");
        require(bytes(_ipfsHash).length > 0, "AuditTrail: IPFS hash required");
        
        Transaction memory newTx = Transaction({
            tokenId: _tokenId,
            smeAddress: msg.sender,
            timestamp: block.timestamp,
            transactionType: _transactionType,
            amount: _amount,
            dataHash: _dataHash,
            ipfsHash: _ipfsHash,
            isVerified: true
        });
        
        auditTrails[msg.sender].push(newTx);
        tokenExists[_tokenId] = true;
        tokenToSME[_tokenId] = msg.sender;
        transactionCounts[msg.sender]++;
        totalTransactions++;
        
        emit TransactionLogged(
            _tokenId, 
            msg.sender, 
            block.timestamp, 
            _dataHash,
            _transactionType,
            _amount
        );
        
        return true;
    }
    
    /**
     * @dev Get complete audit trail for an SME
     * @param _sme Address of the SME
     * @return Array of transactions
     */
    function getAuditTrail(address _sme) 
        external 
        view 
        returns (Transaction[] memory) 
    {
        require(_sme != address(0), "AuditTrail: Invalid SME address");
        return auditTrails[_sme];
    }
    
    /**
     * @dev Verify if a token exists and get its details
     * @param _tokenId Token identifier to verify
     * @param _sme SME address to check against
     * @return exists Whether the token exists
     * @return transaction The transaction details if it exists
     */
    function verifyToken(string memory _tokenId, address _sme) 
        external 
        view 
        validTokenId(_tokenId)
        returns (bool exists, Transaction memory transaction) 
    {
        require(_sme != address(0), "AuditTrail: Invalid SME address");
        
        Transaction[] memory smeTransactions = auditTrails[_sme];
        
        for (uint i = 0; i < smeTransactions.length; i++) {
            if (keccak256(bytes(smeTransactions[i].tokenId)) == 
                keccak256(bytes(_tokenId))) {
                return (true, smeTransactions[i]);
            }
        }
        
        Transaction memory emptyTx;
        return (false, emptyTx);
    }
    
    /**
     * @dev Get transaction count for an SME
     * @param _sme SME address
     * @return Number of transactions
     */
    function getTransactionCount(address _sme) 
        external 
        view 
        returns (uint256) 
    {
        require(_sme != address(0), "AuditTrail: Invalid SME address");
        return transactionCounts[_sme];
    }
    
    /**
     * @dev Verify data integrity of a transaction
     * @param _tokenId Token identifier
     * @param _sme SME address
     * @param _expectedHash Expected data hash
     * @return Whether the data integrity check passes
     */
    function verifyDataIntegrity(
        string memory _tokenId,
        address _sme,
        bytes32 _expectedHash
    ) 
        external 
        view 
        validTokenId(_tokenId)
        returns (bool) 
    {
        require(_sme != address(0), "AuditTrail: Invalid SME address");
        require(_expectedHash != bytes32(0), "AuditTrail: Invalid expected hash");
        
        (bool exists, Transaction memory tx) = this.verifyToken(_tokenId, _sme);
        
        if (!exists) return false;
        return tx.dataHash == _expectedHash;
    }
    
    /**
     * @dev Get transaction by token ID (public lookup)
     * @param _tokenId Token identifier
     * @return exists Whether the token exists
     * @return transaction The transaction details
     */
    function getTransactionByTokenId(string memory _tokenId)
        external
        view
        validTokenId(_tokenId)
        returns (bool exists, Transaction memory transaction)
    {
        if (!tokenExists[_tokenId]) {
            Transaction memory emptyTx;
            return (false, emptyTx);
        }
        
        address smeAddress = tokenToSME[_tokenId];
        return this.verifyToken(_tokenId, smeAddress);
    }
    
    /**
     * @dev Check if an address is an authorized SME
     * @param _sme Address to check
     * @return Authorization status
     */
    function isAuthorizedSME(address _sme) external view returns (bool) {
        return authorizedSMEs[_sme];
    }
    
    /**
     * @dev Get total number of transactions in the system
     * @return Total transaction count
     */
    function getTotalTransactions() external view returns (uint256) {
        return totalTransactions;
    }
    
    /**
     * @dev Pause the contract (emergency function)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Batch authorize multiple SMEs
     * @param _smes Array of SME addresses
     * @param _statuses Array of authorization statuses
     */
    function batchAuthorizeSMEs(
        address[] memory _smes, 
        bool[] memory _statuses
    ) external onlyOwner {
        require(_smes.length == _statuses.length, "AuditTrail: Arrays length mismatch");
        require(_smes.length > 0, "AuditTrail: Empty arrays");
        
        for (uint i = 0; i < _smes.length; i++) {
            require(_smes[i] != address(0), "AuditTrail: Invalid SME address");
            authorizedSMEs[_smes[i]] = _statuses[i];
            emit SMEAuthorized(_smes[i], _statuses[i]);
        }
    }
}