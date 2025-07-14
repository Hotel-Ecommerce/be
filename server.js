const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');

// Tải biến môi trường
dotenv.config();

// Kết nối đến cơ sở dữ liệu
connectDB();

const app = express();

// Middleware
app.use(express.json()); // Phân tích cú pháp body JSON
app.use(express.urlencoded({ extended: true })); // Phân tích cú pháp dữ liệu URL-encoded
app.use(cors()); // Kích hoạt CORS cho tất cả các nguồn (cho mục đích phát triển)

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
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/statistics', statisticRoutes);

// Middleware xử lý lỗi cơ bản (cho các lỗi chưa được xử lý)
app.use((err, req, res, next) => {
    console.error(err.stack); // Log lỗi stack để debug
    res.status(err.statusCode || 500).json({
        message: err.message || 'Something went wrong!',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack // Chỉ hiển thị stack trong môi trường phát triển
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server đang chạy trên cổng ${PORT}`));