# Privacy and Telemetry

This project does not add custom analytics, telemetry, crash reporting, or tracking.

The application loads Canva inside an Electron shell. Canva itself may collect usage data according to its own policies.

The app stores session data locally to maintain login state.

Version `1.4.10-dev.7` keeps user-facing runtime behavior stable, while centralizing debug logging and internal module structure for maintenance.

The centralized debug log is written locally under the Electron user-data logs directory and is intended for maintainer troubleshooting only.
