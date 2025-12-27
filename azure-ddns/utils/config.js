const fs = require("fs");

/**
 * Load and validate configuration from options.json
 * @returns {Object} Validated configuration object
 */
function getConfig() {
  const configPath = "/data/options.json";
  if (!fs.existsSync(configPath)) {
    throw new Error("Configuration file not found");
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return validateConfig(config);
}

/**
 * Validate required configuration fields
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validated configuration object
 */
function validateConfig(config) {
  // Validate required Azure configuration
  const required = [
    "azure_tenant_id",
    "azure_client_id",
    "azure_client_secret",
    "azure_subscription_id",
    "azure_resource_group",
  ];

  for (const field of required) {
    if (!config[field]) {
      throw new Error(`Missing required configuration: ${field}`);
    }
  }

  if (!config.domains || config.domains.length === 0) {
    throw new Error("No domains configured for DNS updates");
  }

  // Set defaults
  config.check_interval = config.check_interval || 300;
  config.log_level = config.log_level || "info";
  config.ipv4_enabled = config.ipv4_enabled !== false; // Default to true
  config.ipv6_enabled = config.ipv6_enabled === true; // Default to false

  return config;
}

module.exports = {
  getConfig,
  validateConfig,
};
