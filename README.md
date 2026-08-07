# RasPi Universal Vehicle

A Raspberry Pi Zero 2 W-powered vehicle with dual motor control and live camera
feed, controlled from a PC browser or the Windows desktop application.

> [!WARNING]
> The Windows application uses Electron 22 to retain Windows 7 compatibility.
> Electron 22 and its embedded Chromium version are end-of-life and receive no
> security fixes. The Pi protocol is also unencrypted and unauthenticated. Use
> this controller only with a vehicle on a trusted local network; it is not safe
> to expose to the internet.

## Hardware

### Bill of Materials

| Component | Recommended | Est. Price |
|---|---|---|
| SBC | Raspberry Pi Zero 2 W | ~$20 |
| Motor Driver | TB6612FNG breakout | ~$5 |
| Camera | RPi Camera Module v3 Wide | ~$35 |
| Camera cable | Pi Zero camera ribbon | ~$3 |
| Motors | 2x TT/BO gear motors (3-6V) | ~$5 |
| Chassis | 2WD robot car kit | ~$12 |
| Motor power | 4x AA NiMH or 2S LiPo | ~$10 |
| Pi power | 5V/3A USB power bank | ~$10 |
| GPIO header | Hammer header for Zero | ~$2 |

### GPIO Wiring (TB6612FNG)

```
TB6612FNG Pin    →  Pi Zero 2 W Pin
───────────────────────────────────
VMOT (motor +)   →  Battery positive (4xAA or 2S LiPo)
GND (motor)      →  Battery negative
VCC (logic)      →  3V3 (pin 1)
GND (logic)      →  GND (pin 6)
STBY             →  3V3 (pin 1) — enable
PWMA (left PWM)  →  GPIO 17 (pin 11)
AIN1 (left fwd)  →  GPIO 18 (pin 12)
AIN2 (left rev)  →  GPIO 27 (pin 13)
PWMB (right PWM) →  GPIO 22 (pin 15)
BIN1 (right fwd) →  GPIO 23 (pin 16)
BIN2 (right rev) →  GPIO 24 (pin 18)
AO1 / AO2        →  Left motor
BO1 / BO2        →  Right motor
```

Note: Default GPIO pins can be changed in `pi/motor_controller.py`.

For the complete motor, power, camera, and light diagram, see
[Complete hardware wiring](docs/WIRING.md).

## Pi Setup

### 1. Install Raspberry Pi OS

1. Flash Raspberry Pi OS Bookworm (64-bit) to an SD card using [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. In the imager, configure:
   - Hostname: `vehicle`
   - Enable SSH with password authentication
   - Set WiFi SSID/password
   - Set a user password for `user: pi, pwd: pi`

### 2. Enable Camera and SPI

On Raspberry Pi OS Bookworm the CSI camera is auto-detected by `libcamera` — there is no longer a Camera entry in `raspi-config`, and the legacy GPU memory split is no longer used. Verify the camera is visible:

```bash
rpicam-hello --list-cameras
```

You should see your sensor listed (e.g. `ov5647`, `imx219`, `imx708`). If nothing is listed, edit `/boot/firmware/config.txt` and add under `[all]`:

```
dtoverlay=ov5647   # or imx219 / imx477 / imx708 to match your module
```

Then enable SPI (needed for some motor HATs):

```bash
sudo raspi-config
```

- **Interface Options → SPI** → Enable SPI

Reboot: `sudo reboot`

### 3. Install Dependencies

```bash
ssh pi@vehicle.local
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-lgpio python3-gpiozero python3-picamera2 python3-websockets
```

`gpiozero` uses the `lgpio` backend by default on Raspberry Pi OS Bookworm, which provides hardware-timed PWM on the TB6612FNG enable pins without any extra daemon.

### 4. Deploy the Server Code

On your PC:

```bash
cd raspi-universal-vehicle
./deploy.sh vehicle.local
```

Or manually:

```bash
scp -r pi pi@vehicle.local:/home/pi/vehicle
```

### 5. Configure and Start at Boot

SSH into the Pi:

```bash
ssh pi@vehicle.local
cd ~/vehicle
```

Find the Pi's IP address:
```bash
hostname -I
```

Install the included systemd service and start it immediately:
```bash
sudo install -m 0644 vehicle.service /etc/systemd/system/vehicle.service
sudo systemctl daemon-reload
sudo systemctl enable --now vehicle.service
```

The service now starts automatically on every boot. Confirm that it is running:

```bash
systemctl status vehicle.service
```

Press `q` to exit the status view. To follow the server logs:

```bash
journalctl -u vehicle.service -f
```

After deploying later code changes, restart the running server:

```bash
sudo systemctl restart vehicle.service
```

If `vehicle.service` itself changes, repeat the `install` and `daemon-reload`
commands before restarting. To disable automatic startup and stop the server:

```bash
sudo systemctl disable --now vehicle.service
```

## PC Setup

### Windows desktop application

Separate installers support 32-bit and x64 editions of Windows 7 SP1, Windows
8.1, and Windows 10. Use the x64 installer on Windows 11. Windows 7 must have
current SHA-2 code-signing and TLS-related operating-system updates installed.
Node.js and development tools are not required to run the installed application.

1. Download the matching installer from the GitHub Release: choose the `ia32`
   filename for 32-bit Windows or `x64` for 64-bit Windows.
2. Run the installer. It installs for the current user without administrator
   privileges and creates Desktop and Start Menu shortcuts.
3. Start **RasPi Vehicle Control**, enter the Pi hostname or IP address, and use
   the controls as described below. The address is saved between launches.

The installer is currently unsigned, so Windows may show an unknown-publisher
prompt or SmartScreen warning. Verify that the file came from this repository's
GitHub Release before choosing to run it. If Windows 7 cannot access GitHub
because its browser or TLS support is too old, download the installer on a
supported computer and transfer it using removable media or another trusted
local method.

To uninstall, open **Control Panel → Programs and Features**, select
**RasPi Vehicle Control**, and choose **Uninstall**. Uninstalling leaves the
saved Pi address in the current user's application data so a reinstall retains
it.

### Browser development setup

### Install Node.js

Requires Node.js 18+.

```bash
cd raspi-universal-vehicle/ui
npm install
```

### Run the UI

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

Enter the Pi's IP address in the input field. The UI will auto-connect and remember the last value in local storage.

### Build or run the desktop application locally

Use Node.js 18 or newer for local development. Release automation uses Node.js
22. From the `ui` directory:

```bash
npm ci
npm run desktop:run
```

`desktop:run` builds the UI and launches Electron. It does not start the Pi
server or a Vite development server.

Create both unsigned Windows installers on Windows with:

```powershell
npm ci
npm run build
npm run desktop:dist
```

The installers are written to `ui/release/` as
`RasPi-Vehicle-Control-Setup-<version>-win7-compatible-ia32.exe` and
`RasPi-Vehicle-Control-Setup-<version>-win7-compatible-x64.exe`. Windows 7 is
a runtime target, not a supported build environment.

### Publish a Windows release

1. Set `ui/package.json` to the release version and commit the package and
   lock files.
2. Create and push a matching `v<version>` tag. For version `1.0.0`:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

The Windows workflow checks that the tag and package version match, runs
`npm ci` and the strict UI build on Windows, builds the unsigned installer,
and attaches it to a versioned GitHub Release.

## Usage

### Keyboard Controls

| Key | Action |
|---|---|
| W / Arrow Up | Forward |
| S / Arrow Down | Reverse |
| A / Arrow Left | Turn left |
| D / Arrow Right | Turn right |
| Space | Brake (stop) |

The UI ignores driving keys while you are typing in the Pi IP field, and it sends `stop` automatically if the browser tab loses focus.

### Gamepad Controls

Connect any USB or Bluetooth gamepad (Xbox, PlayStation, etc.). The left stick controls steering and throttle with a deadzone of 0.1.

## Architecture

```
┌────────────────────────────┐
│ PC Browser / Windows App   │
│  React + TypeScript UI     │
│  - Video feed (MJPEG)      │
│  - WebSocket controls       │
│  - Gamepad / keyboard       │
└────────────┬───────────────┘
             │ WiFi (LAN)
             │
┌────────────▼───────────────┐
│    Raspberry Pi Zero 2 W    │
│                             │
│  Python asyncio server      │
│  ├─ :8080 WebSocket         │
│  └─ :8081 MJPEG HTTP        │
│                             │
│  gpiozero MotorController   │
│  picamera2 CameraStream     │
└─────────────────────────────┘
```

## Project Structure

```
raspi-universal-vechile/
├── pi/
│   ├── server.py          # Main entry point
│   ├── motor_controller.py # gpiozero wrapper
│   ├── camera.py          # picamera2 MJPEG
│   ├── vehicle.service    # systemd boot service
│   └── requirements.txt   # Python deps
├── ui/
│   ├── desktop/
│   │   ├── main.cjs       # Hardened Electron main process
│   │   └── icon.png       # Window, executable, and shortcut icon
│   ├── src/
│   │   ├── App.tsx        # Main app
│   │   ├── types.ts       # Shared types
│   │   ├── components/
│   │   │   ├── VideoFeed.tsx
│   │   │   ├── Controls.tsx
│   │   │   └── ConnectionIndicator.tsx
│   │   └── hooks/
│   │       ├── useWebSocket.ts
│   │       └── useGamepad.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── .github/workflows/
│   └── windows-release.yml # Tagged Windows release build
├── deploy.sh              # Deploy script
├── TODO.md                 # Proposed work and completion tracking
└── README.md
```

## Troubleshooting

### Windows application does not start

- Confirm the installer architecture matches Windows: `ia32` for 32-bit or
  `x64` for 64-bit. Use x64 on Windows 11.
- On Windows 7, install SP1 and current SHA-2 and TLS-related operating-system
  updates, then reboot.
- Re-download the installer from the matching GitHub Release if Windows reports
  that it is damaged. An unknown-publisher warning is expected because releases
  are not yet code-signed.
- The application should still open when the Pi or camera is unavailable. Check
  that the Pi is powered on, both devices are on the same trusted LAN, and ports
  8080 and 8081 are not blocked if controls or video remain disconnected.
- After a connection interruption, the controls and camera feed reconnect
  automatically. The camera feed retries every three seconds while unavailable.

Electron 22 is deliberately pinned for Windows 7 support and is end-of-life.
Do not browse arbitrary sites in the application or expose the Pi services to
the internet.

### Camera not detected
```bash
# Check camera is connected (Bookworm / libcamera)
rpicam-hello --list-cameras
# Should list your sensor, e.g. "ov5647" or "imx708"
```

Note: `vcgencmd get_camera` is the legacy check and will report `detected=0` on Bookworm even when the camera works correctly — use `rpicam-hello --list-cameras` instead.

If the camera is not listed, add `dtoverlay=<sensor>` under `[all]` in `/boot/firmware/config.txt` (e.g. `dtoverlay=ov5647` for OV5647-based modules like the SainSmart 5MP fisheye) and reboot.

### Motors not responding

Verify:
- `STBY` on the TB6612FNG is tied high to `3V3`
- The Pi ground and motor battery ground are connected together
- The default pins in `pi/motor_controller.py` match your wiring: left `17/18/27`, right `22/23/24`
- The user running `server.py` is in the `gpio` group (`groups | grep gpio`); the default `pi` user already is

### High video latency
- Lower the resolution in `pi/server.py` (`width`, `height`)
- Reduce `framerate` to 20
- Move the Pi closer to the WiFi router

The defaults (`1296x972 @ 30fps`) are tuned for the OV5647 sensor (e.g. SainSmart 5MP fisheye), which supports up to `1296x972 @ 46fps` natively. Drop to `640x480` and/or `framerate=20` in `pi/server.py` if you see lag over WiFi.

### "No route to host" or intermittent connection drops

Pi Zero 2 W defaults to aggressive WiFi power save, which causes the Pi to become unreachable seconds after going idle. Symptoms: the server logs show a brief client connection, then the browser reports `ERR_ADDRESS_UNREACHABLE` and `nc` reports "No route to host" from the PC.

Disable WiFi power save permanently on the Pi:

```bash
# One-shot (effective until reboot)
sudo iw dev wlan0 set power_save off

# Persistent across reboots (NetworkManager, default on Bookworm)
ACTIVE=$(nmcli -t -f NAME connection show --active | head -n1)
sudo nmcli connection modify "$ACTIVE" wifi.powersave 2
sudo nmcli connection up "$ACTIVE"

# Verify
iw dev wlan0 get power_save   # should print "Power save: off"
```

Also worth checking:
- Use `vehicle.local` in the UI instead of the raw IP to avoid stale DHCP leases.
- If `ping` to the Pi fails from the PC, confirm both are on the same SSID and that the router does not have AP/client isolation enabled.
