import mongoose from 'mongoose';

const bookingChangeRequestSchema = mongoose.Schema(
    {
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Booking',
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Customer',
        },
        // Thêm trường type để phân biệt yêu cầu cập nhật hay hủy
        type: {
            type: String, required: true, enum: ['Update', 'Cancel'], // 'Update' cho cập nhật, 'Cancel' cho hủy
        },
        // Các thông tin mới mà khách hàng yêu cầu (chỉ bắt buộc nếu type là 'Update')
        requestedRoomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room',
            required: function () { return this.type === 'Update'; }
        },
        requestedCheckInDate: {
            type: Date,
            required: function () { return this.type === 'Update'; }
        },
        requestedCheckOutDate: {
            type: Date,
            required: function () { return this.type === 'Update'; }
        },
        // Lý do hủy (chỉ bắt buộc nếu type là 'Cancel')
        cancellationReason: {
            type: String,
            required: function () { return this.type === 'Cancel'; }
        },
        // Trạng thái của yêu cầu: Pending, Approved, Disapproved
        status: {
            type: String,
            required: true,
            default: 'Pending',
            enum: ['Pending', 'Approved', 'Disapproved'],
        },
        // Thông tin người phê duyệt/từ chối (Admin)
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee', // Có thể là Manager hoặc Admin
            default: null,
        },
        approvedAt: {
            type: Date,
            default: null,
        },
        reasonForDisapproval: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true, // Tự động thêm createdAt và updatedAt
    }
);

const BookingChangeRequest = mongoose.model('BookingChangeRequest', bookingChangeRequestSchema);

export default BookingChangeRequest;
