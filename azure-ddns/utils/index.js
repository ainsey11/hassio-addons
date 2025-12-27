const { getConfig, validateConfig } = require("./config");
const { createLogger } = require("./logger");
const {
  connectMqtt,
  publishAutoDiscovery,
  setupAutoDiscovery,
  publishStatus,
  publishIPs,
  publishLastUpdate,
  publishDomainStatus,
  disconnectMqtt,
} = require("./mqtt");
const { HomeAssistantAPI } = require("./ha-api");

module.exports = {
  getConfig,
  validateConfig,
  createLogger,
  connectMqtt,
  publishAutoDiscovery,
  setupAutoDiscovery,
  publishStatus,
  publishIPs,
  publishLastUpdate,
  publishDomainStatus,
  disconnectMqtt,
  HomeAssistantAPI,
};
