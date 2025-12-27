/**
 * Fetcher for accepted alerts sensor
 */

async function fetchAcceptedAlerts(api, logger) {
  try {
    const count = await api.getAlertCountByState("ACCEPTED");

    return {
      state: count,
      attributes: {
        alert_state: "ACCEPTED",
      },
    };
  } catch (error) {
    logger.error(`Error fetching accepted alerts: ${error.message}`);
    return {
      state: "unknown",
      attributes: { error: error.message },
    };
  }
}

module.exports = { fetchAcceptedAlerts };
