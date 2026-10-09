const router = require("express").Router();
const dept = require("../controllers/departmentController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validateId } = require("../middleware/errorMiddleware");

router.use(protect);

router.get("/", dept.list);
router.post("/", authorize("admin"), dept.create);
router.put("/:id", authorize("admin"), validateId(), dept.update);
router.delete("/:id", authorize("admin"), validateId(), dept.remove);

module.exports = router;
