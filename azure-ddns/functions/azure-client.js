const { DnsManagementClient } = require("@azure/arm-dns");
const { ClientSecretCredential } = require("@azure/identity");

/**
 * Initialize Azure DNS Management Client
 * @param {Object} config - Configuration object containing Azure credentials
 * @returns {Object} Azure DNS Management Client instance
 */
function createAzureDNSClient(config) {
  const credential = new ClientSecretCredential(
    config.azure_tenant_id,
    config.azure_client_id,
    config.azure_client_secret
  );

  return new DnsManagementClient(credential, config.azure_subscription_id);
}

module.exports = {
  createAzureDNSClient,
};
