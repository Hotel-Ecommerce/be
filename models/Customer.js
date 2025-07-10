const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Bộ sưu tập Khách hàng (Customer)
const CustomerSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true }, // Khóa chính, tự động tạo
  fullName: { type: String, required: true }, // Tên đầy đủ của khách hàng
  email: { type: String, required: true, unique: true }, // Email, duy nhất
  phone: { type: String, required: true, unique: true }, // Số điện thoại, duy nhất
  address: { type: String }, // Địa chỉ khách hàng
  createdAt: { type: Date, default: Date.now }, // Thời gian tạo bản ghi
  updatedAt: { type: Date, default: Date.now }, // Thời gian cập nhật bản ghi
});

module.exports = mongoose.model("Customer", CustomerSchema);
