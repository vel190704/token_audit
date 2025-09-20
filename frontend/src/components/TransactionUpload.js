import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { formatFileSize, isAllowedFileType, getErrorMessage } from '../utils/helpers';

const TransactionUpload = ({ account, web3, smeData, onUploadSuccess }) => {
  const [formData, setFormData] = useState({
    transaction_type: '',
    amount: '',
    currency: 'USD',
    description: '',
    file: null
  });
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      toast.error('File type not supported or file too large');
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Validate file type
      if (!isAllowedFileType(file.name)) {
        toast.error('File type not supported. Please upload PDF, JPG, PNG, DOC, or DOCX files.');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size too large. Maximum size is 10MB.');
        return;
      }

      setFormData(prev => ({ ...prev, file }));
      toast.success(`File "${file.name}" selected successfully`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.file) {
      toast.error('Please select a file to upload');
      return false;
    }
    if (!formData.transaction_type) {
      toast.error('Please select a transaction type');
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', formData.file);
      formDataToSend.append('sme_id', smeData.sme_id.toString());
      formDataToSend.append('wallet_address', account);
      formDataToSend.append('transaction_type', formData.transaction_type);
      formDataToSend.append('amount', formData.amount);
      formDataToSend.append('currency', formData.currency);
      formDataToSend.append('description', formData.description);

      const response = await axios.post(
        'http://localhost:8000/api/transaction/upload',
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000, // 1 minute timeout
        }
      );

      setUploadResult({
        success: true,
        data: response.data
      });

      // Reset form
      setFormData({
        transaction_type: '',
        amount: '',
        currency: 'USD',
        description: '',
        file: null
      });

      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      toast.success('Transaction uploaded to blockchain successfully!');

    } catch (error) {
      console.error('Upload error:', error);
      
      const errorMessage = getErrorMessage(error);
      setUploadResult({
        success: false,
        error: errorMessage
      });
      
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card fade-in">
      <div className="card-header">
        <h2 className="card-title">📤 Upload New Transaction</h2>
      </div>
      
      <p style={{ marginBottom: '2rem', color: 'var(--gray-600)' }}>
        Upload a transaction document to create an immutable audit trail record on the blockchain. 
        Your file will be stored on IPFS and the transaction details will be recorded on Ethereum.
      </p>

      <form onSubmit={handleSubmit} className="upload-form">
        {/* File Upload Section */}
        <div className="form-group">
          <label>Transaction Document *</label>
          <div
            {...getRootProps()}
            style={{
              border: '2px dashed var(--gray-300)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragActive ? 'var(--gray-50)' : 'white',
              transition: 'all var(--transition-fast)'
            }}
          >
            <input {...getInputProps()} />
            {formData.file ? (
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                <p style={{ margin: '0.5rem 0', fontWeight: '500' }}>
                  {formData.file.name}
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                  {formatFileSize(formData.file.size)}
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--success-color)' }}>
                  ✅ Click to change file or drag a new one
                </p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                  {isDragActive ? '📁' : '📤'}
                </div>
                <p style={{ margin: '0.5rem 0', fontWeight: '500' }}>
                  {isDragActive
                    ? 'Drop your file here'
                    : 'Drag & drop a file here, or click to select'
                  }
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                  Supported: PDF, JPG, PNG, DOC, DOCX, TXT, CSV, XLS, XLSX (Max 10MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="transaction_type">Transaction Type *</label>
            <select
              id="transaction_type"
              name="transaction_type"
              value={formData.transaction_type}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Type</option>
              <option value="PAYMENT">💳 Payment</option>
              <option value="INVOICE">📄 Invoice</option>
              <option value="EXPENSE">💰 Expense</option>
              <option value="RECEIPT">🧾 Receipt</option>
              <option value="REFUND">↩️ Refund</option>
              <option value="CONTRACT">📋 Contract</option>
              <option value="OTHER">📝 Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount *</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              required
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label htmlFor="currency">Currency</label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
            >
              <option value="USD">🇺🇸 USD</option>
              <option value="EUR">🇪🇺 EUR</option>
              <option value="GBP">🇬🇧 GBP</option>
              <option value="JPY">🇯🇵 JPY</option>
              <option value="CAD">🇨🇦 CAD</option>
              <option value="AUD">🇦🇺 AUD</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows="3"
            placeholder="Optional description or notes about this transaction"
          />
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          className="submit-btn"
          disabled={uploading}
          style={{ width: '100%', marginTop: '1rem' }}
        >
          {uploading ? (
            <>
              <LoadingSpinner size="small" color="white" />
              Processing...
            </>
          ) : (
            <>
              🚀 Submit to Blockchain
            </>
          )}
        </button>
      </form>

      {/* Upload Result */}
      {uploadResult && (
        <div className={`result ${uploadResult.success ? 'success' : 'error'}`}>
          {uploadResult.success ? (
            <div>
              <h3>✅ Transaction Uploaded Successfully!</h3>
              <div style={{ marginTop: '1rem' }}>
                <p><strong>Token ID:</strong> <code>{uploadResult.data.token_id}</code></p>
                <p><strong>Status:</strong> <span className={`status-badge status-${uploadResult.data.verification_status}`}>
                  {uploadResult.data.verification_status}
                </span></p>
                {uploadResult.data.blockchain_hash && (
                  <p><strong>Blockchain Hash:</strong> <code style={{ fontSize: '0.875rem' }}>
                    {uploadResult.data.blockchain_hash}
                  </code></p>
                )}
                {uploadResult.data.ipfs_hash && (
                  <p><strong>IPFS Hash:</strong> <code style={{ fontSize: '0.875rem' }}>
                    {uploadResult.data.ipfs_hash}
                  </code></p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h3>❌ Upload Failed</h3>
              <p>{uploadResult.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Processing Info */}
      {uploading && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: 'var(--gray-50)', 
          borderRadius: 'var(--radius-lg)',
          fontSize: '0.875rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>🔄 Processing Steps:</h4>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            <li>Uploading file to IPFS...</li>
            <li>Creating data hash for integrity verification...</li>
            <li>Submitting transaction to blockchain...</li>
            <li>Waiting for blockchain confirmation...</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default TransactionUpload;