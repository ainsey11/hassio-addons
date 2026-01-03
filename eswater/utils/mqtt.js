const mqtt = require("mqtt");

function connectMqtt(config, logger) {
  const mqttUrl = `mqtt://${config.mqtt_host}:${config.mqtt_port}`;
  const mqttOptions = {
    username: config.mqtt_user || undefined,
    password: config.mqtt_password || undefined,
  };

  const client = mqtt.connect(mqttUrl, mqttOptions);

  client.on("connect", () => {
    logger.info("MQTT connected successfully");
  });

  client.on("error", (error) => {
    logger.error(`MQTT connection error: ${error.message}`);
  });

  client.on("close", () => {
    logger.warning("MQTT connection closed");
  });

  client.on("reconnect", () => {
    logger.info("MQTT reconnecting...");
  });

  return client;
}

function setupAutoDiscovery(mqttClient, logger) {
  logger.info("Setting up MQTT Auto Discovery...");

  // Device info for grouping all sensors
  const deviceInfo = {
    identifiers: ["eswater_meter"],
    name: "ESWater Smart Meter",
    manufacturer: "Essex & Suffolk Water",
    model: "Smart Meter",
    sw_version: "1.0.0",
  };

  // Daily usage sensor (primary) with attributes
  publishAutoDiscovery(
    mqttClient,
    "sensor",
    "daily_usage",
    {
      name: "Daily Water Usage",
      state_topic: "eswater/daily_usage",
      json_attributes_topic: "eswater/daily_usage_attributes",
      unit_of_measurement: "L",
      device_class: "water",
      state_class: "measurement",
      icon: "mdi:water",
      device: deviceInfo,
      unique_id: "eswater_daily_usage",
    },
    logger
  );

  // Latest hourly reading sensor
  publishAutoDiscovery(
    mqttClient,
    "sensor",
    "latest_reading",
    {
      name: "Latest Hourly Reading",
      state_topic: "eswater/latest_reading",
      unit_of_measurement: "L",
      device_class: "water",
      icon: "mdi:water-pump",
      device: deviceInfo,
      unique_id: "eswater_latest_reading",
    },
    logger
  );

  // Hourly breakdown (JSON payload for charting)
  publishAutoDiscovery(
    mqttClient,
    "sensor",
    "hourly_breakdown",
    {
      name: "Water Hourly Breakdown",
      state_topic: "eswater/hourly_json",
      icon: "mdi:chart-bar",
      device: deviceInfo,
      unique_id: "eswater_hourly_breakdown",
    },
    logger
  );

  // Data points count sensor
  publishAutoDiscovery(
    mqttClient,
    "sensor",
    "reading_count",
    {
      name: "Available Data Points",
      state_topic: "eswater/reading_count",
      unit_of_measurement: "readings",
      icon: "mdi:counter",
      device: deviceInfo,
      unique_id: "eswater_reading_count",
    },
    logger
  );

  // Last reading timestamp
  publishAutoDiscovery(
    mqttClient,
    "sensor",
    "last_updated",
    {
      name: "Last Reading Time",
      state_topic: "eswater/last_updated",
      device_class: "timestamp",
      icon: "mdi:clock",
      device: deviceInfo,
      unique_id: "eswater_last_updated",
    },
    logger
  );

  // Data age sensor (how old the data is)
  publishAutoDiscovery(
    mqttClient,
    "sensor",
    "data_age",
    {
      name: "Data Age (Days)",
      state_topic: "eswater/data_age",
      unit_of_measurement: "days",
      icon: "mdi:calendar-clock",
      device: deviceInfo,
      unique_id: "eswater_data_age",
    },
    logger
  );

  // Connection status sensor
  publishAutoDiscovery(
    mqttClient,
    "sensor",
    "connection_status",
    {
      name: "ESWater Connection Status",
      state_topic: "eswater/connection_status",
      icon: "mdi:connection",
      device: deviceInfo,
      unique_id: "eswater_connection_status",
    },
    logger
  );

  logger.info("MQTT Auto Discovery setup complete");
}

function publishAutoDiscovery(mqttClient, component, objectId, config, logger) {
  const topic = `homeassistant/${component}/eswater/${objectId}/config`;
  const payload = JSON.stringify(config);
  mqttClient.publish(topic, payload, { retain: true });
  logger.debug(`Published auto-discovery for ${component}.eswater_${objectId}`);
}

function publishMeterData(mqttClient, data, logger) {
  try {
    // Handle both old format (for backwards compatibility) and new API format
    if (data && data.data) {
      // New API format
      const apiData = data.data;
      const rawData = data.rawData || data.data?.rawData;

      // Calculate hourly stats if rawData present
      let minHour = null;
      let maxHour = null;
      let meanHour = null;
      let latestHourValue = apiData.latestReading;
      if (Array.isArray(rawData) && rawData.length > 0) {
        const litreValues = rawData
          .map((r) =>
            r && r.LitreValue !== undefined ? Number(r.LitreValue) : null
          )
          .filter((v) => v !== null && !Number.isNaN(v));
        if (litreValues.length > 0) {
          minHour = Math.min(...litreValues);
          maxHour = Math.max(...litreValues);
          meanHour =
            Math.round(
              (litreValues.reduce((sum, v) => sum + v, 0) /
                litreValues.length) *
                100
            ) / 100;
          // latest hour from rawData if we have timestamps ordered
          const last = rawData[rawData.length - 1];
          if (last && last.LitreValue !== undefined) {
            latestHourValue = Number(last.LitreValue);
          }
        }
      }

      if (apiData.dailyUsage !== undefined) {
        mqttClient.publish(
          "eswater/daily_usage",
          apiData.dailyUsage.toString(),
          {
            retain: true,
          }
        );
        logger.debug(`Published daily usage: ${apiData.dailyUsage}L`);
      }

      // Publish attributes for the primary daily sensor
      const attributes = {
        latest_hour_liters: latestHourValue ?? apiData.latestReading ?? 0,
        reading_count: apiData.readingCount ?? 0,
        data_age_days: apiData.daysBack ?? 0,
        days_back_used: apiData.daysBack ?? 0,
        min_hour_liters: minHour,
        max_hour_liters: maxHour,
        mean_hour_liters: meanHour,
        meter_serial: apiData.meterSerial,
        account_id: apiData.accountId,
      };

      mqttClient.publish(
        "eswater/daily_usage_attributes",
        JSON.stringify(attributes),
        { retain: true }
      );

      if (apiData.latestReading !== undefined) {
        mqttClient.publish(
          "eswater/latest_reading",
          apiData.latestReading.toString(),
          {
            retain: true,
          }
        );
        logger.debug(`Published latest reading: ${apiData.latestReading}L`);
      }

      // Publish hourly breakdown JSON for charting/diagnostics (stringified array)
      if (Array.isArray(rawData)) {
        mqttClient.publish("eswater/hourly_json", JSON.stringify(rawData), {
          retain: true,
        });
        logger.debug(
          `Published hourly breakdown JSON (${rawData.length} items)`
        );
      }

      if (apiData.readingCount !== undefined) {
        mqttClient.publish(
          "eswater/reading_count",
          apiData.readingCount.toString(),
          {
            retain: true,
          }
        );
        logger.debug(`Published reading count: ${apiData.readingCount}`);
      }

      if (apiData.timestamp) {
        const ts = new Date(apiData.timestamp).toISOString();
        mqttClient.publish("eswater/last_updated", ts, {
          retain: true,
        });
        logger.debug(`Published timestamp: ${ts}`);
      }

      if (apiData.daysBack !== undefined) {
        mqttClient.publish("eswater/data_age", apiData.daysBack.toString(), {
          retain: true,
        });
        logger.debug(`Published data age: ${apiData.daysBack} days`);
      }

      if (apiData.status) {
        mqttClient.publish("eswater/connection_status", apiData.status, {
          retain: true,
        });
        logger.debug(`Published connection status: ${apiData.status}`);
      }
    }

    logger.info("Published meter data to MQTT successfully");
  } catch (error) {
    logger.error(`Failed to publish meter data: ${error.message}`);
  }
}

function publishStatus(mqttClient, status, message = "", logger) {
  const payload = JSON.stringify({
    status,
    message,
    timestamp: new Date().toISOString(),
  });
  mqttClient.publish("eswater/status", payload, { retain: true });
  logger.debug(`Published status: ${status} - ${message}`);
}

module.exports = {
  connectMqtt,
  setupAutoDiscovery,
  publishMeterData,
  publishStatus,
};
