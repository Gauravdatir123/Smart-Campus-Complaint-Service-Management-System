const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");
const auth = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Slow down brute-force attempts on login/register
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === "test" ? 1000 : 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "Too many attempts, please try again in a few minutes" }
});

router.post("/register", authLimiter, auth.register);
router.post("/login", authLimiter, auth.login);
router.get("/me", protect, auth.getMe);
router.put("/me", protect, auth.updateMe);

module.exports = router;
