import jwt from 'jsonwebtoken';
import Customer from '../models/Customer.js';
import Employee from '../models/Employee.js';
import asyncHandler from '../utils/errorHandler.js';
import { jwtSecret, jwtExpiresIn, jwtRefreshSecret, jwtRefreshExpiresIn } from '../config/jwt.js';

// Hàm tạo JWT (tạo AccessToken)
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, jwtSecret, { expiresIn: jwtExpiresIn });
};
// Hàm tạo Refresh Token
const generateRefreshToken = (id, role) => {
    return jwt.sign({ id, role }, jwtRefreshSecret, { expiresIn: jwtRefreshExpiresIn });
};
// Hàm gửi Refresh Token vào cookie máy client
const sendRefreshToken = (res, token) => {
    res.cookie('refreshToken', token, {
        httpOnly: true, // Chỉ có thể truy cập qua HTTP(S) request, không qua JavaScript phía client
        secure: process.env.NODE_ENV === 'production', // Chỉ gửi cookie qua HTTPS trong production
        sameSite: 'strict', // Ngăn chặn tấn công CSRF (Cross-Site Request Forgery)
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 ngày
    });
};


//  Đăng ký khách hàng mới

export const signupCustomer = asyncHandler(async (req, res) => {
    const { password, fullName, address, email, phone } = req.body;

    // Chỉ kiểm tra email đã tồn tại (email phải là duy nhất)
    const customerExists = await Customer.findOne({ email });
    if (customerExists) {
        res.status(400);
        throw new Error('Email đã tồn tại.');
    }

    const customer = await Customer.create({
        fullName,
        email,
        phone,
        address,
        password // Mật khẩu sẽ được mã hóa qua models
    });

    if (customer) {
        // Tạo Refresh Token và lưu vào DB
        const refreshToken = generateRefreshToken(customer._id, 'Customer');
        customer.refreshToken = refreshToken; // Lưu refresh token (chưa hash) vào DB
        await customer.save();

        // Gửi Refresh Token vào cookie
        sendRefreshToken(res, refreshToken);


        res.status(201).json({
            _id: customer._id,
            fullName: customer.fullName,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            role: 'Customer', // Đặt vai trò Customer
            token: generateToken(customer._id, 'Customer')
        });
    } else {
        res.status(400);
        throw new Error('Dữ liệu khách hàng không hợp lệ');
    }
});


export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body; // đổi thành email

    let user = null;
    let role = null;

    // Cố gắng tìm trong collection Customer
    const customer = await Customer.findOne({ email: email });
    if (customer && (await customer.matchPassword(password))) {
        user = customer;
        role = 'Customer';
    }

    // Nếu không tìm thấy trong Customer, cố gắng tìm trong Employee
    if (!user) {
        const employee = await Employee.findOne({ email: email, isActive: true });
        if (employee && (await employee.matchPassword(password))) {
            user = employee;
            role = employee.role; // Manager hoặc Admin
        }
    }

    if (user) {
        // Tạo Refresh Token mới và lưu vào DB
        const refreshToken = generateRefreshToken(user._id, role);
        user.refreshToken = refreshToken; // Cập nhật refresh token (chưa hash)
        await user.save(); // Lưu vào DB

        // Gửi Refresh Token vào cookie
        sendRefreshToken(res, refreshToken);


        res.json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            address: user.address,
            role: role,
            token: generateToken(user._id, role)
        });
    } else {
        res.status(401);
        throw new Error('Tên người dùng hoặc mật khẩu không hợp lệ');
    }
});


// Đăng xuất người dùng (xóa token phía client và trong DB)
export const signout = asyncHandler(async (req, res) => {
    // Xóa refresh token khỏi cookie
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });

    // Xóa refresh token khỏi DB
    if (req.user) { // req.user được gán từ middleware `protect`
        if (req.user.role === 'Customer') {
            await Customer.findByIdAndUpdate(req.user._id, { refreshToken: null });
        } else if (req.user.role === 'Manager' || req.user.role === 'Admin') {
            await Employee.findByIdAndUpdate(req.user._id, { refreshToken: null });
        }
    }

    res.status(200).json({ message: 'Đăng xuất thành công' });
});


//  Thay đổi mật khẩu

export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Lấy thông tin người dùng từ req.user (được gán bởi middleware 'protect')
    let user;
    if (req.user.role === 'Customer') {
        user = await Customer.findById(req.user._id);
    } else { // dành cho Manager hoặc Admin tìm trong Employee
        user = await Employee.findById(req.user._id);
    }

    if (!user) {
        res.status(404);
        throw new Error('Không tìm thấy user trong database.');
    }

    // 1. Kiểm tra mật khẩu hiện tại nhập đúng chưa
    if (!(await user.matchPassword(currentPassword))) {
        res.status(400);
        throw new Error('Mật khẩu hiện tại không đúng.');
    }

    // 2. Cập nhật mật khẩu mới
    // sử dụng hash password qua pre của mongoDB
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Mật khẩu đã được thay đổi thành công.' });
});

// Làm mới Access Token bằng Refresh Token
export const refreshAccessToken = asyncHandler(async (req, res) => {
    const refreshTokenFromCookie = req.cookies.refreshToken;

    if (!refreshTokenFromCookie) {
        res.status(401);
        throw new Error('Không có Refresh Token trong cookie');
    }

    try {
        const decoded = jwt.verify(refreshTokenFromCookie, jwtRefreshSecret);

        let user;
        if (decoded.role === 'Customer') {
            user = await Customer.findById(decoded.id);
        } else if (decoded.role === 'Manager' || decoded.role === 'Admin') {
            user = await Employee.findById(decoded.id);
        }

        if (!user || user.refreshToken !== refreshTokenFromCookie) {
            res.status(403);
            throw new Error('Refresh Token không hợp lệ hoặc đã bị thu hồi');
        }

        // Tạo Access Token mới
        const newAccessToken = generateAccessToken(user._id, user.role);

        res.json({ token: newAccessToken });

    } catch (error) {
        console.error(error);
        res.status(403);
        throw new Error('Refresh Token không hợp lệ hoặc đã hết hạn');
    }
});