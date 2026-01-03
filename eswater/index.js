const {
  getConfig,
  createLogger,
  connectMqtt,
  setupAutoDiscovery,
  publishMeterData,
  publishStatus,
} = require("./utils");

const { fetchWaterConsumption } = require("./functions");

class ESWater {
  constructor() {
    this.config = getConfig();
    this.logger = createLogger(this.config.log_level);
    this.mqttClient = null;
    this.updateTimer = null;

    this.initializeClients();
    // Don't await in constructor - start service after MQTT connects
  }

  initializeClients() {
    // Initialize MQTT client
    this.mqttClient = connectMqtt(this.config, this.logger);

    this.mqttClient.on("connect", () => {
      setupAutoDiscovery(this.mqttClient, this.logger);
      publishStatus(this.mqttClient, "online", "", this.logger);

      // Start service after MQTT connects and network is stable
      this.startService().catch((error) => {
        this.logger.error(`Failed to start service: ${error.message}`);
      });
    });

    this.mqttClient.on("error", (error) => {
      this.logger.error(`MQTT error: ${error.message}`);
    });
  }

  async startService() {
    this.logger.info("ESWater service starting...");

    // Give network time to stabilize after container start (20 seconds)
    this.logger.info("Waiting 20 seconds for network to stabilize...");
    await new Promise((resolve) => setTimeout(resolve, 20000));
    this.logger.info("Network stabilization complete");

    try {
      // Initial data fetch
      await this.fetchAndPublishData();

      // Set up periodic updates
      const updateInterval = (this.config.update_interval || 3600) * 1000; // Convert to milliseconds
      this.updateTimer = setInterval(() => {
        this.fetchAndPublishData();
      }, updateInterval);

      this.logger.info(
        `Service started successfully. Update interval: ${
          this.config.update_interval || 3600
        } seconds`
      );
    } catch (error) {
      this.logger.error(`Failed to start service: ${error.message}`);
      publishStatus(this.mqttClient, "error", error.message, this.logger);
    }
  }

  async fetchAndPublishData() {
    try {
      this.logger.info("Fetching water consumption data from ESWater API...");
      publishStatus(
        this.mqttClient,
        "fetching",
        "Fetching water meter data from ESWater API",
        this.logger
      );

      const apiResponse = await fetchWaterConsumption(this.config, this.logger);

      if (apiResponse && apiResponse.success) {
        // Publish the structured data to MQTT
        publishMeterData(this.mqttClient, apiResponse, this.logger);
        publishStatus(
          this.mqttClient,
          "online",
          "Data updated successfully via API",
          this.logger
        );
        this.logger.info("Water consumption data updated successfully");

        // Log the data that was published
        const data = apiResponse.data;
        this.logger.info(
          `Published data - Daily: ${data.dailyUsage}L, Latest: ${data.latestReading}L, Readings: ${data.readingCount}`
        );
      } else {
        const errorMsg = apiResponse?.error || "No data received from API";
        publishStatus(this.mqttClient, "error", errorMsg, this.logger);
        this.logger.error(`API fetch failed: ${errorMsg}`);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch and publish data: ${error.message}`);
      publishStatus(this.mqttClient, "error", error.message, this.logger);
    }
  }

  shutdown() {
    this.logger.info("Shutting down ESWater service...");

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    if (this.mqttClient) {
      publishStatus(
        this.mqttClient,
        "offline",
        "Service shutting down",
        this.logger
      );
      this.mqttClient.end();
    }

    this.logger.info("ESWater service shut down complete");
  }
}

// Start the service
try {
  const eswater = new ESWater();

  // Handle graceful shutdown signals
  process.on("SIGINT", () => {
    console.log("Received SIGINT, shutting down gracefully...");
    eswater.shutdown();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("Received SIGTERM, shutting down gracefully...");
    eswater.shutdown();
    process.exit(0);
  });
} catch (error) {
  console.error(`Failed to start ESWater: ${error.message}`);
  process.exit(1);
}
