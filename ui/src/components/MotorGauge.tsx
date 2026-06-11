interface MotorGaugeProps {
  left: number; // -1.0 .. 1.0
  right: number; // -1.0 .. 1.0
}

function MotorBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(-1, Math.min(1, value));
  const magnitude = Math.abs(clamped);
  const pct = Math.round(magnitude * 100);
  const forward = clamped >= 0;
  const fillColor = forward ? "#22c55e" : "#ef4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}>{label}</span>
      <div
        style={{
          position: "relative",
          width: 24,
          height: 80,
          background: "#0f0f13",
          border: "1px solid #2a2a3a",
          borderRadius: 4,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* center line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 1,
            background: "#2a2a3a",
          }}
        />
        {/* forward fill grows up from center, reverse fill grows down from center */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: `${magnitude * 50}%`,
            background: fillColor,
            ...(forward ? { bottom: "50%" } : { top: "50%" }),
            transition: "height 80ms linear",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 12,
          fontFamily: "monospace",
          color: clamped === 0 ? "#666" : fillColor,
          minWidth: 36,
          textAlign: "center",
        }}
      >
        {forward ? "+" : "-"}
        {pct}%
      </span>
    </div>
  );
}

export function MotorGauge({ left, right }: MotorGaugeProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <MotorBar value={left} label="L" />
      <MotorBar value={right} label="R" />
    </div>
  );
}
