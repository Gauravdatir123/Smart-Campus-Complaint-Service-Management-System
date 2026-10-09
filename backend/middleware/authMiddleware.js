const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

// Authentication: "who are you?"  Verifies the Bearer token and attaches req.user.
const protect = async (req, _res, next) => {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
        throw ApiError.unauthorized("Please log in to continue");
    }

    let payload;
    try {
        payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    } catch (err) {
        const msg = err.name === "TokenExpiredError" ? "Session expired, please log in again" : "Invalid token";
        throw ApiError.unauthorized(msg);
    }

    const user = await User.findById(payload.id);
    if (!user) throw ApiError.unauthorized("User no longer exists");
    if (!user.isActive) throw ApiError.forbidden("This account has been deactivated");

    req.user = user;
    next();
};

module.exports = { protect };
