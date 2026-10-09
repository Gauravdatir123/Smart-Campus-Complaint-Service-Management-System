require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// Fail fast on missing configuration instead of crashing on the first login
["MONGO_URI", "JWT_SECRET"].forEach((key) => {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key} (see .env.example)`);
        process.exit(1);
    }
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
