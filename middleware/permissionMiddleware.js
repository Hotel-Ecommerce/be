const authorize = (roles = []) => {
    // Chuyển roles thành một mảng nếu nó là một chuỗi đơn
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        // Kiểm tra xem người dùng có được xác thực và có vai trò không
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: 'Không xác thực được vai trò' });
        }

        // Kiểm tra xem vai trò của người dùng có nằm trong danh sách các vai trò được phép không
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Bạn không có quyền truy cập.' });
        }
        next();
    };
};

module.exports = authorize;