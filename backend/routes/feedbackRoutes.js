const router = require("express").Router();
const feedback = require("../controllers/feedbackController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validateId } = require("../middleware/errorMiddleware");

router.use(protect);

router.post("/", authorize("student"), feedback.create);
router.get("/:complaintId", validateId("complaintId"), feedback.getForComplaint);

module.exports = router;
