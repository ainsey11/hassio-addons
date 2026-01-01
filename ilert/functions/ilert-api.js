const axios = require("axios");

/**
 * iLert API client
 */
class ILertAPI {
  constructor(apiKey, email, logger) {
    this.apiKey = apiKey;
    this.email = email;
    this.logger = logger;
    this.baseURL = "https://api.ilert.com/api";

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
  }

  /**
   * Get all schedules
   */
  async getSchedules() {
    try {
      this.logger.debug(
        "API Call: GET /schedules?include=currentShift&include=nextShift"
      );
      const response = await this.client.get("/schedules", {
        params: {
          include: ["currentShift", "nextShift"],
        },
      });
      this.logger.info(
        `API Response: GET /schedules - Status ${response.status}`
      );
      this.logger.debug(
        `Schedules data: ${JSON.stringify(response.data).substring(0, 200)}...`
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch schedules: ${error.message} (Status: ${error.response?.status})`
      );
      throw error;
    }
  }

  /**
   * Get schedule shifts for a date range
   * @param {number} scheduleId - Schedule ID
   * @param {string} from - Start date ISO string
   * @param {string} until - End date ISO string
   */
  async getScheduleShifts(scheduleId, from, until) {
    try {
      this.logger.debug(
        `API Call: GET /schedules/${scheduleId}/shifts?from=${from}&until=${until}`
      );
      const response = await this.client.get(
        `/schedules/${scheduleId}/shifts`,
        {
          params: { from, until },
        }
      );
      this.logger.info(
        `API Response: GET /schedules/${scheduleId}/shifts - Status ${response.status}, Count: ${response.data.length}`
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch schedule shifts: ${error.message} (Status: ${error.response?.status})`
      );
      return [];
    }
  }

  /**
   * Get current on-call information
   */
  async getOnCalls() {
    try {
      this.logger.debug("API Call: GET /on-calls");
      const response = await this.client.get("/on-calls");
      this.logger.info(
        `API Response: GET /on-calls - Status ${response.status}, Count: ${response.data.length}`
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch on-calls: ${error.message} (Status: ${error.response?.status})`
      );
      return [];
    }
  }

  /**
   * Get on-call information with optional date range
   * @param {string} from - Start date ISO string (optional)
   * @param {string} until - End date ISO string (optional)
   */
  async getOnCallsInRange(from = null, until = null) {
    try {
      const params = {};
      if (from) params.from = from;
      if (until) params.until = until;

      const queryString =
        Object.keys(params).length > 0
          ? `?${new URLSearchParams(params).toString()}`
          : "";

      this.logger.debug(`API Call: GET /on-calls${queryString}`);
      const response = await this.client.get("/on-calls", { params });
      this.logger.info(
        `API Response: GET /on-calls${queryString} - Status ${response.status}, Count: ${response.data.length}`
      );
      return response.data;
    } catch (error) {
      this.logger.warning(
        `Failed to fetch on-calls with date range (${error.response?.status}), falling back to basic on-calls`
      );
      // Fallback to basic on-calls if date range is not supported
      return this.getOnCalls();
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId) {
    try {
      this.logger.debug(`API Call: GET /users/${userId}`);
      const response = await this.client.get(`/users/${userId}`);
      this.logger.info(
        `API Response: GET /users/${userId} - Status ${response.status}`
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch user ${userId}: ${error.message} (Status: ${error.response?.status})`
      );
      return null;
    }
  }

  /**
   * Get on-call information for a schedule
   */
  async getOnCallUsers(scheduleId) {
    try {
      this.logger.debug(`API Call: GET /schedules/${scheduleId}/on-calls`);
      const response = await this.client.get(
        `/schedules/${scheduleId}/on-calls`
      );
      this.logger.info(
        `API Response: GET /schedules/${scheduleId}/on-calls - Status ${response.status}`
      );
      this.logger.debug(
        `On-call users data: ${JSON.stringify(response.data).substring(
          0,
          200
        )}...`
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch on-call users: ${error.message} (Status: ${error.response?.status})`
      );
      throw error;
    }
  }

  /**
   * Get all incidents
   */
  async getIncidents(params = {}) {
    try {
      const response = await this.client.get("/incidents", { params });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch incidents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get open incidents
   */
  async getOpenIncidents() {
    try {
      this.logger.debug(
        "API Call: GET /incidents?states=ACCEPTED&states=PENDING"
      );
      const response = await this.client.get("/incidents", {
        params: {
          states: ["ACCEPTED", "PENDING"],
        },
      });
      this.logger.info(
        `API Response: GET /incidents - Status ${response.status}, Count: ${response.data.length}`
      );
      this.logger.debug(
        `Incidents data: ${JSON.stringify(response.data).substring(0, 200)}...`
      );
      return response.data;
    } catch (error) {
      this.logger.warning(
        `Failed to fetch open incidents (Status: ${
          error.response?.status || error.message
        })`
      );
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Get my open incidents (assigned to the configured user)
   */
  async getMyOpenIncidents() {
    try {
      const allIncidents = await this.getOpenIncidents();

      // Filter incidents assigned to or reported by the configured email
      return allIncidents.filter((incident) => {
        const assignedToMe =
          incident.assignedTo && incident.assignedTo.email === this.email;
        const reportedByMe =
          incident.reportedBy && incident.reportedBy.email === this.email;
        return assignedToMe || reportedByMe;
      });
    } catch (error) {
      this.logger.error(`Failed to fetch my incidents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser() {
    try {
      this.logger.debug("API Call: GET /users/current");
      const response = await this.client.get("/users/current");
      this.logger.info(
        `API Response: GET /users/current - Status ${response.status}`
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch current user: ${error.message} (Status: ${error.response?.status})`
      );
      throw error;
    }
  }

  /**
   * Get all alerts
   */
  async getAlerts(params = {}) {
    try {
      this.logger.debug(
        `API Call: GET /alerts with params: ${JSON.stringify(params)}`
      );
      const response = await this.client.get("/alerts", { params });
      this.logger.info(
        `API Response: GET /alerts - Status ${response.status}, Count: ${response.data.length}`
      );
      this.logger.debug(
        `Alerts data: ${JSON.stringify(response.data).substring(0, 200)}...`
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch alerts: ${error.message} (Status: ${error.response?.status})`
      );
      throw error;
    }
  }

  /**
   * Get open alerts
   */
  async getOpenAlerts() {
    try {
      this.logger.debug("API Call: GET /alerts?states=PENDING&states=ACCEPTED");
      const response = await this.client.get("/alerts", {
        params: {
          states: ["PENDING", "ACCEPTED"],
        },
      });
      this.logger.info(
        `API Response: GET /alerts - Status ${response.status}, Count: ${response.data.length}`
      );
      this.logger.debug(
        `Open alerts data: ${JSON.stringify(response.data).substring(
          0,
          200
        )}...`
      );
      return response.data;
    } catch (error) {
      this.logger.warning(
        `Failed to fetch open alerts (Status: ${
          error.response?.status || error.message
        })`
      );
      return [];
    }
  }

  /**
   * Get alerts by specific state
   */
  async getAlertsByState(state) {
    try {
      this.logger.debug(`API Call: GET /alerts?states=${state}`);
      const response = await this.client.get("/alerts", {
        params: {
          states: [state],
        },
      });
      this.logger.info(
        `API Response: GET /alerts (${state}) - Status ${response.status}, Count: ${response.data.length}`
      );
      return response.data;
    } catch (error) {
      this.logger.warning(
        `Failed to fetch ${state} alerts (Status: ${
          error.response?.status || error.message
        })`
      );
      return [];
    }
  }

  /**
   * Get count of alerts by specific state
   * Note: /alerts/count endpoint appears to ignore state filters,
   * so we fetch alerts directly with a high limit
   */
  async getAlertCountByState(state) {
    try {
      this.logger.debug(
        `API Call: GET /alerts?states=${state} (counting with pagination)`
      );

      let totalCount = 0;
      let startIndex = 0;
      const maxResults = 100; // API maximum
      let hasMore = true;

      // Paginate through all results
      while (hasMore) {
        const url = `/alerts?states=${state}&max-results=${maxResults}&start-index=${startIndex}`;
        const response = await this.client.get(url);

        const pageCount = response.data.length;
        totalCount += pageCount;

        // If we got less than max, we're done
        if (pageCount < maxResults) {
          hasMore = false;
        } else {
          startIndex += maxResults;
        }

        this.logger.debug(
          `Fetched page at index ${
            startIndex - maxResults
          }: ${pageCount} alerts`
        );
      }

      this.logger.info(
        `API Response: GET /alerts (${state}) - Total Count: ${totalCount}`
      );

      return totalCount;
    } catch (error) {
      this.logger.warning(
        `Failed to fetch ${state} alert count - URL: ${
          error.config?.url
        }, Status: ${
          error.response?.status || error.message
        }, Data: ${JSON.stringify(error.response?.data)}`
      );
      return 0;
    }
  }

  /**
   * Get my open alerts (assigned to the configured user)
   */
  async getMyOpenAlerts() {
    try {
      const allAlerts = await this.getOpenAlerts();

      // Filter alerts assigned to or reported by the configured email
      const filtered = allAlerts.filter((alert) => {
        const assignedToMe =
          alert.assignedTo && alert.assignedTo.email === this.email;
        const reportedByMe =
          alert.reportedBy && alert.reportedBy.email === this.email;
        return assignedToMe || reportedByMe;
      });

      this.logger.info(
        `Filtered ${filtered.length} alerts for user ${this.email}`
      );
      return filtered;
    } catch (error) {
      this.logger.error(`Failed to fetch my alerts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Accept (acknowledge) an alert
   */
  async acceptAlert(alertId) {
    try {
      this.logger.info(`API Call: PUT /alerts/${alertId}/accept`);
      const response = await this.client.put(`/alerts/${alertId}/accept`);
      this.logger.info(
        `API Response: PUT /alerts/${alertId}/accept - Status ${response.status}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      this.logger.error(
        `Failed to accept alert ${alertId}: ${error.message} (Status: ${error.response?.status})`
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Accept all pending alerts
   */
  async acceptAllPendingAlerts() {
    try {
      // Get all pending alerts
      const url = `/alerts?states=PENDING&max-results=100`;
      const response = await this.client.get(url);
      const pendingAlerts = response.data;

      if (pendingAlerts.length === 0) {
        this.logger.info("No pending alerts to accept");
        return { success: true, accepted: 0 };
      }

      this.logger.info(`Accepting ${pendingAlerts.length} pending alerts...`);

      let accepted = 0;
      for (const alert of pendingAlerts) {
        const result = await this.acceptAlert(alert.id);
        if (result.success) accepted++;
      }

      this.logger.info(`Accepted ${accepted}/${pendingAlerts.length} alerts`);
      return { success: true, accepted };
    } catch (error) {
      this.logger.error(`Failed to accept pending alerts: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser() {
    try {
      this.logger.debug("API Call: GET /users/current");
      const response = await this.client.get("/users/current");
      this.logger.info(
        `API Response: GET /users/current - Status ${response.status}`
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to get current user: ${error.message} (Status: ${error.response?.status})`
      );
      return null;
    }
  }

  /**
   * Mute notifications for a duration
   * @param {number} minutes - Duration in minutes (0 to unmute)
   */
  async muteNotifications(minutes) {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { success: false, error: "Could not get current user" };
      }

      let mutedUntil = null;
      if (minutes > 0) {
        mutedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      }

      this.logger.info(
        `API Call: PUT /users/${user.id} - Setting mutedUntil to ${
          mutedUntil || "null (unmute)"
        }`
      );

      const response = await this.client.put(`/users/${user.id}`, {
        ...user,
        mutedUntil,
      });

      this.logger.info(
        `API Response: PUT /users/${user.id} - Status ${response.status}`
      );

      // Store locally to avoid stale API responses
      this._lastKnownMutedUntil = mutedUntil;
      this._wasMuted = !!mutedUntil;

      return { success: true, mutedUntil };
    } catch (error) {
      this.logger.error(
        `Failed to mute notifications: ${error.message} (Status: ${error.response?.status})`
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Get mute status
   */
  async getMuteStatus() {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { muted: false, mutedUntil: null, wasReset: false };
      }

      // Use locally stored value if it's more recent (API may be stale)
      let effectiveMutedUntil = user.mutedUntil;
      if (this._lastKnownMutedUntil) {
        const localTime = new Date(this._lastKnownMutedUntil);
        const apiTime = user.mutedUntil ? new Date(user.mutedUntil) : null;
        if (!apiTime || localTime > apiTime) {
          effectiveMutedUntil = this._lastKnownMutedUntil;
        }
      }

      const mutedUntil = effectiveMutedUntil
        ? new Date(effectiveMutedUntil)
        : null;
      const muted = mutedUntil && mutedUntil > new Date();

      // Track if mute was set but has now expired (wasReset)
      const wasReset = !muted && this._wasMuted === true;
      this._wasMuted = muted;

      // Clear local cache if mute has expired
      if (!muted) {
        this._lastKnownMutedUntil = null;
      }

      this.logger.debug(
        `Mute status: muted=${muted}, mutedUntil=${
          effectiveMutedUntil || "null"
        }, wasReset=${wasReset}`
      );

      return {
        muted,
        mutedUntil: muted ? effectiveMutedUntil : null,
        wasReset,
      };
    } catch (error) {
      this.logger.error(`Failed to get mute status: ${error.message}`);
      return { muted: false, mutedUntil: null, wasReset: false };
    }
  }

  /**
   * Get all heartbeat monitors
   */
  async getHeartbeatMonitors() {
    try {
      this.logger.debug("API Call: GET /heartbeat-monitors");
      const response = await this.client.get("/heartbeat-monitors");
      this.logger.info(
        `API Response: GET /heartbeat-monitors - Status ${response.status}, Count: ${response.data.length}`
      );
      return response.data;
    } catch (error) {
      this.logger.warning(
        `Failed to fetch heartbeat monitors: ${error.message} (Status: ${error.response?.status})`
      );
      return [];
    }
  }
}

module.exports = { ILertAPI };
