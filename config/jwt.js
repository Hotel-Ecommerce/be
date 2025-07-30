export const jwtSecret = process.env.JWT_SECRET || 'TanPhat';
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1d';


// bổ sung refreshToken
export const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'TanPhatRefreshSecret'; // Thêm Refresh Secret
export const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // Thời gian hết hạn của Refresh Token