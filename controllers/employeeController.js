import Employee from '../models/Employee.js';
import asyncHandler from '../utils/errorHandler.js';
import APIFeatures from '../utils/apiFeatures.js';
import bcrypt from 'bcryptjs';
// Lấy tất cả nhân viên

export const getEmployees = asyncHandler(async (req, res) => {
    const features = new APIFeatures(Employee.find({ isActive: true }), req.query)
        .search(['fullName', 'email', 'phone'])
        .filter() // Để xử lý bộ lọc vai trò
        .sort()
        .paginate();

    const employees = await features.query.select('-password'); // Không gửi mật khẩu đã hash
    res.json(employees);
});

// Thêm nhân viên mới

export const addEmployee = asyncHandler(async (req, res) => {
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
        throw new Error('Vai trò không hợp lệ');
    }

    const employee = await Employee.create({
        fullName,
        role,
        email,
        phone,
        password // mã hóa
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

// Lấy thông tin nhân viên bằng ID

export const getEmployeeById = asyncHandler(async (req, res) => {
    const employee = await Employee.findOne({ _id: req.params.id, isActive: true }).select('-password');

    if (!employee) {
        res.status(404);
        throw new Error('Không tìm thấy nhân viên...');
    }
    res.json(employee);
});

// Cập nhật thông tin nhân viên

export const updateEmployee = asyncHandler(async (req, res) => {
    const { id, fullName, role, email, phone } = req.body;

    const employee = await Employee.findOne({ _id: id, isActive: true });

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

// Xóa nhân viên

export const deleteEmployee = asyncHandler(async (req, res) => {
    const { id } = req.body;

    const employee = await Employee.findById(id);

    if (!employee || !employee.isActive) {
        res.status(404);
        throw new Error('Không tìm thấy nhân viên...');
    }

    employee.isActive = false;
    await employee.save();

    res.json({ status: 'success', message: 'Employee deleted successfully' });
});

// @desc    Đặt lại mật khẩu cho nhân viên khác (Manager hoặc Admin)
// @route   POST /employees/resetPassword
// Chỉ có manager mới thay đổi được mật khẩu của manager khác và admin. Admin có thể thay đổi mật khẩu của admin khác
export const resetEmployeePassword = asyncHandler(async (req, res) => {
    const { id, newPassword } = req.body; // id là ID của nhân viên cần đặt lại mật khẩu

    const employee = await Employee.findOne({ _id: id, isActive: true }); 

    if (!employee) {
        res.status(404);
        throw new Error('Không tìm thấy nhân viên.');
    }

    const requestingUser = req.user; // Người dùng đang thực hiện request (Manager hoặc Admin)

    // --- KIỂM TRA QUYỀN ĐẶT LẠI MẬT KHẨU ---
    // 1. Ngăn không cho người dùng tự đặt lại mật khẩu của chính mình qua API này
    // (họ nên dùng API changePassword chung)
    if (requestingUser._id.toString() === id) {
        res.status(403);
        throw new Error('Bạn không thể đặt lại mật khẩu của chính mình qua API này. Vui lòng sử dụng chức năng changePassword.');
    }

    // 2. Chỉ Manager mới có quyền đặt lại mật khẩu của Manager khác hoặc Admin
    if (requestingUser.role === 'Manager') {
        if (employee.role !== 'Manager' && employee.role !== 'Admin') {
            res.status(403);
            throw new Error('Manager chỉ có thể đặt lại mật khẩu của các Manager khác hoặc Admin.');
        }
    } else { // Nếu người dùng không phải là Manager (tức là Admin hoặc vai trò khác)
        res.status(403); // Forbidden
        throw new Error('Bạn không có quyền đặt lại mật khẩu cho nhân viên khác qua API này.');
    }

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    employee.password = await bcrypt.hash(newPassword, salt);

    await employee.save(); // Lưu mật khẩu đã hash vào DB

    res.status(200).json({ message: 'Mật khẩu đã được đặt lại thành công.' });
});
