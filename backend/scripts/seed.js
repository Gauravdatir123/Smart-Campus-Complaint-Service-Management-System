// Usage:  npm run seed
// Creates the default departments, one admin, one staff member per department and a demo student.
// Safe to run more than once: existing records are left untouched.
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Department = require("../models/Department");

const DEPARTMENTS = [
    ["Electrical", "Power, lighting, fans and electrical equipment"],
    ["IT & Network", "Wi-Fi, labs, computers and internet access"],
    ["Hostel Management", "Rooms, mess and hostel facilities"],
    ["Housekeeping", "Cleanliness and sanitation across campus"],
    ["Library", "Books, reading rooms and library services"],
    ["Transport", "Buses, schedules and parking"],
    ["Water & Plumbing", "Drinking water, taps, leaks and drainage"]
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

(async () => {
    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is not set");
        process.exit(1);
    }
    await connectDB();

    const password = process.env.SEED_PASSWORD || "Password@123";
    const created = [];

    const ensureUser = async (data) => {
        const existing = await User.findOne({ email: data.email });
        if (existing) return existing;
        const user = await User.create({ ...data, password });
        created.push(`${data.role.padEnd(8)} ${data.email}`);
        return user;
    };

    await ensureUser({
        name: "Campus Admin",
        email: process.env.SEED_ADMIN_EMAIL || "admin@campus.test",
        role: "admin"
    });

    for (const [name, description] of DEPARTMENTS) {
        const dept = (await Department.findOne({ name })) || (await Department.create({ name, description }));
        await ensureUser({
            name: `${name} Staff`,
            email: `staff.${slug(name)}@campus.test`,
            role: "staff",
            department: dept._id
        });
    }

    await ensureUser({ name: "Demo Student", email: "student@campus.test", role: "student" });

    console.log(created.length ? "Created accounts:" : "Nothing to create - already seeded.");
    created.forEach((line) => console.log("  " + line));
    if (created.length) console.log(`\nPassword for all seeded accounts: ${password}  (change it before deploying!)`);

    await mongoose.disconnect();
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
