/**
 * Fetcher for next shift sensor
 */

async function fetchNextShift(api, logger) {
  try {
    const onCalls = await api.getOnCalls();

    if (!onCalls || onCalls.length < 2) {
      return {
        state: "unknown",
        attributes: {},
      };
    }

    // Second entry is the next shift
    const nextOnCall = onCalls[1];
    const user = await api.getUser(nextOnCall.user.id);

    return {
      state: nextOnCall.start,
      attributes: {
        user_name: user
          ? `${user.firstName} ${user.lastName}`
          : `User ${nextOnCall.user.id}`,
        shift_start: nextOnCall.start,
        shift_end: nextOnCall.end,
        escalation_level: nextOnCall.escalationLevel,
      },
    };
  } catch (error) {
    logger.error(`Error fetching next shift: ${error.message}`);
    return {
      state: "unknown",
      attributes: { error: error.message },
    };
  }
}

module.exports = { fetchNextShift };
