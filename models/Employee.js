const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const EmployeeSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true }, // Khóa chính, tự động tạo
  fullName: { type: String, required: true }, // Tên đầy đủ của nhân viên
  role: { type: String, required: true, enum: ["Manager", "Receptionist"] }, // Vai trò nhân viên
  email: { type: String, required: true, unique: true }, // Email, duy nhất
  phone: { type: String }, // Số điện thoại
  createdAt: { type: Date, default: Date.now }, // Thời gian tạo
  updatedAt: { type: Date, default: Date.now }, // Thời gian cập nhật
});
module.exports = mongoose.model("Employee", EmployeeSchema);
