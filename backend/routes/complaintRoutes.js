const router = require("express").Router();
const c = require("../controllers/complaintController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { uploadImage } = require("../middleware/uploadMiddleware");
const { validateId } = require("../middleware/errorMiddleware");

router.use(protect); // every complaint route requires a logged-in user

router.post("/", authorize("student"), uploadImage, c.create);
router.get("/", c.list);
router.get("/stats", c.stats); // must be declared before "/:id"

router.get("/:id", validateId(), c.getOne);
router.put("/:id", validateId(), uploadImage, c.update);
router.delete("/:id", validateId(), c.remove);
router.put("/:id/status", validateId(), uploadImage, c.updateStatus);

module.exports = router;
