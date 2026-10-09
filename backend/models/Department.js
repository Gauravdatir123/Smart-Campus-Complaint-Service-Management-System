const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
        description: { type: String, trim: true, maxlength: 300, default: "" }
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// The guide lists `staffIds` on Department. Instead of storing a second copy that can drift
// out of sync with User.department, we compute it: staff = every user whose department is this one.
departmentSchema.virtual("staff", {
    ref: "User",
    localField: "_id",
    foreignField: "department"
});

departmentSchema.set("toJSON", {
    virtuals: true,
    transform: (_doc, ret) => {
        delete ret.__v;
        delete ret.id;
        return ret;
    }
});

module.exports = mongoose.model("Department", departmentSchema);
