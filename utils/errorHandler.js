// Wrapper cho các hàm async để bắt lỗi và chuyển đến middleware xử lý lỗi Express
const asyncHandler = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);


export default asyncHandler;