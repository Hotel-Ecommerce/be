import express from 'express';
import multer from 'multer';
import path from 'path';
import {
    getRooms,
    addRoom,
    getRoomById,
    updateRoom,
    deleteRoom,
    getAvailableRooms
} from '../controllers/roomController.js';
import protect from '../middleware/authMiddleware.js';
import authorize from '../middleware/permissionMiddleware.js';
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
router.get('/list/available', getAvailableRooms); // Công khai, không cần xác thực
router.post('/add', protect, authorize(['Manager', 'Admin']), upload.array('images', 5), addRoom); // Tối đa 5 hình ảnh
router.get('/:id', getRoomById); // Công khai, không cần xác thực
router.post('/update', protect, authorize(['Manager', 'Admin']), upload.array('images', 5), updateRoom);
router.post('/delete', protect, authorize(['Manager', 'Admin']), deleteRoom);


export default router;
