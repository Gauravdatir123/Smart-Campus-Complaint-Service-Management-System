const Department = require("../models/Department");
const User = require("../models/User");
const Complaint = require("../models/Complaint");
const ApiError = require("../utils/ApiError");
const { str, Validator } = require("../utils/validate");

// GET /api/departments  (any logged-in user; admin also gets the staff list)
exports.list = async (req, res) => {
    let query = Department.find().sort("name");
    if (req.user.role === "admin") {
        query = query.populate("staff", "name email isActive");
    }
    res.json({ success: true, data: await query });
};

// POST /api/departments  (admin)
exports.create = async (req, res) => {
    const name = str(req.body.name);
    const description = str(req.body.description);
    new Validator()
        .check(name.length >= 2 && name.length <= 80, "name", "Name must be 2-80 characters")
        .check(description.length <= 300, "description", "Description is too long (max 300)")
        .done();

    const dept = await Department.create({ name, description });
    res.status(201).json({ success: true, data: dept });
};

// PUT /api/departments/:id  (admin)
exports.update = async (req, res) => {
    const dept = await Department.findById(req.params.id);
    if (!dept) throw ApiError.notFound("Department not found");

    const v = new Validator();
    if (req.body.name !== undefined) {
        const name = str(req.body.name);
        v.check(name.length >= 2 && name.length <= 80, "name", "Name must be 2-80 characters");
        dept.name = name;
    }
    if (req.body.description !== undefined) {
        const description = str(req.body.description);
        v.check(description.length <= 300, "description", "Description is too long (max 300)");
        dept.description = description;
    }
    v.done();

    await dept.save();
    res.json({ success: true, data: dept });
};

// DELETE /api/departments/:id  (admin) - blocked while it is still in use
exports.remove = async (req, res) => {
    const dept = await Department.findById(req.params.id);
    if (!dept) throw ApiError.notFound("Department not found");

    const [staffCount, complaintCount] = await Promise.all([
        User.countDocuments({ department: dept._id }),
        Complaint.countDocuments({ department: dept._id })
    ]);
    if (staffCount || complaintCount) {
        throw ApiError.conflict(
            `Cannot delete: ${staffCount} staff member(s) and ${complaintCount} complaint(s) use this department`
        );
    }

    await dept.deleteOne();
    res.json({ success: true, message: "Department deleted" });
};
