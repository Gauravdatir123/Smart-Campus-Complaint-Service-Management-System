const router = require("express").Router();
const admin = require("../controllers/adminController");
const complaints = require("../controllers/complaintController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { uploadImage } = require("../middleware/uploadMiddleware");
const { validateId } = require("../middleware/errorMiddleware");

router.use(protect, authorize("admin")); // everything below is admin-only

router.get("/dashboard", admin.dashboard);

router.put("/complaints/:id/assign", validateId(), complaints.assign);
router.put("/complaints/:id/status", validateId(), uploadImage, complaints.updateStatus);

router.get("/users", admin.listUsers);
router.post("/users", admin.createUser);
router.put("/users/:id", validateId(), admin.updateUser);
router.delete("/users/:id", validateId(), admin.deleteUser);

module.exports = router;
