const { configureCloudinary, isConfigured } = require("../config/cloudinary");
const ApiError = require("./ApiError");

const FOLDER = "smart-campus";

// Uploads an in-memory buffer (from multer) to Cloudinary.
// Returns { url, publicId } - the only things we persist in MongoDB.
const uploadImage = (buffer, subfolder = "complaints") => {
    if (!isConfigured()) {
        throw new ApiError(
            503,
            "Image upload is not configured on the server. Set the CLOUDINARY_* variables in .env."
        );
    }
    const cloudinary = configureCloudinary();

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: `${FOLDER}/${subfolder}`,
                resource_type: "image",
                transformation: [{ width: 1600, height: 1600, crop: "limit" }, { quality: "auto" }]
            },
            (error, result) => {
                if (error) return reject(new ApiError(502, "Image upload failed", error.message));
                resolve({ url: result.secure_url, publicId: result.public_id });
            }
        );
        stream.end(buffer);
    });
};

// Best-effort delete: never throws, so a Cloudinary hiccup cannot break a request.
const deleteImage = async (publicId) => {
    if (!publicId || !isConfigured()) return;
    try {
        await configureCloudinary().uploader.destroy(publicId);
    } catch (err) {
        console.error("Cloudinary delete failed:", publicId, err.message);
    }
};

module.exports = { uploadImage, deleteImage };
