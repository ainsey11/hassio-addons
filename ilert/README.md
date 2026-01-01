# iLert Home Assistant Addon

Home Assistant addon that integrates iLert on-call schedules, alerts and incidents as entities.

## Configuration

### iLert API

- **api_key** (required): Your iLert API key (Bearer token)
- **ilert_email** (required): Your iLert account email
- **poll_interval** (optional): Data refresh interval in seconds - default: 300 (5 minutes)
- **log_level** (optional): Logging level (debug, info, warning, error) - default: info
- **calendar_entity** (optional): Local calendar entity ID for sync - e.g., `calendar.ilert_on_call`
- **calendar_personal_only** (optional): Only sync your own shifts - default: false
- **calendar_days_ahead** (optional): Days ahead to sync - default: 28, range: 1-90

### Calendar Sync (Optional)

The addon can sync your on-call schedule to a Home Assistant Local Calendar, allowing you to see your shifts in the HA calendar view.

#### Setup

1. **Create a Local Calendar in Home Assistant**:

   - Go to **Settings → Devices & Services**
   - Click **+ Add Integration**
   - Search for **"Local Calendar"** and add it
   - Give it a name like "iLert On-Call" (this creates entity `calendar.ilert_on_call`)

2. **Find your calendar entity ID**:

   - Go to **Settings → Devices & Services → Entities**
   - Search for "calendar"
   - Find your local calendar and note the **Entity ID** (e.g., `calendar.ilert_on_call`)
   - Or go to **Developer Tools → States** and search for `calendar.`

3. **Configure the addon**:
   - Set **calendar_entity** to your calendar's entity ID (e.g., `calendar.ilert_on_call`)
   - Optional: Set **calendar_personal_only** to `true` to only sync your own shifts
   - Optional: Set **calendar_days_ahead** to control how far in advance to sync (default: 28 days, range: 1-90)
   - Restart the addon

#### How it works

- The addon syncs on-call events from iLert to your local calendar
- Events are created with the on-call user's name and schedule info
- Duplicate events are automatically skipped
- Events sync on each poll interval

#### Configuration

- **calendar_entity** (optional): The entity ID of your Local Calendar (e.g., `calendar.ilert_on_call`). Leave empty to disable calendar sync.

### MQTT Configuration

This addon uses MQTT to publish sensor data to Home Assistant. You need to configure the MQTT connection.

#### Prerequisites

1. **Install Mosquitto Broker** (if not already installed):

   - Go to Settings → Add-ons → Add-on Store
   - Search for "Mosquitto broker" and install it
   - Start the Mosquitto broker addon

2. **Create MQTT User**:

   - Open Mosquitto addon configuration
   - Add a login user:
     ```yaml
     logins:
       - username: homeassistant
         password: YOUR_SECURE_PASSWORD
     ```
   - Click Save
   - Restart the Mosquitto broker addon

3. **Configure this addon**:
   - **mqtt_host**: `core-mosquitto` (default, usually no change needed)
   - **mqtt_port**: `1883` (default, usually no change needed)
   - **mqtt_user**: `homeassistant` (or whatever username you created above)
   - **mqtt_password**: The password you set in Mosquitto configuration

#### Why MQTT?

MQTT is the standard way for Home Assistant addons to create sensors and entities. It provides:

- Automatic entity discovery (sensors appear in HA without manual configuration)
- Real-time state updates
- Attributes and metadata support
- Integration with HA's device registry
- Lightweight and reliable communication

#### Security

Your MQTT password is stored securely using Home Assistant's credential management system.

## Usage

1. Install and start Mosquitto broker addon
2. Create MQTT credentials in Mosquitto configuration
3. Install this addon
4. Configure your iLert API key and MQTT credentials
5. Start the addon
6. Sensors will automatically appear in Home Assistant

## Sensors

The addon creates the following sensors:

- **On-Call User**: Currently on-call person
- **Next Shift**: When the next shift starts
- **Current Shift End**: When current shift ends
- **Open Incidents**: Total number of open incidents
- **Pending Alerts**: Number of pending (unacknowledged) alerts
- **Accepted Alerts**: Number of accepted alerts
- **Schedule Status**: Whether you are currently on-call
- **Mute Status**: Whether notifications are muted
- **Latest Alert**: Title and details of the most recent alert
- **Heartbeat Monitors**: Count and health of your heartbeat monitors

## Binary Sensors

- **On-Call Status**: ON when you are currently on-call, OFF otherwise
  - Great for automations (turn on DND, change lights, send notifications when you go on-call)
  - Attributes include: user_name, shift_end, escalation_level

## Controls

The addon creates interactive controls:

- **Acknowledge Pending Alerts** (button): Accept all pending alerts with one click
- **Mute Notifications** (select): Mute your notifications for 15 min, 30 min, 1 hour, 2 hours, or 4 hours

### Logging

The addon includes comprehensive logging:

- **INFO level**: API response codes and sensor updates
- **DEBUG level**: Full API request/response details (first 200 chars)
- Set `log_level: debug` to troubleshoot API issues
