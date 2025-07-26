import express from 'express';
import {
    getBookings,
    addBooking,
    getBookingById,
    updateBooking,
    deleteBooking,
    markBookingPaid,
    requestBookingChange,
    requestBookingCancellation,
    getBookingChangeRequests,
    approveBookingChangeRequest,
    disapproveBookingChangeRequest,
} from '../controllers/bookingController.js';
import protect from '../middleware/authMiddleware.js';
import authorize from '../middleware/permissionMiddleware.js';
const router = express.Router();

router.get('/list', protect, authorize(['Manager', 'Admin', 'Customer']), getBookings);
router.post('/add', protect, authorize(['Manager', 'Admin', 'Customer']), addBooking); // thêm đặt phòng mới
router.get('/:id', protect, authorize(['Manager', 'Admin', 'Customer']), getBookingById); // lấy thông tin đạt phòng qua Id
router.post('/update', protect, authorize(['Manager', 'Admin']), updateBooking);
router.post('/delete', protect, authorize(['Manager', 'Admin', 'Customer']), deleteBooking);  //Customer xóa booking của chính họ, Manager và Admin xóa bất kỳ booking nào.
router.put('/markBookingPaid/:id', protect, authorize(['Manager', 'Admin', 'Customer']), markBookingPaid); // đánh dấu đã thanh toan1

//Route Yêu cầu Thay đổi/Hủy Booking

// Gửi yêu cầu thay đổi booking (Customer)
router.post('/bookingChangeRequests/update', protect, authorize('Customer'), requestBookingChange);

// Gửi yêu cầu hủy booking (Customer)
router.post('/bookingChangeRequests/cancel', protect, authorize('Customer'), requestBookingCancellation);
// Lấy tất cả các yêu cầu thay đổi/hủy booking (cho Admin/Manager)
router.get('/bookingChangeRequests', protect, authorize(['Manager', 'Admin']), getBookingChangeRequests);
// Admin, Manager phê duyệt yêu cầu thay đổi/hủy booking
router.put('/bookingChangeRequests/:id/approve', protect, authorize(['Manager', 'Admin']), approveBookingChangeRequest);
// Admin, Manager từ chối yêu cầu thay đổi/hủy booking
router.put('/bookingChangeRequests/:id/disapprove', protect, authorize(['Manager', 'Admin']), disapproveBookingChangeRequest);



export default router;