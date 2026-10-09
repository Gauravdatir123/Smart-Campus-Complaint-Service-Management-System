const multer = require("multer");
const ApiError = require("../utils/ApiError");

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Files stay in memory (no temp files on disk) and are streamed straight to Cloudinary.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED.includes(file.mimetype)) {
            return cb(ApiError.badRequest("Only JPG, PNG or WEBP images are allowed"));
        }
        cb(null, true);
    }
});

// Single optional image in the form field called "image"
const uploadImage = upload.single("image");

module.exports = { uploadImage, MAX_SIZE };
