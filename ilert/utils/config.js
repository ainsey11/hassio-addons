/**
 * Get configuration from environment variables
 * @returns {Object} Configuration object
 */
function getConfig() {
  return {
    apiKey: process.env.API_KEY || "",
    logLevel: process.env.LOG_LEVEL || "info",
    ilertEmail: process.env.ILERT_EMAIL || "",
    pollInterval: parseInt(process.env.POLL_INTERVAL) || 300,
    calendarEntity: process.env.CALENDAR_ENTITY || "",
    supervisorToken: process.env.SUPERVISOR_TOKEN || "",
  };
}

/**
 * Validate required configuration
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result with isValid flag and missing fields array
 */
function validateConfig(config) {
  const missing = [];

  if (!config.apiKey) missing.push("API key");
  if (!config.ilertEmail) missing.push("iLert email");

  return {
    isValid: missing.length === 0,
    missing,
    message:
      missing.length > 0
        ? `Missing configuration: ${missing.join(
            " and "
          )}. Please configure in the addon settings.`
        : "Configuration is valid",
  };
}

module.exports = { getConfig, validateConfig };
