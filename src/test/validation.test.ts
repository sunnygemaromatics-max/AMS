import { z } from 'zod';

// Test validation schemas
const emailSchema = z.string().email();
const passwordSchema = z.string().min(8);

describe('Validation Tests', () => {
  describe('Email Validation', () => {
    it('should validate correct email', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = emailSchema.safeParse('invalid-email');
      expect(result.success).toBe(false);
    });

    it('should reject empty email', () => {
      const result = emailSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('should validate strong password', () => {
      const result = passwordSchema.safeParse('StrongPass123!');
      expect(result.success).toBe(true);
    });

    it('should reject short password', () => {
      const result = passwordSchema.safeParse('short');
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = passwordSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });
});
