# Project TODO

This list tracks proposed work for the Raspberry Pi vehicle. Safety-critical and
reliability work should take priority over convenience features. Items that need
vehicle hardware must not be marked complete based only on desktop testing.

## Safety and control

- [ ] Add a server-side motion watchdog that stops both motors when move commands
  are no longer received within a short, documented timeout.
- [ ] Define and implement control ownership when multiple WebSocket clients are
  connected so one client cannot unexpectedly override another.
- [ ] Reject non-finite, malformed, or out-of-range command values before they
  reach the motor controller; retain motor-side clamping as a final safeguard.
- [ ] Document and test emergency-stop behavior for browser focus loss, controller
  disconnect, WebSocket loss, last-client disconnect, and server shutdown.
- [ ] Verify motor direction, soft-start, stopping distance, and GPIO cleanup on
  the assembled vehicle with its wheels safely raised before a floor test.

## Reliability and observability

- [ ] Add clear connection and command-error feedback to the browser UI.
- [ ] Keep the light and motor gauges synchronized with status messages returned
  by the Pi rather than relying only on locally requested state.
- [ ] Add a lightweight health/status endpoint suitable for troubleshooting the
  WebSocket server, camera stream, and connected-client count.
- [ ] Review camera-client shutdown behavior and confirm repeated reconnects do
  not leave threads or sockets behind on the Pi Zero 2 W.
- [ ] Allow the Python server to start and keep motor and light controls available
  when no camera is connected; log a clear camera error to the console instead of
  crashing.
- [ ] Measure CPU use, memory use, video latency, and control latency on hardware;
  record acceptable targets and the tested camera settings.

## Testing and developer workflow

- [ ] Add hardware-independent unit tests for command parsing, numeric validation,
  clamping, and disconnect-stop behavior using fake motor and light controllers.
- [ ] Add UI tests for keyboard input suppression while typing, focus-loss stop,
  gamepad disconnect stop, and command generation.
- [ ] Add documented `test` and `lint` package scripts when those tools are added.
- [ ] Add a CI workflow that runs the UI build, Python syntax checks, and all
  hardware-independent tests without importing GPIO-backed modules.
- [ ] Create a short manual hardware test checklist for connect, move, stop,
  disconnect, light, camera, and clean shutdown behavior.
- [x] Create a Windows executable that starts the UI with one click, and document
  how to build, distribute, run, and troubleshoot it.

## Documentation and setup

- [ ] Reconcile README examples with current defaults, including camera settings,
  the light controller, project tree, and Raspberry Pi username assumptions.
- [ ] Document every browser-to-Pi command and Pi-to-browser status message with
  example JSON and validation rules.
- [ ] Document configuration options for GPIO pins, ports, camera quality, frame
  size, frame rate, and motor tuning without requiring source edits.
- [ ] Provide a checked systemd service file and installation instructions that
  preserve clean shutdown and automatic motor stopping.
- [ ] Add a first-run verification path covering power isolation, common ground,
  camera detection, GPIO permissions, networking, and wheels-off-ground testing.

## Proposed enhancements

These are ideas, not existing or committed functionality.

- [ ] Consider a low-bandwidth operating mode for weaker Wi-Fi connections.
- [ ] Consider configurable steering sensitivity, deadzone, and maximum speed.
- [ ] Consider battery-voltage monitoring with a clearly documented sensor circuit.
- [ ] Consider authenticated and encrypted control before supporting operation
  outside a trusted local network.
- [ ] Consider recording diagnostic events without writing excessively to the
  Raspberry Pi SD card.

## Completion checklist

For each completed item:

- [ ] Keep `ui/src/types.ts` and `pi/server.py` synchronized for protocol changes.
- [ ] Update `README.md` and wiring documentation when behavior or setup changes.
- [ ] Run `cd ui && npm run build` for UI changes.
- [ ] Run `python3 -m compileall -q pi` for Python changes.
- [ ] State which hardware checks were performed and which remain unverified.
