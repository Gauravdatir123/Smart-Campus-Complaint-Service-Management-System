const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        complaintId: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint" },
        message: { type: String, required: true, maxlength: 300 },
        isRead: { type: Boolean, default: false }
    },
    { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

notificationSchema.set("toJSON", {
    transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("Notification", notificationSchema);
