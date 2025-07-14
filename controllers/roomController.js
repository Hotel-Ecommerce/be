const Room = require('../models/Room');
const Booking = require('../models/Booking');
const asyncHandler = require('../utils/errorHandler');
const APIFeatures = require('../utils/apiFeatures');
const path = require('path');
const fs = require('fs');

// lấy thời gian đã được đặt cho một phòng
const getRoomBookedTimes = async (roomId) => {
    const bookings = await Booking.find({
        roomId: roomId,
        status: 'Confirmed' // Chỉ các booking đã xác nhận
    }).select('checkInDate checkOutDate -_id'); // Chọn các trường cần thiết

    return bookings.map(booking => ({
        start: booking.checkInDate,
        end: booking.checkOutDate
    }));
};

// Lấy tất cả phòng

exports.getRooms = asyncHandler(async (req, res) => {
    const features = new APIFeatures(Room.find(), req.query)
        .filter() // Xử lý các bộ lọc như type, capacity
        .search(['roomNumber', 'description', 'type']) // Tìm kiếm theo q
        .sort() // Sắp xếp
        .paginate(); // Phân trang

    const rooms = await features.query;

    // Nâng cao dữ liệu phòng với thời gian đã được đặt (bookedTime)
    const roomsWithBookedTime = await Promise.all(rooms.map(async room => {
        const bookedTime = await getRoomBookedTimes(room._id);
        return {
            ...room._doc, // Lấy đối tượng JavaScript thuần từ tài liệu Mongoose
            bookedTime: bookedTime
        };
    }));

    res.json(roomsWithBookedTime);
});

// Thêm phòng mới

exports.addRoom = asyncHandler(async (req, res) => {
    const { roomNumber, type, price, description, capacity } = req.body;
    // req.files chứa thông tin về các file được upload bởi Multer
    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    // Xác thực loại phòng
    const validTypes = ['Standard', 'Deluxe', 'Suite'];
    if (!validTypes.includes(type)) {
        // Xóa các file đã upload nếu loại phòng không hợp lệ
        images.forEach(imagePath => {
            const filePath = path.join(__dirname, '..', imagePath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
        res.status(400);
        throw new Error('Loại phòng không hợp lệ');
    }

    // Kiểm tra số phòng đã tồn tại chưa
    const roomExists = await Room.findOne({ roomNumber });
    if (roomExists) {
        // Xóa các file đã upload nếu số phòng đã tồn tại
        images.forEach(imagePath => {
            const filePath = path.join(__dirname, '..', imagePath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
        res.status(400);
        throw new Error('Số phòng đã tồn tại...');
    }

    const room = await Room.create({
        roomNumber,
        type,
        price: parseFloat(price),
        description,
        images,
        capacity: parseInt(capacity)
    });

    res.status(201).json(room);
});

// Lấy thông tin phòng bằng ID

exports.getRoomById = asyncHandler(async (req, res) => {
    const room = await Room.findById(req.params.id);

    if (!room) {
        res.status(404);
        throw new Error('Không tìm thấy phòng...');
    }

    // thêm dữ liệu phòng với thời gian đã được đặt (bookedTime)
    const bookedTime = await getRoomBookedTimes(room._id);
    const roomWithBookedTime = {
        ...room._doc,
        bookedTime: bookedTime
    };

    res.json(roomWithBookedTime);
});

// Cập nhật thông tin phòng

exports.updateRoom = asyncHandler(async (req, res) => {
    const { id, roomNumber, type, price, description, capacity, removedImageUrls } = req.body;
    const newImages = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const room = await Room.findById(id);

    if (!room) {
        // Xóa các file mới upload nếu không tìm thấy phòng
        newImages.forEach(imagePath => {
            const filePath = path.join(__dirname, '..', imagePath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
        res.status(404);
        throw new Error('Không tìm thấy phòng...');
    }

    // Kiểm tra xem số phòng mới đã tồn tại với phòng khác chưa
    if (roomNumber && roomNumber !== room.roomNumber) {
        const existingRoomWithNumber = await Room.findOne({ roomNumber });
        if (existingRoomWithNumber && existingRoomWithNumber._id.toString() !== id) {
            // Xóa các file mới upload nếu số phòng đã tồn tại
            newImages.forEach(imagePath => {
                const filePath = path.join(__dirname, '..', imagePath);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
            res.status(400);
            throw new Error('Số phòng đã tồn tại...');
        }
    }

    // Xử lý các hình ảnh bị xóa
    let updatedImages = room.images;
    if (removedImageUrls) {
        const urlsToRemove = JSON.parse(removedImageUrls); // Chuyển chuỗi JSON thành mảng
        updatedImages = room.images.filter(img => !urlsToRemove.includes(img));
        urlsToRemove.forEach(imagePath => {
            const filePath = path.join(__dirname, '..', imagePath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    }

    // Thêm hình ảnh mới
    updatedImages = [...updatedImages, ...newImages];

    room.roomNumber = roomNumber || room.roomNumber;
    room.type = type || room.type;
    room.price = price ? parseFloat(price) : room.price;
    room.description = description || room.description;
    room.images = updatedImages;
    room.capacity = capacity ? parseInt(capacity) : room.capacity;
    room.updatedAt = Date.now();

    const updatedRoom = await room.save();
    res.json(updatedRoom);
});

// Xóa phòng

exports.deleteRoom = asyncHandler(async (req, res) => {
    const { id } = req.body;

    const room = await Room.findById(id);

    if (!room) {
        res.status(404);
        throw new Error('Không tìm thấy phòng');
    }

    // Xóa các hình ảnh liên quan khỏi server
    room.images.forEach(imagePath => {
        const filePath = path.join(__dirname, '..', imagePath);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    });

    await room.deleteOne();
    res.json({ status: 'success', message: 'Room deleted successfully' });
});