// const mongoose = require('mongoose');
import mongoose from "mongoose";
const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['Standard', 'Deluxe', 'Suite'] },
  price: { type: Number, required: true },
  description: { type: String },
  images: [{ type: String }], // Mảng các URL hình ảnh
  capacity: { type: Number, required: true }, // Sức chứa của phòng
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


export default mongoose.model('Room', roomSchema);