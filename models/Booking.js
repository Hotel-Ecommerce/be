const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BookingSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true }, // Khóa chính, tự động tạo
  customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true }, // Tham chiếu đến khách hàng
  roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true }, // Tham chiếu đến phòng
  checkIn: { type: Date, required: true }, // Ngày nhận phòng
  checkOut: { type: Date, required: true }, // Ngày trả phòng
  totalPrice: { type: Number, required: true }, // Tổng giá tiền
  status: {
    type: String,
    enum: ["Confirmed", "Pending", "Cancelled"],
    default: "Pending",
  }, // Trạng thái đặt phòng, mặc định là pending
  createdAt: { type: Date, default: Date.now }, // Thời gian tạo
  updatedAt: { type: Date, default: Date.now }, // Thời gian cập nhật
});
module.exports = mongoose.model("Booking", BookingSchema);
