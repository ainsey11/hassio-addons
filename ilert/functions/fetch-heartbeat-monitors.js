/**
 * Fetcher for heartbeat monitors sensor
 * Returns count and health status of heartbeat monitors
 */

async function fetchHeartbeatMonitors(api, logger) {
  try {
    const monitors = await api.getHeartbeatMonitors();

    if (!monitors || monitors.length === 0) {
      return {
        state: 0,
        attributes: {
          healthy: 0,
          unhealthy: 0,
          disabled: 0,
          monitors: [],
        },
      };
    }

    // Categorize monitors by status
    // iLert heartbeat monitor states: HEALTHY, ALERTING, PAUSED, etc.
    const healthy = monitors.filter((m) => m.status === "HEALTHY").length;
    const unhealthy = monitors.filter(
      (m) => m.status === "ALERTING" || m.status === "EXPIRED"
    ).length;
    const disabled = monitors.filter(
      (m) => m.status === "PAUSED" || m.status === "DISABLED"
    ).length;

    // Create summary for attributes
    const monitorSummary = monitors.map((m) => ({
      name: m.name,
      status: m.status,
      last_ping: m.lastPingReceivedAt,
    }));

    return {
      state: monitors.length,
      attributes: {
        healthy,
        unhealthy,
        disabled,
        monitors: monitorSummary,
      },
    };
  } catch (error) {
    logger.error(`Error fetching heartbeat monitors: ${error.message}`);
    return {
      state: 0,
      attributes: {
        healthy: 0,
        unhealthy: 0,
        disabled: 0,
        monitors: [],
        error: error.message,
      },
    };
  }
}

module.exports = { fetchHeartbeatMonitors };
