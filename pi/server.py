import asyncio
import json
import logging
import signal
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import threading

from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed

from motor_controller import MotorController
from camera import CameraStream

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

WS_HOST = "0.0.0.0"
WS_PORT = 8080
MJPEG_HOST = "0.0.0.0"
MJPEG_PORT = 8081

motor = MotorController()
camera = CameraStream(width=640, height=480, framerate=15, quality=70)
clients = 0
mjpeg_server: ThreadingHTTPServer | None = None


class MJPEGHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/video":
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()

            frame_id = -1
            try:
                while camera.is_streaming:
                    frame_id, frame = camera.get_frame(frame_id)
                    if frame:
                        self.wfile.write(b"--frame\r\n")
                        self.wfile.write(b"Content-Type: image/jpeg\r\n")
                        self.wfile.write(f"Content-Length: {len(frame)}\r\n\r\n".encode())
                        self.wfile.write(frame)
                        self.wfile.write(b"\r\n")
                    else:
                        break
            except (BrokenPipeError, ConnectionResetError):
                pass
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass


async def websocket_handler(ws):
    global clients

    clients += 1
    logger.info(f"Client connected: {ws.remote_address}")
    try:
        async for msg in ws:
            logger.info(f"Received: {msg}")
            try:
                data = json.loads(msg)
                cmd_type = data.get("type")
                if cmd_type == "move":
                    left = float(data.get("left", 0))
                    right = float(data.get("right", 0))
                    motor.move(left, right)
                elif cmd_type == "stop":
                    motor.stop()
                else:
                    logger.warning(f"Unknown command type: {cmd_type}")
                await ws.send(json.dumps({"type": "status", "left": motor.speeds[0], "right": motor.speeds[1]}))
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON: {msg}")
            except Exception as exc:
                logger.error(f"Command error: {exc}")
    except ConnectionClosed:
        pass
    finally:
        clients = max(0, clients - 1)
        if clients == 0:
            motor.stop()
        logger.info(f"Client disconnected: {ws.remote_address}")


def run_mjpeg_server(server: ThreadingHTTPServer):
    logger.info(f"MJPEG server started on {MJPEG_HOST}:{MJPEG_PORT}")
    server.serve_forever(poll_interval=0.5)


async def run_servers():
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop_event.set)

    global mjpeg_server
    camera.start()
    mjpeg_server = ThreadingHTTPServer((MJPEG_HOST, MJPEG_PORT), MJPEGHandler)
    mjpeg_thread = threading.Thread(target=run_mjpeg_server, args=(mjpeg_server,), daemon=True)
    mjpeg_thread.start()

    async with serve(websocket_handler, WS_HOST, WS_PORT, ping_interval=20, ping_timeout=20):
        logger.info(f"WebSocket server started on {WS_HOST}:{WS_PORT}")
        await stop_event.wait()

    logger.info("Shutdown signal received")
    mjpeg_server.shutdown()
    mjpeg_server.server_close()
    camera.stop()
    motor.close()


def main():
    logger.info("Starting RasPi Universal Vehicle server...")
    asyncio.run(run_servers())
    logger.info("Server stopped")


if __name__ == "__main__":
    main()
