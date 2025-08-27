import CryptoJS from 'crypto-js';

/**
 * Hash a password using SHA-256 with a salt
 * This ensures passwords are not transmitted in plain text
 */
export const hashPassword = (password: string, username: string): string => {
  // Use username as salt to make each hash unique
  const salt = CryptoJS.SHA256(username.toLowerCase()).toString();
  
  // Combine password with salt and hash
  const hash = CryptoJS.SHA256(password + salt).toString();
  
  return hash;
};

/**
 * Generate a challenge hash for additional security
 * This can be used for secure authentication challenges
 */
export const generateChallenge = (username: string, timestamp?: number): string => {
  const time = timestamp || Date.now();
  return CryptoJS.SHA256(username + time.toString()).toString();
};
