/**
 * Fetcher for current on-call user sensor
 */

async function fetchOnCallUser(api, logger) {
  try {
    const onCalls = await api.getOnCalls();

    if (!onCalls || onCalls.length === 0) {
      return {
        state: "No one on-call",
        attributes: {},
      };
    }

    // Get the first on-call entry (current user on-call)
    const currentOnCall = onCalls[0];

    // Fetch full user details
    const user = await api.getUser(currentOnCall.user.id);

    if (!user) {
      return {
        state: `User ${currentOnCall.user.id}`,
        attributes: {
          user_id: currentOnCall.user.id,
          escalation_level: currentOnCall.escalationLevel,
          shift_start: currentOnCall.start,
          shift_end: currentOnCall.end,
        },
      };
    }

    return {
      state: user.firstName
        ? `${user.firstName} ${user.lastName}`
        : user.username,
      attributes: {
        email: user.email,
        username: user.username,
        escalation_level: currentOnCall.escalationLevel,
        shift_start: currentOnCall.start,
        shift_end: currentOnCall.end,
      },
    };
  } catch (error) {
    logger.error(`Error fetching on-call user: ${error.message}`);
    return {
      state: "error",
      attributes: { error: error.message },
    };
  }
}

module.exports = { fetchOnCallUser };
