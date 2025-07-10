const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ServiceSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true }, // Khóa chính, tự động tạo
  name: { type: String, required: true, unique: true }, // Tên dịch vụ, duy nhất
  price: { type: Number, required: true }, // Giá dịch vụ
  description: { type: String }, // Mô tả dịch vụ
  createdAt: { type: Date, default: Date.now }, // Thời gian tạo
  updatedAt: { type: Date, default: Date.now }, // Thời gian cập nhật
});
module.exports = mongoose.model("Service", ServiceSchema);
