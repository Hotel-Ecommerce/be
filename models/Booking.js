import mongoose from "mongoose";
const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  totalPrice: { type: Number, required: true },
  status: { type: String, default: 'Confirmed', enum: ['Confirmed', 'Cancelled'] }, // Trạng thái đặt phòng
  paymentStatus: { type: String, default: 'Unpaid', enum: ['Unpaid', 'Paid', 'Cancelled'] }, // Trạng thái thanh toán
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


export default mongoose.model('Booking', bookingSchema)