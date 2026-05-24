import { useEffect, useRef, useState, useCallback } from "react";

interface GamepadState {
  leftStickX: number;
  leftStickY: number;
  rightStickX: number;
  rightStickY: number;
  buttons: boolean[];
  connected: boolean;
}

interface UseGamepadReturn {
  state: GamepadState;
  isConnected: boolean;
}

const EMPTY_STATE: GamepadState = {
  leftStickX: 0,
  leftStickY: 0,
  rightStickX: 0,
  rightStickY: 0,
  buttons: [],
  connected: false,
};

export function useGamepad(): UseGamepadReturn {
  const [state, setState] = useState<GamepadState>(EMPTY_STATE);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const setStateIfChanged = useCallback((next: GamepadState) => {
    setState((prev) => {
      const changed =
        prev.connected !== next.connected ||
        prev.leftStickX !== next.leftStickX ||
        prev.leftStickY !== next.leftStickY ||
        prev.rightStickX !== next.rightStickX ||
        prev.rightStickY !== next.rightStickY ||
        prev.buttons.length !== next.buttons.length ||
        prev.buttons.some((value, index) => value !== next.buttons[index]);

      return changed ? next : prev;
    });
  }, []);

  const startPolling = useCallback(() => {
    if (runningRef.current) {
      return;
    }

    runningRef.current = true;
    rafRef.current = requestAnimationFrame(pollGamepad);
  }, []);

  const stopPolling = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const pollGamepad = useCallback(() => {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];

    if (gp) {
      setStateIfChanged({
        leftStickX: Math.round((gp.axes[0] ?? 0) * 100) / 100,
        leftStickY: Math.round((gp.axes[1] ?? 0) * 100) / 100,
        rightStickX: Math.round((gp.axes[2] ?? 0) * 100) / 100,
        rightStickY: Math.round((gp.axes[3] ?? 0) * 100) / 100,
        buttons: gp.buttons.map((b) => b.pressed),
        connected: true,
      });
    } else {
      setStateIfChanged(EMPTY_STATE);
    }

    rafRef.current = requestAnimationFrame(pollGamepad);
  }, [setStateIfChanged]);

  useEffect(() => {
    const handleConnect = () => {
      startPolling();
    };

    const handleDisconnect = () => {
      stopPolling();
      setStateIfChanged(EMPTY_STATE);
    };

    window.addEventListener("gamepadconnected", handleConnect);
    window.addEventListener("gamepaddisconnected", handleDisconnect);

    startPolling();

    return () => {
      stopPolling();
      window.removeEventListener("gamepadconnected", handleConnect);
      window.removeEventListener("gamepaddisconnected", handleDisconnect);
    };
  }, [pollGamepad, setStateIfChanged, startPolling, stopPolling]);

  return { state, isConnected: state.connected };
}
