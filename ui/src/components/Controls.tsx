import { useEffect, useRef, useCallback } from "react";
import type { Command } from "../types";

interface ControlsProps {
  onCommand: (cmd: Command) => void;
}

interface KeyState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export function Controls({ onCommand }: ControlsProps) {
  const keysRef = useRef<KeyState>({ up: false, down: false, left: false, right: false });

  const resetKeys = useCallback(() => {
    keysRef.current = { up: false, down: false, left: false, right: false };
  }, []);

  const isTypingTarget = (target: EventTarget | null) => {
    return target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
  };

  const computeSpeeds = useCallback((): { left: number; right: number } => {
    const k = keysRef.current;
    let forward = 0;
    let turn = 0;

    if (k.up) forward += 1;
    if (k.down) forward -= 1;
    if (k.left) turn -= 1;
    if (k.right) turn += 1;

    const left = Math.max(-1, Math.min(1, forward + turn * 0.5));
    const right = Math.max(-1, Math.min(1, forward - turn * 0.5));

    return { left, right };
  }, []);

  const sendMoveCommand = useCallback(() => {
    const { left, right } = computeSpeeds();
    if (left === 0 && right === 0) {
      onCommand({ type: "stop" });
    } else {
      onCommand({ type: "move", left, right });
    }
  }, [computeSpeeds, onCommand]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          keysRef.current.up = true;
          break;
        case "ArrowDown":
        case "KeyS":
          keysRef.current.down = true;
          break;
        case "ArrowLeft":
        case "KeyA":
          keysRef.current.left = true;
          break;
        case "ArrowRight":
        case "KeyD":
          keysRef.current.right = true;
          break;
        case "Space":
          resetKeys();
          onCommand({ type: "stop" });
          return;
        default:
          return;
      }
      e.preventDefault();
      sendMoveCommand();
    };

    const stopOnBlur = () => {
      resetKeys();
      onCommand({ type: "stop" });
    };

    const stopOnHidden = () => {
      if (document.hidden) {
        stopOnBlur();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          keysRef.current.up = false;
          break;
        case "ArrowDown":
        case "KeyS":
          keysRef.current.down = false;
          break;
        case "ArrowLeft":
        case "KeyA":
          keysRef.current.left = false;
          break;
        case "ArrowRight":
        case "KeyD":
          keysRef.current.right = false;
          break;
        default:
          return;
      }
      e.preventDefault();
      sendMoveCommand();
    };

    const guardedKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        return;
      }

      handleKeyDown(e);
    };

    const guardedKeyUp = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        return;
      }

      handleKeyUp(e);
    };

    window.addEventListener("keydown", guardedKeyDown);
    window.addEventListener("keyup", guardedKeyUp);
    window.addEventListener("blur", stopOnBlur);
    document.addEventListener("visibilitychange", stopOnHidden);

    return () => {
      window.removeEventListener("keydown", guardedKeyDown);
      window.removeEventListener("keyup", guardedKeyUp);
      window.removeEventListener("blur", stopOnBlur);
      document.removeEventListener("visibilitychange", stopOnHidden);
    };
  }, [onCommand, resetKeys, sendMoveCommand]);

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
      <span style={{ marginRight: 16 }}>Keyboard: WASD / Arrows to move, Space to brake</span>
      <span>Connect a gamepad for analog control</span>
    </div>
  );
}
