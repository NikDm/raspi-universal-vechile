import logging
import io
import threading
import time

from picamera2 import Picamera2

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CameraStream:
    def __init__(
        self,
        width: int = 1296,
        height: int = 972,
        framerate: int = 30,
        quality: int = 80,
    ):
        self.width = width
        self.height = height
        self.framerate = framerate
        self.quality = quality
        self._picam2: Picamera2 | None = None
        self._streaming = False
        self._latest_frame: bytes | None = None
        self._frame_id = 0
        self._frame_lock = threading.Lock()
        self._frame_ready = threading.Condition(self._frame_lock)
        self._capture_thread: threading.Thread | None = None

    def start(self) -> None:
        if self._picam2 is not None:
            return
        self._picam2 = Picamera2()
        config = self._picam2.create_video_configuration(
            main={
                "size": (self.width, self.height),
            },
            controls={
                "FrameRate": self.framerate,
            },
        )
        self._picam2.configure(config)
        self._picam2.start()
        self._streaming = True
        self._capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._capture_thread.start()
        logger.info(
            f"Camera started: {self.width}x{self.height} @ {self.framerate}fps, quality={self.quality}"
        )

    def stop(self) -> None:
        self._streaming = False
        capture_thread = self._capture_thread

        if self._picam2 is not None:
            self._picam2.close()
            self._picam2 = None
        with self._frame_ready:
            self._frame_ready.notify_all()
        if capture_thread is not None:
            capture_thread.join(timeout=1)
            self._capture_thread = None
        logger.info("Camera stopped")

    def _capture_loop(self) -> None:
        frame_interval = 1 / self.framerate if self.framerate > 0 else 0

        while self._streaming and self._picam2 is not None:
            start = time.monotonic()
            try:
                stream = io.BytesIO()
                self._picam2.capture_file(stream, format="jpeg")
                stream.seek(0)

                with self._frame_ready:
                    self._latest_frame = stream.getvalue()
                    self._frame_id += 1
                    self._frame_ready.notify_all()
            except Exception as exc:
                logger.error(f"Capture error: {exc}")
                time.sleep(0.1)
                continue

            elapsed = time.monotonic() - start
            remaining = frame_interval - elapsed
            if remaining > 0:
                time.sleep(remaining)

    def get_frame(self, last_frame_id: int = -1, timeout: float = 1.0) -> tuple[int, bytes | None]:
        if self._picam2 is None:
            return (last_frame_id, None)

        with self._frame_ready:
            if last_frame_id == self._frame_id and self._streaming:
                self._frame_ready.wait(timeout=timeout)

            return (self._frame_id, self._latest_frame)

    @property
    def is_streaming(self) -> bool:
        return self._streaming
