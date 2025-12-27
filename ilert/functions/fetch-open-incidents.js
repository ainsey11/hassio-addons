/**
 * Fetcher for open incidents count sensor
 */

async function fetchOpenIncidents(api, logger) {
  try {
    const incidents = await api.getOpenIncidents();
    const count = incidents.length;

    return {
      state: count.toString(),
      attributes: {
        incident_list: incidents.slice(0, 10).map((i) => ({
          id: i.id,
          summary: i.summary,
          status: i.status,
          created_at: i.createdAt,
        })),
      },
    };
  } catch (error) {
    logger.error(`Error fetching open incidents: ${error.message}`);
    return {
      state: "0",
      attributes: { error: error.message },
    };
  }
}

module.exports = { fetchOpenIncidents };
