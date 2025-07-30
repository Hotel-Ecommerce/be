import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/errorHandler.js';
import Customer from '../models/Customer.js';
import Employee from '../models/Employee.js';
import { jwtSecret } from '../config/jwt.js';



const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Lấy token từ header
            token = req.headers.authorization.split(' ')[1];

            // Giải mã token
            const decoded = jwt.verify(token, jwtSecret);

            // Kiểm tra xem đó là Customer hay Employee
            if (decoded.role === 'Customer') {
                req.user = await Customer.findById(decoded.id).select('-password');
                if (!req.user) {
                    res.status(401);
                    throw new Error('Không tìm thấy khách hàng');
                }
            } else if (decoded.role === 'Manager' || decoded.role === 'Admin') {
                req.user = await Employee.findById(decoded.id).select('-password');
                if (!req.user) {
                    res.status(401);
                    throw new Error('Không tìm thấy nhân viên');
                }
            } else {
                res.status(401);
                throw new Error('Vai trò không xác định');
            }
            req.user.role = decoded.role; // Gắn vai trò vào req.user
            next();
        } catch (error) {
            console.error(error);
            res.status(401);
            throw new Error('Xác thực token không hợp lệ');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Không có AccessToken');
    }
});


export default protect;