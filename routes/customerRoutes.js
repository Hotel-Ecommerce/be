import express from 'express';
import {
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer
} from '../controllers/customerController.js';
import protect from '../middleware/authMiddleware.js';
import authorize from '../middleware/permissionMiddleware.js';
const router = express.Router();

router.get('/list', protect, authorize(['Manager', 'Admin']), getCustomers);
router.get('/:id', protect, authorize(['Manager', 'Admin', 'Customer']), getCustomerById);
router.post('/update', protect, authorize(['Manager', 'Admin', 'Customer']), updateCustomer);
router.post('/delete', protect, authorize(['Manager', 'Admin']), deleteCustomer);


export default router; 