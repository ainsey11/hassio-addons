/**
 * Update DNS records for all configured domains
 * @param {Object} dnsClient - Azure DNS Management Client
 * @param {string} ipv4 - New IPv4 address
 * @param {string} ipv6 - New IPv6 address
 * @param {Object} config - Configuration object
 * @param {Object} logger - Logger instance
 * @returns {Array} Array of updated record objects
 */
async function updateAllDNSRecords(dnsClient, ipv4, ipv6, config, logger) {
  const updatedRecords = [];

  for (const domain of config.domains) {
    try {
      const domainUpdates = await updateDomainRecords(
        dnsClient,
        domain,
        ipv4,
        ipv6,
        config,
        logger
      );
      updatedRecords.push(...domainUpdates);
    } catch (error) {
      logger.error(`Failed to update domain ${domain.zone}: ${error.message}`);
      throw error;
    }
  }

  return updatedRecords;
}

/**
 * Update DNS records for a specific domain
 * @param {Object} dnsClient - Azure DNS Management Client
 * @param {Object} domain - Domain configuration object
 * @param {string} ipv4 - New IPv4 address
 * @param {string} ipv6 - New IPv6 address
 * @param {Object} config - Configuration object
 * @param {Object} logger - Logger instance
 * @returns {Array} Array of updated record objects for this domain
 */
async function updateDomainRecords(
  dnsClient,
  domain,
  ipv4,
  ipv6,
  config,
  logger
) {
  const { zone, records } = domain;
  const updatedRecords = [];

  for (const recordName of records) {
    // Update A record (IPv4) if IPv4 is available and enabled
    if (ipv4 && config.ipv4_enabled !== false) {
      try {
        logger.info(`Updating A record ${recordName}.${zone} to ${ipv4}`);

        const recordSet = {
          ttl: 300,
          aRecords: [{ ipv4Address: ipv4 }],
        };

        await dnsClient.recordSets.createOrUpdate(
          config.azure_resource_group,
          zone,
          recordName === "@" ? "@" : recordName,
          "A",
          recordSet
        );

        updatedRecords.push({
          record: `${recordName}.${zone}`,
          type: "A",
          value: ipv4,
        });

        logger.info(`Successfully updated A record ${recordName}.${zone}`);
      } catch (error) {
        logger.error(
          `Failed to update A record ${recordName}.${zone}: ${error.message}`
        );
        throw error;
      }
    }

    // Update AAAA record (IPv6) if IPv6 is available and enabled
    if (ipv6 && config.ipv6_enabled === true) {
      try {
        logger.info(`Updating AAAA record ${recordName}.${zone} to ${ipv6}`);

        const recordSet = {
          ttl: 300,
          aaaaRecords: [{ ipv6Address: ipv6 }],
        };

        await dnsClient.recordSets.createOrUpdate(
          config.azure_resource_group,
          zone,
          recordName === "@" ? "@" : recordName,
          "AAAA",
          recordSet
        );

        updatedRecords.push({
          record: `${recordName}.${zone}`,
          type: "AAAA",
          value: ipv6,
        });

        logger.info(`Successfully updated AAAA record ${recordName}.${zone}`);
      } catch (error) {
        logger.error(
          `Failed to update AAAA record ${recordName}.${zone}: ${error.message}`
        );
        throw error;
      }
    }
  }

  return updatedRecords;
}

module.exports = {
  updateAllDNSRecords,
  updateDomainRecords,
};
