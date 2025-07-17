import Booking from '../models/Booking.js';
import asyncHandler from '../utils/errorHandler.js';
// Lấy thống kê đặt phòng

export const getBookingStatistics = asyncHandler(async (req, res) => {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
        res.status(400);
        throw new Error('Vui lòng cung cấp startDate và endDate.');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        res.status(400);
        throw new Error('Khoảng ngày không hợp lệ.');
    }

    let dateFormat;
    let groupFields;
    switch (groupBy) {
        case 'month':
            dateFormat = '%Y-%m';
            groupFields = { year: { $year: '$checkInDate' }, month: { $month: '$checkInDate' } };
            break;
        case 'year':
            dateFormat = '%Y';
            groupFields = { year: { $year: '$checkInDate' } };
            break;
        case 'day':
        default:
            dateFormat = '%Y-%m-%d';
            groupFields = {
                year: { $year: '$checkInDate' },
                month: { $month: '$checkInDate' },
                day: { $dayOfMonth: '$checkInDate' }
            };
            break;
    }

    const statistics = await Booking.aggregate([
        {
            $match: {
                checkInDate: {
                    $gte: start,
                    $lte: end
                }
            }
        },
        {
            $group: {
                _id: groupFields,
                totalBookings: { $sum: 1 },
                confirmedBookings: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0]
                    }
                },

                totalRevenue: { $sum: '$totalPrice' }

            }
        },
        {
            $project: {
                _id: 0,
                date: {
                    $dateToString: {
                        format: dateFormat,
                        date: {
                            $dateFromParts: {
                                year: '$_id.year',
                                month: '$_id.month',
                                day: '$_id.day'
                            }
                        }
                    }
                },
                totalBookings: 1,
                confirmedBookings: 1,
                totalRevenue: 1 // 
            }
        },
        {
            $sort: { date: 1 } // Sắp xếp theo ngày tăng dần
        }
    ]);

    res.json(statistics);
});