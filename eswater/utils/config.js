const fs = require("fs");

function getConfig() {
  const configPath = "/data/options.json";
  if (!fs.existsSync(configPath)) {
    throw new Error("Configuration file not found");
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  // Validate required configuration
  if (!config.eswater_username) {
    throw new Error("Missing required configuration: eswater_username");
  }
  if (!config.eswater_password) {
    throw new Error("Missing required configuration: eswater_password");
  }

  return config;
}

module.exports = {
  getConfig,
};
