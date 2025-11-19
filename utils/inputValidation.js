/**
 * Input Validation Utility
 * FIX H25: Comprehensive input validation and sanitization
 *
 * Protects against:
 * - Injection attacks
 * - XSS (Cross-Site Scripting)
 * - Data corruption
 * - Invalid formats
 */

/**
 * Validates and sanitizes share code
 * FIX H25: Prevents injection attacks via share codes
 *
 * @param {string} code - Share code to validate
 * @returns {Object} {valid: boolean, sanitized: string, error: string}
 */
export function validateAndSanitizeShareCode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, sanitized: '', error: 'Share code is required' };
  }

  // Remove whitespace
  const trimmed = code.trim();

  // Check length
  if (trimmed.length < 6 || trimmed.length > 12) {
    return {
      valid: false,
      sanitized: trimmed,
      error: 'Share code must be 6-12 characters'
    };
  }

  // Only allow alphanumeric and hyphens (no special chars that could cause injection)
  const sanitized = trimmed.replace(/[^a-zA-Z0-9-]/g, '');

  if (sanitized !== trimmed) {
    return {
      valid: false,
      sanitized,
      error: 'Share code can only contain letters, numbers, and hyphens'
    };
  }

  // Additional check: no script tags or common XSS patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i,
    /eval\(/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      return {
        valid: false,
        sanitized: '',
        error: 'Invalid characters in share code'
      };
    }
  }

  return { valid: true, sanitized, error: null };
}

/**
 * Validates password strength and format
 * FIX H25: Password validation
 *
 * @param {string} password - Password to validate
 * @returns {Object} {valid: boolean, error: string, strength: string}
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required', strength: 'none' };
  }

  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters', strength: 'weak' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password is too long (max 128 characters)', strength: 'none' };
  }

  // Check strength
  let strength = 'weak';
  if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)) {
    strength = 'strong';
  } else if (password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password)) {
    strength = 'medium';
  }

  return { valid: true, error: null, strength };
}

/**
 * Validates location coordinates
 * FIX H25, C13: Location data validation
 *
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Object} {valid: boolean, error: string}
 */
export function validateCoordinates(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { valid: false, error: 'Coordinates must be numbers' };
  }

  if (isNaN(latitude) || isNaN(longitude)) {
    return { valid: false, error: 'Invalid coordinate values' };
  }

  if (latitude < -90 || latitude > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }

  if (longitude < -180 || longitude > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }

  return { valid: true, error: null };
}

/**
 * Validates and sanitizes name input (for contacts, geofences, etc.)
 * FIX H25: Name sanitization
 *
 * @param {string} name - Name to validate
 * @param {number} maxLength - Maximum length (default 100)
 * @returns {Object} {valid: boolean, sanitized: string, error: string}
 */
export function validateAndSanitizeName(name, maxLength = 100) {
  if (!name || typeof name !== 'string') {
    return { valid: false, sanitized: '', error: 'Name is required' };
  }

  // Remove leading/trailing whitespace
  let sanitized = name.trim();

  // Check length
  if (sanitized.length === 0) {
    return { valid: false, sanitized: '', error: 'Name cannot be empty' };
  }

  if (sanitized.length > maxLength) {
    return {
      valid: false,
      sanitized: sanitized.substring(0, maxLength),
      error: `Name must be ${maxLength} characters or less`
    };
  }

  // Remove potentially dangerous characters but keep letters, numbers, spaces, and common punctuation
  sanitized = sanitized.replace(/[<>{}[\]\\]/g, '');

  // Check for script injection patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      return {
        valid: false,
        sanitized: '',
        error: 'Name contains invalid characters'
      };
    }
  }

  return { valid: true, sanitized, error: null };
}

/**
 * Validates phone number format
 * FIX H25: Phone number validation
 *
 * @param {string} phone - Phone number to validate
 * @returns {Object} {valid: boolean, sanitized: string, error: string}
 */
export function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, sanitized: '', error: 'Phone number is required' };
  }

  // Remove all non-numeric characters except + at the start
  let sanitized = phone.trim();
  const hasPlus = sanitized.startsWith('+');
  sanitized = sanitized.replace(/[^\d]/g, '');

  if (hasPlus) {
    sanitized = '+' + sanitized;
  }

  // Check minimum length (at least 10 digits)
  const digitCount = sanitized.replace(/\D/g, '').length;
  if (digitCount < 10) {
    return {
      valid: false,
      sanitized,
      error: 'Phone number must have at least 10 digits'
    };
  }

  if (digitCount > 15) {
    return {
      valid: false,
      sanitized,
      error: 'Phone number is too long'
    };
  }

  return { valid: true, sanitized, error: null };
}

/**
 * Validates email format
 * FIX H25: Email validation
 *
 * @param {string} email - Email to validate
 * @returns {Object} {valid: boolean, sanitized: string, error: string}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, sanitized: '', error: 'Email is required' };
  }

  const sanitized = email.trim().toLowerCase();

  // Basic email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(sanitized)) {
    return { valid: false, sanitized, error: 'Invalid email format' };
  }

  if (sanitized.length > 254) {
    return { valid: false, sanitized, error: 'Email is too long' };
  }

  return { valid: true, sanitized, error: null };
}

/**
 * Validates JSON structure before parsing
 * FIX L9: Safe JSON parsing
 *
 * @param {string} jsonString - JSON string to validate
 * @returns {Object} {valid: boolean, data: any, error: string}
 */
export function safeJSONParse(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    return { valid: false, data: null, error: 'Invalid JSON string' };
  }

  try {
    const data = JSON.parse(jsonString);
    return { valid: true, data, error: null };
  } catch (error) {
    return { valid: false, data: null, error: 'JSON parsing failed: ' + error.message };
  }
}

/**
 * Sanitizes text for display (prevents XSS in UI)
 * FIX H25: XSS prevention
 *
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeForDisplay(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates geofence radius
 * FIX H25: Geofence validation
 *
 * @param {number} radius - Radius in meters
 * @returns {Object} {valid: boolean, error: string}
 */
export function validateGeofenceRadius(radius) {
  if (typeof radius !== 'number' || isNaN(radius)) {
    return { valid: false, error: 'Radius must be a number' };
  }

  if (radius < 50) {
    return { valid: false, error: 'Radius must be at least 50 meters' };
  }

  if (radius > 5000) {
    return { valid: false, error: 'Radius must be 5000 meters or less' };
  }

  return { valid: true, error: null };
}

/**
 * Validates update interval
 * FIX H25: Configuration validation
 *
 * @param {number} interval - Interval in seconds
 * @returns {Object} {valid: boolean, error: string}
 */
export function validateUpdateInterval(interval) {
  if (typeof interval !== 'number' || isNaN(interval)) {
    return { valid: false, error: 'Interval must be a number' };
  }

  // Minimum 30 seconds to prevent excessive battery drain
  if (interval < 30) {
    return { valid: false, error: 'Interval must be at least 30 seconds' };
  }

  // Maximum 1 hour
  if (interval > 3600) {
    return { valid: false, error: 'Interval must be 1 hour or less' };
  }

  return { valid: true, error: null };
}

/**
 * Comprehensive validation for location update data
 * FIX C13, H25: Location data validation
 *
 * @param {Object} location - Location object
 * @returns {Object} {valid: boolean, errors: Array}
 */
export function validateLocationData(location) {
  const errors = [];

  if (!location || typeof location !== 'object') {
    return { valid: false, errors: ['Invalid location object'] };
  }

  // Validate coordinates
  const coordsValidation = validateCoordinates(location.latitude, location.longitude);
  if (!coordsValidation.valid) {
    errors.push(coordsValidation.error);
  }

  // Validate timestamp
  if (!location.timestamp || typeof location.timestamp !== 'number') {
    errors.push('Missing or invalid timestamp');
  } else {
    const now = Date.now();
    const timeDiff = Math.abs(now - location.timestamp);
    // Timestamp shouldn't be more than 1 hour in the future or past
    if (timeDiff > 3600000) {
      errors.push('Timestamp is too far from current time');
    }
  }

  // Validate accuracy if present
  if (location.accuracy !== undefined) {
    if (typeof location.accuracy !== 'number' || location.accuracy < 0) {
      errors.push('Invalid accuracy value');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
