const Feedback = require("../models/Feedback");
const Complaint = require("../models/Complaint");
const ApiError = require("../utils/ApiError");
const { notify, adminIds, ticketId } = require("../utils/notify");
const { str, isObjectId, Validator } = require("../utils/validate");

// POST /api/feedback  (student)  body: { complaintId, rating (1-5), comment }
exports.create = async (req, res) => {
    const complaintId = str(req.body.complaintId);
    const rating = Number(req.body.rating);
    const comment = str(req.body.comment);

    new Validator()
        .check(isObjectId(complaintId), "complaintId", "Invalid complaint")
        .check(Number.isInteger(rating) && rating >= 1 && rating <= 5, "rating", "Rating must be a whole number from 1 to 5")
        .check(comment.length <= 1000, "comment", "Comment is too long (max 1000)")
        .done();

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw ApiError.notFound("Complaint not found");
    if (String(complaint.studentId) !== String(req.user._id)) {
        throw ApiError.forbidden("You can only review your own complaints");
    }
    if (!["resolved", "closed"].includes(complaint.status)) {
        throw ApiError.badRequest("You can give feedback once the complaint is resolved");
    }
    if (await Feedback.exists({ complaintId })) {
        throw ApiError.conflict("Feedback has already been submitted for this complaint");
    }

    const feedback = await Feedback.create({ complaintId, studentId: req.user._id, rating, comment });

    await notify(
        [complaint.assignedTo, ...(await adminIds())],
        complaint._id,
        `${rating}-star feedback received for ${ticketId(complaint)}`
    );

    res.status(201).json({ success: true, data: feedback });
};

// GET /api/feedback/:complaintId
exports.getForComplaint = async (req, res) => {
    const complaint = await Complaint.findById(req.params.complaintId);
    if (!complaint) throw ApiError.notFound("Complaint not found");

    const { user } = req;
    const isOwner = String(complaint.studentId) === String(user._id);
    const isStaffOfComplaint = user.role === "staff" && (
        String(complaint.assignedTo) === String(user._id) ||
        (user.department && String(complaint.department) === String(user.department))
    );
    if (!(user.role === "admin" || isOwner || isStaffOfComplaint)) {
        throw ApiError.forbidden("You cannot view this feedback");
    }

    const feedback = await Feedback.findOne({ complaintId: complaint._id }).populate("studentId", "name");
    res.json({ success: true, data: feedback }); // data is null when nothing has been submitted yet
};
