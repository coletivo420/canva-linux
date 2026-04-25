# Privacy and Telemetry

This project does not add custom analytics, telemetry, crash reporting, or tracking.

The Canva-Linux application loads Canva inside an Electron shell. Canva itself may collect usage data according to its own policies.

The app stores session data locally to maintain login state.

Version `1.4.10-dev.8` keeps the centralized debug logging and modular source structure, while generating a single Canva preload bundle before runtime packaging so the custom eyedropper loads reliably.

The centralized debug log is written locally under the Electron user-data logs directory and is intended for maintainer troubleshooting only.

The generated preload bundle and custom eyedropper fix do not add analytics, telemetry, crash reporting, or remote logging.
