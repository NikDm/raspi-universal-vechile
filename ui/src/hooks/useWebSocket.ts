import { useEffect, useRef, useCallback, useState } from "react";
import type { Command } from "../types";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

interface UseWebSocketOptions {
  url: string;
  onStatusChange?: (status: ConnectionStatus) => void;
}

interface UseWebSocketReturn {
  sendCommand: (cmd: Command) => void;
  status: ConnectionStatus;
}

export function useWebSocket({ url, onStatusChange }: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  const updateStatus = useCallback(
    (s: ConnectionStatus) => {
      setStatus(s);
      onStatusChange?.(s);
    },
    [onStatusChange]
  );

  const connect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    updateStatus("connecting");
    const ws = new WebSocket(url);

    ws.onopen = () => {
      updateStatus("connected");
    };

    ws.onclose = () => {
      updateStatus("disconnected");
      wsRef.current = null;
      if (shouldReconnectRef.current) {
        reconnectTimerRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [url, updateStatus]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const sendCommand = useCallback((cmd: Command) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  return { sendCommand, status };
}
