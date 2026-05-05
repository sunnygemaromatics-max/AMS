import { useState } from 'react';

// XSS Protection utilities
export class InputSanitizer {
  // DOMPurify-like basic sanitization (lightweight version)
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Remove all HTML tags
  static stripHtml(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input.replace(/<[^>]*>/g, '');
  }

  // Sanitize for CSV/Excel export
  static sanitizeForCsv(input: string): string {
    if (typeof input !== 'string') return '';
    
    // Remove or escape CSV special characters
    return input
      .replace(/"/g, '""') // Escape quotes
      .replace(/,/g, '\\,') // Escape commas
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs
  }

  // Sanitize filenames
  static sanitizeFilename(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 255); // Limit length
  }

  // Sanitize SQL-like input (basic protection)
  static sanitizeSql(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/['"\\]/g, '\\$&') // Escape quotes and backslashes
      .replace(/--/g, '\\--') // Escape SQL comments
      .replace(/\/\*/g, '\\/*') // Escape block comment start
      .replace(/\*\//g, '\\*/'); // Escape block comment end
  }

  // General text sanitization
  static sanitizeText(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 10000); // Reasonable length limit
  }

  // Email sanitization
  static sanitizeEmail(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9@._-]/g, '') // Only allow email-safe chars
      .substring(0, 254); // RFC 5321 limit
  }

  // Phone number sanitization
  static sanitizePhone(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[^\d+\-\s()]/g, '') // Only allow phone number chars
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .substring(0, 20); // Reasonable length limit
  }

  // Asset code sanitization
  static sanitizeAssetCode(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .toUpperCase()
      .replace(/[^A-Z0-9\-_]/g, '') // Only allow alphanumerics, dash, underscore
      .replace(/-+/g, '-') // Replace multiple dashes
      .replace(/_+/g, '_') // Replace multiple underscores
      .trim()
      .substring(0, 50); // Reasonable length limit
  }

  // Validate and sanitize numeric input
  static sanitizeNumber(input: string | number, min?: number, max?: number): number | null {
    const num = typeof input === 'number' ? input : parseFloat(input);
    
    if (isNaN(num)) return null;
    
    if (min !== undefined && num < min) return null;
    if (max !== undefined && num > max) return null;
    
    return num;
  }

  // Sanitize array of values
  static sanitizeArray<T>(input: any[], sanitizer: (item: any) => T): T[] {
    if (!Array.isArray(input)) return [];
    
    return input
      .filter(item => item !== null && item !== undefined)
      .map(sanitizer)
      .filter(item => item !== null && item !== undefined);
  }
}

// Validation schemas with sanitization
export const validationRules = {
  email: {
    sanitize: InputSanitizer.sanitizeEmail,
    validate: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    errorMessage: 'Please enter a valid email address'
  },
  
  phone: {
    sanitize: InputSanitizer.sanitizePhone,
    validate: (phone: string) => phone.length >= 10,
    errorMessage: 'Please enter a valid phone number'
  },
  
  assetCode: {
    sanitize: InputSanitizer.sanitizeAssetCode,
    validate: (code: string) => code.length >= 3,
    errorMessage: 'Asset code must be at least 3 characters'
  },
  
  text: {
    sanitize: InputSanitizer.sanitizeText,
    validate: (text: string) => text.length > 0 && text.length <= 10000,
    errorMessage: 'Text must be between 1 and 10,000 characters'
  },
  
  number: {
    sanitize: (input: string) => InputSanitizer.sanitizeNumber(input),
    validate: (num: number | null) => num !== null && !isNaN(num),
    errorMessage: 'Please enter a valid number'
  }
};

// Hook for form sanitization
export function useSanitizedForm<T extends Record<string, any>>(
  initialData: T,
  validationSchema: Partial<Record<keyof T, keyof typeof validationRules>>
) {
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const sanitizeField = (key: keyof T, value: any): any => {
    const rule = validationSchema[key];
    if (!rule) return value;
    
    const validator = validationRules[rule];
    if (!validator) return value;
    
    const sanitized = validator.sanitize(value);
    
    if (!validator.validate(sanitized)) {
      setErrors(prev => ({ ...prev, [key]: validator.errorMessage }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
    
    return sanitized;
  };

  const updateField = (key: keyof T, value: any) => {
    const sanitized = sanitizeField(key, value);
    setData(prev => ({ ...prev, [key]: sanitized }));
  };

  const sanitizeAll = (inputData: Partial<T>) => {
    const sanitized: Partial<T> = {};
    const newErrors: Partial<Record<keyof T, string>> = {};

    Object.entries(inputData).forEach(([key, value]) => {
      const typedKey = key as keyof T;
      const rule = validationSchema[typedKey];
      if (rule) {
        const validator = validationRules[rule];
        if (validator) {
          const sanitizedValue = validator.sanitize(value);
          sanitized[typedKey] = sanitizedValue as T[keyof T];
          
          if (!validator.validate(sanitizedValue)) {
            newErrors[typedKey] = validator.errorMessage;
          }
        }
      } else {
        sanitized[typedKey] = value as T[keyof T];
      }
    });

    setData(prev => ({ ...prev, ...sanitized }));
    setErrors(newErrors);
    
    return Object.keys(newErrors).length === 0;
  };

  return {
    data,
    errors,
    updateField,
    sanitizeAll,
    isValid: Object.keys(errors).length === 0
  };
}
