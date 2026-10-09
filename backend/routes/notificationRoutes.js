const router = require("express").Router();
const n = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");
const { validateId } = require("../middleware/errorMiddleware");

router.use(protect);

router.get("/", n.list);
router.put("/read-all", n.markAllRead); // before "/:id/read"
router.put("/:id/read", validateId(), n.markRead);

module.exports = router;
