const axios = require("axios");

// Configuration from environment variables
const config = {
  apiKey: process.env.API_KEY || "",
  logLevel: process.env.LOG_LEVEL || "info",
  ilertEmail: process.env.ILERT_EMAIL || "",
};

// Logging utility
const logger = {
  debug: (msg) =>
    ["debug"].includes(config.logLevel) && console.log(`[DEBUG] ${msg}`),
  info: (msg) =>
    ["debug", "info"].includes(config.logLevel) && console.log(`[INFO] ${msg}`),
  warning: (msg) =>
    ["debug", "info", "warning"].includes(config.logLevel) &&
    console.warn(`[WARNING] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

// Initialize addon
logger.info("iLert addon started successfully");
logger.info(`Log level: ${config.logLevel}`);

// Log warning if API key or email is missing
if (!config.apiKey || !config.ilertEmail) {
  logger.warning(
    `Missing configuration: ${!config.apiKey ? "API key" : ""} ${
      !config.apiKey && !config.ilertEmail ? "and" : ""
    } ${
      !config.ilertEmail ? "iLert email" : ""
    }. Please configure in the addon settings.`
  );
}

// TODO: Implement iLert integration logic here

// Keep the process running
setInterval(() => {
  logger.debug("Addon running...");
}, 60000); // Log every minute in debug mode

// Handle shutdown gracefully
process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});
