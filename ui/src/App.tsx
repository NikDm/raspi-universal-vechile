import { useState, useCallback, useEffect, useRef } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { useGamepad } from "./hooks/useGamepad";
import { VideoFeed } from "./components/VideoFeed";
import { Controls } from "./components/Controls";
import { ConnectionIndicator } from "./components/ConnectionIndicator";
import type { Command } from "./types";

const WS_PORT = 8080;
const MJPEG_PORT = 8081;
const PI_IP_STORAGE_KEY = "raspi-vehicle.pi-ip";

function clampSpeed(value: number) {
  return Math.max(-1, Math.min(1, Math.round(value * 100) / 100));
}

function getInitialPiIp() {
  return window.localStorage.getItem(PI_IP_STORAGE_KEY) ?? "192.168.1.100";
}

function App() {
  const [piIp, setPiIp] = useState(getInitialPiIp);
  const prevSpeedsRef = useRef({ left: 0, right: 0 });
  const inputSourceRef = useRef<"keyboard" | "gamepad" | null>(null);
  const { sendCommand, status: wsStatus } = useWebSocket({ url: `ws://${piIp}:${WS_PORT}` });
  const { state: gamepad } = useGamepad();

  const handleCommand = useCallback(
    (cmd: Command) => {
      inputSourceRef.current = "keyboard";
      sendCommand(cmd);
      if (cmd.type === "move") {
        prevSpeedsRef.current = { left: cmd.left, right: cmd.right };
      } else {
        prevSpeedsRef.current = { left: 0, right: 0 };
      }
    },
    [sendCommand]
  );

  useEffect(() => {
    window.localStorage.setItem(PI_IP_STORAGE_KEY, piIp);
  }, [piIp]);

  useEffect(() => {
    if (gamepad.connected) {
      return;
    }

    if (inputSourceRef.current === "gamepad") {
      sendCommand({ type: "stop" });
      prevSpeedsRef.current = { left: 0, right: 0 };
      inputSourceRef.current = null;
    }
  }, [gamepad.connected, sendCommand]);

  useEffect(() => {
    if (!gamepad.connected) {
      return;
    }

    const deadzone = 0.1;
    let lx = gamepad.leftStickX;
    let ly = gamepad.leftStickY;

    if (Math.abs(lx) < deadzone) lx = 0;
    if (Math.abs(ly) < deadzone) ly = 0;

    const forward = -ly;
    const turn = lx;
    const left = clampSpeed(forward + turn * 0.5);
    const right = clampSpeed(forward - turn * 0.5);
    const hasInput = left !== 0 || right !== 0;
    const prevSpeeds = prevSpeedsRef.current;

    if (!hasInput && inputSourceRef.current !== "gamepad") {
      return;
    }

    if (left !== prevSpeeds.left || right !== prevSpeeds.right) {
      if (!hasInput) {
        sendCommand({ type: "stop" });
        inputSourceRef.current = null;
      } else {
        sendCommand({ type: "move", left, right });
        inputSourceRef.current = "gamepad";
      }
      prevSpeedsRef.current = { left, right };
    }
  }, [gamepad, sendCommand]);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0f0f13",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "#16161e",
          borderBottom: "1px solid #2a2a3a",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 15 }}>RasPi Vehicle Control</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {gamepad.connected && (
            <span style={{ fontSize: 12, color: "#22c55e", fontFamily: "monospace" }}>
              Gamepad connected
            </span>
          )}
          <ConnectionIndicator
            status={wsStatus}
            ip={piIp}
            wsPort={WS_PORT}
            videoPort={MJPEG_PORT}
          />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <VideoFeed src={`http://${piIp}:${MJPEG_PORT}/video`} />
      </div>

      <div
        style={{
          padding: "8px 16px",
          background: "#16161e",
          borderTop: "1px solid #2a2a3a",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <label style={{ fontSize: 13, color: "#888" }}>Pi IP:</label>
        <input
          type="text"
          value={piIp}
          onChange={(e) => setPiIp(e.target.value)}
          style={{
            background: "#0f0f13",
            border: "1px solid #2a2a3a",
            color: "#e0e0e0",
            borderRadius: 4,
            padding: "4px 8px",
            fontFamily: "monospace",
            fontSize: 13,
            width: 140,
          }}
        />
      </div>

      <Controls onCommand={handleCommand} />
    </div>
  );
}

export default App;
