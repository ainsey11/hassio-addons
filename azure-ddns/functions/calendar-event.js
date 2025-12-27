/**
 * Create a calendar event for DNS record updates
 * @param {Object} haAPI - Home Assistant API instance
 * @param {Array} updatedRecords - Array of updated DNS records
 * @param {string} ipv4 - New IPv4 address
 * @param {string} ipv6 - New IPv6 address
 * @param {string} calendarEntity - Calendar entity ID
 * @param {Object} logger - Logger instance
 * @returns {boolean} Success status
 */
async function createDNSUpdateCalendarEvent(
  haAPI,
  updatedRecords,
  ipv4,
  ipv6,
  calendarEntity,
  logger
) {
  try {
    const now = new Date();
    const eventTitle = "DNS Records Updated";

    // Create summary of what was updated
    const recordSummary = updatedRecords
      .map((record) => `${record.record} (${record.type}) → ${record.value}`)
      .join("\n");

    const description = `Azure Dynamic DNS updated the following records:\n\n${recordSummary}\n\nTimestamp: ${now.toISOString()}`;

    const event = {
      summary: eventTitle,
      description: description,
      start_date_time: now.toISOString(),
      end_date_time: new Date(now.getTime() + 15 * 60 * 1000).toISOString(), // 15 minute duration
    };

    const success = await haAPI.createCalendarEvent(calendarEntity, event);

    if (success) {
      logger.info(
        `Created calendar event for DNS update: ${updatedRecords.length} records updated`
      );
    } else {
      logger.warning("Failed to create calendar event for DNS update");
    }

    return success;
  } catch (error) {
    logger.error(`Error creating calendar event: ${error.message}`);
    return false;
  }
}

module.exports = {
  createDNSUpdateCalendarEvent,
};
