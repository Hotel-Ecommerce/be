const express = require('express');
const { getBookingStatistics } = require('../controllers/statisticController');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/permissionMiddleware');
const router = express.Router();

router.get('/bookings', protect, authorize(['Manager']), getBookingStatistics);

module.exports = router;