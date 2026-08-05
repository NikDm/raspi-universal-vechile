# AGENTS.md

## Purpose

This repository controls a Raspberry Pi Zero 2 W vehicle from a browser. Changes should keep the vehicle safe, the Pi workload small, and setup understandable for someone building the hardware for the first time.

The long-term direction is stronger agentic support and reliable, task-oriented documentation. When behavior, wiring, setup, commands, or architecture changes, update the relevant documentation in the same change.

## Repository map

- `pi/server.py`: Python entry point; WebSocket command server on port 8080 and MJPEG HTTP server on port 8081.
- `pi/motor_controller.py`: TB6612FNG/gpiozero motor control, clamping, soft-start, and emergency stop behavior.
- `pi/light_controller.py`: GPIO light control (GPIO 25 by default).
- `pi/camera.py`: Picamera2 hardware-assisted MJPEG capture.
- `ui/src/App.tsx`: UI composition and coordination of keyboard, gamepad, WebSocket, light, and gauges.
- `ui/src/hooks/`: browser connection and input polling logic.
- `ui/src/components/`: presentational and control components.
- `ui/src/types.ts`: browser-to-Pi command types.
- `deploy.sh`: rsyncs only `pi/` to `/home/pi/vehicle` on the target.
- `README.md`: hardware, setup, operation, architecture, and troubleshooting guide.

## Working rules

1. Inspect `git status` before editing. Preserve user changes and avoid unrelated cleanup.
2. Keep changes focused and prefer the simplest implementation suitable for a Pi Zero 2 W.
3. Treat motion control as safety-critical:
   - Clamp motor commands to `[-1.0, 1.0]`.
   - Preserve immediate stop behavior and stop on last-client disconnect.
   - Do not introduce blocking work into the asyncio WebSocket path.
   - Ensure threads, GPIO devices, camera resources, and servers shut down cleanly.
4. Keep the TypeScript `Command` union and `pi/server.py` command handling synchronized. Current commands are:
   - `{"type":"move","left":number,"right":number}`
   - `{"type":"stop"}`
   - `{"type":"light","on"?:boolean}`
5. Browser controls must not capture driving shortcuts while the user is typing. Loss of focus, controller disconnect, or loss of the controlling input should result in a stop where applicable.
6. Avoid extra runtime dependencies unless they provide clear value on constrained hardware. Explain and document new dependencies.
7. Never assume Raspberry Pi GPIO or camera hardware is available on the development machine.

## Setup and common commands

UI development (Node.js 18+):

```bash
cd ui
npm install
npm run dev
```

UI verification:

```bash
cd ui
npm run build
```

There is currently no automated test or lint script. `npm run build` (strict TypeScript followed by Vite) is the minimum UI check. If tests or linting are added, expose them as package scripts and document them here and in `README.md`.

Python syntax verification that does not require Pi hardware:

```bash
python3 -m compileall -q pi
```

Run on Raspberry Pi hardware:

```bash
cd pi
python3 server.py
```

Deploy from the repository root (this writes to the configured Pi over SSH):

```bash
./deploy.sh vehicle.local
```

Do not deploy, run GPIO code, alter the Pi, or change systemd configuration unless the user explicitly asks. A local import or execution of `pi/server.py` initializes GPIO-backed controllers at module load, so use syntax checks on non-Pi machines.

## Verification expectations

- UI-only change: run `cd ui && npm run build`.
- Python-only change: run `python3 -m compileall -q pi`; test on Pi hardware when behavior depends on GPIO, camera, networking, or timing.
- Protocol/full-stack change: run both checks and manually verify connect, move, stop, disconnect safety, and video behavior on hardware when available.
- Documentation-only change: check commands, paths, GPIO pin numbers, ports, hostnames, and links against the code.
- Report checks that were run and clearly state anything that could not be tested without hardware.

Do not claim hardware verification unless it was performed on the vehicle.

## Code conventions

- Python: follow the existing typed, small-class style; use `logging`, explicit cleanup, and standard-library features where practical.
- React/TypeScript: keep strict types, functional components, and hooks; put shared wire-protocol types in `ui/src/types.ts`.
- Preserve the current lightweight design. Avoid broad refactors or a state-management framework without a demonstrated need.
- Comments should explain safety, timing, hardware, or non-obvious design constraints rather than restating code.

## Documentation conventions

- Keep `README.md` as the user-facing source of truth for assembly, wiring, setup, usage, deployment, architecture, and troubleshooting.
- Keep this file focused on instructions for coding agents and contributors.
- Use exact commands that can be copied, identify whether they run on the PC or Pi, and mention prerequisites.
- Update the project tree and protocol/wiring tables when files, messages, ports, or GPIO assignments change.
- Prefer concise sections with observable verification steps. Mark future ideas as proposals rather than existing functionality.

## Known constraints

- The Pi uses Raspberry Pi OS Bookworm, Picamera2, gpiozero, and the lgpio backend.
- Default services bind to all interfaces: WebSocket `:8080`, MJPEG `/video` on `:8081`, Vite development UI `:3000`.
- The browser communicates over unencrypted LAN HTTP/WebSocket; do not describe it as internet-safe or authenticated.
- Camera/GPIO packages may be installed through Raspberry Pi OS rather than a conventional desktop Python environment.
