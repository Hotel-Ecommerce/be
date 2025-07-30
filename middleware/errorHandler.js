const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 501 : res.statusCode; // mã lỗi 501: Not Implemented: Máy chủ không hỗ trợ chức năng cần thiết để hoàn thành yêu cầu
    res.status(statusCode);
    res.json({
        message: err.message,
    });
};
export default errorHandler