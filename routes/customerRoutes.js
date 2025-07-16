const express = require('express');
const {
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer
} = require('../controllers/customerController');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/permissionMiddleware');
const router = express.Router();

router.get('/list', protect, authorize(['Manager', 'Admin']), getCustomers);
router.get('/:id', protect, authorize(['Manager', 'Admin', 'Customer']), getCustomerById);
router.post('/update', protect, authorize(['Manager', 'Admin', 'Customer']), updateCustomer);
router.post('/delete', protect, authorize(['Manager', 'Admin']), deleteCustomer);


export default router; 