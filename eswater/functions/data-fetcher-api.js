const ESWaterHybridClient = require("./eswater-hybrid-client");

/**
 * Clean hybrid API-based water consumption fetcher
 * Uses the ESWater hybrid client for reliable auth and API data
 */
async function fetchWaterConsumptionAPI(config, logger) {
  let client = null;

  try {
    logger.info("Starting ESWater hybrid API-based data fetch");

    // Check if we should skip due to recent failures (account lockout protection)
    const now = Date.now();

    // Simple in-memory failure tracking (would be better with persistent storage)
    if (!global.eswaterFailureTracking) {
      global.eswaterFailureTracking = {
        lastFailure: 0,
        failureCount: 0,
      };
    }

    const tracking = global.eswaterFailureTracking;
    const timeSinceLastFailure = now - tracking.lastFailure;
    const backoffTime = Math.min(
      tracking.failureCount * 5 * 60 * 1000,
      60 * 60 * 1000
    ); // 5min per failure, max 1 hour

    if (tracking.failureCount >= 3 && timeSinceLastFailure < backoffTime) {
      const waitMinutes = Math.ceil(
        (backoffTime - timeSinceLastFailure) / (60 * 1000)
      );
      logger.warning(
        `Skipping login attempt due to recent failures. Wait ${waitMinutes} more minutes to prevent account lockout.`
      );

      return {
        success: false,
        source: "hybrid_api",
        error: `Too many recent failures. Waiting ${waitMinutes} minutes to prevent account lockout.`,
        data: {
          status: "waiting",
          error: "Account lockout prevention active",
          dailyUsage: 0,
          latestReading: 0,
          readingCount: 0,
        },
      };
    }

    // Validate configuration
    if (!config.eswater_username || !config.eswater_password) {
      throw new Error("ESWater credentials not provided in configuration");
    }

    // Initialize hybrid client
    client = new ESWaterHybridClient(logger);
    await client.initialize();

    // Authenticate and extract auth data
    const loginSuccess = await client.loginAndExtractAuth(
      config.eswater_username,
      config.eswater_password
    );

    if (!loginSuccess) {
      throw new Error("Failed to authenticate or extract required API data");
    }

    // Fetch latest usage data using API
    const usageData = await client.getUsageData();

    logger.info(`Retrieved water usage data:`);
    logger.info(`  Daily Usage: ${usageData.dailyUsage}L`);
    logger.info(`  Latest Reading: ${usageData.latestReading}L`);
    logger.info(`  Reading Count: ${usageData.readingCount}`);
    logger.info(`  Data Age: ${usageData.daysBack} days`);

    // Reset failure tracking on success
    tracking.lastFailure = 0;
    tracking.failureCount = 0;

    // Return structured data for MQTT publishing
    return {
      success: true,
      source: "hybrid_api",
      data: {
        dailyUsage: usageData.dailyUsage,
        latestReading: usageData.latestReading,
        timestamp: usageData.timestamp,
        readingCount: usageData.readingCount,
        daysBack: usageData.daysBack,
        status: "online",
      },
      rawData: usageData.rawData,
    };
  } catch (error) {
    logger.error(`ESWater hybrid API fetch failed: ${error.message}`);

    // Track failures for account lockout prevention
    const tracking = global.eswaterFailureTracking || {
      lastFailure: 0,
      failureCount: 0,
    };
    tracking.lastFailure = Date.now();
    tracking.failureCount = Math.min(tracking.failureCount + 1, 10); // Cap at 10
    global.eswaterFailureTracking = tracking;

    if (
      error.message.includes("locked") ||
      error.message.includes("unsuccessful")
    ) {
      logger.error(
        `Account appears to be locked. Will wait before next attempt.`
      );
    }

    return {
      success: false,
      source: "hybrid_api",
      error: error.message,
      data: {
        status: "error",
        error: error.message,
        dailyUsage: 0,
        latestReading: 0,
        readingCount: 0,
      },
    };
  } finally {
    if (client) {
      await client.cleanup();
    }
  }
}

module.exports = {
  fetchWaterConsumption: fetchWaterConsumptionAPI,
};
