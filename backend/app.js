const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const adminRoutes = require("./routes/adminRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const ApiError = require("./utils/ApiError");

const app = express();

// Behind Render/Heroku/Vercel proxies: needed for correct client IPs (rate limiting)
app.set("trust proxy", 1);

app.use(helmet());

// Only allow the configured frontend origin(s), e.g. CLIENT_URL=https://my-app.vercel.app
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, cb) => {
            // no Origin header = curl/Postman/server-to-server
            if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
            cb(ApiError.forbidden(`CORS: origin ${origin} is not allowed`));
        }
    })
);

app.use(express.json({ limit: "100kb" }));
// Express 5 leaves req.body undefined when nothing was parsed; give controllers an object
app.use((req, _res, next) => {
    if (req.body === undefined) req.body = {};
    next();
});

app.get("/", (_req, res) => {
    res.send("Smart Campus API is running");
});
app.get("/api/health", (_req, res) => res.json({ success: true, status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
