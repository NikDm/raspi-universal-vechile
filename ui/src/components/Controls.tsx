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
          resetLevels();
          e.preventDefault();
          sendLevels();
          return;
        default:
          return;
      }

      e.preventDefault();
      sendLevels();
    };

    const stopOnBlur = () => {
      resetLevels();
      onCommand({ type: "stop" });
    };

    const stopOnHidden = () => {
      if (document.hidden) {
        stopOnBlur();
      }
    };

    const guardedKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        return;
      }
      handleKeyDown(e);
    };

    window.addEventListener("keydown", guardedKeyDown);
    window.addEventListener("blur", stopOnBlur);
    document.addEventListener("visibilitychange", stopOnHidden);

    return () => {
      window.removeEventListener("keydown", guardedKeyDown);
      window.removeEventListener("blur", stopOnBlur);
      document.removeEventListener("visibilitychange", stopOnHidden);
    };
  }, [onCommand, resetLevels, sendLevels]);

  return (
    <div
      style={{
        padding: "12px 16px",
        background: "#1a1a24",
        borderTop: "1px solid #2a2a3a",
        fontSize: 13,
        color: "#888",
        fontFamily: "monospace",
      }}
    >
      <span style={{ marginRight: 16 }}>
        Up/Down: both motors +/- 1 level &nbsp;|&nbsp; Left/Right: straighten, then steer by 2 &nbsp;|&nbsp; Space: stop &nbsp;|&nbsp; L: light
      </span>
    </div>
  );
}
