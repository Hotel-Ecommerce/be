const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');
const Employee = require('./models/Employee');

// Tải biến môi trường
dotenv.config();



const app = express();

// Middleware
app.use(express.json()); // Phân tích cú pháp body JSON
app.use(express.urlencoded({ extended: true })); // Phân tích cú pháp dữ liệu URL-encoded
app.use(cors()); // Kích hoạt CORS 

// Phục vụ các file tĩnh (hình ảnh đã upload)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import các route
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const statisticRoutes = require('./routes/statisticRoutes');

// Gắn các route
app.use('/auth', authRoutes);
app.use('/customers', customerRoutes);
app.use('/rooms', roomRoutes);
app.use('/bookings', bookingRoutes);
app.use('/employees', employeeRoutes);
app.use('/statistics', statisticRoutes);


// tạo user mặc định khi khởi chạy user
const createDefaultUsers = async () => {
    try {
        // Kiểm tra và tạo Manager
        let manager = await Employee.findOne({ email: 'manager@manager.com' });
        if (!manager) {
            manager = await Employee.create({
                fullName: 'Manager',
                email: 'manager@manager.com',
                phone: '0908518566',
                password: 'manager',
                role: 'Manager'
            });
            console.log('Default Manager da tao:', manager.email);
        } else {
            console.log('Da ton tai:', manager.email);
        }

        // Kiểm tra và tạo Admin
        let admin = await Employee.findOne({ email: 'admin@admin.com' });
        if (!admin) {
            admin = await Employee.create({
                fullName: 'Admin',
                email: 'admin@admin.com',
                phone: '0908518566',
                password: 'admin',
                role: 'Admin'
            });
            console.log('Default Admin đa tao:', admin.email);
        } else {
            console.log('Default Admin da ton tai:', admin.email);
        }
    } catch (error) {
        console.error('Loi khi tao default user:', error.message);
    }
};


const PORT = process.env.PORT || 8988;

connectDB().then(() => {
    app.listen(PORT, async () => {
        console.log(`Server đang chạy trên cổng ${PORT}`);
        await createDefaultUsers();
    });
}).catch(err => {
    console.error('Không thể kết nối Database và khởi động server:', err.message);
    process.exit(1);
});