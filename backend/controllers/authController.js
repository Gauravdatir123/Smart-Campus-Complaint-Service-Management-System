const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const generateToken = require("../utils/generateToken");
const { str, isEmail, Validator } = require("../utils/validate");

const authResponse = (user) => ({
    success: true,
    token: generateToken(user._id),
    user
});

// POST /api/auth/register  - public sign-up. Always creates a STUDENT:
// staff/admin accounts can only be created by an admin (see adminController.createUser).
exports.register = async (req, res) => {
    const name = str(req.body.name);
    const email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";

    new Validator()
        .check(name.length >= 2 && name.length <= 80, "name", "Name must be 2-80 characters")
        .check(isEmail(email), "email", "Enter a valid email address")
        .check(password.length >= 6 && password.length <= 72, "password", "Password must be 6-72 characters")
        .done();

    if (await User.exists({ email })) {
        throw ApiError.conflict("An account with this email already exists");
    }

    const user = await User.create({ name, email, password, role: "student" });
    res.status(201).json(authResponse(user));
};

// POST /api/auth/login
exports.login = async (req, res) => {
    const email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";

    new Validator()
        .check(isEmail(email), "email", "Enter a valid email address")
        .check(password.length > 0, "password", "Password is required")
        .done();

    const user = await User.findOne({ email }).select("+password");
    // Same message for "no such user" and "wrong password" so emails cannot be enumerated
    if (!user || !(await user.matchPassword(password))) {
        throw ApiError.unauthorized("Invalid email or password");
    }
    if (!user.isActive) throw ApiError.forbidden("This account has been deactivated");

    await user.populate("department", "name");
    res.json(authResponse(user));
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
    await req.user.populate("department", "name");
    res.json({ success: true, user: req.user });
};

// PUT /api/auth/me  - update own name and/or password
exports.updateMe = async (req, res) => {
    const user = await User.findById(req.user._id).select("+password");
    const v = new Validator();

    if (req.body.name !== undefined) {
        const name = str(req.body.name);
        v.check(name.length >= 2 && name.length <= 80, "name", "Name must be 2-80 characters");
        user.name = name;
    }

    if (req.body.newPassword !== undefined && req.body.newPassword !== "") {
        const { currentPassword, newPassword } = req.body;
        v.check(typeof newPassword === "string" && newPassword.length >= 6 && newPassword.length <= 72,
            "newPassword", "New password must be 6-72 characters");
        v.done();
        if (typeof currentPassword !== "string" || !(await user.matchPassword(currentPassword))) {
            throw ApiError.badRequest("Current password is incorrect", { currentPassword: "Incorrect password" });
        }
        user.password = newPassword;
    }
    v.done();

    await user.save();
    await user.populate("department", "name");
    res.json({ success: true, user });
};
