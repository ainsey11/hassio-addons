const axios = require("axios");
const {
  getConfig,
  validateConfig,
  createLogger,
  connectMqtt,
  setMessageHandler,
  publishDiscovery,
  publishState,
  publishAttributes,
  HomeAssistantAPI,
} = require("./utils");
const {
  getSensors,
  getBinarySensors,
  getControls,
  createMqttDiscoveryConfig,
  createBinarySensorDiscoveryConfig,
  createControlDiscoveryConfig,
  getMqttDiscoveryTopic,
  getMqttStateTopic,
  getMqttAttributesTopic,
  getBinarySensorDiscoveryTopic,
  getBinarySensorStateTopic,
  getBinarySensorAttributesTopic,
  getControlDiscoveryTopic,
  getControlCommandTopic,
  getControlStateTopic,
} = require("./sensors");
const {
  ILertAPI,
  fetchOnCallUser,
  fetchNextShift,
  fetchCurrentShiftEnd,
  fetchOpenIncidents,
  fetchPendingAlerts,
  fetchAcceptedAlerts,
  fetchScheduleStatus,
  fetchLatestAlert,
  fetchOnCallSchedule,
  fetchIsOnCall,
  fetchHeartbeatMonitors,
} = require("./functions");

// Load configuration
const config = getConfig();
const logger = createLogger(config.logLevel);

// Initialize addon
logger.info("iLert addon started successfully");
logger.info(`Log level: ${config.logLevel}`);

// Validate configuration
const validation = validateConfig(config);
if (!validation.isValid) {
  logger.warning(validation.message);
}

// Log any configuration warnings
if (validation.warnings && validation.warnings.length > 0) {
  validation.warnings.forEach((warning) => logger.warning(warning));
}

// Global state
let mqttClient = null;
let ilertAPI = null;
let haAPI = null;
let updateInterval = null;
let syncedEventIds = new Set(); // Track synced events to avoid duplicates

// Mute duration mapping
const MUTE_DURATIONS = {
  Unmute: 0,
  "15 minutes": 15,
  "30 minutes": 30,
  "1 hour": 60,
  "2 hours": 120,
  "4 hours": 240,
};

// Connect to MQTT and publish sensors
async function setupSensors() {
  try {
    mqttClient = await connectMqtt(logger);
    const sensors = getSensors();
    const binarySensors = getBinarySensors();

    logger.info(
      `Publishing ${sensors.length} sensors and ${binarySensors.length} binary sensors via MQTT discovery...`
    );

    // Publish discovery configs for all sensors
    for (const sensor of sensors) {
      const discoveryTopic = getMqttDiscoveryTopic(sensor);
      const discoveryConfig = createMqttDiscoveryConfig(sensor);
      await publishDiscovery(
        mqttClient,
        discoveryTopic,
        discoveryConfig,
        logger
      );

      // Publish initial state
      const stateTopic = getMqttStateTopic(sensor);
      await publishState(mqttClient, stateTopic, "unknown", logger);
    }

    // Publish discovery configs for all binary sensors
    for (const sensor of binarySensors) {
      const discoveryTopic = getBinarySensorDiscoveryTopic(sensor);
      const discoveryConfig = createBinarySensorDiscoveryConfig(sensor);
      await publishDiscovery(
        mqttClient,
        discoveryTopic,
        discoveryConfig,
        logger
      );

      // Publish initial state
      const stateTopic = getBinarySensorStateTopic(sensor);
      await publishState(mqttClient, stateTopic, "OFF", logger);
    }

    logger.info("All sensors published successfully");
  } catch (error) {
    logger.error(`Failed to setup sensors: ${error.message}`);
    logger.error("Make sure MQTT addon is installed and configured");
    throw error;
  }
}

// Setup controls (buttons, selects)
async function setupControls() {
  try {
    const controls = getControls();

    logger.info(`Publishing ${controls.length} controls via MQTT discovery...`);

    // Setup message handler using the centralized handler
    setMessageHandler((topic, message) => {
      logger.debug(`MQTT message received on topic: ${topic}`);
      handleMqttCommand(topic, message);
    });
    logger.debug("MQTT message handler registered");

    // Publish discovery configs for all controls
    for (const control of controls) {
      const discoveryTopic = getControlDiscoveryTopic(control);
      const discoveryConfig = createControlDiscoveryConfig(control);
      await publishDiscovery(
        mqttClient,
        discoveryTopic,
        discoveryConfig,
        logger
      );

      // Subscribe to command topic with QoS 1
      const commandTopic = getControlCommandTopic(control);
      mqttClient.subscribe(commandTopic, { qos: 1 }, (err, granted) => {
        if (err) {
          logger.error(
            `Failed to subscribe to ${commandTopic}: ${err.message}`
          );
        } else {
          logger.info(
            `Subscribed to ${commandTopic} with QoS ${granted[0]?.qos}`
          );
        }
      });

      // Set initial state for selects
      if (control.type === "select") {
        const stateTopic = getControlStateTopic(control);
        await publishState(mqttClient, stateTopic, "Unmute", logger);
      }
    }

    logger.info("All controls published successfully");
  } catch (error) {
    logger.error(`Failed to setup controls: ${error.message}`);
    throw error;
  }
}

// Handle incoming MQTT commands
async function handleMqttCommand(topic, message) {
  const payload = message.toString();
  logger.info(`Received command on ${topic}: ${payload}`);

  try {
    if (topic.includes("ack_pending_alerts")) {
      logger.info("Acknowledging all pending alerts...");
      const result = await ilertAPI.acceptAllPendingAlerts();
      if (result.success) {
        logger.info(`Successfully acknowledged ${result.accepted} alerts`);
        // Trigger immediate update
        await updateSensorStates();
      } else {
        logger.error(`Failed to acknowledge alerts: ${result.error}`);
      }
    } else if (topic.includes("mute_notifications")) {
      const minutes = MUTE_DURATIONS[payload];
      if (minutes !== undefined) {
        logger.info(`Setting mute duration to ${minutes} minutes...`);
        const result = await ilertAPI.muteNotifications(minutes);
        if (result.success) {
          logger.info(
            `Notifications muted until ${result.mutedUntil || "unmuted"}`
          );
          // Update select state
          const control = getControls().find(
            (c) => c.id === "mute_notifications"
          );
          if (control) {
            const stateTopic = getControlStateTopic(control);
            await publishState(mqttClient, stateTopic, payload, logger);
          }
          // Trigger immediate update
          await updateSensorStates();
        } else {
          logger.error(`Failed to mute: ${result.error}`);
        }
      } else {
        logger.warning(`Unknown mute duration: ${payload}`);
      }
    }
  } catch (error) {
    logger.error(`Error handling command: ${error.message}`);
  }
}

/**
 * Update all sensor states with fresh data from iLert
 */
async function updateSensorStates() {
  if (!mqttClient || !ilertAPI) {
    logger.error("MQTT or iLert API not initialized");
    return;
  }

  try {
    logger.info("Fetching iLert data...");

    // Fetch mute status
    const muteStatus = await ilertAPI.getMuteStatus();

    // Fetch all data from iLert
    const data = {
      on_call_user: await fetchOnCallUser(ilertAPI, logger),
      next_shift: await fetchNextShift(ilertAPI, logger),
      current_shift_end: await fetchCurrentShiftEnd(ilertAPI, logger),
      open_incidents: await fetchOpenIncidents(ilertAPI, logger),
      pending_alerts: await fetchPendingAlerts(ilertAPI, logger),
      accepted_alerts: await fetchAcceptedAlerts(ilertAPI, logger),
      schedule_status: await fetchScheduleStatus(ilertAPI, logger),
      mute_status: {
        state: muteStatus.muted ? "Muted" : "Not muted",
        attributes: { muted_until: muteStatus.mutedUntil || "N/A" },
      },
      latest_alert: await fetchLatestAlert(ilertAPI, logger),
      heartbeat_monitors: await fetchHeartbeatMonitors(ilertAPI, logger),
    };

    // Binary sensor data
    const binaryData = {
      is_on_call: await fetchIsOnCall(ilertAPI, logger, config),
    };

    // Only reset mute select state to "Unmute" if mute has expired
    // Don't reset on every poll - let the select state persist
    if (!muteStatus.muted && muteStatus.wasReset) {
      const control = getControls().find((c) => c.id === "mute_notifications");
      if (control) {
        const stateTopic = getControlStateTopic(control);
        await publishState(mqttClient, stateTopic, "Unmute", logger);
      }
    }

    logger.info("iLert data fetched successfully");
    const sensors = getSensors();
    const binarySensors = getBinarySensors();

    // Update each sensor
    for (const sensor of sensors) {
      const sensorData = data[sensor.id];

      if (!sensorData) {
        logger.warning(`No data found for sensor: ${sensor.id}`);
        continue;
      }

      // Publish state
      const stateTopic = getMqttStateTopic(sensor);
      await publishState(mqttClient, stateTopic, sensorData.state, logger);

      // Publish attributes if available
      if (
        sensorData.attributes &&
        Object.keys(sensorData.attributes).length > 0
      ) {
        const attributesTopic = getMqttAttributesTopic(sensor);
        await publishAttributes(
          mqttClient,
          attributesTopic,
          sensorData.attributes,
          logger
        );
      }
    }

    // Update each binary sensor
    for (const sensor of binarySensors) {
      const sensorData = binaryData[sensor.id];

      if (!sensorData) {
        logger.warning(`No data found for binary sensor: ${sensor.id}`);
        continue;
      }

      // Publish state (ON/OFF)
      const stateTopic = getBinarySensorStateTopic(sensor);
      await publishState(mqttClient, stateTopic, sensorData.state, logger);

      // Publish attributes if available
      if (
        sensorData.attributes &&
        Object.keys(sensorData.attributes).length > 0
      ) {
        const attributesTopic = getBinarySensorAttributesTopic(sensor);
        await publishAttributes(
          mqttClient,
          attributesTopic,
          sensorData.attributes,
          logger
        );
      }
    }

    logger.info("Sensor states updated successfully");
  } catch (error) {
    logger.error(`Failed to update sensor states: ${error.message}`);
  }
}

/**
 * Sync on-call events to local calendar
 */
async function syncCalendarEvents() {
  if (!ilertAPI || !haAPI || !config.calendarEntity) {
    return;
  }

  try {
    logger.debug("Syncing on-call schedule to local calendar...");

    const scheduleData = await fetchOnCallSchedule(ilertAPI, logger);

    if (!scheduleData.events || scheduleData.events.length === 0) {
      logger.debug("No on-call events to sync");
      return;
    }

    // Get existing events from calendar to avoid duplicates
    const now = new Date();
    const futureDate = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
    const existingEvents = await haAPI.getCalendarEvents(
      config.calendarEntity,
      now.toISOString(),
      futureDate.toISOString()
    );

    // Create a set of existing event signatures (summary + start time)
    const existingSignatures = new Set(
      existingEvents.map(
        (e) => `${e.summary}|${e.start?.dateTime || e.start?.date}`
      )
    );

    let created = 0;
    let skipped = 0;

    for (const event of scheduleData.events) {
      // Create signature for this event
      const signature = `${event.summary}|${event.start}`;

      // Skip if already exists or already synced this session
      if (existingSignatures.has(signature) || syncedEventIds.has(signature)) {
        skipped++;
        continue;
      }

      // Only sync future events (or currently active)
      const eventEnd = new Date(event.end);
      if (eventEnd < now) {
        continue;
      }

      const result = await haAPI.createCalendarEvent(
        config.calendarEntity,
        event
      );
      if (result.success) {
        syncedEventIds.add(signature);
        created++;
        logger.debug(`Created calendar event: ${event.summary}`);
      } else {
        logger.warning(
          `Failed to create event: ${event.summary} - ${result.error}`
        );
      }
    }

    if (created > 0 || skipped > 0) {
      logger.info(
        `Calendar sync: ${created} created, ${skipped} already exist`
      );
    }
  } catch (error) {
    logger.error(`Failed to sync calendar: ${error.message}`);
  }
}

/**
 * Initialize the addon
 */
async function initialize() {
  try {
    // Setup MQTT and sensors
    await setupSensors();

    // Setup controls (buttons, selects)
    await setupControls();

    // Setup HA API for calendar if configured
    if (config.calendarEntity) {
      logger.info(`Calendar sync enabled: ${config.calendarEntity}`);
      haAPI = new HomeAssistantAPI(logger);
    } else {
      logger.info("Calendar sync disabled (no calendar_entity configured)");
    }

    // Initialize iLert API if configured
    if (config.apiKey && config.ilertEmail) {
      logger.info("Initializing iLert API client...");
      ilertAPI = new ILertAPI(config.apiKey, config.ilertEmail, logger);

      // Do initial data fetch
      await updateSensorStates();
      if (config.calendarEntity && haAPI) {
        await syncCalendarEvents();
      }

      // Set up polling interval (configurable, default 5 minutes)
      const pollInterval = (config.pollInterval || 300) * 1000; // Convert seconds to milliseconds
      updateInterval = setInterval(async () => {
        await updateSensorStates();
        if (config.calendarEntity && haAPI) {
          await syncCalendarEvents();
        }
      }, pollInterval);
      logger.info(
        `Data polling started (every ${pollInterval / 1000} seconds)`
      );
    } else {
      logger.warning(
        "iLert API credentials not configured - sensors will remain in unknown state"
      );
      logger.warning(
        "Please configure api_key and ilert_email in the addon settings"
      );
    }
  } catch (error) {
    logger.error(`Initialization failed: ${error.message}`);
    process.exit(1);
  }
}

// Start the addon
initialize();

// Keep the process running
setInterval(() => {
  logger.debug("Addon running...");
}, 60000); // Log every minute in debug mode

// Handle shutdown gracefully
process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down gracefully...");
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  if (mqttClient) {
    mqttClient.end();
  }
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down gracefully...");
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  if (mqttClient) {
    mqttClient.end();
  }
  process.exit(0);
});
