# PUP E-Manage / PUPSJ Records Management System

The runnable Next.js application and its setup instructions are in [`next-app/`](next-app/).

## Install or run

- **macOS:** Follow the [one-click installer instructions](next-app/README.md#macos) in `next-app/installer/mac/`.
- **Windows:** Follow the [one-click installer instructions](next-app/README.md#windows) in `next-app/installer/windows/`.
- **Development:** Follow the [developer setup guide](next-app/README.md#developer-prerequisites).

For development and manual Docker Compose setup, use one environment file: `next-app/.env`, copied from `next-app/.env.example`. See [Configure the environment](next-app/README.md#configure-the-environment) for the required settings.

## Project references

- [Agent and maintainer guide](AGENTS.md)
- [Component standards](COMPONENT_STANDARDS.md)
- [Architecture and operations documentation](docs/)
- `_SAMPLE_DATA/` — sample files and import fixtures
- `_LEGACY_PROTOTYPE/` — static prototype retained for reference

The app package manifest, dependencies, migrations, source, and deployment configuration live under `next-app/`.
