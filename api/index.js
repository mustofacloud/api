// api/index.js
const app = require("../src/index");

// Vercel Serverless Function wrapper
module.exports = (req, res) => {
    return app(req, res);
};
