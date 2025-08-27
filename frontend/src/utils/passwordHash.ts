import CryptoJS from 'crypto-js';

/**
 * Generate a secure password hash for transmission to the server
 * This prevents sending plaintext passwords over the network
 * 
 * @param password - Plain text password
 * @param username - Username to use as salt
 * @returns Hashed password string
 */
export function hashPassword(password: string, username: string): string {
  // Generate salt from username (deterministic but unique per user)
  const salt = CryptoJS.SHA256(username.toLowerCase()).toString();
  
  // Combine password with salt and hash
  const passwordHash = CryptoJS.SHA256(password + salt).toString();
  
  return passwordHash;
}

/**
 * Validate password strength (basic validation)
 * @param password - Password to validate
 * @returns Object with validation result and message
 */
export function validatePassword(password: string): { isValid: boolean; message: string } {
  if (password.length < 6) {
    return { isValid: false, message: 'Passwort muss mindestens 6 Zeichen lang sein' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: 'Passwort ist zu lang (max. 128 Zeichen)' };
  }
  
  return { isValid: true, message: '' };
}
