# Addon Development Tools

This directory contains scripts to help with addon development and maintenance.

## Scripts

### `create-addon.sh` - Addon Generator

Creates a new Node.js addon with complete scaffolding based on the patterns from existing addons.

#### Usage

```bash
./tools/create-addon.sh <addon-name> [description]
```

#### Examples

```bash
# Create a Plex management addon
./tools/create-addon.sh plex-manager "Manage Plex Media Server"

# Create a smart doorbell integration
./tools/create-addon.sh smart-doorbell "AI-powered doorbell integration"

# Create a simple monitoring tool
./tools/create-addon.sh system-monitor
```

#### What it creates

```
my-addon/
├── config.yaml           # Addon configuration and schema
├── Dockerfile            # Docker build instructions
├── package.json          # Node.js dependencies and scripts
├── index.js              # Main addon logic with MQTT integration
├── run.sh                # Startup script
├── build.yaml            # Multi-arch build configuration
├── README.md             # Documentation template
└── translations/
    └── en.json           # UI translations
```

#### Features included in generated addons

- **MQTT Integration**: Auto-discovery setup for Home Assistant
- **Configuration Management**: JSON schema validation
- **Error Handling**: Graceful error handling and logging
- **Multi-Architecture**: Support for all HA architectures
- **Development Ready**: ESLint configuration and npm scripts
- **Documentation**: Complete README template

#### After creation

1. `cd <addon-name>`
2. `npm install`
3. Edit `config.yaml` with your specific configuration options
4. Implement your addon logic in `index.js`
5. Update `README.md` with detailed documentation
6. Test with: `ha addons install local_<addon-name>`

### `update-deps.sh` - Dependency Updater

Updates npm dependencies for all Node.js addons in the repository.

#### Usage

```bash
./tools/update-deps.sh
```

#### What it does

- Scans for all Node.js addons (directories with both `package.json` and `config.yaml`)
- Runs `npm update` in each addon directory
- Shows outdated packages for review
- Skips non-addon directories (`.git`, `tools`, `docs`, etc.)

## Development Workflow

### Creating a new addon

```bash
# 1. Generate the addon
./tools/create-addon.sh my-awesome-addon "Does awesome things"

# 2. Develop the addon
cd my-awesome-addon
npm install
# Edit files...

# 3. Test locally
ha addons reload
ha addons install local_my-awesome-addon
ha addons start local_my-awesome-addon

# 4. Check logs
ha addons logs local_my-awesome-addon

# 5. Update documentation
# Edit README.md, update changelog, etc.
```

### Maintaining existing addons

```bash
# Update all dependencies
./tools/update-deps.sh

# Check for security issues
cd my-addon && npm audit

# Update specific packages
cd my-addon && npm update package-name
```

## Best Practices

### Naming Conventions

- Use **kebab-case** for addon names (`smart-doorbell`, `plex-manager`)
- Names should be **descriptive** and **concise**
- Avoid generic names like `helper` or `tool`
- Consider the target service/integration in the name

### Configuration Schema

- Always define a proper `schema` in `config.yaml`
- Use appropriate types (`str`, `int`, `bool`, `password`, `url`, etc.)
- Mark optional fields with `?` suffix
- Provide meaningful defaults in `options`

### MQTT Integration

- Use consistent topic patterns: `addon_name/topic`
- Always include device information for proper grouping
- Use unique IDs for all entities
- Enable auto-discovery for better UX

### Documentation

- Keep README.md updated with features and configuration
- Include examples in configuration sections
- Document all MQTT topics and sensors
- Add troubleshooting section for common issues

## Template Customization

The templates in `create-addon.sh` can be modified to match your specific needs:

- **Base Dependencies**: Modify the `dependencies` in `generate_package_json()`
- **MQTT Topics**: Update the topic patterns in `generate_index_js()`
- **Configuration**: Adjust the default options in `generate_config_yaml()`
- **Documentation**: Customize the README template in `generate_readme()`

## Integration with CI/CD

These tools work seamlessly with the existing GitHub Actions workflows:

- **CI Pipeline**: Automatically detects and tests new addons
- **Release Pipeline**: Creates releases when versions are bumped
- **Dependabot**: Updates dependencies for all addons
- **PR Template**: Includes new addon names in the checklist
