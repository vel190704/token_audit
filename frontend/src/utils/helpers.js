/**
 * Utility functions for the SME Audit Trail application
 */

/**
 * Shorten an Ethereum address for display
 * @param {string} address - The full Ethereum address
 * @param {number} startLength - Number of characters to show at start
 * @param {number} endLength - Number of characters to show at end
 * @returns {string} Shortened address
 */
export const shortenAddress = (address, startLength = 6, endLength = 4) => {
  if (!address) return '';
  if (address.length <= startLength + endLength) return address;
  
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

/**
 * Format currency amount
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format date for display
 * @param {string|Date} date - The date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate Ethereum address
 * @param {string} address - The address to validate
 * @returns {boolean} True if valid
 */
export const isValidEthereumAddress = (address) => {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validate email address
 * @param {string} email - The email to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate a random color for charts
 * @returns {string} Hex color code
 */
export const generateRandomColor = () => {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (err) {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

/**
 * Get status color based on verification status
 * @param {string} status - Verification status
 * @returns {string} CSS color value
 */
export const getStatusColor = (status) => {
  const colors = {
    verified: 'var(--success-color)',
    pending: 'var(--warning-color)',
    failed: 'var(--danger-color)',
    processing: 'var(--primary-color)'
  };
  return colors[status] || 'var(--gray-400)';
};

/**
 * Get transaction type icon
 * @param {string} type - Transaction type
 * @returns {string} Emoji icon
 */
export const getTransactionTypeIcon = (type) => {
  const icons = {
    PAYMENT: '💳',
    INVOICE: '📄',
    EXPENSE: '💰',
    RECEIPT: '🧾',
    REFUND: '↩️',
    CONTRACT: '📋',
    OTHER: '📝'
  };
  return icons[type] || '📝';
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Check if file type is allowed
 * @param {string} fileName - File name
 * @param {Array} allowedTypes - Array of allowed file extensions
 * @returns {boolean} True if allowed
 */
export const isAllowedFileType = (fileName, allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']) => {
  if (!fileName) return false;
  const extension = fileName.split('.').pop().toLowerCase();
  return allowedTypes.includes(extension);
};

/**
 * Calculate pagination info
 * @param {number} currentPage - Current page number (1-based)
 * @param {number} totalItems - Total number of items
 * @param {number} itemsPerPage - Items per page
 * @returns {object} Pagination info
 */
export const calculatePagination = (currentPage, totalItems, itemsPerPage) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  
  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    startIndex,
    endIndex,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages
  };
};

/**
 * Format blockchain hash for display
 * @param {string} hash - Blockchain transaction hash
 * @param {number} startLength - Characters to show at start
 * @param {number} endLength - Characters to show at end
 * @returns {string} Formatted hash
 */
export const formatBlockchainHash = (hash, startLength = 10, endLength = 8) => {
  if (!hash) return 'N/A';
  if (hash.length <= startLength + endLength) return hash;
  
  return `${hash.slice(0, startLength)}...${hash.slice(-endLength)}`;
};

/**
 * Get network name by chain ID
 * @param {number} chainId - Blockchain network chain ID
 * @returns {string} Network name
 */
export const getNetworkName = (chainId) => {
  const networks = {
    1: 'Ethereum Mainnet',
    5: 'Goerli Testnet',
    11155111: 'Sepolia Testnet',
    137: 'Polygon Mainnet',
    80001: 'Polygon Mumbai',
    1337: 'Local Development',
    31337: 'Hardhat Local'
  };
  return networks[chainId] || `Unknown Network (${chainId})`;
};

/**
 * Convert Wei to Ether
 * @param {string|number} wei - Amount in Wei
 * @returns {number} Amount in Ether
 */
export const weiToEther = (wei) => {
  if (!wei) return 0;
  return Number(wei) / Math.pow(10, 18);
};

/**
 * Convert Ether to Wei
 * @param {string|number} ether - Amount in Ether
 * @returns {string} Amount in Wei
 */
export const etherToWei = (ether) => {
  if (!ether) return '0';
  return (Number(ether) * Math.pow(10, 18)).toString();
};

/**
 * Validate required form fields
 * @param {object} data - Form data object
 * @param {Array} requiredFields - Array of required field names
 * @returns {object} Validation result with errors
 */
export const validateRequiredFields = (data, requiredFields) => {
  const errors = {};
  let isValid = true;
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors[field] = `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`;
      isValid = false;
    }
  });
  
  return { isValid, errors };
};

/**
 * Create error message from API response
 * @param {object} error - Error object from API
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
};