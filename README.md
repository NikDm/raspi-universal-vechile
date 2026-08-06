# RasPi Universal Vehicle

A Raspberry Pi Zero 2 W-powered vehicle with dual motor control and live camera feed, controlled from a PC browser.

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

### 5. Configure and Run

SSH into the Pi:

```bash
ssh pi@vehicle.local
cd ~/vehicle
```

Find the Pi's IP address:
```bash
hostname -I
```

Run the server:
```bash
python3 server.py
```

For auto-start on boot (optional):
```bash
# Create systemd service
sudo nano /etc/systemd/system/vehicle.service
```

```ini
[Unit]
Description=RasPi Vehicle Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/vehicle
ExecStart=/usr/bin/python3 server.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable vehicle.service
sudo systemctl start vehicle.service
```

## PC Setup

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
│     PC Browser             │
│  React + TypeScript UI      │
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
│   └── requirements.txt   # Python deps
├── ui/
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
├── deploy.sh              # Deploy script
└── README.md
```

## Troubleshooting

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
