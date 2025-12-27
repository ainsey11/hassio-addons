/**
 * Fetch on-call schedule events for calendar
 * Returns events formatted for Home Assistant MQTT calendar
 */
async function fetchOnCallSchedule(api, logger) {
  try {
    // Get current on-calls (this returns current and upcoming shifts)
    const onCalls = await api.getOnCalls();

    if (!onCalls || onCalls.length === 0) {
      logger.debug("No on-call data found");
      return { events: [], currentEvent: null };
    }

    const now = new Date();
    const allEvents = [];
    let currentEvent = null;

    // Process each on-call entry
    for (const onCall of onCalls) {
      // Get user name
      let userName = "Unknown";
      if (onCall.user) {
        try {
          const user = await api.getUser(onCall.user.id);
          if (user) {
            if (user.firstName) {
              userName = `${user.firstName} ${user.lastName || ""}`.trim();
            } else {
              userName = user.username || user.email || "Unknown";
            }
          }
        } catch {
          userName = onCall.user.username || onCall.user.email || "Unknown";
        }
      }

      const scheduleName = onCall.schedule?.name || "On-Call";

      const event = {
        start: onCall.start,
        end: onCall.end,
        summary: `${userName} - ${scheduleName}`,
        description: `On-call: ${userName}\nSchedule: ${scheduleName}\nEscalation Level: ${
          onCall.escalationLevel || 1
        }`,
      };

      allEvents.push(event);

      // Check if this is the current event
      const shiftStart = new Date(onCall.start);
      const shiftEnd = new Date(onCall.end);
      if (shiftStart <= now && shiftEnd > now) {
        currentEvent = event;
      }
    }

    // Sort events by start time
    allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    logger.debug(
      `Fetched ${allEvents.length} on-call events, current: ${
        currentEvent ? currentEvent.summary : "none"
      }`
    );

    return { events: allEvents, currentEvent };
  } catch (error) {
    logger.error(`Failed to fetch on-call schedule: ${error.message}`);
    return { events: [], currentEvent: null };
  }
}

module.exports = { fetchOnCallSchedule };
