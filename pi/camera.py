import io
import logging
import threading

from picamera2 import Picamera2
from picamera2.encoders import MJPEGEncoder
from picamera2.outputs import FileOutput

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class _StreamBuffer(io.BufferedIOBase):
    """Thread-safe holder for the latest JPEG frame produced by the encoder.

    picamera2's MJPEGEncoder writes complete JPEG frames to the file-like
    object passed to FileOutput. Each write() is one frame, so we just keep
    the most recent one and notify any waiting MJPEG clients.

    Must subclass io.BufferedIOBase because FileOutput validates the type.
    """

    def __init__(self) -> None:
        super().__init__()
        self.frame: bytes | None = None
        self.frame_id = 0
        self.condition = threading.Condition()

    def writable(self) -> bool:
        return True

    def write(self, buf) -> int:
        data = bytes(buf)
        with self.condition:
            self.frame = data
            self.frame_id += 1
            self.condition.notify_all()
        return len(data)


class CameraStream:
    def __init__(
        self,
        width: int = 640,
        height: int = 480,
        framerate: int = 15,
        quality: int = 70,
    ):
        self.width = width
        self.height = height
        self.framerate = framerate
        self.quality = quality
        self._picam2: Picamera2 | None = None
        self._streaming = False
        self._buffer = _StreamBuffer()

    def start(self) -> None:
        if self._picam2 is not None:
            return
        self._picam2 = Picamera2()
        config = self._picam2.create_video_configuration(
            main={"size": (self.width, self.height)},
            controls={"FrameRate": self.framerate},
        )
        self._picam2.configure(config)

        # Hardware-assisted MJPEG encoding. This offloads JPEG encoding off the
        # Python/CPU path used by capture_file(), which is essential on a
        # Pi Zero 2 W where software encoding pegs all cores.
        encoder = MJPEGEncoder()
        encoder.quality = self.quality
        self._picam2.start_recording(encoder, FileOutput(self._buffer))
        self._streaming = True
        logger.info(
            f"Camera started: {self.width}x{self.height} @ {self.framerate}fps, "
            f"quality={self.quality} (MJPEGEncoder)"
        )

    def stop(self) -> None:
        self._streaming = False
        if self._picam2 is not None:
            try:
                self._picam2.stop_recording()
            except Exception as exc:
                logger.error(f"Error stopping recording: {exc}")
            self._picam2.close()
            self._picam2 = None
        with self._buffer.condition:
            self._buffer.condition.notify_all()
        logger.info("Camera stopped")

    def get_frame(self, last_frame_id: int = -1, timeout: float = 1.0) -> tuple[int, bytes | None]:
        if not self._streaming:
            return (last_frame_id, None)

        with self._buffer.condition:
            if last_frame_id == self._buffer.frame_id and self._streaming:
                self._buffer.condition.wait(timeout=timeout)
            return (self._buffer.frame_id, self._buffer.frame)

    @property
    def is_streaming(self) -> bool:
        return self._streaming
