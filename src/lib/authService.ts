import * as bcrypt from 'bcryptjs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  score?: number;
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  if (!email?.trim()) errors.push('Email is required');
  else if (!EMAIL_REGEX.test(email.trim())) errors.push('Email format is invalid');
  return { valid: errors.length === 0, errors };
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  if (!password) {
    errors.push('Password is required');
    return { valid: false, errors, score: 0 };
  }

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }
  if (!PASSWORD_REQUIREMENTS.hasUppercase.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!PASSWORD_REQUIREMENTS.hasLowercase.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!PASSWORD_REQUIREMENTS.hasNumber.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!PASSWORD_REQUIREMENTS.hasSpecial.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 20;
  if (PASSWORD_REQUIREMENTS.hasUppercase.test(password)) score += 20;
  if (PASSWORD_REQUIREMENTS.hasLowercase.test(password)) score += 20;
  if (PASSWORD_REQUIREMENTS.hasNumber.test(password)) score += 10;
  if (PASSWORD_REQUIREMENTS.hasSpecial.test(password)) score += 10;

  return { valid: errors.length === 0, errors, score };
}

export function validateName(name: string): ValidationResult {
  const errors: string[] = [];
  if (!name?.trim()) errors.push('Name is required');
  else if (name.trim().length < 2) errors.push('Name must be at least 2 characters');
  else if (name.trim().length > 100) errors.push('Name must be less than 100 characters');
  return { valid: errors.length === 0, errors };
}

export function hashPassword(password: string): string {
  try {
    if (!password || password.trim().length === 0) {
      throw new Error('Password cannot be empty');
    }
    
    const salt = bcrypt.genSaltSync(12);
    return bcrypt.hashSync(password, salt);
  } catch (error) {
    console.error('CRITICAL: Password hashing failed:', error);
    // SECURITY: Do NOT use fallback hashing - this is a critical security failure
    // Throw error instead of creating insecure hash
    throw new Error('Password hashing failed. Please ensure bcryptjs is properly installed.');
  }
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    if (!hash || !password) {
      return false;
    }
    
    if (hash.startsWith('$legacy$')) {
      // SECURITY: Legacy password hashes are no longer supported
      // Users with legacy hashes must reset their password
      console.warn('Legacy password hash detected - password reset required');
      return false;
    }
    
    // Only accept bcrypt hashes
    if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
      return bcrypt.compareSync(password, hash);
    }
    
    // Unknown hash format - reject for security
    console.error('Invalid password hash format detected');
    return false;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(36))
    .join('')
    .slice(0, 16);
  return `session-${timestamp}-${randomStr}`;
}

export function generateVerificationCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => (b % 36).toString(36).toUpperCase())
    .join('');
}

export function generateSecureToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function validateSignupData(data: {
  name?: string;
  email?: string;
  password?: string;
}): ValidationResult {
  const errors: string[] = [];

  const nameValidation = validateName(data.name || '');
  if (!nameValidation.valid) errors.push(...nameValidation.errors);

  const emailValidation = validateEmail(data.email || '');
  if (!emailValidation.valid) errors.push(...emailValidation.errors);

  const passwordValidation = validatePassword(data.password || '');
  if (!passwordValidation.valid) errors.push(...passwordValidation.errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isSessionExpired(expiresAt?: number, currentTime: number = Date.now()): boolean {
  if (!expiresAt) return false;
  return currentTime > expiresAt;
}

export function calculateSessionExpiration(hours: number = 24): number {
  return Date.now() + hours * 60 * 60 * 1000;
}

export function safeComparePassword(input: string, stored: string): boolean {
  if (!stored) return false;

  // Constant-time comparison to prevent timing attacks
  const inputLen = input.length;
  const storedLen = stored.length;
  const maxLen = Math.max(inputLen, storedLen);
  let result = 0;

  for (let i = 0; i < maxLen; i++) {
    const a = i < inputLen ? input.charCodeAt(i) : 0;
    const b = i < storedLen ? stored.charCodeAt(i) : 0;
    result |= a ^ b;
  }

  // If lengths differ, it's definitely not equal
  if (inputLen !== storedLen) result |= 1;

  // Also verify with proper bcrypt if possible
  const bcryptResult = verifyPassword(input, stored);

  return result === 0 && bcryptResult;
}

export function sanitizeInput(input: string, maxLength: number = 1000): string {
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '')
    .trim();
}

export function validatePasscode(input: string, minLength: number = 6): ValidationResult {
  const errors: string[] = [];
  if (!input || input.length < minLength) {
    errors.push(`Passcode must be at least ${minLength} characters`);
  }
  return { valid: errors.length === 0, errors };
}
