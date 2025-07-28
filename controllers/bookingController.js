import Booking from '../models/Booking.js';
import Customer from '../models/Customer.js';
import Room from '../models/Room.js';
import BookingChangeRequest from '../models/BookingChangeRequest.js';
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

export const getBookings = asyncHandler(async (req, res) => {
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


export const addBooking = asyncHandler(async (req, res) => {
    const { customerId, roomId, checkInDate, checkOutDate } = req.body;

    // Xác thực ngày tháng
    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);

    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime()) || inDate >= outDate) {
        res.status(400);
        throw new Error('Khoảng ngày không hợp lệ');
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

//  Lấy thông tin booking bằng ID
// @route   GET /bookings/:id
// @access  Private/Manager, Admin, Customer

export const getBookingById = asyncHandler(async (req, res) => {
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

// Cập nhật thông tin booking (chỉ Admin/Manager mới có thể gọi trực tiếp)
// Khách hàng sẽ dùng requestBookingChange

export const updateBooking = asyncHandler(async (req, res) => {
    const { id, customerId, roomId, checkInDate, checkOutDate, totalPrice, status, paymentStatus } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
        res.status(404);
        throw new Error('Không tìm thấy đặt phòng');
    }

    // Chỉ Admin/Manager mới có quyền cập nhật trực tiếp booking
    if (req.user.role === 'Customer') {
        res.status(403);
        throw new Error('Không được phép cập nhật trực tiếp đặt phòng. Vui lòng gửi yêu cầu thay đổi cho Admin/ Manager.');
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
    if (roomId && roomId.toString() !== booking.roomId.toString() || checkInDate || checkOutDate) {
        const targetRoomId = roomId || booking.roomId;
        const isAvailable = await checkRoomAvailability(targetRoomId, newCheckInDate, newCheckOutDate, id);
        if (!isAvailable) {
            res.status(400);
            throw new Error('Phòng không có sẵn trong khoảng thời gian mới');
        }
    }

    // Cập nhật các trường
    booking.customerId = customerId || booking.customerId;
    booking.roomId = roomId || booking.roomId;
    booking.checkInDate = newCheckInDate;
    booking.checkOutDate = newCheckOutDate;
    // Tính lại totalPrice nếu ngày hoặc phòng thay đổi
    if (checkInDate || checkOutDate || (roomId && roomId.toString() !== booking.roomId.toString())) {
        const room = await Room.findById(booking.roomId); // Lấy thông tin phòng hiện tại
        if (!room) {
            res.status(404);
            throw new Error('Không tìm thấy thông tin phòng để tính lại giá.');
        }
        const oneDay = 24 * 60 * 60 * 1000;
        const numberOfNights = Math.round(Math.abs((newCheckOutDate - newCheckInDate) / oneDay));
        booking.totalPrice = room.price * numberOfNights;
    } else {
        booking.totalPrice = totalPrice || booking.totalPrice;
    }

    booking.status = status || booking.status;
    booking.paymentStatus = paymentStatus || booking.paymentStatus;
    booking.updatedAt = Date.now();

    const updatedBooking = await booking.save();
    res.json(updatedBooking);
});

// Xóa booking
// @route   DELETE /bookings/:id
// @access  Private/Customer (chỉ booking của mình), Manager, Admin
export const deleteBooking = asyncHandler(async (req, res) => {
    const bookingId = req.params.id; // Thay đổi từ req.body.id sang req.params.id

    const booking = await Booking.findById(bookingId);

    if (!booking) {
        res.status(404);
        throw new Error('Không tìm thấy đặt phòng');
    }

    // Nếu người dùng là Customer, chỉ cho phép xóa booking của chính họ
    if (req.user.role === 'Customer') {
        if (booking.customerId.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Bạn không có quyền xóa đặt phòng này.');
        }
    }
    // Admin/Manager có thể xóa bất kỳ booking nào (không cần kiểm tra thêm)

    // không cho xóa nếu đã check-in hoặc hoàn tất thanh toán
    if (booking.status === 'Checked-in' || booking.status === 'Completed') {
        res.status(400);
        throw new Error('Không thể xóa đặt phòng ở trạng thái đã nhận phòng hoặc đã hoàn thành.');
    }

    await booking.deleteOne();
    res.json({ status: 'success', message: 'Booking deleted successfully' });
});


// chuyển trạng thái Booking từ Unpaid sang Paid
export const markBookingPaid = asyncHandler(async (req, res) => {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
        res.status(404);
        throw new Error('Không tìm thấy đặt phòng.');
    }

    // Kiểm tra quyền truy cập:
    // - Manager/Admin có thể thay đổi trạng thái của mọi booking
    // - Customer chỉ có thể thay đổi trạng thái thanh toán của booking của chính họ
    //   và chỉ khi trạng thái hiện tại là 'Unpaid'
    if (req.user.role === 'Customer' && booking.customerId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Bạn không có quyền cập nhật đặt phòng này.');
    }

    // Chỉ cho phép chuyển từ 'Unpaid' sang 'Paid'
    if (booking.paymentStatus === 'Paid') {
        res.status(400);
        throw new Error('Đặt phòng đã được thanh toán rồi.');
    }
    if (booking.paymentStatus === 'Cancelled') {
        res.status(400);
        throw new Error('Đặt phòng đã bị hủy, không thể cập nhật trạng thái thanh toán.');
    }

    booking.paymentStatus = 'Paid';
    booking.updatedAt = Date.now();

    const updatedBooking = await booking.save();

    res.json(updatedBooking);
});



// BỔ SUNG TÍNH NĂNG THAY ĐỔI BOOKING


// Hàm tìm và hủy các booking xung đột (được gọi khi một request được approve)
const cancelConflictingBookings = async (roomId, checkInDate, checkOutDate, approvedBookingId) => {
    const query = {
        roomId: roomId,
        status: 'Confirmed', // Chỉ xem xét các booking đã xác nhận
        _id: { $ne: approvedBookingId }, // Loại trừ booking đã được cập nhật
        $or: [
            { checkInDate: { $lt: checkOutDate }, checkOutDate: { $gt: checkInDate } }
        ]
    };

    const conflictingBookings = await Booking.find(query);

    if (conflictingBookings.length > 0) {
        console.log(`Tìm thấy ${conflictingBookings.length} booking xung đột, đang tiến hành hủy...`);
        for (const booking of conflictingBookings) {
            booking.status = 'Cancelled';
            booking.paymentStatus = 'Refund Pending'; // Hoặc trạng thái phù hợp khác
            booking.updatedAt = Date.now();
            await booking.save();
            // Có thể thêm logic gửi thông báo cho khách hàng có booking bị hủy
            console.log(`Booking ${booking._id} đã bị hủy do xung đột lịch.`);
        }
    }
};



// @desc    Khách hàng gửi yêu cầu thay đổi booking
// @route   POST /bookings/bookingChangeRequests/update
// @access  Private/Customer
export const requestBookingChange = asyncHandler(async (req, res) => {
    const { bookingId, requestedRoomId, requestedCheckInDate, requestedCheckOutDate } = req.body;

    // 1. Tìm booking gốc
    const originalBooking = await Booking.findById(bookingId);
    if (!originalBooking) {
        res.status(404);
        throw new Error('Không tìm thấy đặt phòng gốc.');
    }

    // 2. Đảm bảo khách hàng là chủ sở hữu của booking
    if (originalBooking.customerId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Bạn không có quyền yêu cầu thay đổi đặt phòng này.');
    }

    // 3. Xác thực ngày tháng mới
    const newInDate = new Date(requestedCheckInDate);
    const newOutDate = new Date(requestedCheckOutDate);

    if (isNaN(newInDate.getTime()) || isNaN(newOutDate.getTime()) || newInDate >= newOutDate) {
        res.status(400);
        throw new Error('Khoảng ngày yêu cầu không hợp lệ.');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newInDate < today) {
        res.status(400);
        throw new Error('Ngày nhận phòng yêu cầu không thể ở quá khứ.');
    }

    // 4. Kiểm tra sự tồn tại của phòng mới được yêu cầu
    const requestedRoom = await Room.findById(requestedRoomId);
    if (!requestedRoom) {
        res.status(404);
        throw new Error('Không tìm thấy phòng được yêu cầu.');
    }

    // 5. Kiểm tra xem đã có yêu cầu thay đổi nào đang chờ xử lý cho booking này chưa
    const existingPendingRequest = await BookingChangeRequest.findOne({
        bookingId: bookingId,
        status: 'Pending',
    });

    if (existingPendingRequest) {
        res.status(400);
        throw new Error('Đã có một yêu cầu thay đổi đang chờ xử lý cho đặt phòng này.');
    }

    // 6. Tạo yêu cầu thay đổi
    const changeRequest = await BookingChangeRequest.create({
        bookingId,
        customerId: req.user._id,
        type: 'Update', // Đặt loại yêu cầu là 'Update'
        requestedRoomId,
        requestedCheckInDate: newInDate,
        requestedCheckOutDate: newOutDate,
        status: 'Pending',
    });

    res.status(201).json({
        message: 'Yêu cầu thay đổi đặt phòng đã được gửi thành công và đang chờ Admin phê duyệt.',
        changeRequest,
    });
});

// @desc    Khách hàng gửi yêu cầu hủy booking
// @route   POST /bookings/bookingChangeRequests/cancel
// @access  Private/Customer
export const requestBookingCancellation = asyncHandler(async (req, res) => {
    const { bookingId, cancellationReason } = req.body;

    // 1. Tìm booking gốc
    const originalBooking = await Booking.findById(bookingId);
    if (!originalBooking) {
        res.status(404);
        throw new Error('Không tìm thấy đặt phòng gốc.');
    }

    // 2. Đảm bảo khách hàng là chủ sở hữu của booking
    if (originalBooking.customerId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Bạn không có quyền yêu cầu hủy đặt phòng này.');
    }

    // 3. Kiểm tra xem booking có đang ở trạng thái có thể hủy không (ví dụ: không phải đã hủy)
    if (originalBooking.status === 'Cancelled' || originalBooking.status === 'Completed') {
        res.status(400);
        throw new Error(`Đặt phòng đang ở trạng thái '${originalBooking.status}', không thể gửi yêu cầu hủy.`);
    }

    // 4. Kiểm tra xem đã có yêu cầu hủy hoặc thay đổi nào đang chờ xử lý cho booking này chưa
    const existingPendingRequest = await BookingChangeRequest.findOne({
        bookingId: bookingId,
        status: 'Pending',
    });

    if (existingPendingRequest) {
        res.status(400);
        throw new Error('Đã có một yêu cầu thay đổi hoặc hủy đang chờ xử lý cho đặt phòng này.');
    }

    // 5. Tạo yêu cầu hủy
    const changeRequest = await BookingChangeRequest.create({
        bookingId,
        customerId: req.user._id,
        type: 'Cancel', // Đặt loại yêu cầu là 'Cancel'
        cancellationReason: cancellationReason || 'Không có lý do cụ thể.',
        status: 'Pending',
    });

    res.status(201).json({
        message: 'Yêu cầu hủy đặt phòng đã được gửi thành công và đang chờ Admin phê duyệt.',
        changeRequest,
    });
});


// @desc    Lấy tất cả các yêu cầu thay đổi booking (cho Admin/Manager)
// @route   GET /bookings/bookingChangeRequests
// @access  Private/Manager, Admin
export const getBookingChangeRequests = asyncHandler(async (req, res) => {
    // Chỉ Admin và Manager mới có quyền xem tất cả các yêu cầu
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
        res.status(403);
        throw new Error('Bạn không có quyền xem các yêu cầu thay đổi đặt phòng.');
    }

    const { status, customerId, bookingId, type } = req.query; // Thêm type vào query
    let query = {};

    if (status) {
        query.status = status;
    }
    if (customerId) {
        query.customerId = customerId;
    }
    if (bookingId) {
        query.bookingId = bookingId;
    }
    if (type) { // Lọc theo type
        query.type = type;
    }

    const requests = await BookingChangeRequest.find(query)
        .populate('bookingId', 'checkInDate checkOutDate roomId status') // Lấy thêm status của booking gốc
        .populate('customerId', 'fullName email phone')
        .populate('requestedRoomId', 'roomNumber type price') // Có thể null nếu là yêu cầu hủy
        .populate('approvedBy', 'fullName email role'); // Thông tin người phê duyệt

    res.json(requests);
});

// @desc    Admin phê duyệt yêu cầu thay đổi booking
// @route   PUT /bookings/bookingChangeRequests/:id/approve
// @access  Private/Admin Manager
export const approveBookingChangeRequest = asyncHandler(async (req, res) => {
    const requestId = req.params.id;

    // Chỉ Admin/ Manager mới có quyền phê duyệt
    if (req.user.role == 'Customer') {
        res.status(403);
        throw new Error('Bạn không có quyền phê duyệt yêu cầu thay đổi đặt phòng.');
    }

    const changeRequest = await BookingChangeRequest.findById(requestId);

    if (!changeRequest) {
        res.status(404);
        throw new Error('Không tìm thấy yêu cầu thay đổi đặt phòng.');
    }

    if (changeRequest.status !== 'Pending') {
        res.status(400);
        throw new Error(`Yêu cầu đã ở trạng thái '${changeRequest.status}', không thể phê duyệt.`);
    }

    // 1. Lấy thông tin booking gốc
    const originalBooking = await Booking.findById(changeRequest.bookingId);
    if (!originalBooking) {
        changeRequest.status = 'Disapproved';
        changeRequest.reasonForDisapproval = 'Không tìm thấy đặt phòng gốc.';
        changeRequest.approvedBy = req.user._id;
        changeRequest.approvedAt = Date.now();
        await changeRequest.save();
        res.status(404);
        throw new Error('Không tìm thấy đặt phòng gốc để cập nhật. Yêu cầu đã bị từ chối.');
    }

    // Xử lý dựa trên loại yêu cầu (Update hoặc Cancel)
    if (changeRequest.type === 'Update') {
        // 2. Kiểm tra lại tính khả dụng của phòng với các ngày mới được yêu cầu
        const isAvailable = await checkRoomAvailability(
            changeRequest.requestedRoomId,
            changeRequest.requestedCheckInDate,
            changeRequest.requestedCheckOutDate,
            originalBooking._id // Loại trừ booking gốc khỏi việc kiểm tra xung đột
        );

        if (!isAvailable) {
            // Nếu không khả dụng, từ chối yêu cầu
            changeRequest.status = 'Disapproved';
            changeRequest.reasonForDisapproval = 'Phòng không còn khả dụng trong khoảng thời gian yêu cầu.';
            changeRequest.approvedBy = req.user._id;
            changeRequest.approvedAt = Date.now();
            await changeRequest.save();
            res.status(400);
            throw new Error('Phòng không còn khả dụng trong khoảng thời gian yêu cầu. Yêu cầu đã bị từ chối.');
        }

        // 3. Nếu phòng khả dụng, tiến hành cập nhật booking gốc
        originalBooking.roomId = changeRequest.requestedRoomId;
        originalBooking.checkInDate = changeRequest.requestedCheckInDate;
        originalBooking.checkOutDate = changeRequest.requestedCheckOutDate;

        // Tính lại tổng giá
        const room = await Room.findById(changeRequest.requestedRoomId);
        if (!room) {
            changeRequest.status = 'Disapproved';
            changeRequest.reasonForDisapproval = 'Không tìm thấy thông tin phòng mới để tính lại giá.';
            changeRequest.approvedBy = req.user._id;
            changeRequest.approvedAt = Date.now();
            await changeRequest.save();
            res.status(404);
            throw new Error('Không tìm thấy thông tin phòng mới để tính lại giá. Yêu cầu đã bị từ chối.');
        }
        const oneDay = 24 * 60 * 60 * 1000;
        const numberOfNights = Math.round(Math.abs((changeRequest.requestedCheckOutDate - changeRequest.requestedCheckInDate) / oneDay));
        originalBooking.totalPrice = room.price * numberOfNights;
        originalBooking.updatedAt = Date.now();

        await originalBooking.save();

        // 4. Xử lý các booking khác bị xung đột do sự thay đổi này (nếu có)
        await cancelConflictingBookings(
            originalBooking.roomId,
            originalBooking.checkInDate,
            originalBooking.checkOutDate,
            originalBooking._id
        );

        res.json({
            message: 'Yêu cầu thay đổi đặt phòng đã được phê duyệt và đặt phòng gốc đã được cập nhật thành công.',
            updatedBooking: originalBooking,
            changeRequest: changeRequest,
        });

    } else if (changeRequest.type === 'Cancel') {
        // Xử lý yêu cầu hủy
        originalBooking.status = 'Cancelled';
        originalBooking.paymentStatus = 'Refund Pending'; // Hoặc trạng thái phù hợp khác
        originalBooking.updatedAt = Date.now();
        await originalBooking.save();

        res.json({
            message: 'Yêu cầu hủy đặt phòng đã được phê duyệt và đặt phòng gốc đã được hủy.',
            cancelledBooking: originalBooking,
            changeRequest: changeRequest,
        });
    } else {
        res.status(400);
        throw new Error('Loại yêu cầu không hợp lệ.');
    }

    // Cập nhật trạng thái của yêu cầu thay đổi SAU KHI xử lý booking gốc
    changeRequest.status = 'Approved';
    changeRequest.approvedBy = req.user._id;
    changeRequest.approvedAt = Date.now();
    await changeRequest.save();
});

// @desc    Admin từ chối yêu cầu thay đổi booking
// @route   PUT /bookings/bookingChangeRequests/:id/disapprove
// @access  Private/Admin
export const disapproveBookingChangeRequest = asyncHandler(async (req, res) => {
    const requestId = req.params.id;
    const { reason } = req.body; // Lý do từ chối

    // Chỉ Admin mới có quyền từ chối
    if (req.user.role !== 'Admin') {
        res.status(403);
        throw new Error('Bạn không có quyền từ chối yêu cầu thay đổi đặt phòng.');
    }

    const changeRequest = await BookingChangeRequest.findById(requestId);

    if (!changeRequest) {
        res.status(404);
        throw new Error('Không tìm thấy yêu cầu thay đổi đặt phòng.');
    }

    if (changeRequest.status !== 'Pending') {
        res.status(400);
        throw new Error(`Yêu cầu đã ở trạng thái '${changeRequest.status}', không thể từ chối.`);
    }

    changeRequest.status = 'Disapproved';
    changeRequest.reasonForDisapproval = reason || 'Không có lý do cụ thể.';
    changeRequest.approvedBy = req.user._id;
    changeRequest.approvedAt = Date.now();

    await changeRequest.save();

    res.json({
        message: `Yêu cầu ${changeRequest.type === 'Update' ? 'thay đổi' : 'hủy'} đặt phòng đã bị từ chối.`,
        changeRequest: changeRequest,
    });
});