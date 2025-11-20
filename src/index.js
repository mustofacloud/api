// src/index.js
const express = require("express");
const cors = require("cors");
const routes = require("./routes/routes");
const { sendLogToDiscord } = require("./other/discordLogger");
const config = require("./main/config");

const app = express();

// Maintenance middleware
app.use((req, res, next) => {
    if (config.maintenanceMode) {
        sendLogToDiscord(
            `Service temporarily unavailable. Request from ${req.ip} blocked.`,
            "Error"
        );
        return res.status(503).json({
            message: "Service temporarily unavailable due to maintenance.",
        });
    }
    next();
});

// Logging middleware
app.use((req, res, next) => {
    const startTime = new Date();

    res.on("finish", () => {
        const endTime = new Date();
        const responseTime = endTime - startTime;

        sendLogToDiscord(
            `Request handled. Method: ${req.method}, URL: ${req.originalUrl}`,
            "Info",
            { responseTime }
        );
    });

    next();
});

// Enable CORS
app.use(cors());

// Router
app.use("/api", routes);

// Homepage endpoint
app.get("/", (req, res) => {
    sendLogToDiscord(`Welcome message sent to ${req.ip}.`);
    res.json({
        message: "🖥️ UNV48 WEB API",
        author: "https://github.com/mustofacloud",
    });
});

// ❗ IMPORTANT: NO app.listen here!
// Vercel will handle the server start.

// Export Express instance for Vercel
module.exports = app;
