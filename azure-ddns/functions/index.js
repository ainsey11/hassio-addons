const { getCurrentPublicIP, checkIPChanges } = require("./ip-detection");
const { updateAllDNSRecords, updateDomainRecords } = require("./dns-update");
const { createAzureDNSClient } = require("./azure-client");
const { createDNSUpdateCalendarEvent } = require("./calendar-event");

module.exports = {
  getCurrentPublicIP,
  checkIPChanges,
  updateAllDNSRecords,
  updateDomainRecords,
  createAzureDNSClient,
  createDNSUpdateCalendarEvent,
};
