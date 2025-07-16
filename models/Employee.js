// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const employeeSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  role: { type: String, required: true, enum: ['Manager', 'Admin'] }, // Vai trò của nhân viên
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Mã hóa mật khẩu trước khi lưu
employeeSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// thực hiện để so sánh mật khẩu
employeeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


export default mongoose.model('Employee', employeeSchema);