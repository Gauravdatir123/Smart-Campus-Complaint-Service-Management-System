const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES } = require("../utils/constants");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 80 },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        // select:false -> never returned unless explicitly requested with .select("+password")
        password: { type: String, required: true, minlength: 6, select: false },

        role: { type: String, enum: ROLES, default: "student" },

        // Only meaningful for staff: the department whose complaints they handle
        department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },

        // Admins can deactivate an account instead of deleting it
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// Hash the password whenever it is set or changed
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plain) {
    return bcrypt.compare(plain, this.password);
};

userSchema.set("toJSON", {
    transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("User", userSchema);
