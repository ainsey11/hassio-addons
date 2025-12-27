/**
 * Fetcher for current shift end time sensor
 */

async function fetchCurrentShiftEnd(api, logger) {
  try {
    const onCalls = await api.getOnCalls();

    if (!onCalls || onCalls.length === 0) {
      return { state: "unknown", attributes: {} };
    }

    const currentOnCall = onCalls[0];
    return {
      state: currentOnCall.end,
      attributes: {
        shift_start: currentOnCall.start,
        escalation_level: currentOnCall.escalationLevel,
      },
    };
  } catch (error) {
    logger.error(`Error fetching shift end: ${error.message}`);
    return {
      state: "unknown",
      attributes: { error: error.message },
    };
  }
}

module.exports = { fetchCurrentShiftEnd };
