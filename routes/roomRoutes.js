const express = require('express');
const multer = require('multer');
const path = require('path');
const {
    getRooms,
    addRoom,
    getRoomById,
    updateRoom,
    deleteRoom
} = require('../controllers/roomController');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/permissionMiddleware');
const router = express.Router();

// sử dụng Multer để lưu trữ hình ảnh
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Lưu hình ảnh vào thư mục 'uploads'
    },
    filename: (req, file, cb) => {
        // Tạo tên file duy nhất
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

router.get('/list', getRooms); // Công khai, không cần xác thực
router.post('/add', protect, authorize(['Manager', 'Admin']), upload.array('images', 5), addRoom); // Tối đa 5 hình ảnh
router.get('/:id', getRoomById); // Công khai, không cần xác thực
router.post('/update', protect, authorize(['Manager', 'Admin']), upload.array('images', 5), updateRoom);
router.post('/delete', protect, authorize(['Manager', 'Admin']), deleteRoom);

module.exports = router;