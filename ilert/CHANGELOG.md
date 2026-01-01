# Changelog - iLert Integration

All notable changes to iLert Integration addon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.5.0] - 2026-01-01

### Added

- **Configurable Calendar Sync Period**: New `calendar_days_ahead` option to control how far in advance to sync calendar events
  - Default: 28 days (4 weeks)
  - Range: 1-90 days with validation
  - Allows customization based on team rotation patterns and preferences
  - Higher values may impact performance due to more API calls

### Fixed

- **Calendar Duplicate Prevention**: Fixed issue where addon restarts would create duplicate calendar entries
  - Improved event signature matching to handle datetime format differences
  - Better session state management to prevent stale tracking data
  - Events are now properly detected as existing and skipped during sync

## [3.4.2] - 2026-01-01

### Added

- **Translation Support**: Added proper UI descriptions for `calendar_personal_only` option
  - Clear explanations in Home Assistant configuration UI
  - Multilingual support ready for future translations

## [3.4.1] - 2026-01-01

### Added

- **Personal Calendar Filtering**: New `calendar_personal_only` option to show only your own shifts
  - When enabled, filters calendar events by the configured `ilert_email`
  - Useful for teams where you only want your personal on-call schedule

### Fixed

- **Calendar Event Duplicates**: Fixed duplicate calendar events being created
  - Improved duplicate detection using time-based matching
  - Standardized event titles to "Name - On-Call" format
  - Better handling of overlapping data from different API endpoints

## [3.4.0] - 2026-01-01

### Added

- **Extended Calendar Coverage**: Calendar now populates with up to 28 days of future on-call events
  - Uses schedule shifts API in addition to current on-calls for comprehensive coverage
  - Properly handles future shifts and schedule changes
  - Removes duplicate events automatically
  - Improved event detection and user name resolution

### Fixed

- **Calendar Sync**: Fixed issue where only current shift was populated in calendar
  - Now fetches future shifts from all configured schedules
  - Better handling of schedule overrides and changes
  - Enhanced duplicate event prevention

## [3.3.1] - 2025-12-27

### Added

- Warnings for missing MQTT configuration (username/password)

### Fixed

- MQTT configuration now properly loaded from environment variables

## [3.3.0] - 2025-12-27

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
