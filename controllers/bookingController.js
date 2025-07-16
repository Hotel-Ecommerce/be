// const Booking = require('../models/Booking');
// const Customer = require('../models/Customer');
// const Room = require('../models/Room');
// const asyncHandler = require('../utils/errorHandler');
// const APIFeatures = require('../utils/apiFeatures');
import Booking from '../models/Booking.js';
import Customer from '../models/Customer.js';
import Room from '../models/Room.js';
import asyncHandler from '../utils/errorHandler.js';
import APIFeatures from '../utils/apiFeatures.js';
// để kiểm tra còn phòng hay không còn.
const checkRoomAvailability = async (roomId, checkInDate, checkOutDate, currentBookingId = null) => {
    const query = {
        roomId: roomId,
        status: 'Confirmed', // Chỉ các booking đã xác nhận mới chặn khả dụng
        $or: [
            // Kiểm tra xem khoảng thời gian mới có trùng với bất kỳ booking nào hiện có không
            { checkInDate: { $lt: checkOutDate }, checkOutDate: { $gt: checkInDate } }
        ]
    };

    if (currentBookingId) {
        query._id = { $ne: currentBookingId }; // Loại trừ booking hiện tại nếu đang cập nhật
    }

    const conflictingBookings = await Booking.find(query);
    return conflictingBookings.length === 0;
};

//Lấy tất cả các booking

exports.getBookings = asyncHandler(async (req, res) => {
    let query = Booking.find();

    // Cus chỉ có thể xem các booking của chính họ
    if (req.user.role === 'Customer') {
        query = query.where('customerId').equals(req.user._id);
    } else {
        // Manager/Admin có thể lọc theo customerId hoặc roomId
        if (req.query.customerId) {
            query = query.where('customerId').equals(req.query.customerId);
        }
        if (req.query.roomId) {
            query = query.where('roomId').equals(req.query.roomId);
        }
    }

    const features = new APIFeatures(query, req.query)
        .filter() // Xử lý checkInDate, checkOutDate, paymentStatus
        .sort()
        .paginate();

    const bookings = await features.query.populate('customerId', 'fullName email phone').populate('roomId', 'roomNumber type price');
    res.json(bookings);
});

// Thêm booking mới

exports.addBooking = asyncHandler(async (req, res) => {
    const { customerId, roomId, checkInDate, checkOutDate } = req.body;

    // Xác thực ngày tháng
    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);

    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime()) || inDate >= outDate) {
        res.status(400);
        throw new Error('Khoảng ngày không hợp lệ…');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Chuẩn hóa về đầu ngày
    if (inDate < today) {
        res.status(400);
        throw new Error('Ngày nhận phòng không thể ở quá khứ.');
    }

    // Khách hàng chỉ có thể đặt phòng cho chính họ
    if (req.user.role === 'Customer' && req.user._id.toString() !== customerId) {
        res.status(403);
        throw new Error('Khách hàng chỉ có thể đặt phòng cho chính mình.');
    }

    // Kiểm tra sự tồn tại của khách hàng
    const customer = await Customer.findById(customerId);
    if (!customer) {
        res.status(404);
        throw new Error('Không tìm thấy khách hàng...');
    }

    // Kiểm tra sự tồn tại của phòng
    const room = await Room.findById(roomId);
    if (!room) {
        res.status(404);
        throw new Error('Không tìm thấy phòng...');
    }

    // Kiểm tra tính khả dụng của phòng
    const isAvailable = await checkRoomAvailability(roomId, inDate, outDate);
    if (!isAvailable) {
        res.status(400);
        throw new Error('Phòng không có sẵn trong khoảng thời gian này, xin vui lòng chọn khoảng thời gian khác hoặc phòng khác');
    }

    // Tính tổng giá
    const oneDay = 24 * 60 * 60 * 1000; // mili giây trong một ngày
    const numberOfNights = Math.round(Math.abs((outDate - inDate) / oneDay));
    const totalPrice = room.price * numberOfNights;

    const booking = await Booking.create({
        customerId,
        roomId,
        checkInDate: inDate,
        checkOutDate: outDate,
        totalPrice,
        status: 'Confirmed', // Trạng thái mặc định
        paymentStatus: 'Unpaid' // Trạng thái thanh toán mặc định
    });

    res.status(201).json(booking);
});

// @desc    Lấy thông tin booking bằng ID
// @route   GET /api/bookings/:id
// @access  Private/Manager, Admin, Customer
exports.getBookingById = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate('customerId', 'fullName email phone')
        .populate('roomId', 'roomNumber type price');

    if (!booking) {
        res.status(404);
        throw new Error('Không tìm thấy đặt phòng...');
    }

    // Khách hàng chỉ có thể xem booking của chính họ
    if (req.user.role === 'Customer' && booking.customerId && req.user._id.toString() !== booking.customerId._id.toString()) {
        res.status(403);
        throw new Error('Forbidden: Bạn chỉ có thể xem đặt phòng của chính mình.');
    }

    res.json(booking);
});

// Cập nhật thông tin booking

exports.updateBooking = asyncHandler(async (req, res) => {
    const { id, customerId, roomId, checkInDate, checkOutDate, totalPrice, status, paymentStatus } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
        res.status(404);
        throw new Error('Không tìm thấy đặt phòng...');
    }

    let newCheckInDate = checkInDate ? new Date(checkInDate) : booking.checkInDate;
    let newCheckOutDate = checkOutDate ? new Date(checkOutDate) : booking.checkOutDate;

    // Xác thực ngày tháng nếu chúng được cập nhật
    if (checkInDate || checkOutDate) {
        if (isNaN(newCheckInDate.getTime()) || isNaN(newCheckOutDate.getTime()) || newCheckInDate >= newCheckOutDate) {
            res.status(400);
            throw new Error('Khoảng ngày tháng không hợp lệ');
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (newCheckInDate < today && newCheckInDate.getTime() !== booking.checkInDate.getTime()) {
            res.status(400);
            throw new Error('Ngày nhận phòng không thể ở quá khứ.');
        }
    }

    // Kiểm tra tính khả dụng của phòng nếu roomId hoặc ngày thay đổi
    if (roomId && roomId !== booking.roomId.toString() || checkInDate || checkOutDate) {
        const targetRoomId = roomId || booking.roomId;
        const isAvailable = await checkRoomAvailability(targetRoomId, newCheckInDate, newCheckOutDate, id);
        if (!isAvailable) {
            res.status(400);
            throw new Error('Phòng không có sẵn trong khoảng thời gian mới...');
        }
    }

    // Cập nhật các trường
    booking.customerId = customerId || booking.customerId;
    booking.roomId = roomId || booking.roomId;
    booking.checkInDate = newCheckInDate;
    booking.checkOutDate = newCheckOutDate;
    booking.totalPrice = totalPrice || booking.totalPrice;
    booking.status = status || booking.status;
    booking.paymentStatus = paymentStatus || booking.paymentStatus;
    booking.updatedAt = Date.now();

    const updatedBooking = await booking.save();
    res.json(updatedBooking);
});

// Xóa booking

exports.deleteBooking = asyncHandler(async (req, res) => {
    const { id } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
        res.status(404);
        throw new Error('Không tìm thấy đặt phòng...');
    }

    await booking.deleteOne();
    res.json({ status: 'success', message: 'Booking deleted successfully' });
});