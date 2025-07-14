class APIFeatures {
    constructor(query, queryString) {
        this.query = query; // Query Mongoose
        this.queryString = queryString; // req.query từ Express
    }

    filter() {
        const queryObj = { ...this.queryString };
        const excludedFields = ['page', 'sort', 'limit', 'fields', 'q', 'capacity_gte', 'checkInDate', 'checkOutDate'];
        excludedFields.forEach(el => delete queryObj[el]);

        // Lọc nâng cao cho checkInDate/checkOutDate (API Đặt phòng)
        if (queryObj.checkInDate) {
            this.query = this.query.where('checkInDate').gte(new Date(queryObj.checkInDate));
            delete queryObj.checkInDate;
        }
        if (queryObj.checkOutDate) {
            this.query = this.query.where('checkOutDate').lte(new Date(queryObj.checkOutDate));
            delete queryObj.checkOutDate;
        }

        // Lọc sức chứa phòng (capacity_gte)
        if (queryObj.capacity_gte) {
            this.query = this.query.where('capacity').gte(parseInt(queryObj.capacity_gte));
            delete queryObj.capacity_gte;
        }

        let queryStr = JSON.stringify(queryObj);
        // Thay thế các toán tử (gte, gt, lte, lt) bằng toán tử MongoDB
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
        this.query = this.query.find(JSON.parse(queryStr));

        return this;
    }

    search(fields = []) {
        if (this.queryString.q) {
            const searchQuery = {
                $or: fields.map(field => ({
                    [field]: { $regex: this.queryString.q, $options: 'i' } // Tìm kiếm không phân biệt chữ hoa chữ thường
                }))
            };
            this.query = this.query.find(searchQuery);
        }
        return this;
    }

    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-createdAt'); // Mặc định sắp xếp theo thời gian tạo giảm dần
        }
        return this;
    }

    paginate() {
        const page = parseInt(this.queryString.page, 10) || 1; // Trang. 0 = Trang 1, nên điều chỉnh
        const limit = parseInt(this.queryString.size, 10) || 20; // Số bản ghi mỗi trang
        const skip = (page - 1) * limit; // Số bản ghi bỏ qua

        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}

module.exports = APIFeatures;