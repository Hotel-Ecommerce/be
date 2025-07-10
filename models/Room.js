const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RoomSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true }, // Khóa chính, tự động tạo
  roomNumber: { type: String, required: true, unique: true }, // Số phòng, duy nhất
  type: { type: String, required: true, enum: ["Standard", "Deluxe", "Suite"] }, // Loại phòng
  price: { type: Number, required: true }, // Giá phòng mỗi đêm
  description: { type: String }, // Mô tả chi tiết về phòng
  images: [{ type: String }], // Mảng các URL hình ảnh của phòng
  capacity: { type: Number }, // Số lượng người tối đa
  status: {
    type: String,
    enum: ["Available", "Occupied", "Maintenance"],
    default: "Available",
  }, // Trạng thái phòng
  createdAt: { type: Date, default: Date.now }, // Thời gian tạo
  updatedAt: { type: Date, default: Date.now }, // Thời gian cập nhật
});
module.exports = mongoose.model("Room", RoomSchema);
