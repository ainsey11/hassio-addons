/**
 * Fetch the latest alert from iLert
 * Returns the most recent alert regardless of status
 */
async function fetchLatestAlert(api, logger) {
  try {
    // Fetch most recent alert (limit 1, sorted by creation date desc)
    const alerts = await api.getAlerts({
      "start-index": 0,
      "max-results": 1,
    });

    if (!alerts || alerts.length === 0) {
      return {
        state: "No alerts",
        attributes: {
          id: null,
          status: null,
          created_at: null,
          source: null,
          priority: null,
        },
      };
    }

    const alert = alerts[0];
    const title = alert.summary || alert.alertKey || "Untitled Alert";

    logger.debug(`Latest alert: ${title} (${alert.status})`);

    return {
      state: title,
      attributes: {
        id: alert.id,
        status: alert.status,
        created_at: alert.createdAt,
        source: alert.alertSource?.name || "Unknown",
        priority: alert.priority || "UNKNOWN",
      },
    };
  } catch (error) {
    logger.error(`Failed to fetch latest alert: ${error.message}`);
    return {
      state: "Error",
      attributes: {
        id: null,
        status: null,
        created_at: null,
        source: null,
        priority: null,
      },
    };
  }
}

module.exports = { fetchLatestAlert };
