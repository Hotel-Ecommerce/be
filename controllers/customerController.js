const Customer = require('../models/Customer');
const asyncHandler = require('../utils/errorHandler');
const APIFeatures = require('../utils/apiFeatures');

// Lấy tất cả khách hàng

exports.getCustomers = asyncHandler(async (req, res) => {
    const features = new APIFeatures(Customer.find(), req.query)
        .search(['fullName', 'email', 'phone'])
        .sort()
        .paginate();

    const customers = await features.query;
    res.json(customers);
});

// Lấy khách hàng theo ID

exports.getCustomerById = asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
        res.status(404);
        throw new Error('Không tìm thấy khách hàng...');
    }

    // Khách hàng chỉ có thể xem hồ sơ của chính họ
    if (req.user.role === 'Customer' && req.user._id.toString() !== customer._id.toString()) {
        res.status(403);
        throw new Error('FBạn chỉ có thể xem thông tin của chính mình.');
    }

    res.json(customer);
});

// Cập nhật thông tin khách hàng

exports.updateCustomer = asyncHandler(async (req, res) => {
    const { id, fullName, email, phone, address } = req.body;

    const customer = await Customer.findById(id);

    if (!customer) {
        res.status(404);
        throw new Error('Không tìm thấy khách hàng...');
    }

    // Khách hàng chỉ có thể cập nhật hồ sơ của chính họ
    if (req.user.role === 'Customer' && req.user._id.toString() !== customer._id.toString()) {
        res.status(403);
        throw new Error('Forbidden: Bạn chỉ có thể cập nhật thông tin khách hàng của chính mình.');
    }

    // Kiểm tra xem email mới đã tồn tại với người dùng khác chưa
    if (email && email !== customer.email) {
        const existingCustomerWithEmail = await Customer.findOne({ email });
        if (existingCustomerWithEmail && existingCustomerWithEmail._id.toString() !== id) {
            res.status(400);
            throw new Error('Email đã tồn tại.');
        }
    }
    // Phone không cần unique, nên không cần kiểm tra trùng lặp

    customer.fullName = fullName || customer.fullName;
    customer.email = email || customer.email;
    customer.phone = phone || customer.phone;
    customer.address = address || customer.address;
    customer.updatedAt = Date.now();

    const updatedCustomer = await customer.save();
    res.json(updatedCustomer);
});

// Xóa khách hàng

exports.deleteCustomer = asyncHandler(async (req, res) => {
    const { id } = req.body;

    const customer = await Customer.findById(id);

    if (!customer) {
        res.status(404);
        throw new Error('Không tìm thấy khách hàng...');
    }

    await customer.deleteOne();
    res.json({ status: 'success', message: 'Customer deleted successfully' });
});