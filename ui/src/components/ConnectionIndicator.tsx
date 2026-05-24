import type { ConnectionStatus } from "../hooks/useWebSocket";

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  ip: string;
  wsPort: number;
  videoPort: number;
}

export function ConnectionIndicator({ status, ip, wsPort, videoPort }: ConnectionIndicatorProps) {
  const color =
    status === "connected" ? "#22c55e" : status === "connecting" ? "#eab308" : "#ef4444";
  const label =
    status === "connected" ? "Connected" : status === "connecting" ? "Connecting..." : "Disconnected";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        fontFamily: "monospace",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 6px ${color}`,
          flexShrink: 0,
        }}
      />
      <span style={{ color }}>{label}</span>
      {ip && (
        <span style={{ color: "#666", marginLeft: 8 }}>
          ws://{ip}:{wsPort} | mjpeg://{ip}:{videoPort}
        </span>
      )}
    </div>
  );
}
