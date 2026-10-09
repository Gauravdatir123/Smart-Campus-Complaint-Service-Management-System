const mongoose = require("mongoose");

// Cache the connection so it is reused between requests (needed on Vercel)
let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

const connectDB = async () => {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose
            .connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 10000
            })
            .then((m) => {
                console.log("MongoDB connected successfully");
                return m;
            })
            .catch((error) => {
                cached.promise = null;
                console.error("MongoDB connection failed:", error.name, error.message);
                throw error;
            });
    }

    cached.conn = await cached.promise;
    return cached.conn;
};

module.exports = connectDB;