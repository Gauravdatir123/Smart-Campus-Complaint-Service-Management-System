const ApiError = require("../utils/ApiError");
const { isObjectId } = require("../utils/validate");

// 404 for unknown routes
const notFound = (req, _res, next) => {
    next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// Reject malformed ids early with a clean 400 instead of a Mongoose CastError.
const validateId = (param = "id") => (req, _res, next) => {
    if (!isObjectId(req.params[param])) {
        throw ApiError.badRequest(`Invalid ${param}`);
    }
    next();
};

// Central error handler: every thrown/rejected error ends up here (Express 5 forwards async errors).
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
    let status = err.status || 500;
    let message = err.message || "Server error";
    let details = err.details;

    if (err.name === "ValidationError" && err.errors) {
        status = 400;
        message = "Validation failed";
        details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    } else if (err.name === "CastError") {
        status = 400;
        message = `Invalid value for ${err.path}`;
    } else if (err.code === 11000) {
        status = 409;
        const field = Object.keys(err.keyPattern || {})[0] || "field";
        message = `A record with this ${field} already exists`;
    } else if (err.name === "MulterError") {
        status = 400;
        message = err.code === "LIMIT_FILE_SIZE" ? "Image is too large (max 5 MB)" : err.message;
    } else if (err.type === "entity.parse.failed") {
        status = 400;
        message = "Request body is not valid JSON";
    }

    if (status >= 500) console.error(err);

    res.status(status).json({
        success: false,
        message: status >= 500 && process.env.NODE_ENV === "production" ? "Server error" : message,
        ...(details ? { errors: details } : {})
    });
};

module.exports = { notFound, errorHandler, validateId };
