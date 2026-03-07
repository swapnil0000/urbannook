import { useState, useCallback } from 'react';

// Validation rules configuration
const validationRules = {
    // Text field validations
    name: {
        required: true,
        minLength: 2,
        maxLength: 50,
        messages: {
            required: 'Name is required',
            minLength: 'Name must be at least 2 characters',
            maxLength: 'Name cannot exceed 50 characters'
        }
    },
    
    firstName: {
        required: true,
        minLength: 2,
        maxLength: 30,
        messages: {
            required: 'First name is required',
            minLength: 'First name must be at least 2 characters',
            maxLength: 'First name cannot exceed 30 characters'
        }
    },
    
    lastName: {
        required: true,
        minLength: 2,
        maxLength: 30,
        messages: {
            required: 'Last name is required',
            minLength: 'Last name must be at least 2 characters',
            maxLength: 'Last name cannot exceed 30 characters'
        }
    },
    
    // Email validation
    email: {
        required: true,
        pattern: /^\S+@\S+\.\S+$/,
        messages: {
            required: 'Email is required',
            pattern: 'Please provide a valid email address'
        }
    },
    
    // Phone validation
    phone: {
        required: true,
        pattern: /^[6-9]\d{9}$/,
        messages: {
            required: 'Phone number is required',
            pattern: 'Please provide a valid 10-digit phone number'
        }
    },
    
    // Password validation
    password: {
        required: true,
        minLength: 8,
        maxLength: 128,
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        messages: {
            required: 'Password is required',
            minLength: 'Password must be at least 8 characters',
            maxLength: 'Password cannot exceed 128 characters',
            pattern: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        }
    },
    
    // Password validation (for login - only required check)
    loginPassword: {
        required: true,
        messages: {
            required: 'Password is required'
        }
    },
    
    // Confirm password validation
    confirmPassword: {
        required: true,
        messages: {
            required: 'Please confirm your password',
            match: 'Passwords do not match'
        }
    },
    
    // Subject/Topic validation
    subject: {
        required: true,
        messages: {
            required: 'Subject is required'
        }
    },
    
    // Message/Description validation
    message: {
        required: true,
        minLength: 10,
        maxLength: 2000,
        messages: {
            required: 'Message is required',
            minLength: 'Message must be at least 10 characters',
            maxLength: 'Message cannot exceed 2000 characters'
        }
    },
    
    // Address validation
    address: {
        required: true,
        minLength: 10,
        maxLength: 200,
        messages: {
            required: 'Address is required',
            minLength: 'Address must be at least 10 characters',
            maxLength: 'Address cannot exceed 200 characters'
        }
    },
    
    // City validation
    city: {
        required: true,
        minLength: 2,
        maxLength: 50,
        messages: {
            required: 'City is required',
            minLength: 'City must be at least 2 characters',
            maxLength: 'City cannot exceed 50 characters'
        }
    },
    
    // Pincode validation
    pincode: {
        required: true,
        pattern: /^[1-9][0-9]{5}$/,
        messages: {
            required: 'Pincode is required',
            pattern: 'Please provide a valid 6-digit pincode'
        }
    },
    
    // Age validation
    age: {
        required: true,
        min: 18,
        max: 120,
        messages: {
            required: 'Age is required',
            min: 'You must be at least 18 years old',
            max: 'Please provide a valid age'
        }
    },
    
    // Login/Auth validation
    identifier: {
        required: true,
        messages: {
            required: 'Email or Username is required'
        }
    },
    
    // Mobile number validation (Indian format)
    mobile: {
        required: true,
        pattern: /^[6-9]\d{9}$/,
        minLength: 10,
        maxLength: 10,
        messages: {
            required: 'Mobile number is required',
            pattern: 'Mobile number must start with 6-9 and be 10 digits',
            minLength: 'Must be exactly 10 digits',
            maxLength: 'Must be exactly 10 digits'
        }
    },
    
    // Generic required field
    required: {
        required: true,
        messages: {
            required: 'This field is required'
        }
    }
};

const useFormValidation = (customRules = {}) => {
    const [errors, setErrors] = useState({});
    
    // Merge custom rules with default rules
    const rules = { ...validationRules, ...customRules };
    
    // Validate a single field and update errors state
    const validateField = useCallback((fieldName, value, formData = {}) => {
        const rule = rules[fieldName];
        if (!rule) return true;
        
        const trimmedValue = typeof value === 'string' ? value.trim() : value;
        let error = null;
        
        // Required validation
        if (rule.required && (!trimmedValue || trimmedValue === '')) {
            error = rule.messages.required;
        }
        // Skip other validations if field is empty and not required
        else if (!rule.required && (!trimmedValue || trimmedValue === '')) {
            error = null;
        }
        // Min length validation
        else if (rule.minLength && trimmedValue.length < rule.minLength) {
            error = rule.messages.minLength;
        }
        // Max length validation
        else if (rule.maxLength && trimmedValue.length > rule.maxLength) {
            error = rule.messages.maxLength;
        }
        // Pattern validation
        else if (rule.pattern && !rule.pattern.test(trimmedValue)) {
            error = rule.messages.pattern;
        }
        // Min value validation (for numbers)
        else if (rule.min && Number(trimmedValue) < rule.min) {
            error = rule.messages.min;
        }
        // Max value validation (for numbers)
        else if (rule.max && Number(trimmedValue) > rule.max) {
            error = rule.messages.max;
        }
        // Special case: confirm password validation
        else if (fieldName === 'confirmPassword' && formData.password && trimmedValue !== formData.password) {
            error = rule.messages.match;
        }
        
        // Update errors state
        setErrors(prevErrors => {
            const newErrors = { ...prevErrors };
            if (error) {
                newErrors[fieldName] = error;
            } else {
                delete newErrors[fieldName];
            }
            return newErrors;
        });
        
        return !error;
    }, [rules]);

    // Internal validate field function that only returns error without updating state
    const validateFieldInternal = useCallback((fieldName, value, formData = {}) => {
        const rule = rules[fieldName];
        if (!rule) return null;
        
        const trimmedValue = typeof value === 'string' ? value.trim() : value;
        
        // Required validation
        if (rule.required && (!trimmedValue || trimmedValue === '')) {
            return rule.messages.required;
        }
        
        // Skip other validations if field is empty and not required
        if (!rule.required && (!trimmedValue || trimmedValue === '')) {
            return null;
        }
        
        // Min length validation
        if (rule.minLength && trimmedValue.length < rule.minLength) {
            return rule.messages.minLength;
        }
        
        // Max length validation
        if (rule.maxLength && trimmedValue.length > rule.maxLength) {
            return rule.messages.maxLength;
        }
        
        // Pattern validation
        if (rule.pattern && !rule.pattern.test(trimmedValue)) {
            return rule.messages.pattern;
        }
        
        // Min value validation (for numbers)
        if (rule.min && Number(trimmedValue) < rule.min) {
            return rule.messages.min;
        }
        
        // Max value validation (for numbers)
        if (rule.max && Number(trimmedValue) > rule.max) {
            return rule.messages.max;
        }
        
        // Special case: confirm password validation
        if (fieldName === 'confirmPassword' && formData.password && trimmedValue !== formData.password) {
            return rule.messages.match;
        }
        
        return null;
    }, [rules]);
    
    // Validate all fields in form data
    const validateAllFields = useCallback((formData) => {
        const newErrors = {};
        let isValid = true;
        
        Object.keys(formData).forEach(fieldName => {
            const error = validateFieldInternal(fieldName, formData[fieldName], formData);
            if (error) {
                newErrors[fieldName] = error;
                isValid = false;
            }
        });
        
        setErrors(newErrors);
        return isValid;
    }, [validateFieldInternal]);
    
    // Clear error for a specific field
    const clearFieldError = useCallback((fieldName) => {
        setErrors(prevErrors => {
            const newErrors = { ...prevErrors };
            delete newErrors[fieldName];
            return newErrors;
        });
    }, []);
    
    // Clear all errors
    const clearAllErrors = useCallback(() => {
        setErrors({});
    }, []);
    
    // Set custom error for a field
    const setFieldError = useCallback((fieldName, errorMessage) => {
        setErrors(prevErrors => ({
            ...prevErrors,
            [fieldName]: errorMessage
        }));
    }, []);
    
    // Get error for a specific field
    const getFieldError = useCallback((fieldName) => {
        return errors[fieldName] || '';
    }, [errors]);
    
    // Check if form has any errors
    const hasErrors = useCallback(() => {
        return Object.keys(errors).length > 0;
    }, [errors]);
    
    return {
        errors,
        validateField,
        validateAllFields,
        clearFieldError,
        clearAllErrors,
        setFieldError,
        getFieldError,
        hasErrors
    };
};

export default useFormValidation;