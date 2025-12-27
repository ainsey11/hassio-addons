# iLert Integration Configuration

## Required Settings

### iLert API Key

Your iLert API key (Bearer token).

- Go to iLert → Settings → API Keys to create one
- The key should start with "Bearer "

### iLert Email

Your iLert account email address used to identify your alerts and on-call status.

## MQTT Settings

### MQTT Host

MQTT broker hostname. Default: `core-mosquitto` (the Mosquitto addon).

### MQTT Port

MQTT broker port. Default: `1883`.

### MQTT Username / Password

Credentials configured in the Mosquitto addon. Create these in the Mosquitto addon configuration.

## Optional Settings

### Poll Interval

How often to fetch data from iLert (in seconds). Default: `300` (5 minutes).

### Log Level

Logging verbosity: `debug`, `info`, `warning`, `error`. Use `debug` to troubleshoot issues.

### Calendar Entity (Optional)

Sync on-call shifts to a Home Assistant Local Calendar.

**To set up calendar sync:**

1. **Create a Local Calendar in Home Assistant:**

   - Go to Settings → Devices & Services
   - Click "+ Add Integration"
   - Search for "Local Calendar" and add it
   - Give it a name like "iLert On-Call"

2. **Find your calendar entity ID:**

   - Go to Settings → Devices & Services → Entities
   - Search for "calendar"
   - Note the Entity ID (e.g., `calendar.ilert_on_call`)

3. **Enter the entity ID** in this field (e.g., `calendar.ilert_on_call`)

4. **Restart the addon**

Leave this field empty to disable calendar sync.

---

## Sensors Created

| Sensor             | Description                 |
| ------------------ | --------------------------- |
| On-Call User       | Currently on-call person    |
| Next Shift         | When the next shift starts  |
| Current Shift End  | When current shift ends     |
| Open Incidents     | Total open incidents        |
| Pending Alerts     | Unacknowledged alerts       |
| Accepted Alerts    | Acknowledged alerts         |
| Schedule Status    | On-call or off-duty         |
| Mute Status        | Notification mute status    |
| Latest Alert       | Most recent alert title     |
| Heartbeat Monitors | Count of heartbeat monitors |

## Binary Sensors Created

| Sensor         | Description                            |
| -------------- | -------------------------------------- |
| On-Call Status | ON when you are on-call, OFF otherwise |

The **On-Call Status** binary sensor is perfect for automations - trigger notifications, change lights, or enable DND mode when you go on-call.

**Binary sensor attributes:**

- `user_name`: Your display name when on-call
- `shift_end`: When your current shift ends
- `escalation_level`: Your escalation level in the schedule

**Heartbeat Monitors attributes:**

- `healthy`: Number of monitors in healthy state
- `unhealthy`: Number of alerting/expired monitors
- `disabled`: Number of paused/disabled monitors
- `monitors`: List of all monitors with name, status, and last ping time

## Controls Created

| Control                    | Description                         |
| -------------------------- | ----------------------------------- |
| Acknowledge Pending Alerts | Button to accept all pending alerts |
| Mute Notifications         | Dropdown to mute for 15min-4hrs     |
