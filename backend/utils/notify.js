const Notification = require("../models/Notification");
const User = require("../models/User");

// Create notifications for one or many users. Failures are logged, never thrown,
// so a notification problem can never fail the main request.
const notify = async (userIds, complaintId, message) => {
    try {
        const unique = [...new Set((Array.isArray(userIds) ? userIds : [userIds])
            .filter(Boolean)
            .map(String))];
        if (!unique.length) return;
        await Notification.insertMany(
            unique.map((userId) => ({ userId, complaintId, message }))
        );
    } catch (err) {
        console.error("Notification error:", err.message);
    }
};

const adminIds = async () => {
    const admins = await User.find({ role: "admin", isActive: true }).select("_id");
    return admins.map((a) => a._id);
};

const staffIdsOf = async (departmentId) => {
    if (!departmentId) return [];
    const staff = await User.find({ role: "staff", department: departmentId, isActive: true }).select("_id");
    return staff.map((s) => s._id);
};

const ticketId = (complaint) => `#${String(complaint._id).slice(-6).toUpperCase()}`;

module.exports = { notify, adminIds, staffIdsOf, ticketId };
