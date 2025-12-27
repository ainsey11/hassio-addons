# Azure Dynamic DNS

Automatically updates Azure DNS records when your public IP address changes, providing a dynamic DNS solution for your home lab.

## Key Features

- **Multi-domain support**: Update multiple A and AAAA records across different Azure DNS zones
- **IPv4 and IPv6 support**: Configurable support for both IPv4 (A records) and IPv6 (AAAA records)
- **IP change detection**: Only updates DNS when your IP actually changes
- **Configurable intervals**: Set how often to check for IP changes
- **MQTT integration**: Publishes status and IP information to MQTT with auto-discovery
- **Calendar integration**: Optional logging of DNS updates to Home Assistant Local Calendar
- **Multiple IP services**: Uses multiple external services to determine public IP for reliability
- **Detailed logging**: Comprehensive logging with configurable log levels
- **Error handling**: Robust error handling with retry logic

## Use Cases

- **Home Lab**: Keep your domain pointing to your home server when your ISP changes your IP
- **Remote Access**: Maintain consistent access to your Home Assistant or other services
- **Multi-domain Management**: Update multiple domains/subdomains from a single addon
- **Audit Trail**: Track all DNS changes via calendar integration and MQTT sensors

## Prerequisites

- Azure DNS zone(s) configured in your Azure subscription
- Azure Active Directory application with DNS Zone Contributor permissions
- Home Assistant with MQTT integration (optional but recommended)
- Local Calendar integration (optional, for audit logging)

## Quick Start

1. Create an Azure AD application with DNS permissions (see full documentation)
2. Install and configure the addon with your Azure credentials
3. Add your domains and records to update
4. Optionally configure MQTT and calendar integration
5. The addon will automatically detect IP changes and update DNS records

[📖 Full Documentation](../azure-ddns/README.md)
