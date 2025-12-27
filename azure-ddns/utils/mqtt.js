const mqtt = require("mqtt");

let mqttClient = null;

/**
 * Connect to MQTT broker
 * @param {Object} config - Configuration object containing MQTT settings
 * @param {Object} logger - Logger instance
 * @returns {Object} MQTT client instance
 */
function connectMqtt(config, logger) {
  const mqttUrl = `mqtt://${config.mqtt_host}:${config.mqtt_port}`;
  const mqttOptions = {
    username: config.mqtt_user || undefined,
    password: config.mqtt_password || undefined,
  };

  mqttClient = mqtt.connect(mqttUrl, mqttOptions);

  mqttClient.on("connect", () => {
    logger.info("MQTT connected");
    publishStatus("online", logger);
  });

  mqttClient.on("error", (error) => {
    logger.error(`MQTT error: ${error.message}`);
  });

  return mqttClient;
}

/**
 * Publish MQTT auto-discovery configuration for Home Assistant
 * @param {string} component - Component type (sensor, binary_sensor, etc.)
 * @param {string} objectId - Unique object identifier
 * @param {Object} config - Auto-discovery configuration
 * @param {Object} logger - Logger instance
 */
function publishAutoDiscovery(component, objectId, config, logger) {
  if (!mqttClient) {
    logger.warning("MQTT client not connected, cannot publish auto-discovery");
    return;
  }

  const topic = `homeassistant/${component}/azure_ddns/${objectId}/config`;
  const payload = JSON.stringify(config);
  mqttClient.publish(topic, payload, { retain: true });
  logger.debug(
    `Published auto-discovery for ${component}.azure_ddns_${objectId}`
  );
}

/**
 * Set up MQTT auto-discovery for all sensors
 * @param {Object} config - Configuration object
 * @param {Object} logger - Logger instance
 */
function setupAutoDiscovery(config, logger) {
  logger.info("Setting up MQTT Auto Discovery...");

  // Device info for grouping all sensors
  const deviceInfo = {
    identifiers: ["azure_ddns"],
    name: "Azure Dynamic DNS",
    manufacturer: "Home Assistant Addon",
    model: "Azure DDNS Service",
    sw_version: "1.0.0",
  };

  // DDNS Service Status (binary sensor)
  publishAutoDiscovery(
    "binary_sensor",
    "azure_ddns_service",
    {
      name: "Azure DDNS Service",
      state_topic: "ddns/azure/status",
      value_template: "{{ 'ON' if value_json.status == 'online' else 'OFF' }}",
      json_attributes_topic: "ddns/azure/status",
      device_class: "connectivity",
      device: deviceInfo,
      unique_id: "azure_ddns_service_status",
    },
    logger
  );

  // IPv4 Address sensor
  publishAutoDiscovery(
    "sensor",
    "azure_ddns_ipv4",
    {
      name: "Public IPv4 Address",
      state_topic: "ddns/azure/ipv4/current",
      icon: "mdi:ip-network",
      device: deviceInfo,
      unique_id: "azure_ddns_ipv4_current",
    },
    logger
  );

  // IPv4 Previous Address sensor
  publishAutoDiscovery(
    "sensor",
    "azure_ddns_ipv4_previous",
    {
      name: "Previous IPv4 Address",
      state_topic: "ddns/azure/ipv4/previous",
      icon: "mdi:ip-network-outline",
      device: deviceInfo,
      unique_id: "azure_ddns_ipv4_previous",
    },
    logger
  );

  // IPv6 Address sensor (if enabled)
  if (config.ipv6_enabled) {
    publishAutoDiscovery(
      "sensor",
      "azure_ddns_ipv6",
      {
        name: "Public IPv6 Address",
        state_topic: "ddns/azure/ipv6/current",
        icon: "mdi:ip-network",
        device: deviceInfo,
        unique_id: "azure_ddns_ipv6_current",
      },
      logger
    );

    publishAutoDiscovery(
      "sensor",
      "azure_ddns_ipv6_previous",
      {
        name: "Previous IPv6 Address",
        state_topic: "ddns/azure/ipv6/previous",
        icon: "mdi:ip-network-outline",
        device: deviceInfo,
        unique_id: "azure_ddns_ipv6_previous",
      },
      logger
    );
  }

  // Last Update timestamp sensor
  publishAutoDiscovery(
    "sensor",
    "azure_ddns_last_update",
    {
      name: "Last DNS Update",
      state_topic: "ddns/azure/last_update",
      device_class: "timestamp",
      icon: "mdi:clock-outline",
      device: deviceInfo,
      unique_id: "azure_ddns_last_update",
    },
    logger
  );

  // Legacy IPv4 sensor for backward compatibility
  publishAutoDiscovery(
    "sensor",
    "azure_ddns_legacy_ip",
    {
      name: "Public IP Address (Legacy)",
      state_topic: "ddns/azure/ip/current",
      icon: "mdi:ip-network",
      device: deviceInfo,
      unique_id: "azure_ddns_legacy_ip_current",
    },
    logger
  );

  // Create sensors for each domain
  config.domains.forEach((domain) => {
    const zoneName = domain.zone.replace(/\./g, "_");
    publishAutoDiscovery(
      "sensor",
      `azure_ddns_domain_${zoneName}`,
      {
        name: `${domain.zone} DNS Status`,
        state_topic: `ddns/azure/domains/${zoneName}/status`,
        value_template: "{{ value_json.status }}",
        json_attributes_topic: `ddns/azure/domains/${zoneName}/status`,
        icon: "mdi:dns",
        device: deviceInfo,
        unique_id: `azure_ddns_domain_${zoneName}_status`,
      },
      logger
    );
  });

  logger.info("MQTT Auto Discovery setup complete");
}

/**
 * Publish service status to MQTT
 * @param {string} status - Service status (online, offline, error)
 * @param {Object} logger - Logger instance
 * @param {string} message - Optional status message
 */
function publishStatus(status, logger, message = "") {
  if (!mqttClient) {
    logger.warning("MQTT client not connected, cannot publish status");
    return;
  }

  const topic = "ddns/azure/status";
  const payload = JSON.stringify({
    status,
    message,
    timestamp: new Date().toISOString(),
  });
  mqttClient.publish(topic, payload, { retain: true });
}

/**
 * Publish IP addresses to MQTT topics
 * @param {string} ipv4 - Current IPv4 address
 * @param {string} ipv6 - Current IPv6 address
 * @param {boolean} ipv4Changed - Whether IPv4 changed
 * @param {boolean} ipv6Changed - Whether IPv6 changed
 * @param {string} previousIPv4 - Previous IPv4 address
 * @param {string} previousIPv6 - Previous IPv6 address
 * @param {Object} logger - Logger instance
 */
function publishIPs(
  ipv4,
  ipv6,
  ipv4Changed,
  ipv6Changed,
  previousIPv4,
  previousIPv6,
  logger
) {
  if (!mqttClient) {
    logger.warning("MQTT client not connected, cannot publish IPs");
    return;
  }

  // Publish current IPs
  if (ipv4) {
    mqttClient.publish("ddns/azure/ipv4/current", ipv4, { retain: true });
    if (ipv4Changed && previousIPv4) {
      mqttClient.publish("ddns/azure/ipv4/previous", previousIPv4, {
        retain: true,
      });
    }
  }

  if (ipv6) {
    mqttClient.publish("ddns/azure/ipv6/current", ipv6, { retain: true });
    if (ipv6Changed && previousIPv6) {
      mqttClient.publish("ddns/azure/ipv6/previous", previousIPv6, {
        retain: true,
      });
    }
  }

  // Maintain backward compatibility with legacy topic
  if (ipv4) {
    mqttClient.publish("ddns/azure/ip/current", ipv4, { retain: true });
    if (ipv4Changed && previousIPv4) {
      mqttClient.publish("ddns/azure/ip/previous", previousIPv4, {
        retain: true,
      });
    }
  }
}

/**
 * Publish last update timestamp to MQTT
 * @param {Date} lastUpdateTime - Last update timestamp
 * @param {Object} logger - Logger instance
 */
function publishLastUpdate(lastUpdateTime, logger) {
  if (!mqttClient) {
    logger.warning("MQTT client not connected, cannot publish last update");
    return;
  }

  if (lastUpdateTime) {
    mqttClient.publish("ddns/azure/last_update", lastUpdateTime.toISOString(), {
      retain: true,
    });
  }
}

/**
 * Publish domain status to MQTT
 * @param {string} zone - DNS zone name
 * @param {string} status - Domain status
 * @param {Object} logger - Logger instance
 * @param {string} message - Optional status message
 */
function publishDomainStatus(zone, status, logger, message = "") {
  if (!mqttClient) {
    logger.warning("MQTT client not connected, cannot publish domain status");
    return;
  }

  const topic = `ddns/azure/domains/${zone.replace(".", "_")}/status`;
  const payload = JSON.stringify({
    status,
    message,
    timestamp: new Date().toISOString(),
  });
  mqttClient.publish(topic, payload, { retain: true });
}

/**
 * Disconnect from MQTT broker
 * @param {Object} logger - Logger instance
 */
function disconnectMqtt(logger) {
  if (mqttClient) {
    publishStatus("offline", logger);
    mqttClient.end();
    mqttClient = null;
  }
}

module.exports = {
  connectMqtt,
  publishAutoDiscovery,
  setupAutoDiscovery,
  publishStatus,
  publishIPs,
  publishLastUpdate,
  publishDomainStatus,
  disconnectMqtt,
};
