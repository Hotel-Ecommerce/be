const Customer = require('../models/Customer');
const asyncHandler = require('../utils/errorHandler');
const APIFeatures = require('../utils/apiFeatures');

// @desc    Lấy tất cả khách hàng
// @route   GET /api/customers/list
// @access  Private/Manager, Admin
exports.getCustomers = asyncHandler(async (req, res) => {
    const features = new APIFeatures(Customer.find(), req.query)
        .search(['fullName', 'email', 'phone'])
        .sort()
        .paginate();

    const customers = await features.query;
    res.json(customers);
});

// @desc    Lấy khách hàng theo ID
// @route   GET /api/customers/:id
// @access  Private/Manager, Admin, Customer
exports.getCustomerById = asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
        res.status(404);
        throw new Error('Không tìm thấy khách hàng...');
    }

    // Khách hàng chỉ có thể xem hồ sơ của chính họ
    if (req.user.role === 'Customer' && req.user._id.toString() !== customer._id.toString()) {
        res.status(403);
        throw new Error('Forbidden: Bạn chỉ có thể xem thông tin khách hàng của chính mình.');
    }

    res.json(customer);
});

// @desc    Cập nhật thông tin khách hàng
// @route   POST /api/customers/update
// @access  Private/Manager, Admin, Customer
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
            throw new Error('Email đã tồn tại...');
        }
    }
    // Phone không cần unique, nên không cần kiểm tra trùng lặp
    // Nếu bạn muốn phone là duy nhất, hãy thêm lại logic kiểm tra ở đây và unique: true trong model.

    customer.fullName = fullName || customer.fullName;
    customer.email = email || customer.email;
    customer.phone = phone || customer.phone;
    customer.address = address || customer.address;
    customer.updatedAt = Date.now();

    const updatedCustomer = await customer.save();
    res.json(updatedCustomer);
});

// @desc    Xóa khách hàng
// @route   POST /api/customers/delete
// @access  Private/Manager, Admin
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

// @desc    Cập nhật mật khẩu khách hàng
// @route   POST /api/customers/update-password
// @access  Private/Customer
exports.updateCustomerPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    // Kiểm tra mật khẩu mới và xác nhận mật khẩu mới có khớp không
    if (newPassword !== confirmNewPassword) {
        res.status(400);
        throw new Error('Mật khẩu mới và xác nhận mật khẩu không khớp...');
    }

    // Lấy thông tin khách hàng từ token
    const customer = await Customer.findById(req.user._id);

    if (!customer) {
        res.status(404);
        throw new Error('Không tìm thấy khách hàng...');
    }
    
    // Kiểm tra mật khẩu hiện tại có đúng không
    const isMatch = await customer.matchPassword(oldPassword);
    if (!isMatch) {
        res.status(401);
        throw new Error('Mật khẩu hiện tại không đúng...');
    }

    // Cập nhật mật khẩu mới và lưu
    customer.password = newPassword;
    await customer.save();


    res.json({ status: 'success', message: 'Mật khẩu đã được cập nhật thành công' });
});