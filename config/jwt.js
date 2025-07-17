export const jwtSecret = process.env.JWT_SECRET || 'your_fallback_secret';
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1d';