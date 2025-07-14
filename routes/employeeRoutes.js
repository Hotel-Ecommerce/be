const express = require('express');
const {
    getEmployees,
    addEmployee,
    getEmployeeById,
    updateEmployee,
    deleteEmployee
} = require('../controllers/employeeController');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/permissionMiddleware');
const router = express.Router();

router.get('/list', protect, authorize(['Manager']), getEmployees);
router.post('/add', protect, authorize(['Manager']), addEmployee);
router.get('/:id', protect, authorize(['Manager']), getEmployeeById);
router.post('/update', protect, authorize(['Manager']), updateEmployee);
router.post('/delete', protect, authorize(['Manager']), deleteEmployee);

module.exports = router;