const express = require('express');
const {
    getBookings,
    addBooking,
    getBookingById,
    updateBooking,
    deleteBooking
} = require('../controllers/bookingController');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/permissionMiddleware');
const router = express.Router();

router.get('/list', protect, authorize(['Manager', 'Admin', 'Customer']), getBookings);
router.post('/add', protect, authorize(['Manager', 'Admin', 'Customer']), addBooking);
router.get('/:id', protect, authorize(['Manager', 'Admin', 'Customer']), getBookingById);
router.post('/update', protect, authorize(['Manager', 'Admin']), updateBooking);
router.post('/delete', protect, authorize(['Manager']), deleteBooking); // Chỉ Manager có thể xóa booking


export default router;