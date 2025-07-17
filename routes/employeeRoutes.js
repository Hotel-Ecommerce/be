import express from 'express';
import {
    getEmployees,
    addEmployee,
    getEmployeeById,
    updateEmployee,
    deleteEmployee
} from '../controllers/employeeController.js';
import protect from '../middleware/authMiddleware.js';
import authorize from '../middleware/permissionMiddleware.js';
const router = express.Router();

router.get('/list', protect, authorize(['Manager']), getEmployees);
router.post('/add', protect, authorize(['Manager']), addEmployee);
router.get('/:id', protect, authorize(['Manager']), getEmployeeById);
router.post('/update', protect, authorize(['Manager']), updateEmployee);
router.post('/delete', protect, authorize(['Manager']), deleteEmployee);


export default router;