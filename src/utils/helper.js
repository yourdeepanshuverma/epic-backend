// 🔹 Helper — generate random 4-digit OTP
/**
 * Generate a random 4-digit OTP
 * @return {string} 4-digit OTP
 */
export const generateOtp = () =>
  Math.floor(1000 + Math.random() * 9000).toString();
