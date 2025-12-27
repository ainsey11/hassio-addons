/**
 * Sensor definitions for iLert data exposed to Home Assistant
 * Each sensor represents a piece of iLert information
 */

const sensors = [
  {
    id: "on_call_user",
    name: "Current On-Call User",
    type: "sensor",
    icon: "mdi:account-clock",
    attributes: [
      "email",
      "username",
      "escalation_level",
      "shift_start",
      "shift_end",
    ],
  },
  {
    id: "next_shift",
    name: "Next On-Call Shift",
    type: "sensor",
    device_class: "timestamp",
    icon: "mdi:calendar-clock",
    attributes: ["user_name", "shift_start", "shift_end", "escalation_level"],
  },
  {
    id: "current_shift_end",
    name: "Current Shift End Time",
    type: "sensor",
    device_class: "timestamp",
    icon: "mdi:clock-end",
    attributes: ["shift_start", "escalation_level"],
  },
  {
    id: "open_incidents",
    name: "Open Incidents",
    type: "sensor",
    unit_of_measurement: "incidents",
    icon: "mdi:alert-circle",
    attributes: ["incident_list"],
  },
  {
    id: "pending_alerts",
    name: "Pending Alerts",
    type: "sensor",
    unit_of_measurement: "alerts",
    icon: "mdi:bell-outline",
  },
  {
    id: "accepted_alerts",
    name: "Accepted Alerts",
    type: "sensor",
    unit_of_measurement: "alerts",
    icon: "mdi:bell-check",
  },
  {
    id: "schedule_status",
    name: "Schedule Status",
    type: "sensor",
    icon: "mdi:calendar-check",
    attributes: ["on_call_count"],
  },
  {
    id: "mute_status",
    name: "Mute Status",
    type: "sensor",
    icon: "mdi:bell-off-outline",
    attributes: ["muted_until"],
  },
  {
    id: "latest_alert",
    name: "Latest Alert",
    type: "sensor",
    icon: "mdi:bell-alert",
    attributes: ["id", "status", "created_at", "source", "priority"],
  },
  {
    id: "heartbeat_monitors",
    name: "Heartbeat Monitors",
    type: "sensor",
    unit_of_measurement: "monitors",
    icon: "mdi:heart-pulse",
    attributes: ["healthy", "unhealthy", "disabled", "monitors"],
  },
];

// Binary sensors
const binarySensors = [
  {
    id: "is_on_call",
    name: "On-Call Status",
    type: "binary_sensor",
    device_class: "occupancy",
    icon: "mdi:phone-in-talk",
    attributes: ["user_name", "shift_end", "escalation_level"],
  },
];

// Controls (buttons and selects)
const controls = [
  {
    id: "ack_pending_alerts",
    name: "Acknowledge Pending Alerts",
    type: "button",
    icon: "mdi:bell-check",
    device_class: "identify",
  },
  {
    id: "mute_notifications",
    name: "Mute Notifications",
    type: "select",
    icon: "mdi:bell-sleep",
    options: [
      "Unmute",
      "15 minutes",
      "30 minutes",
      "1 hour",
      "2 hours",
      "4 hours",
    ],
  },
];

// Calendars
const calendars = [
  {
    id: "on_call_schedule",
    name: "On-Call Schedule",
    icon: "mdi:calendar-account",
  },
];

module.exports = { sensors, binarySensors, controls, calendars };
