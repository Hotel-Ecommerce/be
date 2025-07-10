const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = new Schema({
  name: {
    type: String,
    required: [true, "Vui lòng thêm tên"],
  },
  email: {
    type: String,
    required: [true, "Vui lòng điền email"],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Vui lòng thêm mật khẩu"],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ["Customer", "Receptionist", "Manager"],
    default: "Customer",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
// xem lại
// Mã hoá mật khẩu trước khi lưu vào database
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Tạo JWT Token cho người dùng
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// So sánh mật khẩu khi người dùng đăng nhập
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
