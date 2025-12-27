/**
 * Fetcher for schedule status sensor
 */

async function fetchScheduleStatus(api, logger) {
  try {
    const onCalls = await api.getOnCalls();

    const hasCoverage = onCalls && onCalls.length > 0;

    return {
      state: hasCoverage ? "On-call" : "Not on-call",
      attributes: {
        on_call_count: onCalls ? onCalls.length : 0,
      },
    };
  } catch (error) {
    logger.error(`Error fetching schedule status: ${error.message}`);
    return {
      state: "error",
      attributes: { error: error.message },
    };
  }
}

module.exports = { fetchScheduleStatus };
