const axios = require("axios");

/**
 * Get current public IP address for a specified IP version
 * @param {number} ipVersion - IP version (4 or 6)
 * @param {Object} config - Configuration object containing IP services
 * @param {Object} logger - Logger instance
 * @returns {string} Public IP address
 */
async function getCurrentPublicIP(ipVersion = 4, config, logger) {
  const services =
    ipVersion === 6
      ? config.ipv6_services || [
          "https://api64.ipify.org",
          "https://ipv6.icanhazip.com",
        ]
      : config.ip_services || [
          "https://api.ipify.org",
          "https://icanhazip.com",
        ];

  for (const service of services) {
    try {
      logger.debug(`Checking IPv${ipVersion} from ${service}`);
      const response = await axios.get(service, { timeout: 10000 });
      const ip = response.data.trim();

      // IP validation
      const isValidIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
      const isValidIPv6 =
        /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$/.test(
          ip
        );

      if (
        (ipVersion === 4 && isValidIPv4) ||
        (ipVersion === 6 && isValidIPv6)
      ) {
        logger.debug(`Got IPv${ipVersion} ${ip} from ${service}`);
        return ip;
      }
    } catch (error) {
      logger.warning(
        `Failed to get IPv${ipVersion} from ${service}: ${error.message}`
      );
    }
  }

  throw new Error(
    `Unable to determine public IPv${ipVersion} from any service`
  );
}

/**
 * Check if IP addresses have changed and return the results
 * @param {string} currentIPv4 - Current IPv4 address stored
 * @param {string} currentIPv6 - Current IPv6 address stored
 * @param {Object} config - Configuration object
 * @param {Object} logger - Logger instance
 * @returns {Object} Object containing new IPs and change flags
 */
async function checkIPChanges(currentIPv4, currentIPv6, config, logger) {
  let ipv4Changed = false;
  let ipv6Changed = false;
  let newIPv4 = null;
  let newIPv6 = null;

  // Check IPv4 if enabled
  if (config.ipv4_enabled !== false) {
    try {
      newIPv4 = await getCurrentPublicIP(4, config, logger);
      if (currentIPv4 !== newIPv4) {
        ipv4Changed = true;
        logger.info(
          `IPv4 changed from ${currentIPv4 || "unknown"} to ${newIPv4}`
        );
      } else {
        logger.debug(`IPv4 unchanged: ${newIPv4}`);
      }
    } catch (error) {
      logger.warning(`Failed to check IPv4: ${error.message}`);
    }
  }

  // Check IPv6 if enabled
  if (config.ipv6_enabled === true) {
    try {
      newIPv6 = await getCurrentPublicIP(6, config, logger);
      if (currentIPv6 !== newIPv6) {
        ipv6Changed = true;
        logger.info(
          `IPv6 changed from ${currentIPv6 || "unknown"} to ${newIPv6}`
        );
      } else {
        logger.debug(`IPv6 unchanged: ${newIPv6}`);
      }
    } catch (error) {
      logger.warning(`Failed to check IPv6: ${error.message}`);
    }
  }

  return {
    newIPv4,
    newIPv6,
    ipv4Changed,
    ipv6Changed,
  };
}

module.exports = {
  getCurrentPublicIP,
  checkIPChanges,
};
