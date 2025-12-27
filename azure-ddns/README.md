# Azure Dynamic DNS Addon

This Home Assistant addon automatically updates Azure DNS A records when your public IP address changes, providing a dynamic DNS solution for your home lab.

## Features

- **Multi-domain support**: Update multiple A and AAAA records across different Azure DNS zones
- **IPv4 and IPv6 support**: Configurable support for both IPv4 (A records) and IPv6 (AAAA records)
- **IP change detection**: Only updates DNS when your IP actually changes
- **Configurable intervals**: Set how often to check for IP changes
- **MQTT integration**: Publishes status and IP information to MQTT for Home Assistant sensors
- **Auto-discovery**: Sensors automatically appear in Home Assistant without manual configuration
- **Calendar integration**: Optional logging of DNS updates to Home Assistant Local Calendar
- **Multiple IP services**: Uses multiple external services to determine public IP for reliability
- **Detailed logging**: Comprehensive logging with configurable log levels
- **Error handling**: Robust error handling with retry logic

## Configuration

### Azure Setup

You need to create an Azure Active Directory application and grant it permissions to manage your DNS zones. Here's how to do it using the Azure CLI:

#### 1. Install and Login to Azure CLI

**Linux/macOS:**

```bash
# Install Azure CLI (if not already installed)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login
```

**Windows (PowerShell):**

```powershell
# Install Azure CLI using winget
winget install Microsoft.AzureCLI

# Or download from: https://aka.ms/installazurecliwindows

# Login to Azure
az login
```

#### 2. Set Variables

**Linux/macOS (Bash):**

```bash
# Set your subscription ID
SUBSCRIPTION_ID="your-subscription-id-here"

# Set your DNS zone name and resource group
DNS_ZONE_NAME="nerdcave.us"
RESOURCE_GROUP_NAME="MyResourceGroup"

# Set a name for your application
APP_NAME="homeassistant-ddns"
```

**Windows (PowerShell):**

```powershell
# Set your subscription ID
$SUBSCRIPTION_ID = "your-subscription-id-here"

# Set your DNS zone name and resource group
$DNS_ZONE_NAME = "nerdcave.us"
$RESOURCE_GROUP_NAME = "MyResourceGroup"

# Set a name for your application
$APP_NAME = "homeassistant-ddns"
```

#### 3. Create the App Registration

**Linux/macOS (Bash):**

```bash
# Create the App Registration
az ad app create --display-name "$APP_NAME" --query "appId" -o tsv

# Store the App ID for later use
APP_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv)
echo "App ID (Client ID): $APP_ID"

# Create a service principal for the app
az ad sp create --id $APP_ID

# Get the Object ID of the service principal
OBJECT_ID=$(az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv)
echo "Object ID: $OBJECT_ID"
```

**Windows (PowerShell):**

```powershell
# Create the App Registration
$APP_ID = az ad app create --display-name $APP_NAME --query "appId" -o tsv
Write-Host "App ID (Client ID): $APP_ID"

# Create a service principal for the app
az ad sp create --id $APP_ID

# Get the Object ID of the service principal
$OBJECT_ID = az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv
Write-Host "Object ID: $OBJECT_ID"
```

#### 4. Create a Client Secret

**Linux/macOS (Bash):**

```bash
# Create a client secret (valid for 2 years)
CLIENT_SECRET=$(az ad app credential reset --id $APP_ID --years 2 --query "password" -o tsv)
echo "Client Secret: $CLIENT_SECRET"

# IMPORTANT: Save this secret now - you won't be able to see it again!
```

**Windows (PowerShell):**

```powershell
# Create a client secret (valid for 2 years)
$CLIENT_SECRET = az ad app credential reset --id $APP_ID --years 2 --query "password" -o tsv
Write-Host "Client Secret: $CLIENT_SECRET"

# IMPORTANT: Save this secret now - you won't be able to see it again!
```

#### 5. Grant DNS Zone Contributor Permissions

**Linux/macOS (Bash):**

```bash
# Get your DNS zone resource ID
DNS_ZONE_ID="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP_NAME/providers/Microsoft.Network/dnsZones/$DNS_ZONE_NAME"

# Assign DNS Zone Contributor role to the service principal
az role assignment create \
    --assignee $OBJECT_ID \
    --role "DNS Zone Contributor" \
    --scope $DNS_ZONE_ID

echo "Role assignment completed!"
```

**Windows (PowerShell):**

```powershell
# Get your DNS zone resource ID
$DNS_ZONE_ID = "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP_NAME/providers/Microsoft.Network/dnsZones/$DNS_ZONE_NAME"

# Assign DNS Zone Contributor role to the service principal
az role assignment create `
    --assignee $OBJECT_ID `
    --role "DNS Zone Contributor" `
    --scope $DNS_ZONE_ID

Write-Host "Role assignment completed!"
```

#### 6. Get Required Information

**Linux/macOS (Bash):**

```bash
# Get your Tenant ID
TENANT_ID=$(az account show --query "tenantId" -o tsv)

echo "=== Configuration Values ==="
echo "Tenant ID: $TENANT_ID"
echo "Client ID: $APP_ID"
echo "Client Secret: $CLIENT_SECRET"
echo "Subscription ID: $SUBSCRIPTION_ID"
echo "============================"
```

**Windows (PowerShell):**

```powershell
# Get your Tenant ID
$TENANT_ID = az account show --query "tenantId" -o tsv

Write-Host "=== Configuration Values ==="
Write-Host "Tenant ID: $TENANT_ID"
Write-Host "Client ID: $APP_ID"
Write-Host "Client Secret: $CLIENT_SECRET"
Write-Host "Subscription ID: $SUBSCRIPTION_ID"
Write-Host "============================"
```

#### Alternative: Complete Setup Scripts

**Linux/macOS (Bash) - Save as `azure-ddns-setup.sh`:**

```bash
#!/bin/bash
# azure-ddns-setup.sh

# Configuration - EDIT THESE VALUES
SUBSCRIPTION_ID="12345678-1234-1234-1234-123456789012"
DNS_ZONE_NAME="nerdcave.us"
RESOURCE_GROUP_NAME="MyResourceGroup"
APP_NAME="homeassistant-ddns"

# Login and set subscription
az login
az account set --subscription $SUBSCRIPTION_ID

# Create app and service principal
APP_ID=$(az ad app create --display-name "$APP_NAME" --query "appId" -o tsv)
az ad sp create --id $APP_ID
OBJECT_ID=$(az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv)

# Create client secret
CLIENT_SECRET=$(az ad app credential reset --id $APP_ID --years 2 --query "password" -o tsv)

# Assign permissions
DNS_ZONE_ID="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP_NAME/providers/Microsoft.Network/dnsZones/$DNS_ZONE_NAME"
az role assignment create --assignee $OBJECT_ID --role "DNS Zone Contributor" --scope $DNS_ZONE_ID

# Get tenant ID
TENANT_ID=$(az account show --query "tenantId" -o tsv)

# Output configuration
echo "=== Add these values to your Home Assistant addon configuration ==="
echo "Tenant ID: $TENANT_ID"
echo "Client ID: $APP_ID"
echo "Client Secret: $CLIENT_SECRET"
echo "Subscription ID: $SUBSCRIPTION_ID"
```

**Windows PowerShell - Save as `azure-ddns-setup.ps1`:**

```powershell
# azure-ddns-setup.ps1

# Configuration - EDIT THESE VALUES
$SUBSCRIPTION_ID = "12345678-1234-1234-1234-123456789012"
$DNS_ZONE_NAME = "nerdcave.us"
$RESOURCE_GROUP_NAME = "MyResourceGroup"
$APP_NAME = "homeassistant-ddns"

# Login and set subscription
az login
az account set --subscription $SUBSCRIPTION_ID

# Create app and service principal
$APP_ID = az ad app create --display-name $APP_NAME --query "appId" -o tsv
az ad sp create --id $APP_ID
$OBJECT_ID = az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv

# Create client secret
$CLIENT_SECRET = az ad app credential reset --id $APP_ID --years 2 --query "password" -o tsv

# Assign permissions
$DNS_ZONE_ID = "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP_NAME/providers/Microsoft.Network/dnsZones/$DNS_ZONE_NAME"
az role assignment create --assignee $OBJECT_ID --role "DNS Zone Contributor" --scope $DNS_ZONE_ID

# Get tenant ID
$TENANT_ID = az account show --query "tenantId" -o tsv

# Output configuration
Write-Host "=== Add these values to your Home Assistant addon configuration ==="
Write-Host "Tenant ID: $TENANT_ID"
Write-Host "Client ID: $APP_ID"
Write-Host "Client Secret: $CLIENT_SECRET"
Write-Host "Subscription ID: $SUBSCRIPTION_ID"
```

SUBSCRIPTION_ID="12345678-1234-1234-1234-123456789012"
DNS_ZONE_NAME="nerdcave.us"
RESOURCE_GROUP_NAME="MyResourceGroup"
APP_NAME="homeassistant-ddns"

# Login and set subscription

az login
az account set --subscription $SUBSCRIPTION_ID

# Create app and service principal

APP_ID=$(az ad app create --display-name "$APP_NAME" --query "appId" -o tsv)
az ad sp create --id $APP_ID
OBJECT_ID=$(az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv)

# Create client secret

CLIENT_SECRET=$(az ad app credential reset --id $APP_ID --years 2 --query "password" -o tsv)

# Assign permissions

DNS_ZONE_ID="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP_NAME/providers/Microsoft.Network/dnsZones/$DNS_ZONE_NAME"
az role assignment create --assignee $OBJECT_ID --role "DNS Zone Contributor" --scope $DNS_ZONE_ID

# Get tenant ID

TENANT_ID=$(az account show --query "tenantId" -o tsv)

# Output configuration

echo "=== Add these values to your Home Assistant addon configuration ==="
echo "Tenant ID: $TENANT_ID"
echo "Client ID: $APP_ID"
echo "Client Secret: $CLIENT_SECRET"
echo "Subscription ID: $SUBSCRIPTION_ID"

````

#### Troubleshooting Permission Issues

If you get authorization errors like in your log:

```bash
# Check if the role assignment exists
az role assignment list --assignee $OBJECT_ID --scope $DNS_ZONE_ID

# If missing, recreate the role assignment
az role assignment create \
    --assignee $OBJECT_ID \
    --role "DNS Zone Contributor" \
    --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP_NAME/providers/Microsoft.Network/dnsZones/$DNS_ZONE_NAME"

# Sometimes you need to wait a few minutes for permissions to propagate
````

### Addon Configuration

```yaml
azure_tenant_id: "87654321-4321-4321-4321-210987654321"
azure_client_id: "abcd1234-5678-9012-3456-789012345678"
azure_client_secret: "your-client-secret-here"
azure_subscription_id: "12345678-1234-1234-1234-123456789012"
azure_resource_group: "MyResourceGroup"
domains:
  - zone: "nerdcave.us"
    records: ["@", "home", "lab"]
  - zone: "homelab.local"
    records: ["*"]
ipv4_enabled: true
ipv6_enabled: true
check_interval: 300
ip_services:
  - "https://api.ipify.org"
  - "https://icanhazip.com"
ipv6_services:
  - "https://api64.ipify.org"
  - "https://ipv6.icanhazip.com"
mqtt_host: "core-mosquitto"
mqtt_port: 1883
mqtt_user: ""
mqtt_password: ""
calendar_entity: "calendar.azure_dns_updates"
log_level: "info"
```

### Configuration Options

| Option                  | Required | Default        | Description                                 |
| ----------------------- | -------- | -------------- | ------------------------------------------- |
| `azure_tenant_id`       | Yes      | -              | Azure AD Tenant ID                          |
| `azure_client_id`       | Yes      | -              | Azure AD Application (Client) ID            |
| `azure_client_secret`   | Yes      | -              | Azure AD Application Client Secret          |
| `azure_subscription_id` | Yes      | -              | Azure Subscription ID                       |
| `domains`               | Yes      | -              | List of DNS zones and records to update     |
| `ipv4_enabled`          | No       | true           | Enable IPv4 (A record) updates              |
| `ipv6_enabled`          | No       | false          | Enable IPv6 (AAAA record) updates           |
| `check_interval`        | No       | 300            | How often to check for IP changes (seconds) |
| `ip_services`           | No       | See above      | External services to check public IPv4      |
| `ipv6_services`         | No       | See above      | External services to check public IPv6      |
| `mqtt_host`             | No       | core-mosquitto | MQTT broker hostname                        |
| `mqtt_port`             | No       | 1883           | MQTT broker port                            |
| `mqtt_user`             | No       | -              | MQTT username                               |
| `mqtt_password`         | No       | -              | MQTT password                               |
| `calendar_entity`       | No       | -              | Home Assistant Local Calendar entity ID     |
| `log_level`             | No       | info           | Logging level (debug, info, warning, error) |

### Domain Configuration

Each domain entry supports:

- `zone`: The DNS zone name (e.g., "example.com")
- `records`: Array of record names to update:
  - `"@"` for the root domain
  - `"subdomain"` for subdomain.example.com
  - `"*"` for wildcard records

## Calendar Integration (Optional)

The addon can automatically log DNS record updates to a Home Assistant Local Calendar, providing an audit trail of all IP address changes and DNS updates.

### Setup

1. **Create a Local Calendar in Home Assistant**:

   - Go to **Settings → Devices & Services → Add Integration**
   - Search for **"Local Calendar"** and add it
   - Give it a name like "Azure DNS Updates" (this creates entity `calendar.azure_dns_updates`)

2. **Find your calendar entity ID**:

   - Go to **Settings → Devices & Services → Entities**
   - Search for "calendar"
   - Find your local calendar and note the **Entity ID** (e.g., `calendar.azure_dns_updates`)
   - Or go to **Developer Tools → States** and search for `calendar.`

3. **Configure the addon**:
   - Set **calendar_entity** to your calendar's entity ID (e.g., `calendar.azure_dns_updates`)

### What Gets Logged

When DNS records are updated, the addon automatically creates calendar events with:

- **Event Title**: "DNS Records Updated"
- **Event Description**: Detailed list of updated records:

  ```
  Azure Dynamic DNS updated the following records:

  home.example.com (A) → 203.0.113.45
  lab.example.com (A) → 203.0.113.45
  @.mydomain.com (AAAA) → 2001:db8::1

  Timestamp: 2025-12-27T20:42:14.224Z
  ```

- **Duration**: 15-minute calendar events
- **Timing**: Created immediately after successful DNS updates

### Benefits

- Complete audit trail of DNS changes
- Visual timeline in Home Assistant calendar view
- Detailed information about which records changed and their new values
- Optional - leave `calendar_entity` empty to disable

## MQTT Integration

The addon publishes the following MQTT topics:

### Status Topics

- `ddns/azure/status` - Service status (online/offline/error)
- `ddns/azure/ip/current` - Current public IPv4 address (legacy compatibility)
- `ddns/azure/ip/previous` - Previous IPv4 address (legacy compatibility)
- `ddns/azure/ipv4/current` - Current public IPv4 address
- `ddns/azure/ipv4/previous` - Previous IPv4 address
- `ddns/azure/ipv6/current` - Current public IPv6 address
- `ddns/azure/ipv6/previous` - Previous IPv6 address
- `ddns/azure/last_update` - Timestamp of last DNS update
- `ddns/azure/domains/{zone}/status` - Per-domain update status

### Home Assistant Sensors

Add these sensors to your `configuration.yaml`: if the MQTT autodiscovery isn't working or configured

```yaml
mqtt:
  sensor:
    - name: "DDNS Status"
      state_topic: "ddns/azure/status"
      value_template: "{{ value_json.status }}"
      json_attributes_topic: "ddns/azure/status"

    - name: "Public IPv4"
      state_topic: "ddns/azure/ipv4/current"

    - name: "Public IPv6"
      state_topic: "ddns/azure/ipv6/current"

    - name: "Last DDNS Update"
      state_topic: "ddns/azure/last_update"
      device_class: timestamp

  binary_sensor:
    - name: "Azure DDNS Service"
      state_topic: "ddns/azure/status"
      value_template: "{{ 'ON' if value_json.status == 'online' else 'OFF' }}"
      device_class: connectivity
```

## Troubleshooting

### Common Issues

1. **Authentication errors**: Verify your Azure credentials and permissions
2. **DNS update failures**: Check that the application has DNS Zone Contributor role
3. **IP detection failures**: Verify internet connectivity and firewall settings

### Logs

Check the addon logs for detailed error messages. Set `log_level: debug` for verbose logging.

## Support

For issues and feature requests, please use the GitHub repository issue tracker.
