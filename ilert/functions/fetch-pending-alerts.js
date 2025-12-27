/**
 * Fetcher for pending alerts sensor
 */

async function fetchPendingAlerts(api, logger) {
  try {
    const count = await api.getAlertCountByState("PENDING");

    return {
      state: count,
      attributes: {
        alert_state: "PENDING",
      },
    };
  } catch (error) {
    logger.error(`Error fetching pending alerts: ${error.message}`);
    return {
      state: "unknown",
      attributes: { error: error.message },
    };
  }
}

module.exports = { fetchPendingAlerts };
