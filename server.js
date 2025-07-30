
import express from "express";
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import cors from 'cors';
import path from 'path';
import Employee from './models/Employee.js';
import cookieParser from 'cookie-parser';
import errorHandler from './middleware/errorHandler.js';


// sử dụng __dirname lấy địa chỉ
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


dotenv.config(); // Tải biến môi trường



const app = express();

// Middleware
app.use(express.json()); // Phân tích cú pháp body JSON
app.use(express.urlencoded({ extended: true })); // Phân tích cú pháp dữ liệu URL-encoded
app.use(cors({
    origin: 'http://localhost:7079',
    credentials: true // Cho phép gửi cookie qua các cross-origin request
}));
app.use(cookieParser()); // Sử dụng cookie-parser middleware

// Phục vụ các file tĩnh (hình ảnh đã upload)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import các route
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import statisticRoutes from './routes/statisticRoutes.js';

// Gắn các route
app.use('/auth', authRoutes);
app.use('/customers', customerRoutes);
app.use('/rooms', roomRoutes);
app.use('/bookings', bookingRoutes);
app.use('/employees', employeeRoutes);
app.use('/statistics', statisticRoutes);
app.use(errorHandler);


// tạo user mặc định khi khởi chạy server
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
            console.log('Default Manager da ton tai:', manager.email);
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