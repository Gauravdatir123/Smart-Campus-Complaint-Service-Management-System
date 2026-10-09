const mongoose = require("mongoose");
const { CATEGORIES, PRIORITIES, STATUSES } = require("../utils/constants");

const historySchema = new mongoose.Schema(
    {
        status: { type: String, enum: STATUSES, required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        comment: { type: String, trim: true, maxlength: 1000, default: "" },
        at: { type: Date, default: Date.now }
    },
    { _id: false }
);

const complaintSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
        description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
        category: { type: String, enum: CATEGORIES, required: true },
        priority: { type: String, enum: PRIORITIES, default: "medium" },
        status: { type: String, enum: STATUSES, default: "submitted" },

        // Evidence uploaded by the student (Cloudinary)
        imageUrl: { type: String, default: "" },
        imagePublicId: { type: String, default: "" },

        studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },

        // Written by staff when resolving
        resolutionComment: { type: String, trim: true, maxlength: 1000, default: "" },
        resolutionImageUrl: { type: String, default: "" },
        resolutionImagePublicId: { type: String, default: "" },

        // Workflow timestamps (createdAt / updatedAt come from `timestamps`)
        assignedAt: Date,
        resolvedAt: Date,
        closedAt: Date,

        // Timeline shown on the details page
        statusHistory: { type: [historySchema], default: [] }
    },
    { timestamps: true }
);

complaintSchema.index({ studentId: 1, createdAt: -1 });
complaintSchema.index({ department: 1, status: 1 });
complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ createdAt: -1 });

complaintSchema.set("toJSON", {
    transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("Complaint", complaintSchema);
