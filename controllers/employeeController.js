const Employee = require('../models/Employee');
const asyncHandler = require('../utils/errorHandler');
const APIFeatures = require('../utils/apiFeatures');

// @desc    Lấy tất cả nhân viên
// @route   GET /api/employees/list
// @access  Private/Manager
exports.getEmployees = asyncHandler(async (req, res) => {
    const features = new APIFeatures(Employee.find(), req.query)
        .search(['fullName', 'email', 'phone'])
        .filter() // Để xử lý bộ lọc vai trò
        .sort()
        .paginate();

    const employees = await features.query.select('-password'); // Không gửi mật khẩu hash
    res.json(employees);
});

// @desc    Thêm nhân viên mới
// @route   POST /api/employees/add
// @access  Private/Manager
exports.addEmployee = asyncHandler(async (req, res) => {
    const { fullName, role, email, phone, password } = req.body;

    // Kiểm tra email đã tồn tại chưa
    const employeeExists = await Employee.findOne({ email });
    if (employeeExists) {
        res.status(400);
        throw new Error('Email đã tồn tại...');
    }

    // Xác thực vai trò
    const validRoles = ['Manager', 'Admin'];
    if (!validRoles.includes(role)) {
        res.status(400);
        throw new Error('Vai trò nhân viên không hợp lệ...');
    }

    const employee = await Employee.create({
        fullName,
        role,
        email,
        phone,
        password // Mật khẩu sẽ được mã hóa bởi hook pre-save trong model
    });

    if (employee) {
        res.status(201).json({
            _id: employee._id,
            fullName: employee.fullName,
            role: employee.role,
            email: employee.email,
            phone: employee.phone
        });
    } else {
        res.status(400);
        throw new Error('Dữ liệu nhân viên không hợp lệ');
    }
});

// @desc    Lấy thông tin nhân viên bằng ID
// @route   GET /api/employees/:id
// @access  Private/Manager
exports.getEmployeeById = asyncHandler(async (req, res) => {
    const employee = await Employee.findById(req.params.id).select('-password');

    if (!employee) {
        res.status(404);
        throw new Error('Không tìm thấy nhân viên...');
    }
    res.json(employee);
});

// @desc    Cập nhật thông tin nhân viên
// @route   POST /api/employees/update
// @access  Private/Manager
exports.updateEmployee = asyncHandler(async (req, res) => {
    const { id, fullName, role, email, phone } = req.body;

    const employee = await Employee.findById(id);

    if (!employee) {
        res.status(404);
        throw new Error('Không tìm thấy nhân viên...');
    }

    // Kiểm tra xem email mới đã tồn tại với nhân viên khác chưa
    if (email && email !== employee.email) {
        const existingEmployeeWithEmail = await Employee.findOne({ email });
        if (existingEmployeeWithEmail && existingEmployeeWithEmail._id.toString() !== id) {
            res.status(400);
            throw new Error('Email đã tồn tại...');
        }
    }

    // Xác thực vai trò nếu nó đang được cập nhật
    if (role) {
        const validRoles = ['Manager', 'Admin'];
        if (!validRoles.includes(role)) {
            res.status(400);
            throw new Error('Vai trò nhân viên không hợp lệ...');
        }
    }

    employee.fullName = fullName || employee.fullName;
    employee.role = role || employee.role;
    employee.email = email || employee.email;
    employee.phone = phone || employee.phone;
    employee.updatedAt = Date.now();

    const updatedEmployee = await employee.save();
    res.json(updatedEmployee.toObject({ getters: true, virtuals: false })); // Trả về đối tượng thuần, ẩn mật khẩu
});

// @desc    Xóa nhân viên
// @route   POST /api/employees/delete
// @access  Private/Manager
exports.deleteEmployee = asyncHandler(async (req, res) => {
    const { id } = req.body;

    const employee = await Employee.findById(id);

    if (!employee) {
        res.status(404);
        throw new Error('Không tìm thấy nhân viên...');
    }

    await employee.deleteOne();
    res.json({ status: 'success', message: 'Employee deleted successfully' });
});