const {
  sensors,
  binarySensors,
  controls,
  calendars,
} = require("./definitions");

/**
 * Get all sensor definitions
 * @returns {Array} Array of sensor definitions
 */
function getSensors() {
  return sensors;
}

/**
 * Get all binary sensor definitions
 * @returns {Array} Array of binary sensor definitions
 */
function getBinarySensors() {
  return binarySensors;
}

/**
 * Get all control definitions
 * @returns {Array} Array of control definitions
 */
function getControls() {
  return controls;
}

/**
 * Get all calendar definitions
 * @returns {Array} Array of calendar definitions
 */
function getCalendars() {
  return calendars;
}

/**
 * Get a specific sensor by ID
 * @param {string} id - Sensor ID
 * @returns {Object|undefined} Sensor definition or undefined if not found
 */
function getSensorById(id) {
  return sensors.find((sensor) => sensor.id === id);
}

/**
 * Get sensors by type
 * @param {string} type - Sensor type (sensor, binary_sensor, etc.)
 * @returns {Array} Array of matching sensors
 */
function getSensorsByType(type) {
  return sensors.filter((sensor) => sensor.type === type);
}

/**
 * Create entity ID for a sensor
 * @param {Object} sensor - Sensor definition
 * @returns {string} Entity ID
 */
function getEntityId(sensor) {
  return `sensor.ilert_${sensor.id}`;
}

/**
 * Create MQTT discovery config for a sensor
 * @param {Object} sensor - Sensor definition
 * @returns {Object} MQTT discovery configuration
 */
function createMqttDiscoveryConfig(sensor) {
  const config = {
    name: sensor.name,
    state_topic: `homeassistant/sensor/ilert_${sensor.id}/state`,
    unique_id: `ilert_${sensor.id}`,
    object_id: `ilert_${sensor.id}`,
    icon: sensor.icon || "mdi:information",
    device: {
      identifiers: ["ilert_addon"],
      name: "iLert Integration",
      manufacturer: "iLert",
      model: "Home Assistant Addon",
    },
  };

  if (sensor.unit_of_measurement) {
    config.unit_of_measurement = sensor.unit_of_measurement;
  }
  if (sensor.device_class) {
    config.device_class = sensor.device_class;
  }
  if (sensor.attributes && sensor.attributes.length > 0) {
    config.json_attributes_topic = `homeassistant/sensor/ilert_${sensor.id}/attributes`;
  }

  return config;
}

/**
 * Create MQTT discovery config for a binary sensor
 * @param {Object} sensor - Binary sensor definition
 * @returns {Object} MQTT discovery configuration
 */
function createBinarySensorDiscoveryConfig(sensor) {
  const config = {
    name: sensor.name,
    state_topic: `homeassistant/binary_sensor/ilert_${sensor.id}/state`,
    unique_id: `ilert_${sensor.id}`,
    object_id: `ilert_${sensor.id}`,
    icon: sensor.icon || "mdi:information",
    payload_on: "ON",
    payload_off: "OFF",
    device: {
      identifiers: ["ilert_addon"],
      name: "iLert Integration",
      manufacturer: "iLert",
      model: "Home Assistant Addon",
    },
  };

  if (sensor.device_class) {
    config.device_class = sensor.device_class;
  }
  if (sensor.attributes && sensor.attributes.length > 0) {
    config.json_attributes_topic = `homeassistant/binary_sensor/ilert_${sensor.id}/attributes`;
  }

  return config;
}

/**
 * Get MQTT discovery topic for a binary sensor
 * @param {Object} sensor - Binary sensor definition
 * @returns {string} MQTT discovery topic
 */
function getBinarySensorDiscoveryTopic(sensor) {
  return `homeassistant/binary_sensor/ilert_${sensor.id}/config`;
}

/**
 * Get MQTT state topic for a binary sensor
 * @param {Object} sensor - Binary sensor definition
 * @returns {string} MQTT state topic
 */
function getBinarySensorStateTopic(sensor) {
  return `homeassistant/binary_sensor/ilert_${sensor.id}/state`;
}

/**
 * Get MQTT attributes topic for a binary sensor
 * @param {Object} sensor - Binary sensor definition
 * @returns {string} MQTT attributes topic
 */
function getBinarySensorAttributesTopic(sensor) {
  return `homeassistant/binary_sensor/ilert_${sensor.id}/attributes`;
}

/**
 * Get MQTT discovery topic for a sensor
 * @param {Object} sensor - Sensor definition
 * @returns {string} MQTT discovery topic
 */
function getMqttDiscoveryTopic(sensor) {
  return `homeassistant/sensor/ilert_${sensor.id}/config`;
}

/**
 * Get MQTT state topic for a sensor
 * @param {Object} sensor - Sensor definition
 * @returns {string} MQTT state topic
 */
function getMqttStateTopic(sensor) {
  return `homeassistant/sensor/ilert_${sensor.id}/state`;
}

/**
 * Get MQTT attributes topic for a sensor
 * @param {Object} sensor - Sensor definition
 * @returns {string} MQTT attributes topic
 */
function getMqttAttributesTopic(sensor) {
  return `homeassistant/sensor/ilert_${sensor.id}/attributes`;
}

/**
 * Create MQTT discovery config for a control (button/select)
 * @param {Object} control - Control definition
 * @returns {Object} MQTT discovery configuration
 */
function createControlDiscoveryConfig(control) {
  const config = {
    name: control.name,
    unique_id: `ilert_${control.id}`,
    object_id: `ilert_${control.id}`,
    icon: control.icon || "mdi:button-pointer",
    device: {
      identifiers: ["ilert_addon"],
      name: "iLert Integration",
      manufacturer: "iLert",
      model: "Home Assistant Addon",
    },
  };

  if (control.type === "button") {
    config.command_topic = `homeassistant/button/ilert_${control.id}/set`;
    config.payload_press = "PRESS";
    if (control.device_class) {
      config.device_class = control.device_class;
    }
  } else if (control.type === "select") {
    config.command_topic = `homeassistant/select/ilert_${control.id}/set`;
    config.state_topic = `homeassistant/select/ilert_${control.id}/state`;
    config.options = control.options;
    config.optimistic = false;
  }

  return config;
}

/**
 * Get MQTT discovery topic for a control
 * @param {Object} control - Control definition
 * @returns {string} MQTT discovery topic
 */
function getControlDiscoveryTopic(control) {
  return `homeassistant/${control.type}/ilert_${control.id}/config`;
}

/**
 * Get MQTT command topic for a control
 * @param {Object} control - Control definition
 * @returns {string} MQTT command topic
 */
function getControlCommandTopic(control) {
  return `homeassistant/${control.type}/ilert_${control.id}/set`;
}

/**
 * Get MQTT state topic for a control (selects only)
 * @param {Object} control - Control definition
 * @returns {string} MQTT state topic
 */
function getControlStateTopic(control) {
  return `homeassistant/${control.type}/ilert_${control.id}/state`;
}

/**
 * Create MQTT discovery config for a calendar
 * @param {Object} calendar - Calendar definition
 * @returns {Object} MQTT discovery configuration
 */
function createCalendarDiscoveryConfig(calendar) {
  return {
    name: calendar.name,
    unique_id: `ilert_${calendar.id}`,
    object_id: `ilert_${calendar.id}`,
    icon: calendar.icon || "mdi:calendar",
    state_topic: `homeassistant/calendar/ilert_${calendar.id}/state`,
    device: {
      identifiers: ["ilert_addon"],
      name: "iLert Integration",
      manufacturer: "iLert",
      model: "Home Assistant Addon",
    },
  };
}

/**
 * Get MQTT discovery topic for a calendar
 * @param {Object} calendar - Calendar definition
 * @returns {string} MQTT discovery topic
 */
function getCalendarDiscoveryTopic(calendar) {
  return `homeassistant/calendar/ilert_${calendar.id}/config`;
}

/**
 * Get MQTT state topic for a calendar
 * @param {Object} calendar - Calendar definition
 * @returns {string} MQTT state topic
 */
function getCalendarStateTopic(calendar) {
  return `homeassistant/calendar/ilert_${calendar.id}/state`;
}

module.exports = {
  getSensors,
  getBinarySensors,
  getControls,
  getCalendars,
  getSensorById,
  getSensorsByType,
  getEntityId,
  createMqttDiscoveryConfig,
  createBinarySensorDiscoveryConfig,
  createControlDiscoveryConfig,
  createCalendarDiscoveryConfig,
  getMqttDiscoveryTopic,
  getMqttStateTopic,
  getMqttAttributesTopic,
  getBinarySensorDiscoveryTopic,
  getBinarySensorStateTopic,
  getBinarySensorAttributesTopic,
  getControlDiscoveryTopic,
  getControlCommandTopic,
  getControlStateTopic,
  getCalendarDiscoveryTopic,
  getCalendarStateTopic,
};
