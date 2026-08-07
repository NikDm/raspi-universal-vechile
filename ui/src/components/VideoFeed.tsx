import { useCallback, useEffect, useRef, useState } from "react";

interface VideoFeedProps {
  src: string;
}

const VIDEO_RETRY_DELAY_MS = 3000;

export function VideoFeed({ src }: VideoFeedProps) {
  const [retryCount, setRetryCount] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setRetryCount(0);
    clearRetryTimer();
    return clearRetryTimer;
  }, [src, clearRetryTimer]);

  const retryVideo = useCallback(() => {
    if (retryTimerRef.current !== null) return;

    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      setRetryCount((count) => count + 1);
    }, VIDEO_RETRY_DELAY_MS);
  }, []);

  return (
    <div
      style={{
        flex: 1,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 0,
      }}
    >
      <img
        key={retryCount}
        src={src}
        alt="Vehicle camera feed"
        onError={retryVideo}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
}
