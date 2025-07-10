const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const InvoiceSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true }, // Khóa chính, tự động tạo
  bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true }, // Tham chiếu đến đặt phòng
  customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true }, // Tham chiếu đến khách hàng
  totalAmount: { type: Number, required: true }, // Tổng số tiền hóa đơn
  services: [{ type: Schema.Types.ObjectId, ref: "Service" }], // Mảng ID các dịch vụ bổ sung
  issueDate: { type: Date, default: Date.now }, // Ngày phát hành hóa đơn
  status: { type: String, enum: ["Paid", "Unpaid"], default: "Unpaid" }, // Trạng thái thanh toán
  createdAt: { type: Date, default: Date.now }, // Thời gian tạo
  updatedAt: { type: Date, default: Date.now }, // Thời gian cập nhật
});
module.exports = mongoose.model("Invoice", InvoiceSchema);
