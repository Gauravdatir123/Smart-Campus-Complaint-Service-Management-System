const ApiError = require("../utils/ApiError");

// Authorization: "are you allowed?"  Usage: authorize("admin", "staff")
const authorize = (...roles) => (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        throw ApiError.forbidden(`Access denied: requires ${roles.join(" or ")} role`);
    }
    next();
};

module.exports = { authorize };
