/**
 * Get configuration from environment variables
 * @returns {Object} Configuration object
 */
function getConfig() {
  const calendarDaysAhead = Math.max(
    1,
    Math.min(90, parseInt(process.env.CALENDAR_DAYS_AHEAD) || 28)
  );

  return {
    apiKey: process.env.API_KEY || "",
    logLevel: process.env.LOG_LEVEL || "info",
    ilertEmail: process.env.ILERT_EMAIL || "",
    pollInterval: parseInt(process.env.POLL_INTERVAL) || 300,
    calendarEntity: process.env.CALENDAR_ENTITY || "",
    calendarPersonalOnly:
      process.env.CALENDAR_PERSONAL_ONLY === "true" || false,
    calendarDaysAhead: calendarDaysAhead,
    supervisorToken: process.env.SUPERVISOR_TOKEN || "",
    mqttHost: process.env.MQTT_HOST || "core-mosquitto",
    mqttPort: parseInt(process.env.MQTT_PORT) || 1883,
    mqttUser: process.env.MQTT_USER || "",
    mqttPassword: process.env.MQTT_PASSWORD || "",
  };
}

/**
 * Validate required configuration
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result with isValid flag, missing fields, and warnings
 */
function validateConfig(config) {
  const missing = [];
  const warnings = [];

  // Required fields
  if (!config.apiKey) missing.push("API key");
  if (!config.ilertEmail) missing.push("iLert email");

  // MQTT warnings (required for sensors to work)
  if (!config.mqttUser) {
    warnings.push("MQTT username not configured - authentication may fail");
  }
  if (!config.mqttPassword) {
    warnings.push("MQTT password not configured - authentication may fail");
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
    message:
      missing.length > 0
        ? `Missing configuration: ${missing.join(
            " and "
          )}. Please configure in the addon settings.`
        : "Configuration is valid",
  };
}

module.exports = { getConfig, validateConfig };
