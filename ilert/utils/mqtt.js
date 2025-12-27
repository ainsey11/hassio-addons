const mqtt = require("mqtt");

// Store message handler callback and logger
let messageHandler = null;
let mqttLogger = null;

/**
 * Set message handler for incoming MQTT messages
 * @param {Function} handler - Callback function (topic, message)
 */
function setMessageHandler(handler) {
  messageHandler = handler;
}

/**
 * Connect to MQTT broker
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} MQTT client
 */
async function connectMqtt(logger) {
  mqttLogger = logger;

  return new Promise((resolve, reject) => {
    // Service configuration from Home Assistant
    const mqttHost = process.env.MQTT_HOST || "core-mosquitto";
    const mqttPort = process.env.MQTT_PORT || 1883;
    const mqttUser = process.env.MQTT_USER || process.env.MQTT_USERNAME;
    const mqttPassword = process.env.MQTT_PASSWORD || process.env.MQTT_PASS;

    logger.info(`Connecting to MQTT broker at ${mqttHost}:${mqttPort}...`);

    const options = {
      reconnectPeriod: 5000,
      clientId: `ilert_addon_${Date.now()}`,
    };

    // Only add auth if credentials are available
    if (mqttUser && mqttPassword) {
      options.username = mqttUser;
      options.password = mqttPassword;
      logger.debug("Using MQTT authentication");
    } else {
      logger.warning("No MQTT credentials found in environment");
    }

    const client = mqtt.connect(`mqtt://${mqttHost}:${mqttPort}`, options);

    // Set up message handler immediately on the client
    client.on("message", (topic, message) => {
      console.log(`[MQTT] Raw message on ${topic}: ${message.toString()}`);
      if (mqttLogger) mqttLogger.info(`MQTT raw message on ${topic}`);
      if (messageHandler) {
        messageHandler(topic, message);
      }
    });

    client.on("connect", () => {
      logger.info("Connected to MQTT broker");

      // Subscribe to command topics directly here to ensure they're on the same client
      client.subscribe(
        "homeassistant/button/ilert_ack_pending_alerts/set",
        { qos: 1 },
        (err, granted) => {
          if (err) {
            logger.error(`Failed to subscribe to ack button: ${err.message}`);
          } else {
            logger.info(
              `Subscribed to ack button topic, granted: ${JSON.stringify(
                granted
              )}`
            );
          }
        }
      );
      client.subscribe(
        "homeassistant/select/ilert_mute_notifications/set",
        { qos: 1 },
        (err, granted) => {
          if (err) {
            logger.error(`Failed to subscribe to mute select: ${err.message}`);
          } else {
            logger.info(
              `Subscribed to mute select topic, granted: ${JSON.stringify(
                granted
              )}`
            );
          }
        }
      );

      resolve(client);
    });

    client.on("error", (error) => {
      logger.error(`MQTT connection error: ${error.message}`);
      reject(error);
    });

    client.on("reconnect", () => {
      logger.debug("Reconnecting to MQTT broker...");
    });

    client.on("close", () => {
      logger.warning("MQTT connection closed");
    });
  });
}

/**
 * Publish MQTT discovery config for a sensor
 * @param {Object} client - MQTT client
 * @param {string} topic - Discovery topic
 * @param {Object} config - Discovery configuration
 * @param {Object} logger - Logger instance
 * @returns {Promise}
 */
function publishDiscovery(client, topic, config, logger) {
  return new Promise((resolve, reject) => {
    client.publish(
      topic,
      JSON.stringify(config),
      { retain: true, qos: 1 },
      (error) => {
        if (error) {
          logger.error(
            `Failed to publish discovery to ${topic}: ${error.message}`
          );
          reject(error);
        } else {
          logger.debug(`Published discovery to ${topic}`);
          resolve();
        }
      }
    );
  });
}

/**
 * Publish sensor state to MQTT
 * @param {Object} client - MQTT client
 * @param {string} topic - State topic
 * @param {*} state - State value
 * @param {Object} logger - Logger instance
 * @returns {Promise}
 */
function publishState(client, topic, state, logger) {
  return new Promise((resolve, reject) => {
    client.publish(topic, String(state), { retain: true, qos: 1 }, (error) => {
      if (error) {
        logger.error(`Failed to publish state to ${topic}: ${error.message}`);
        reject(error);
      } else {
        logger.debug(`Published state to ${topic}: ${state}`);
        resolve();
      }
    });
  });
}

/**
 * Publish sensor attributes to MQTT
 * @param {Object} client - MQTT client
 * @param {string} topic - Attributes topic
 * @param {Object} attributes - Attributes object
 * @param {Object} logger - Logger instance
 * @returns {Promise}
 */
function publishAttributes(client, topic, attributes, logger) {
  return new Promise((resolve, reject) => {
    client.publish(
      topic,
      JSON.stringify(attributes),
      { retain: true, qos: 1 },
      (error) => {
        if (error) {
          logger.error(
            `Failed to publish attributes to ${topic}: ${error.message}`
          );
          reject(error);
        } else {
          logger.debug(`Published attributes to ${topic}`);
          resolve();
        }
      }
    );
  });
}

module.exports = {
  connectMqtt,
  setMessageHandler,
  publishDiscovery,
  publishState,
  publishAttributes,
};
