import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const customerSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true }, // Email phải là duy nhất
  phone: { type: String, required: true }, // Phone không cần unique
  address: { type: String },
  password: { type: String, required: true },
  refreshToken: { type: String }, // bổ sung thêm refreshToken
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// xem lại, thực hiện mã hoá trước khi lưu
customerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// xem lại, thực hiện so sánh mật khẩu
customerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


export default mongoose.model('Customer', customerSchema);