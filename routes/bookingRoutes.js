import express from 'express';
import {
    getBookings,
    addBooking,
    getBookingById,
    updateBooking,
    deleteBooking,
    markBookingPaid
} from '../controllers/bookingController.js';
import protect from '../middleware/authMiddleware.js';
import authorize from '../middleware/permissionMiddleware.js';
const router = express.Router();

router.get('/list', protect, authorize(['Manager', 'Admin', 'Customer']), getBookings);
router.post('/add', protect, authorize(['Manager', 'Admin', 'Customer']), addBooking);
router.get('/:id', protect, authorize(['Manager', 'Admin', 'Customer']), getBookingById);
router.post('/update', protect, authorize(['Manager', 'Admin']), updateBooking);
router.post('/delete', protect, authorize(['Manager']), deleteBooking); // Chỉ Manager có thể xóa booking
router.put('/markBookingPaid/:id', protect, authorize(['Manager', 'Admin', 'Customer']), markBookingPaid);


export default router;