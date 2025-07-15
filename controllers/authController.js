const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const Employee = require('../models/Employee');
const asyncHandler = require('../utils/errorHandler');
const { jwtSecret, jwtExpiresIn } = require('../config/jwt');

// Hàm tạo JWT
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, jwtSecret, { expiresIn: jwtExpiresIn });
};

//  Đăng ký khách hàng mới

exports.signupCustomer = asyncHandler(async (req, res) => {
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
        password // Mật khẩu sẽ được mã hóa
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


exports.login = asyncHandler(async (req, res) => {
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
        const employee = await Employee.findOne({ email: email });
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
            address: user.address,
            role: role,
            token: generateToken(user._id, role)
        });
    } else {
        res.status(401);
        throw new Error('Tên người dùng hoặc mật khẩu không hợp lệ');
    }
});

// Đăng xuất người dùng (xóa token phía client)

exports.signout = (req, res) => {
    res.status(200).json({ message: 'Đăng xuất thành công' });
};


//  Thay đổi mật khẩu

exports.changePassword = asyncHandler(async (req, res) => {
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
    // Mongoose pre-save hook sẽ tự động hash newPassword trước khi lưu
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Mật khẩu đã được thay đổi thành công.' });
});