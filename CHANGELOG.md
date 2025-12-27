# Changelog

All notable changes to addons in this repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and each addon follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Azure Dynamic DNS

### [1.1.0] - 2025-12-27

### Changed

- **Code refactoring for maintainability**: Restructured codebase into modular architecture
  - Split monolithic `index.js` (637 lines) into organized modules
  - Created `utils/` directory for configuration, logging, MQTT, and HA API utilities
  - Created `functions/` directory for IP detection, DNS updates, and calendar integration
  - Improved error handling and separation of concerns

### [1.0.1] - 2025-12-27

### Updated

- Updated package versions to resolve dependabot warnings

### [1.0.0] - 2025-12-27

### Added

- **Initial release** of Azure Dynamic DNS addon
- **Multi-domain support**: Update multiple A and AAAA records across different Azure DNS zones
- **IPv4 and IPv6 support**: Configurable support for both IPv4 (A records) and IPv6 (AAAA records)
- **IP change detection**: Only updates DNS when your IP actually changes
- **Configurable intervals**: Set how often to check for IP changes (default: 5 minutes)
- **MQTT integration with auto-discovery**: All sensors automatically appear in Home Assistant
  - Service status binary sensor
  - Current and previous IPv4/IPv6 address sensors
  - Last update timestamp sensor
  - Per-domain status sensors
- **Calendar integration**: Optional logging of DNS updates to Home Assistant Local Calendar
  - Detailed event descriptions showing which records changed and their new values
  - 15-minute calendar events for easy tracking
- **Multiple IP services**: Uses multiple external services for reliable IP detection
- **Comprehensive error handling**: Robust error handling with retry logic
- **Detailed logging**: Configurable log levels (debug, info, warning, error)

---

## iLert Integration

### [3.3.1] - 2025-12-27

### Added

- Warnings for missing MQTT configuration (username/password)

### Fixed

- MQTT configuration now properly loaded from environment variables

### [3.3.0] - 2025-12-27

### Added

- **Binary Sensor: On-Call Status** (`binary_sensor.ilert_is_on_call`)
  - Shows ON when you are currently on-call, OFF otherwise
  - Perfect for automations (turn on DND, change lights, send notifications)
  - Attributes: `user_name`, `shift_end`, `escalation_level`
- **Heartbeat Monitors Sensor** (`sensor.ilert_heartbeat_monitors`)
  - Shows total count of heartbeat monitors
  - Attributes: `healthy`, `unhealthy`, `disabled`, `monitors` (list with details)

## [3.2.0] - 2025-12-26

### Added

- **Calendar Sync** to Home Assistant Local Calendar
  - Configure `calendar_entity` to sync on-call shifts
  - Events include user name, schedule, and escalation level
- Documentation tab (DOCS.md) for addon configuration page

### Fixed

- Config options now properly display in Home Assistant UI

## [3.1.0] - 2025-12-26

### Added

- **Latest Alert Sensor** (`sensor.ilert_latest_alert`)
  - Shows the most recent alert title
  - Attributes: id, status, created_at, source, priority

### Fixed

- Mute status now uses local caching to avoid stale API responses
- MQTT PUT requests include proper Content-Type header

## [3.0.0] - 2025-12-26

### Added

- **Acknowledge Pending Alerts** button control
- **Mute Notifications** select control (15min, 30min, 1hr, 2hr, 4hr)
- Per-state alert sensors (Pending Alerts, Accepted Alerts)
- Mute Status sensor

### Changed

- Simplified sensor set - removed redundant sensors
- Improved MQTT message handling

### Fixed

- Alert pagination for accurate counts

## [2.0.0] - 2025-12-25

### Changed

- Switched from `/schedules` to `/on-calls` endpoint for better accuracy
- Improved error handling and logging

### Fixed

- Schedule detection issues
- API parameter format (states as array)

## [1.0.0] - 2025-12-24

### Added

- Initial release
- On-Call User sensor
- Next Shift sensor
- Current Shift End sensor
- Open Incidents sensor
- Schedule Status sensor
- MQTT discovery for Home Assistant
