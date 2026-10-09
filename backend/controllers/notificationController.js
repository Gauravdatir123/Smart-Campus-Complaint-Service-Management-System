const Notification = require("../models/Notification");
const ApiError = require("../utils/ApiError");

// GET /api/notifications  - latest 30 plus the unread count
exports.list = async (req, res) => {
    const [data, unread] = await Promise.all([
        Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30),
        Notification.countDocuments({ userId: req.user._id, isRead: false })
    ]);
    res.json({ success: true, data, unread });
};

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { $set: { isRead: true } });
    res.json({ success: true });
};

// PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
    const n = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { $set: { isRead: true } },
        { returnDocument: "after" }
    );
    if (!n) throw ApiError.notFound("Notification not found");
    res.json({ success: true, data: n });
};
