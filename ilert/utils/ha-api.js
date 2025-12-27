const axios = require("axios");

/**
 * Home Assistant API client for calling services
 */
class HomeAssistantAPI {
  constructor(logger) {
    this.logger = logger;
    this.baseURL = "http://supervisor/core/api";
    this.token = process.env.SUPERVISOR_TOKEN;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
  }

  /**
   * Call a Home Assistant service
   * @param {string} domain - Service domain (e.g., 'calendar')
   * @param {string} service - Service name (e.g., 'create_event')
   * @param {Object} data - Service data
   */
  async callService(domain, service, data) {
    try {
      this.logger.debug(
        `HA API: POST /services/${domain}/${service} - ${JSON.stringify(data)}`
      );
      const response = await this.client.post(
        `/services/${domain}/${service}`,
        data
      );
      this.logger.debug(`HA API Response: Status ${response.status}`);
      return { success: true, data: response.data };
    } catch (error) {
      this.logger.error(
        `HA API Error: ${error.message} (Status: ${error.response?.status})`
      );
      if (error.response?.data) {
        this.logger.debug(
          `HA API Error details: ${JSON.stringify(error.response.data)}`
        );
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Get calendar events
   * @param {string} entityId - Calendar entity ID
   * @param {string} start - Start datetime ISO string
   * @param {string} end - End datetime ISO string
   */
  async getCalendarEvents(entityId, start, end) {
    try {
      const response = await this.client.get(
        `/calendars/${entityId}?start=${encodeURIComponent(
          start
        )}&end=${encodeURIComponent(end)}`
      );
      return response.data || [];
    } catch (error) {
      this.logger.error(`Failed to get calendar events: ${error.message}`);
      return [];
    }
  }

  /**
   * Create a calendar event
   * @param {string} entityId - Calendar entity ID
   * @param {Object} event - Event details
   */
  async createCalendarEvent(entityId, event) {
    return this.callService("calendar", "create_event", {
      entity_id: entityId,
      summary: event.summary,
      description: event.description || "",
      start_date_time: event.start,
      end_date_time: event.end,
    });
  }

  /**
   * Delete a calendar event (by creating with same UID - local calendar doesn't support delete)
   * For local calendar, we'll need to manage this differently
   */
  async deleteCalendarEvent(entityId, uid) {
    // Local calendar doesn't have a delete service, so we track events differently
    this.logger.debug(
      `Cannot delete event ${uid} - local calendar doesn't support deletion`
    );
    return { success: false, error: "Delete not supported" };
  }
}

module.exports = { HomeAssistantAPI };
