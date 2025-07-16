// const express = require('express');
// const { getBookingStatistics } = require('../controllers/statisticController');
// const protect = require('../middleware/authMiddleware');
// const authorize = require('../middleware/permissionMiddleware');
import express from 'express';
import { getBookingStatistics } from '../controllers/statisticController.js';
import protect from '../middleware/authMiddleware.js';
import authorize from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.get('/bookings', protect, authorize(['Manager']), getBookingStatistics);


export default router;