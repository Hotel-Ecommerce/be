const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const Employee = require('../models/Employee');
const asyncHandler = require('../utils/errorHandler');
const { jwtSecret, jwtExpiresIn } = require('../config/jwt');

// Hàm tạo JWT
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, jwtSecret, { expiresIn: jwtExpiresIn });
};

// @desc    Đăng ký khách hàng mới
// @route   POST /api/auth/signup
// @access  Public
exports.signupCustomer = asyncHandler(async (req, res) => {
    const { password, fullName, address, email, phone } = req.body;

    // Chỉ kiểm tra email đã tồn tại (email phải là duy nhất)
    const customerExists = await Customer.findOne({ email });
    if (customerExists) {
        res.status(400);
        throw new Error('Email đã tồn tại...');
    }

    const customer = await Customer.create({
        fullName,
        email,
        phone,
        address,
        password // Mật khẩu sẽ được mã hóa bởi hook pre-save trong model
    });

    if (customer) {
        res.status(201).json({
            _id: customer._id,
            fullName: customer.fullName,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            role: 'Customer', // Đặt vai trò rõ ràng
            token: generateToken(customer._id, 'Customer')
        });
    } else {
        res.status(400);
        throw new Error('Dữ liệu khách hàng không hợp lệ');
    }
});

// @desc    Xác thực người dùng (khách hàng & nhân viên) & lấy token
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
    const { username, password } = req.body; // username có thể là email

    let user = null;
    let role = null;

    // Cố gắng tìm trong collection Customer
    const customer = await Customer.findOne({ email: username });
    if (customer && (await customer.matchPassword(password))) {
        user = customer;
        role = 'Customer';
    }

    // Nếu không tìm thấy trong Customer, cố gắng tìm trong Employee
    if (!user) {
        const employee = await Employee.findOne({ email: username });
        if (employee && (await employee.matchPassword(password))) {
            user = employee;
            role = employee.role; // Manager hoặc Admin
        }
    }

    if (user) {
        res.json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            address: user.address || user.role, // Với nhân viên, địa chỉ có thể không tồn tại, dùng vai trò thay thế
            role: role,
            token: generateToken(user._id, role)
        });
    } else {
        res.status(401);
        throw new Error('Tên người dùng hoặc mật khẩu không hợp lệ');
    }
});

// @desc    Đăng xuất người dùng (xóa token phía client)
// @route   POST /api/auth/signout
// @access  Public
exports.signout = (req, res) => {
    res.status(200).json({ message: 'Đăng xuất thành công (token nên được xóa phía client)' });
};