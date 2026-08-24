import { useEffect, useRef, useCallback } from "react";
import type { Command } from "../types";

interface ControlsProps {
  onCommand: (cmd: Command) => void;
}

const MAX_LEVEL = 10;
const TURN_STEP = 2;

interface MotorLevels {
  left: number;
  right: number;
}

function clampLevel(level: number): number {
  return Math.max(-MAX_LEVEL, Math.min(MAX_LEVEL, level));
}

// Reduce the magnitude of a level toward 0 by `step`, without crossing 0.
function reduceToward0(level: number, step: number): number {
  if (level > 0) return Math.max(0, level - step);
  if (level < 0) return Math.min(0, level + step);
  return 0;
}

// Move `from` toward `target` by `step`, without overshooting past target.
function moveToward(from: number, target: number, step: number): number {
  if (from < target) return Math.min(target, from + step);
  if (from > target) return Math.max(target, from - step);
  return from;
}

// Steering: "straighten first, then steer".
// `steerSide` is the direction key pressed. The motor on the OPPOSITE side is
// raised first to match the steer side; once both are equal, the steer side's
// motor is slowed toward 0 (the actual turn).
//
// Example (left=2, right=6):
//   press Right (steerSide="right"): left<right, so raise left -> left=4
//   press Right again:               left<right, so raise left -> left=6 (equal)
//   press Right again:               equal, so slow right       -> right=4
function steer(levels: MotorLevels, steerSide: "left" | "right"): MotorLevels {
  const otherSide = steerSide === "left" ? "right" : "left";
  const steerLevel = levels[steerSide];
  const otherLevel = levels[otherSide];

  // Compare magnitudes so this works in both forward and reverse.
  if (Math.abs(otherLevel) < Math.abs(steerLevel)) {
    // Straighten: raise the other (slower) side toward the steer side.
    return { ...levels, [otherSide]: moveToward(otherLevel, steerLevel, TURN_STEP) };
  }
  // Equal (or other side already faster): steer by slowing the steer side.
  return { ...levels, [steerSide]: reduceToward0(steerLevel, TURN_STEP) };
}

export function Controls({ onCommand }: ControlsProps) {
  const levelsRef = useRef<MotorLevels>({ left: 0, right: 0 });

  const isTypingTarget = (target: EventTarget | null) => {
    return target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
  };

  const sendLevels = useCallback(() => {
    const { left, right } = levelsRef.current;
    if (left === 0 && right === 0) {
      onCommand({ type: "stop" });
    } else {
      onCommand({ type: "move", left: left / MAX_LEVEL, right: right / MAX_LEVEL });
    }
  }, [onCommand]);

  const resetLevels = useCallback(() => {
    levelsRef.current = { left: 0, right: 0 };
  }, []);

  const stop = useCallback(() => {
    resetLevels();
    onCommand({ type: "stop" });
  }, [onCommand, resetLevels]);

  const adjustThrottle = useCallback(
    (delta: 1 | -1) => {
      const levels = levelsRef.current;
      levelsRef.current = {
        left: clampLevel(levels.left + delta),
        right: clampLevel(levels.right + delta),
      };
      sendLevels();
    },
    [sendLevels]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const levels = levelsRef.current;

      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          // Speed up both motors by one level (forward).
          levelsRef.current = {
            left: clampLevel(levels.left + 1),
            right: clampLevel(levels.right + 1),
          };
          break;
        case "ArrowDown":
        case "KeyS":
          // Speed up both motors by one level (backward).
          levelsRef.current = {
            left: clampLevel(levels.left - 1),
            right: clampLevel(levels.right - 1),
          };
          break;
        case "ArrowLeft":
        case "KeyA":
          // Straighten first (raise right toward left), then slow the left.
          levelsRef.current = steer(levels, "left");
          break;
        case "ArrowRight":
        case "KeyD":
          // Straighten first (raise left toward right), then slow the right.
          levelsRef.current = steer(levels, "right");
          break;
        case "Space":
          e.preventDefault();
          stop();
          return;
        default:
          return;
      }

      e.preventDefault();
      sendLevels();
    };

    const guardedKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        return;
      }
      handleKeyDown(e);
    };

    window.addEventListener("keydown", guardedKeyDown);

    return () => {
      window.removeEventListener("keydown", guardedKeyDown);
    };
  }, [onCommand, sendLevels, stop]);

  return (
    <div
        className="drive-controls"
        style={{
          position: "fixed",
          top: "50%",
          left: 16,
          transform: "translateY(-50%)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <button
          className="drive-button drive-button-throttle"
          type="button"
          aria-label="Increase throttle"
          title="Increase throttle"
          onClick={() => adjustThrottle(1)}
          style={{
            width: 80,
            height: 65,
            borderRadius: 8,
            border: "1px solid rgba(120, 120, 145, 0.65)",
            background: "rgba(37, 37, 53, 0.65)",
            color: "#e0e0e0",
            fontSize: 28,
            lineHeight: 1,
            cursor: "pointer",
            touchAction: "manipulation",
            userSelect: "none",
          }}
        >
          ↑
        </button>
        <button
          className="drive-button drive-button-stop"
          type="button"
          aria-label="Stop"
          title="Stop"
          onClick={stop}
          style={{
            width: 80,
            height: 58,
            borderRadius: 8,
            border: "1px solid rgba(248, 113, 113, 0.8)",
            background: "rgba(127, 29, 29, 0.72)",
            color: "#fecaca",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            touchAction: "manipulation",
            userSelect: "none",
          }}
        >
          STOP
        </button>
        <button
          className="drive-button drive-button-throttle"
          type="button"
          aria-label="Decrease throttle"
          title="Decrease throttle"
          onClick={() => adjustThrottle(-1)}
          style={{
            width: 80,
            height: 65,
            borderRadius: 8,
            border: "1px solid rgba(120, 120, 145, 0.65)",
            background: "rgba(37, 37, 53, 0.65)",
            color: "#e0e0e0",
            fontSize: 28,
            lineHeight: 1,
            cursor: "pointer",
            touchAction: "manipulation",
            userSelect: "none",
          }}
        >
          ↓
        </button>
    </div>
  );
}
