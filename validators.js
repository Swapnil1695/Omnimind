// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return '';
};

// Password validation
export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/\d/.test(password)) return 'Password must contain at least one number';
  return '';
};

// Confirm password validation
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return '';
};

// Required field validation
export const validateRequired = (value, fieldName = 'This field') => {
  if (!value && value !== 0) return `${fieldName} is required`;
  if (typeof value === 'string' && value.trim() === '') return `${fieldName} is required`;
  return '';
};

// Name validation
export const validateName = (name) => {
  if (!name) return 'Name is required';
  if (name.length < 2) return 'Name must be at least 2 characters';
  if (name.length > 50) return 'Name must be less than 50 characters';
  return '';
};

// URL validation
export const validateUrl = (url) => {
  if (!url) return '';
  
  try {
    new URL(url);
    return '';
  } catch (error) {
    return 'Please enter a valid URL';
  }
};

// Phone number validation (basic)
export const validatePhone = (phone) => {
  if (!phone) return '';
  
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
    return 'Please enter a valid phone number';
  }
  return '';
};

// Number validation
export const validateNumber = (value, options = {}) => {
  if (value === undefined || value === null || value === '') {
    if (options.required) return 'This field is required';
    return '';
  }
  
  const num = Number(value);
  if (isNaN(num)) return 'Please enter a valid number';
  
  if (options.min !== undefined && num < options.min) {
    return `Value must be at least ${options.min}`;
  }
  
  if (options.max !== undefined && num > options.max) {
    return `Value must be at most ${options.max}`;
  }
  
  if (options.positive && num <= 0) {
    return 'Value must be positive';
  }
  
  if (options.integer && !Number.isInteger(num)) {
    return 'Value must be an integer';
  }
  
  return '';
};

// Date validation
export const validateDate = (date, options = {}) => {
  if (!date) {
    if (options.required) return 'Date is required';
    return '';
  }
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Please enter a valid date';
  
  if (options.minDate) {
    const min = new Date(options.minDate);
    if (d < min) return `Date must be on or after ${min.toLocaleDateString()}`;
  }
  
  if (options.maxDate) {
    const max = new Date(options.maxDate);
    if (d > max) return `Date must be on or before ${max.toLocaleDateString()}`;
  }
  
  if (options.future && d <= new Date()) {
    return 'Date must be in the future';
  }
  
  if (options.past && d >= new Date()) {
    return 'Date must be in the past';
  }
  
  return '';
};

// File validation
export const validateFile = (file, options = {}) => {
  if (!file) {
    if (options.required) return 'File is required';
    return '';
  }
  
  // Check file size
  if (options.maxSize && file.size > options.maxSize) {
    const maxSizeMB = options.maxSize / (1024 * 1024);
    return `File size must be less than ${maxSizeMB}MB`;
  }
  
  // Check file type
  if (options.allowedTypes && options.allowedTypes.length > 0) {
    const fileType = file.type || '';
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    const isTypeAllowed = options.allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return type.toLowerCase() === `.${fileExtension}`;
      }
      return fileType.startsWith(type);
    });
    
    if (!isTypeAllowed) {
      const allowedTypes = options.allowedTypes.join(', ');
      return `File type not allowed. Allowed types: ${allowedTypes}`;
    }
  }
  
  return '';
};

// Project validation
export const validateProject = (project) => {
  const errors = {};
  
  // Title validation
  const titleError = validateRequired(project.title, 'Project title');
  if (titleError) errors.title = titleError;
  
  // Description validation
  if (project.description && project.description.length > 2000) {
    errors.description = 'Description must be less than 2000 characters';
  }
  
  // Due date validation
  if (project.dueDate) {
    const dateError = validateDate(project.dueDate, { minDate: new Date() });
    if (dateError) errors.dueDate = dateError;
  }
  
  // Priority validation
  if (project.priority && !['low', 'medium', 'high', 'critical'].includes(project.priority)) {
    errors.priority = 'Invalid priority level';
  }
  
  // Status validation
  if (project.status && !['planning', 'in-progress', 'on-hold', 'completed', 'cancelled', 'archived'].includes(project.status)) {
    errors.status = 'Invalid project status';
  }
  
  return errors;
};

// Task validation
export const validateTask = (task) => {
  const errors = {};
  
  // Title validation
  const titleError = validateRequired(task.title, 'Task title');
  if (titleError) errors.title = titleError;
  
  // Description validation
  if (task.description && task.description.length > 1000) {
    errors.description = 'Description must be less than 1000 characters';
  }
  
  // Estimated hours validation
  if (task.estimatedHours !== undefined) {
    const hoursError = validateNumber(task.estimatedHours, { min: 0, max: 1000 });
    if (hoursError) errors.estimatedHours = hoursError;
  }
  
  // Priority validation
  if (task.priority && !['low', 'medium', 'high', 'critical'].includes(task.priority)) {
    errors.priority = 'Invalid priority level';
  }
  
  // Status validation
  if (task.status && !['todo', 'in-progress', 'review', 'completed', 'blocked'].includes(task.status)) {
    errors.status = 'Invalid task status';
  }
  
  return errors;
};

// User validation
export const validateUser = (user) => {
  const errors = {};
  
  // Name validation
  const nameError = validateName(user.name);
  if (nameError) errors.name = nameError;
  
  // Email validation
  const emailError = validateEmail(user.email);
  if (emailError) errors.email = emailError;
  
  // Password validation (only if provided)
  if (user.password) {
    const passwordError = validatePassword(user.password);
    if (passwordError) errors.password = passwordError;
  }
  
  return errors;
};

// Form validation helper
export const validateForm = (data, schema) => {
  const errors = {};
  
  Object.keys(schema).forEach(field => {
    const fieldSchema = schema[field];
    const value = data[field];
    
    // Check required fields
    if (fieldSchema.required && !value && value !== 0) {
      errors[field] = fieldSchema.requiredMessage || `${field} is required`;
      return;
    }
    
    // Skip validation if field is empty and not required
    if (!value && value !== 0 && !fieldSchema.required) {
      return;
    }
    
    // Validate based on type
    switch (fieldSchema.type) {
      case 'email':
        const emailError = validateEmail(value);
        if (emailError) errors[field] = emailError;
        break;
        
      case 'password':
        const passwordError = validatePassword(value);
        if (passwordError) errors[field] = passwordError;
        break;
        
      case 'number':
        const numberError = validateNumber(value, fieldSchema.options);
        if (numberError) errors[field] = numberError;
        break;
        
      case 'date':
        const dateError = validateDate(value, fieldSchema.options);
        if (dateError) errors[field] = dateError;
        break;
        
      case 'url':
        const urlError = validateUrl(value);
        if (urlError) errors[field] = urlError;
        break;
        
      case 'phone':
        const phoneError = validatePhone(value);
        if (phoneError) errors[field] = phoneError;
        break;
        
      case 'file':
        const fileError = validateFile(value, fieldSchema.options);
        if (fileError) errors[field] = fileError;
        break;
        
      case 'custom':
        if (fieldSchema.validate) {
          const customError = fieldSchema.validate(value, data);
          if (customError) errors[field] = customError;
        }
        break;
    }
    
    // Validate min/max length for strings
    if (typeof value === 'string' && value.trim()) {
      if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
        errors[field] = `Must be at least ${fieldSchema.minLength} characters`;
      }
      
      if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
        errors[field] = `Must be less than ${fieldSchema.maxLength} characters`;
      }
    }
    
    // Validate pattern
    if (fieldSchema.pattern && value) {
      const regex = new RegExp(fieldSchema.pattern);
      if (!regex.test(value)) {
        errors[field] = fieldSchema.patternMessage || 'Invalid format';
      }
    }
  });
  
  return errors;
};

// Check if form is valid
export const isFormValid = (errors) => {
  return Object.keys(errors).length === 0;
};

// Sanitize input
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove potentially dangerous HTML/script tags
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
};

// Validate credit card number (Luhn algorithm)
export const validateCreditCard = (cardNumber) => {
  if (!cardNumber) return 'Card number is required';
  
  // Remove non-digit characters
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  // Check length
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return 'Invalid card number length';
  }
  
  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  if (sum % 10 !== 0) {
    return 'Invalid card number';
  }
  
  return '';
};

// Validate expiration date
export const validateExpirationDate = (month, year) => {
  if (!month || !year) return 'Expiration date is required';
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  const expMonth = parseInt(month, 10);
  const expYear = parseInt(year, 10);
  
  if (expMonth < 1 || expMonth > 12) {
    return 'Invalid month';
  }
  
  if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
    return 'Card has expired';
  }
  
  if (expYear > currentYear + 20) {
    return 'Invalid expiration year';
  }
  
  return '';
};

// Validate CVV
export const validateCVV = (cvv) => {
  if (!cvv) return 'CVV is required';
  
  const cleanCVV = cvv.replace(/\D/g, '');
  
  if (cleanCVV.length < 3 || cleanCVV.length > 4) {
    return 'Invalid CVV length';
  }
  
  return '';
};

// Export all validators
export default {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateRequired,
  validateName,
  validateUrl,
  validatePhone,
  validateNumber,
  validateDate,
  validateFile,
  validateProject,
  validateTask,
  validateUser,
  validateForm,
  isFormValid,
  sanitizeInput,
  validateCreditCard,
  validateExpirationDate,
  validateCVV,
};