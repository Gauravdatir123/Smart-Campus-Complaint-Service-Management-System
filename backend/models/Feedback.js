const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
    {
        // unique: one feedback per complaint
        complaintId: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", required: true, unique: true },
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, trim: true, maxlength: 1000, default: "" }
    },
    { timestamps: true }
);

feedbackSchema.set("toJSON", {
    transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("Feedback", feedbackSchema);
