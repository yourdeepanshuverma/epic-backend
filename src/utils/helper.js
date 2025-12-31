// 🔹 Helper — generate random 4-digit OTP
/**
 * Generate a random 4-digit OTP
 * @return {string} 4-digit OTP
 */
export const generateOtp = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

/**
 * Redact phone numbers from text (digits and number words)
 * @param {string} text
 * @return {string} Redacted text
 */
export const redactPhoneNumber = (text) => {
  if (!text) return text;

  // 1. Redact detected digit sequences (e.g. 9876543210, 987 654 3210, +91-987...)
  // Matches 7 to 15 digits with optional separators
  const digitRegex =
    /(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}|(\d[\s-]?){10,}/g;

  let redacted = text.replace(digitRegex, "[HIDDEN CONTACT]");

  // 2. Redact number words (e.g. "nine eight seven...")
  // We look for a sequence of 10 number words
  const numWords = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "double",
    "triple",
  ];
  const wordPattern = new RegExp(
    `\\b(${numWords.join("|")})\\b([\\s\\-]*\\b(${numWords.join(
      "|"
    )})\\b){9,}`,
    "gi"
  );

  redacted = redacted.replace(wordPattern, "[HIDDEN CONTACT]");

  return redacted;
};
