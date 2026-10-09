const Complaint = require("../models/Complaint");
const Department = require("../models/Department");
const Feedback = require("../models/Feedback");
const Notification = require("../models/Notification");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { uploadImage, deleteImage } = require("../utils/cloudinaryUpload");
const { notify, adminIds, staffIdsOf, ticketId } = require("../utils/notify");
const { str, isObjectId, escapeRegex, Validator } = require("../utils/validate");
const { CATEGORIES, PRIORITIES, STATUSES, TRANSITIONS } = require("../utils/constants");

const STATUS_LABEL = {
    submitted: "Submitted",
    assigned: "Assigned",
    in_progress: "In progress",
    resolved: "Resolved",
    closed: "Closed"
};

// ---------------------------------------------------------------------------
// Access helpers
// ---------------------------------------------------------------------------

const sameId = (a, b) => a && b && String(a._id || a) === String(b._id || b);

// Which complaints is this user allowed to see? (returned as a Mongo filter)
const scopeFilter = (user) => {
    if (user.role === "admin") return {};
    if (user.role === "student") return { studentId: user._id };

    // staff: complaints of their department, plus anything assigned to them directly
    const conditions = [{ assignedTo: user._id }];
    if (user.department) conditions.push({ department: user.department });
    return { $or: conditions };
};

const canAccess = (user, complaint) => {
    if (user.role === "admin") return true;
    if (user.role === "student") return sameId(complaint.studentId, user._id);
    return sameId(complaint.assignedTo, user._id) ||
        (user.department && sameId(complaint.department, user.department));
};

const populateComplaint = (query) =>
    query
        .populate("studentId", "name email")
        .populate("assignedTo", "name email")
        .populate("department", "name")
        .populate("statusHistory.changedBy", "name role");

const findOrFail = async (id) => {
    const complaint = await Complaint.findById(id);
    if (!complaint) throw ApiError.notFound("Complaint not found");
    return complaint;
};

const pushHistory = (complaint, status, userId, comment = "") => {
    complaint.statusHistory.push({ status, changedBy: userId, comment, at: new Date() });
};

// ---------------------------------------------------------------------------
// POST /api/complaints  (student)
// ---------------------------------------------------------------------------
exports.create = async (req, res) => {
    const title = str(req.body.title);
    const description = str(req.body.description);
    const category = str(req.body.category);
    const priority = str(req.body.priority) || "medium";

    new Validator()
        .check(title.length >= 5 && title.length <= 120, "title", "Title must be 5-120 characters")
        .check(description.length >= 10 && description.length <= 2000, "description", "Description must be 10-2000 characters")
        .check(CATEGORIES.includes(category), "category", "Choose a valid category")
        .check(PRIORITIES.includes(priority), "priority", "Choose a valid priority")
        .done();

    // Upload evidence first; remove it again if saving the complaint fails
    let image = { url: "", publicId: "" };
    if (req.file) image = await uploadImage(req.file.buffer, "complaints");

    let complaint;
    try {
        complaint = await Complaint.create({
            title,
            description,
            category,
            priority,
            imageUrl: image.url,
            imagePublicId: image.publicId,
            studentId: req.user._id,
            statusHistory: [{ status: "submitted", changedBy: req.user._id, comment: "Complaint submitted" }]
        });
    } catch (err) {
        await deleteImage(image.publicId);
        throw err;
    }

    await notify(await adminIds(), complaint._id, `New ${priority} priority complaint ${ticketId(complaint)}: ${title}`);

    res.status(201).json({ success: true, data: complaint });
};

// ---------------------------------------------------------------------------
// GET /api/complaints   ?search=&status=&category=&priority=&department=&sort=&page=&limit=
// Students see their own, staff their department's, admins everything.
// ---------------------------------------------------------------------------
exports.list = async (req, res) => {
    const { search, status, category, priority, department, sort } = req.query;
    const and = [scopeFilter(req.user)];

    const v = new Validator();
    if (status) {
        v.check(STATUSES.includes(status), "status", "Unknown status");
        and.push({ status: String(status) });
    }
    if (category) {
        v.check(CATEGORIES.includes(category), "category", "Unknown category");
        and.push({ category: String(category) });
    }
    if (priority) {
        v.check(PRIORITIES.includes(priority), "priority", "Unknown priority");
        and.push({ priority: String(priority) });
    }
    if (department) {
        v.check(isObjectId(department), "department", "Invalid department id");
        and.push({ department: String(department) });
    }
    v.done();

    if (search && typeof search === "string" && search.trim()) {
        const rx = new RegExp(escapeRegex(search.trim().slice(0, 80)), "i");
        and.push({ $or: [{ title: rx }, { description: rx }] });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const filter = { $and: and };
    const sortBy = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const [data, total] = await Promise.all([
        Complaint.find(filter)
            .select("-statusHistory")
            .sort(sortBy)
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("studentId", "name email")
            .populate("assignedTo", "name")
            .populate("department", "name"),
        Complaint.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data,
        pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) }
    });
};

// ---------------------------------------------------------------------------
// GET /api/complaints/stats  - counts for the student / staff dashboard cards
// ---------------------------------------------------------------------------
exports.stats = async (req, res) => {
    const rows = await Complaint.aggregate([
        { $match: scopeFilter(req.user) },
        { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    rows.forEach((r) => { byStatus[r._id] = r.count; });

    res.json({
        success: true,
        data: {
            total: Object.values(byStatus).reduce((a, b) => a + b, 0),
            byStatus
        }
    });
};

// ---------------------------------------------------------------------------
// GET /api/complaints/:id
// ---------------------------------------------------------------------------
exports.getOne = async (req, res) => {
    const complaint = await populateComplaint(Complaint.findById(req.params.id));
    if (!complaint) throw ApiError.notFound("Complaint not found");
    if (!canAccess(req.user, complaint)) throw ApiError.forbidden("You cannot view this complaint");

    const feedback = await Feedback.findOne({ complaintId: complaint._id }).populate("studentId", "name");
    res.json({ success: true, data: complaint, feedback });
};

// ---------------------------------------------------------------------------
// PUT /api/complaints/:id
//  - student (owner), only while still "submitted": title, description, category, priority, image
//  - admin: priority, category
// ---------------------------------------------------------------------------
exports.update = async (req, res) => {
    const complaint = await findOrFail(req.params.id);
    const { role } = req.user;
    const body = req.body;

    if (role === "staff") {
        throw ApiError.forbidden("Staff update complaints through the status endpoint");
    }
    if (role === "student") {
        if (!sameId(complaint.studentId, req.user._id)) throw ApiError.forbidden("This is not your complaint");
        if (complaint.status !== "submitted") {
            throw ApiError.badRequest("You can only edit a complaint before it has been assigned");
        }
    }

    const v = new Validator();
    if (role === "student") {
        if (body.title !== undefined) {
            const t = str(body.title);
            v.check(t.length >= 5 && t.length <= 120, "title", "Title must be 5-120 characters");
            complaint.title = t;
        }
        if (body.description !== undefined) {
            const d = str(body.description);
            v.check(d.length >= 10 && d.length <= 2000, "description", "Description must be 10-2000 characters");
            complaint.description = d;
        }
    }
    if (body.category !== undefined) {
        v.check(CATEGORIES.includes(str(body.category)), "category", "Choose a valid category");
        complaint.category = str(body.category);
    }
    if (body.priority !== undefined) {
        v.check(PRIORITIES.includes(str(body.priority)), "priority", "Choose a valid priority");
        complaint.priority = str(body.priority);
    }
    v.done();

    // Image handling (students only): replace, or remove with removeImage=true
    let newImage = null;
    const oldPublicId = complaint.imagePublicId;
    if (role === "student") {
        if (req.file) {
            newImage = await uploadImage(req.file.buffer, "complaints");
            complaint.imageUrl = newImage.url;
            complaint.imagePublicId = newImage.publicId;
        } else if (str(body.removeImage) === "true") {
            complaint.imageUrl = "";
            complaint.imagePublicId = "";
        }
    }

    const priorityChanged = complaint.isModified("priority");
    try {
        await complaint.save();
    } catch (err) {
        if (newImage) await deleteImage(newImage.publicId);
        throw err;
    }
    if (oldPublicId && oldPublicId !== complaint.imagePublicId) await deleteImage(oldPublicId);

    if (role === "admin" && priorityChanged) {
        await notify(complaint.studentId, complaint._id,
            `Priority of ${ticketId(complaint)} was set to ${complaint.priority}`);
    }

    res.json({ success: true, data: complaint });
};

// ---------------------------------------------------------------------------
// DELETE /api/complaints/:id   - student (own, still "submitted") or admin (any)
// ---------------------------------------------------------------------------
exports.remove = async (req, res) => {
    const complaint = await findOrFail(req.params.id);

    if (req.user.role === "student") {
        if (!sameId(complaint.studentId, req.user._id)) throw ApiError.forbidden("This is not your complaint");
        if (complaint.status !== "submitted") {
            throw ApiError.badRequest("A complaint that is already being handled cannot be deleted");
        }
    } else if (req.user.role !== "admin") {
        throw ApiError.forbidden();
    }

    await Promise.all([
        complaint.deleteOne(),
        Feedback.deleteMany({ complaintId: complaint._id }),
        Notification.deleteMany({ complaintId: complaint._id })
    ]);
    await Promise.all([deleteImage(complaint.imagePublicId), deleteImage(complaint.resolutionImagePublicId)]);

    res.json({ success: true, message: "Complaint deleted" });
};

// ---------------------------------------------------------------------------
// PUT /api/complaints/:id/status          (student / staff / admin)
// PUT /api/admin/complaints/:id/status    (admin - same handler)
//   body: { status, comment }   + optional "image" (proof) when resolving
// ---------------------------------------------------------------------------
exports.updateStatus = async (req, res) => {
    const status = str(req.body.status);
    const comment = str(req.body.comment);
    const { user } = req;

    new Validator()
        .check(STATUSES.includes(status), "status", "Choose a valid status")
        .check(comment.length <= 1000, "comment", "Comment is too long (max 1000)")
        .done();

    const complaint = await findOrFail(req.params.id);
    if (!canAccess(user, complaint)) throw ApiError.forbidden("You cannot update this complaint");

    // Staff may only work on complaints that are free or assigned to themselves
    if (user.role === "staff" && complaint.assignedTo && !sameId(complaint.assignedTo, user._id)) {
        throw ApiError.forbidden("This complaint is assigned to another staff member");
    }

    const allowed = TRANSITIONS[user.role]?.[complaint.status] || [];
    if (!allowed.includes(status)) {
        throw ApiError.badRequest(
            `You cannot move a complaint from "${STATUS_LABEL[complaint.status]}" to "${STATUS_LABEL[status]}"`
        );
    }

    const v = new Validator();
    if (status === "resolved") {
        v.check(comment.length >= 5, "comment", "Describe how the issue was resolved (min 5 characters)");
    }
    if (user.role === "student" && status === "in_progress") {
        v.check(comment.length >= 5, "comment", "Tell us what is still wrong (min 5 characters)");
    }
    v.done();

    if (req.file && status !== "resolved") {
        throw ApiError.badRequest("A proof image can only be attached when resolving a complaint");
    }

    // ---- apply the change ----
    const now = new Date();
    let newImage = null;
    const oldProofId = complaint.resolutionImagePublicId;

    if (status === "in_progress") {
        // Staff accepting a free complaint takes ownership of it
        if (user.role === "staff" && !complaint.assignedTo) complaint.assignedTo = user._id;
        complaint.resolvedAt = undefined; // work re-opened: it is not resolved any more
    }

    if (status === "resolved") {
        complaint.resolvedAt = now;
        complaint.resolutionComment = comment;
        if (req.file) {
            newImage = await uploadImage(req.file.buffer, "resolutions");
            complaint.resolutionImageUrl = newImage.url;
            complaint.resolutionImagePublicId = newImage.publicId;
        }
    }

    if (status === "closed") complaint.closedAt = now;

    complaint.status = status;
    pushHistory(complaint, status, user._id, comment);

    try {
        await complaint.save();
    } catch (err) {
        if (newImage) await deleteImage(newImage.publicId);
        throw err;
    }
    if (newImage && oldProofId) await deleteImage(oldProofId);

    // ---- notifications ----
    const ref = ticketId(complaint);
    if (user.role === "student") {
        const targets = complaint.assignedTo
            ? [complaint.assignedTo]
            : await staffIdsOf(complaint.department);
        const msg = status === "closed"
            ? `The student confirmed ${ref} is fixed and closed it`
            : `The student says ${ref} is not fixed yet: ${comment}`;
        await notify([...targets, ...(await adminIds())], complaint._id, msg);
    } else {
        await notify(complaint.studentId, complaint._id,
            `Your complaint ${ref} is now ${STATUS_LABEL[status].toLowerCase()}`);
        if (status === "resolved") {
            // Let admins know too so they can follow up if the student does not confirm
            await notify(await adminIds(), complaint._id, `${ref} was marked resolved`);
        }
    }

    const fresh = await populateComplaint(Complaint.findById(complaint._id));
    res.json({ success: true, data: fresh });
};

// ---------------------------------------------------------------------------
// PUT /api/admin/complaints/:id/assign
//   body: { department (required), assignedTo (optional staff id), priority (optional) }
// ---------------------------------------------------------------------------
exports.assign = async (req, res) => {
    const departmentId = str(req.body.department);
    const staffId = str(req.body.assignedTo);
    const priority = str(req.body.priority);

    const v = new Validator()
        .check(isObjectId(departmentId), "department", "Choose a department");
    if (staffId) v.check(isObjectId(staffId), "assignedTo", "Invalid staff id");
    if (priority) v.check(PRIORITIES.includes(priority), "priority", "Choose a valid priority");
    v.done();

    const complaint = await findOrFail(req.params.id);
    if (!["submitted", "assigned", "in_progress"].includes(complaint.status)) {
        throw ApiError.badRequest("Resolved or closed complaints cannot be re-assigned");
    }

    const department = await Department.findById(departmentId);
    if (!department) throw ApiError.notFound("Department not found");

    let staff = null;
    if (staffId) {
        staff = await User.findOne({ _id: staffId, role: "staff", isActive: true });
        if (!staff) throw ApiError.notFound("Staff member not found");
        if (!sameId(staff.department, department._id)) {
            throw ApiError.badRequest("That staff member does not belong to the selected department");
        }
    }

    const now = new Date();
    complaint.department = department._id;
    complaint.assignedTo = staff ? staff._id : null;
    complaint.status = "assigned"; // a (re)assigned complaint waits for the staff to accept it
    complaint.assignedAt = complaint.assignedAt || now;
    if (priority) complaint.priority = priority;
    pushHistory(
        complaint,
        "assigned",
        req.user._id,
        staff ? `Assigned to ${staff.name} (${department.name})` : `Assigned to ${department.name} department`
    );
    await complaint.save();

    const ref = ticketId(complaint);
    await notify(complaint.studentId, complaint._id, `Your complaint ${ref} was assigned to ${department.name}`);
    const staffTargets = staff ? [staff._id] : await staffIdsOf(department._id);
    await notify(staffTargets, complaint._id, `New complaint ${ref} assigned: ${complaint.title}`);

    const fresh = await populateComplaint(Complaint.findById(complaint._id));
    res.json({ success: true, data: fresh });
};
