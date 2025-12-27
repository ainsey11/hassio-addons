const axios = require("axios");

/**
 * Home Assistant API client for interacting with HA services
 */
class HomeAssistantAPI {
  constructor(logger) {
    this.baseURL = process.env.HASSIO_TOKEN
      ? "http://supervisor/core"
      : "http://homeassistant:8123";
    this.token = process.env.HASSIO_TOKEN;
    this.logger = logger;
  }

  /**
   * Create a calendar event in Home Assistant
   * @param {string} entityId - Calendar entity ID
   * @param {Object} event - Event details
   * @returns {boolean} Success status
   */
  async createCalendarEvent(entityId, event) {
    if (!this.token) {
      this.logger.error(
        "No Home Assistant token available for calendar integration"
      );
      return false;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/api/services/calendar/create_event`,
        {
          entity_id: entityId,
          ...event,
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Failed to create calendar event: ${error.message}`);
      return false;
    }
  }
}

module.exports = {
  HomeAssistantAPI,
};
