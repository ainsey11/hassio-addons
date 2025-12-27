# Contributing to Ainsey11 Home Assistant Addons

Thank you for your interest in contributing! 🎉

## Repository Structure

```
hassio-addons/
├── ilert/              # iLert addon
│   ├── config.yaml     # Addon configuration (version here!)
│   ├── Dockerfile
│   └── ...
├── future-addon/       # Another addon (example)
│   ├── config.yaml
│   └── ...
├── repository.yaml     # Repository metadata
├── CHANGELOG.md        # Per-addon changelogs
└── .github/workflows/  # CI/CD automation
```

Each addon is independent with its own version in `config.yaml`.

## Development Setup

### Prerequisites

- Docker
- VS Code with Remote - Containers extension
- A Home Assistant Supervisor environment (or use the devcontainer)

### Getting Started

1. Fork and clone the repository
2. Open in VS Code
3. When prompted, "Reopen in Container" to use the devcontainer
4. Use the provided VS Code tasks to build and test

### VS Code Tasks

- **Reload Addons Repository** - Refresh addon list
- **Rebuild Addon** - Rebuild a specific addon image
- **Start Addon** - Start a specific addon
- **View Addon Logs** - See addon output

## Making Changes

### Code Style

- Use ES6+ JavaScript features
- Follow existing code patterns
- Add JSDoc comments for functions
- Use meaningful variable names

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) with addon scope:

```
feat(ilert): add new heartbeat monitors sensor
fix(ilert): correct mute status caching
docs(ilert): update README with new features
chore(deps): bump dependencies
```

### Version Bumping

Update the version in `<addon>/config.yaml` following [Semantic Versioning](https://semver.org/):

- **Patch** (x.y.Z): Bug fixes, minor changes
- **Minor** (x.Y.0): New features, backward compatible
- **Major** (X.0.0): Breaking changes

Each addon has its own independent version.

### Changelog

Update `CHANGELOG.md` under the appropriate addon section.

## Pull Request Process

1. Create a branch from `main`
2. Make your changes to the relevant addon(s)
3. Update version in `<addon>/config.yaml`
4. Update `CHANGELOG.md` under the addon section
5. Test locally in the devcontainer
6. Open a Pull Request
7. Fill out the PR template
8. Wait for CI checks to pass (only changed addons are tested)
9. Request review

## Releases

Releases are automated via GitHub Actions per-addon:

- When changes are merged to `main`, the workflow detects which addons changed
- For each addon with a new version, it creates a GitHub Release (tagged `<addon>-v<version>`)
- Multi-arch Docker images are built and pushed to GitHub Container Registry
- Images are signed with Sigstore for supply chain security
- Users can choose pre-built images (fast) or local builds

### Release Tags

- `ilert-v3.3.0` - iLert addon release
- `future-addon-v1.0.0` - Another addon release

## Adding a New Addon

1. Create a new directory: `my-addon/`
2. Add required files:
   - `config.yaml` (with `name`, `version`, `slug`, `description`, `arch`)
   - `Dockerfile`
   - `README.md`
3. Optionally add `build.yaml` for custom base images
4. Add a section in `CHANGELOG.md`
5. Open a PR

## Questions?

Open an issue or discussion if you have questions!
