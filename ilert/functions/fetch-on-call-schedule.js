/**
 * Fetch on-call schedule events for calendar
 * Returns events formatted for Home Assistant MQTT calendar
 * @param {Object} api - iLert API instance
 * @param {Object} logger - Logger instance
 * @param {Object} config - Configuration object
 * @param {number} daysAhead - Number of days ahead to fetch (default: 28)
 */
async function fetchOnCallSchedule(api, logger, config, daysAhead = 28) {
  try {
    const now = new Date();
    const futureDate = new Date(
      now.getTime() + daysAhead * 24 * 60 * 60 * 1000
    );

    logger.debug(
      `Fetching on-call schedule from ${now.toISOString()} to ${futureDate.toISOString()}`
    );

    const personalOnly =
      config.calendarPersonalOnly || config.calendar_personal_only;
    const userEmail = config.ilertEmail;

    // Log full config for debugging
    logger.info(
      `Config debug: ${JSON.stringify(
        {
          calendarPersonalOnly: config.calendarPersonalOnly,
          calendar_personal_only: config.calendar_personal_only,
          ilertEmail: config.ilertEmail,
          personalOnly,
          userEmail,
        },
        null,
        2
      )}`
    );

    if (personalOnly && !userEmail) {
      logger.warning(
        "Calendar personal filter enabled but no ilert_email configured"
      );
    }

    logger.info(
      `Personal calendar filter: ${personalOnly ? "enabled" : "disabled"}${
        personalOnly && userEmail ? ` for ${userEmail}` : ""
      }`
    );

    // Try to get on-calls with date range first (may fallback to basic on-calls)
    const fromISO = now.toISOString();
    const untilISO = futureDate.toISOString();
    const currentOnCalls = await api.getOnCallsInRange(fromISO, untilISO);

    // Log the raw API response for debugging
    logger.info(
      `Raw currentOnCalls API response: ${JSON.stringify(
        currentOnCalls,
        null,
        2
      )}`
    );

    // Get all schedules to fetch their shifts for extended coverage
    const schedules = await api.getSchedules();
    logger.info(
      `Raw schedules API response: ${JSON.stringify(
        schedules?.map((s) => ({ id: s.id, name: s.name })),
        null,
        2
      )}`
    );

    const allEvents = [];
    let currentEvent = null;
    let filteredCount = 0;

    // Process current on-calls first (for immediate accuracy)
    if (currentOnCalls && currentOnCalls.length > 0) {
      logger.debug(`Processing ${currentOnCalls.length} current on-calls`);
      for (const onCall of currentOnCalls) {
        logger.debug(
          `Processing on-call entry: ${JSON.stringify(
            {
              user: onCall.user,
              schedule: onCall.schedule?.name,
              start: onCall.start,
              end: onCall.end,
            },
            null,
            2
          )}`
        );

        // Filter by user email if personal calendar is enabled
        if (personalOnly && userEmail) {
          logger.debug(`Checking if user matches email: ${userEmail}`);
          const userMatches = await checkUserMatches(
            onCall.user,
            userEmail,
            api,
            logger
          );
          if (!userMatches) {
            filteredCount++;
            logger.info(
              `❌ FILTERED OUT on-call for different user: ${
                onCall.user?.email || onCall.user?.id
              } (expected: ${userEmail})`
            );
            continue; // Skip this event
          }
          logger.info(`✅ INCLUDING on-call for matching user: ${userEmail}`);
        } else {
          logger.debug(`No personal filtering - including all on-calls`);
        }

        const event = await createEventFromOnCall(onCall, api, logger);
        if (event) {
          allEvents.push(event);

          // Check if this is the current event
          const shiftStart = new Date(onCall.start);
          const shiftEnd = new Date(onCall.end);
          if (shiftStart <= now && shiftEnd > now) {
            currentEvent = event;
          }
        }
      }
    }

    // Fetch schedule shifts for extended range
    if (schedules && schedules.length > 0) {
      const fromISO = now.toISOString();
      const untilISO = futureDate.toISOString();

      for (const schedule of schedules) {
        try {
          logger.debug(
            `Fetching shifts for schedule: ${schedule.name} (ID: ${schedule.id})`
          );
          const shifts = await api.getScheduleShifts(
            schedule.id,
            fromISO,
            untilISO
          );

          if (shifts && shifts.length > 0) {
            logger.debug(
              `Processing ${shifts.length} shifts for schedule: ${schedule.name}`
            );
            for (const shift of shifts) {
              logger.debug(
                `Processing shift entry: ${JSON.stringify(
                  {
                    user: shift.user,
                    schedule: schedule.name,
                    start: shift.start,
                    end: shift.end,
                  },
                  null,
                  2
                )}`
              );

              // Filter by user email if personal calendar is enabled
              if (personalOnly && userEmail) {
                logger.debug(
                  `Checking if shift user matches email: ${userEmail}`
                );
                const userMatches = await checkUserMatches(
                  shift.user,
                  userEmail,
                  api,
                  logger
                );
                if (!userMatches) {
                  filteredCount++;
                  logger.info(
                    `❌ FILTERED OUT shift for different user: ${
                      shift.user?.email || shift.user?.id
                    } (expected: ${userEmail})`
                  );
                  continue; // Skip this event
                }
                logger.info(
                  `✅ INCLUDING shift for matching user: ${userEmail}`
                );
              } else {
                logger.debug(`No personal filtering - including all shifts`);
              }

              // Check if this event already exists (avoid duplicates from current on-calls)
              const existingEvent = allEvents.find(
                (e) =>
                  Math.abs(
                    new Date(e.start).getTime() -
                      new Date(shift.start).getTime()
                  ) < 60000 && // Within 1 minute
                  Math.abs(
                    new Date(e.end).getTime() - new Date(shift.end).getTime()
                  ) < 60000 &&
                  e.summary.includes(schedule.name)
              );

              if (!existingEvent) {
                const event = await createEventFromShift(
                  shift,
                  schedule,
                  api,
                  logger
                );
                if (event) {
                  allEvents.push(event);

                  // Check if this is the current event
                  const shiftStart = new Date(shift.start);
                  const shiftEnd = new Date(shift.end);
                  if (shiftStart <= now && shiftEnd > now) {
                    currentEvent = event;
                  }
                }
              }
            }
          }
        } catch (error) {
          logger.warning(
            `Failed to fetch shifts for schedule ${schedule.name}: ${error.message}`
          );
          // Continue with other schedules
        }
      }
    }

    // Remove duplicates and sort events by start time
    const uniqueEvents = removeDuplicateEvents(allEvents);
    uniqueEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    logger.info(
      `Fetched ${uniqueEvents.length} on-call events over ${daysAhead} days${
        personalOnly ? ` (${filteredCount} filtered out)` : ""
      }, current: ${currentEvent ? currentEvent.summary : "none"}`
    );

    return { events: uniqueEvents, currentEvent };
  } catch (error) {
    logger.error(`Failed to fetch on-call schedule: ${error.message}`);
    return { events: [], currentEvent: null };
  }
}

/**
 * Create event object from on-call data
 */
async function createEventFromOnCall(onCall, api, logger) {
  try {
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

    return {
      start: onCall.start,
      end: onCall.end,
      summary: `${userName} - On-Call`,
      description: `On-call: ${userName}\nSchedule: ${scheduleName}\nEscalation Level: ${
        onCall.escalationLevel || 1
      }`,
    };
  } catch (error) {
    logger.warning(`Failed to create event from on-call: ${error.message}`);
    return null;
  }
}

/**
 * Create event object from schedule shift data
 */
async function createEventFromShift(shift, schedule, api, logger) {
  try {
    let userName = "Unknown";
    if (shift.user) {
      try {
        const user = await api.getUser(shift.user.id);
        if (user) {
          if (user.firstName) {
            userName = `${user.firstName} ${user.lastName || ""}`.trim();
          } else {
            userName = user.username || user.email || "Unknown";
          }
        }
      } catch {
        userName =
          shift.user.username || shift.user.email || `User ${shift.user.id}`;
      }
    }

    const scheduleName = schedule.name || "On-Call";

    return {
      start: shift.start,
      end: shift.end,
      summary: `${userName} - On-Call`,
      description: `On-call: ${userName}\nSchedule: ${scheduleName}\nShift Type: ${
        shift.shiftType || "Regular"
      }`,
    };
  } catch (error) {
    logger.warning(`Failed to create event from shift: ${error.message}`);
    return null;
  }
}

/**
 * Check if a user matches the configured email
 * @param {Object} user - User object from iLert API
 * @param {string} email - Email to match against
 * @param {Object} api - iLert API instance
 * @param {Object} logger - Logger instance
 * @returns {boolean} True if user matches the email
 */
async function checkUserMatches(user, email, api, logger) {
  if (!user || !email) {
    logger.warning(
      `checkUserMatches: missing user or email - user: ${!!user}, email: ${!!email}`
    );
    return false;
  }

  try {
    logger.debug(
      `checkUserMatches: Comparing user ${JSON.stringify(
        user
      )} with email: ${email}`
    );

    // First check if we have direct email access
    if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
      logger.info(
        `✅ checkUserMatches: DIRECT EMAIL MATCH - ${user.email} === ${email}`
      );
      return true;
    } else if (user.email) {
      logger.info(
        `❌ checkUserMatches: Direct email NO MATCH - ${user.email} !== ${email}`
      );
    }

    // If we only have user ID, fetch full user details
    if (user.id && !user.email) {
      logger.debug(
        `checkUserMatches: Fetching full user details for ID: ${user.id}`
      );
      const fullUser = await api.getUser(user.id);
      logger.debug(
        `checkUserMatches: Full user details: ${JSON.stringify(
          fullUser,
          null,
          2
        )}`
      );

      if (
        fullUser &&
        fullUser.email &&
        fullUser.email.toLowerCase() === email.toLowerCase()
      ) {
        logger.info(
          `✅ checkUserMatches: FULL USER EMAIL MATCH - ${fullUser.email} === ${email}`
        );
        return true;
      } else {
        logger.info(
          `❌ checkUserMatches: Full user email NO MATCH - ${
            fullUser?.email || "no email"
          } !== ${email}`
        );
      }
    }

    logger.debug(
      `checkUserMatches: No match found for user ${
        user.id || user.email
      } with ${email}`
    );
    return false;
  } catch (error) {
    logger.error(
      `checkUserMatches: Error checking user match for ${user.id}: ${error.message}`
    );
    return false;
  }
}

/**
 * Remove duplicate events based on start time, end time, and summary
 */
function removeDuplicateEvents(events) {
  const seen = new Map();
  const uniqueEvents = [];

  for (const event of events) {
    const key = `${event.start}|${event.end}|${event.summary}`;
    if (!seen.has(key)) {
      seen.set(key, true);
      uniqueEvents.push(event);
    }
  }

  return uniqueEvents;
}

module.exports = { fetchOnCallSchedule };
