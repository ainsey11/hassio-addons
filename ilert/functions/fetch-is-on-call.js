/**
 * Fetcher for is_on_call binary sensor
 * Returns ON/OFF based on whether the configured user is currently on-call
 */

async function fetchIsOnCall(api, logger, config) {
  try {
    const onCalls = await api.getOnCalls();

    if (!onCalls || onCalls.length === 0) {
      logger.debug("Binary sensor is_on_call: No on-calls found = OFF");
      return {
        state: "OFF",
        attributes: {},
      };
    }

    // Check if configured user is in any on-call entry
    const userEmail = config.ilertEmail;
    let matchingOnCall = null;

    for (const onCall of onCalls) {
      // Fetch full user details for this on-call
      const user = await api.getUser(onCall.user.id);
      if (user && user.email === userEmail) {
        matchingOnCall = { onCall, user };
        break;
      }
    }

    if (matchingOnCall) {
      const { onCall, user } = matchingOnCall;
      logger.debug(`Binary sensor is_on_call: ${userEmail} is ON-CALL`);
      return {
        state: "ON",
        attributes: {
          user_name: user.firstName
            ? `${user.firstName} ${user.lastName}`
            : user.username,
          shift_end: onCall.end,
          escalation_level: onCall.escalationLevel,
        },
      };
    }

    logger.debug(`Binary sensor is_on_call: ${userEmail} is NOT on-call = OFF`);
    return {
      state: "OFF",
      attributes: {},
    };
  } catch (error) {
    logger.error(`Error fetching on-call status: ${error.message}`);
    return {
      state: "OFF",
      attributes: { error: error.message },
    };
  }
}

module.exports = { fetchIsOnCall };
