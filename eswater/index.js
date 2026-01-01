const fs = require("fs");
const axios = require("axios");
const mqtt = require("mqtt");

class Eswater {
  constructor() {
    this.config = this.loadConfig();
    this.mqttClient = null;

    this.initializeClients();
    this.startService();
  }

  loadConfig() {
    const configPath = "/data/options.json";
    if (!fs.existsSync(configPath)) {
      throw new Error("Configuration file not found");
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

    // Add your configuration validation here
    // Example:
    // if (!config.api_key) {
    //   throw new Error("Missing required configuration: api_key");
    // }

    return config;
  }

  initializeClients() {
    // Initialize MQTT client
    const mqttUrl = `mqtt://${this.config.mqtt_host}:${this.config.mqtt_port}`;
    const mqttOptions = {
      username: this.config.mqtt_user || undefined,
      password: this.config.mqtt_password || undefined,
    };

    this.mqttClient = mqtt.connect(mqttUrl, mqttOptions);

    this.mqttClient.on("connect", () => {
      this.log("info", "MQTT connected");
      this.setupAutoDiscovery();
      this.publishStatus("online");
    });

    this.mqttClient.on("error", (error) => {
      this.log("error", `MQTT error: ${error.message}`);
    });
  }

  setupAutoDiscovery() {
    this.log("info", "Setting up MQTT Auto Discovery...");

    // Device info for grouping all sensors
    const deviceInfo = {
      identifiers: ["eswater"],
      name: "Eswater",
      manufacturer: "Home Assistant Addon",
      model: "Eswater Service",
      sw_version: "1.0.0"
    };

    // Example sensor - replace with your actual sensors
    this.publishAutoDiscovery("sensor", "eswater_status", {
      name: "Eswater Status",
      state_topic: "eswater/status",
      icon: "mdi:check-circle",
      device: deviceInfo,
      unique_id: "eswater_status"
    });

    this.log("info", "MQTT Auto Discovery setup complete");
  }

  publishAutoDiscovery(component, objectId, config) {
    const topic = `homeassistant/${component}/eswater/${objectId}/config`;
    const payload = JSON.stringify(config);
    this.mqttClient.publish(topic, payload, { retain: true });
    this.log("debug", `Published auto-discovery for ${component}.eswater_${objectId}`);
  }

  publishStatus(status, message = "") {
    const topic = "eswater/status";
    const payload = JSON.stringify({
      status,
      message,
      timestamp: new Date().toISOString(),
    });
    this.mqttClient.publish(topic, payload, { retain: true });
  }

  async startService() {
    this.log("info", "Eswater service starting...");

    // Add your main service logic here
    // Example: periodic data fetching, API calls, etc.

    this.log("info", "Service started successfully");
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const logLevel = this.config.log_level || "info";

    const levels = { debug: 0, info: 1, warning: 2, error: 3 };
    if (levels[level] >= levels[logLevel]) {
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Start the service
try {
  new Eswater();
} catch (error) {
  console.error(`Failed to start Eswater: ${error.message}`);
  process.exit(1);
}
