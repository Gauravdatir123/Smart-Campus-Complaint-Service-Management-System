const User = require("../models/User");
const Complaint = require("../models/Complaint");
const Department = require("../models/Department");
const Feedback = require("../models/Feedback");
const ApiError = require("../utils/ApiError");
const { str, isEmail, isObjectId, escapeRegex, Validator } = require("../utils/validate");
const { ROLES, STATUSES } = require("../utils/constants");

const OPEN_STATUSES = ["submitted", "assigned", "in_progress"];

// ---------------------------------------------------------------------------
// GET /api/admin/dashboard
// ---------------------------------------------------------------------------
exports.dashboard = async (_req, res) => {
    // Last 6 calendar months, including the current one
    const now = new Date();
    const monthStarts = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));

    const [byStatusRows, byPriorityRows, byCategoryRows, byDepartmentRows, trendCounts, resolvedDocs, [ratingSum, ratingCount], openHighCritical, userCounts] =
        await Promise.all([
            Complaint.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            Complaint.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
            Complaint.aggregate([
                { $group: { _id: "$category", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Complaint.aggregate([
                { $match: { department: { $ne: null } } },
                { $group: { _id: "$department", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            // One small indexed count per month (last 6 months, oldest first)
            Promise.all(
                monthStarts.map((start, i) =>
                    Complaint.countDocuments({
                        createdAt: { $gte: start, $lt: i < 5 ? monthStarts[i + 1] : new Date(now.getFullYear(), now.getMonth() + 1, 1) }
                    })
                )
            ),
            // Only two date fields per resolved complaint are read to work out the average resolution time
            Complaint.find({ resolvedAt: { $ne: null } }).select("createdAt resolvedAt").lean(),
            Promise.all([
                Feedback.aggregate([{ $group: { _id: null, totalRating: { $sum: "$rating" } } }]),
                Feedback.countDocuments()
            ]),
            Complaint.countDocuments({
                status: { $in: OPEN_STATUSES },
                priority: { $in: ["high", "critical"] }
            }),
            User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }])
        ]);

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    byStatusRows.forEach((r) => { byStatus[r._id] = r.count; });
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const resolvedTotal = byStatus.resolved + byStatus.closed;

    // Attach department names (kept out of the aggregation so it stays simple)
    const departments = await Department.find({ _id: { $in: byDepartmentRows.map((r) => r._id) } }).select("name");
    const deptName = Object.fromEntries(departments.map((d) => [String(d._id), d.name]));

    const monthlyTrend = monthStarts.map((d, i) => ({
        month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
        count: trendCounts[i]
    }));

    res.json({
        success: true,
        data: {
            totals: {
                total,
                pending: byStatus.submitted + byStatus.assigned,
                inProgress: byStatus.in_progress,
                resolved: resolvedTotal,
                highCritical: openHighCritical
            },
            byStatus,
            byPriority: byPriorityRows.map((r) => ({ name: r._id, count: r.count })),
            byCategory: byCategoryRows.map((r) => ({ name: r._id, count: r.count })),
            byDepartment: byDepartmentRows.map((r) => ({ name: deptName[String(r._id)] || "Unknown", count: r.count })),
            monthlyTrend,
            resolutionRate: total ? Math.round((resolvedTotal / total) * 1000) / 10 : 0,
            // averages are computed here (sum / count) so the pipelines stay simple
            avgResolutionHours: resolvedDocs.length
                ? Math.round((resolvedDocs.reduce((sum, c) => sum + (c.resolvedAt - c.createdAt), 0) / resolvedDocs.length / 36e5) * 10) / 10
                : null,
            avgRating: ratingCount ? Math.round((ratingSum[0].totalRating / ratingCount) * 10) / 10 : null,
            ratingCount,
            users: Object.fromEntries(ROLES.map((r) => [r, (userCounts.find((u) => u._id === r) || {}).count || 0]))
        }
    });
};

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

// GET /api/admin/users?role=&search=&department=
exports.listUsers = async (req, res) => {
    const filter = {};
    const { role, search, department } = req.query;
    if (role) {
        if (!ROLES.includes(role)) throw ApiError.badRequest("Unknown role");
        filter.role = role;
    }
    if (department) {
        if (!isObjectId(department)) throw ApiError.badRequest("Invalid department id");
        filter.department = department;
    }
    if (search && typeof search === "string" && search.trim()) {
        const rx = new RegExp(escapeRegex(search.trim().slice(0, 80)), "i");
        filter.$or = [{ name: rx }, { email: rx }];
    }

    const users = await User.find(filter).sort({ createdAt: -1 }).limit(200).populate("department", "name");
    res.json({ success: true, data: users });
};

// A staff member must belong to an existing department; others must not have one.
const resolveDepartment = async (role, departmentValue, v) => {
    if (role !== "staff") return null;
    const id = str(departmentValue);
    v.check(isObjectId(id), "department", "Staff members need a department");
    v.done();
    if (!(await Department.exists({ _id: id }))) throw ApiError.notFound("Department not found");
    return id;
};

// POST /api/admin/users  - create staff / admin / student accounts
exports.createUser = async (req, res) => {
    const name = str(req.body.name);
    const email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const role = str(req.body.role) || "staff";

    const v = new Validator()
        .check(name.length >= 2 && name.length <= 80, "name", "Name must be 2-80 characters")
        .check(isEmail(email), "email", "Enter a valid email address")
        .check(password.length >= 6 && password.length <= 72, "password", "Password must be 6-72 characters")
        .check(ROLES.includes(role), "role", "Choose a valid role");
    v.done();

    if (await User.exists({ email })) throw ApiError.conflict("An account with this email already exists");
    const department = await resolveDepartment(role, req.body.department, v);

    const user = await User.create({ name, email, password, role, department });
    await user.populate("department", "name");
    res.status(201).json({ success: true, data: user });
};

// PUT /api/admin/users/:id  - change name, role, department, active flag, or reset password
exports.updateUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw ApiError.notFound("User not found");

    const isSelf = String(user._id) === String(req.user._id);
    const v = new Validator();

    if (req.body.name !== undefined) {
        const name = str(req.body.name);
        v.check(name.length >= 2 && name.length <= 80, "name", "Name must be 2-80 characters");
        user.name = name;
    }
    if (req.body.role !== undefined) {
        const role = str(req.body.role);
        v.check(ROLES.includes(role), "role", "Choose a valid role");
        v.done();
        if (isSelf && role !== "admin") throw ApiError.badRequest("You cannot remove your own admin role");
        user.role = role;
    }
    if (req.body.isActive !== undefined) {
        v.check(typeof req.body.isActive === "boolean", "isActive", "isActive must be true or false");
        v.done();
        if (isSelf && req.body.isActive === false) throw ApiError.badRequest("You cannot deactivate yourself");
        user.isActive = req.body.isActive;
    }
    if (req.body.password) {
        const pw = String(req.body.password);
        v.check(pw.length >= 6 && pw.length <= 72, "password", "Password must be 6-72 characters");
        user.password = pw;
    }
    v.done();

    // department is required for staff, cleared for everyone else
    if (user.role === "staff") {
        const dept = req.body.department !== undefined ? req.body.department : user.department;
        user.department = await resolveDepartment("staff", dept ? String(dept) : "", v);
    } else {
        user.department = null;
    }

    await user.save();
    await user.populate("department", "name");
    res.json({ success: true, data: user });
};

// DELETE /api/admin/users/:id  - blocked if the user owns complaints (deactivate instead)
exports.deleteUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw ApiError.notFound("User not found");
    if (String(user._id) === String(req.user._id)) throw ApiError.badRequest("You cannot delete yourself");

    const owned = await Complaint.countDocuments({ studentId: user._id });
    if (owned) {
        throw ApiError.conflict(`This user has ${owned} complaint(s). Deactivate the account instead of deleting it.`);
    }

    // Free any complaints that were assigned to this staff member
    await Complaint.updateMany({ assignedTo: user._id }, { $set: { assignedTo: null } });
    await user.deleteOne();
    res.json({ success: true, message: "User deleted" });
};
