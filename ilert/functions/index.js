/**
 * Functions module exports
 */

const { ILertAPI } = require("./ilert-api");
const { fetchOnCallUser } = require("./fetch-on-call-user");
const { fetchNextShift } = require("./fetch-next-shift");
const { fetchCurrentShiftEnd } = require("./fetch-current-shift-end");
const { fetchOpenIncidents } = require("./fetch-open-incidents");
const { fetchPendingAlerts } = require("./fetch-pending-alerts");
const { fetchAcceptedAlerts } = require("./fetch-accepted-alerts");
const { fetchScheduleStatus } = require("./fetch-schedule-status");
const { fetchLatestAlert } = require("./fetch-latest-alert");
const { fetchOnCallSchedule } = require("./fetch-on-call-schedule");
const { fetchIsOnCall } = require("./fetch-is-on-call");
const { fetchHeartbeatMonitors } = require("./fetch-heartbeat-monitors");

module.exports = {
  ILertAPI,
  fetchOnCallUser,
  fetchNextShift,
  fetchCurrentShiftEnd,
  fetchOpenIncidents,
  fetchPendingAlerts,
  fetchAcceptedAlerts,
  fetchScheduleStatus,
  fetchLatestAlert,
  fetchOnCallSchedule,
  fetchIsOnCall,
  fetchHeartbeatMonitors,
};
