// Clean hybrid API-based data fetcher - primary method
const {
  fetchWaterConsumption: fetchWaterConsumptionAPI,
  parseWaterMeterData,
} = require("./data-fetcher-api");

const ESWaterHybridClient = require("./eswater-hybrid-client");

module.exports = {
  // Primary hybrid API-based functions (recommended)
  fetchWaterConsumption: fetchWaterConsumptionAPI,
  fetchWaterConsumptionAPI,
  parseWaterMeterData,
  ESWaterHybridClient,
};
