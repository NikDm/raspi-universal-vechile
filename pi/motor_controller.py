import logging
import threading
import time
from typing import Tuple

import gpiozero

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MotorController:
    def __init__(
        self,
        left_enable: int = 17,
        left_forward: int = 18,
        left_backward: int = 27,
        right_enable: int = 22,
        right_forward: int = 23,
        right_backward: int = 24,
        ramp_time: float = 0.15,
        ramp_steps: int = 15,
    ):
        """
        ramp_time:  total seconds to ramp from current speed to a higher target.
        ramp_steps: number of intermediate steps during the ramp. More steps =
                    smoother, but more PWM writes. ramp_time / ramp_steps is the
                    delay between steps.

        Soft-start only applies when the magnitude of a motor's speed is
        increasing (spin-up), where the current inrush spike happens. Slowing
        down or stopping is applied immediately for responsiveness and safety.
        """
        self.left_motor = gpiozero.Motor(
            forward=left_forward,
            backward=left_backward,
            enable=left_enable,
            pwm=True,
        )
        self.right_motor = gpiozero.Motor(
            forward=right_forward,
            backward=right_backward,
            enable=right_enable,
            pwm=True,
        )
        # _left_speed/_right_speed are the actual PWM values currently applied
        # (which lag during a ramp). _target_* are the most recently commanded
        # values, reported via the `speeds` property.
        self._left_speed = 0.0
        self._right_speed = 0.0
        self._target_left = 0.0
        self._target_right = 0.0

        self.ramp_time = ramp_time
        self.ramp_steps = max(1, ramp_steps)

        # Protects motor writes and the ramp thread lifecycle.
        self._lock = threading.Lock()
        self._ramp_thread: threading.Thread | None = None
        self._cancel_ramp = threading.Event()

        logger.info(
            "MotorController initialized: "
            f"L=({left_enable},{left_forward},{left_backward}), "
            f"R=({right_enable},{right_forward},{right_backward}), "
            f"ramp_time={ramp_time}s, ramp_steps={ramp_steps}"
        )

    @staticmethod
    def _clamp(value: float) -> float:
        return max(-1.0, min(1.0, value))

    def _cancel_active_ramp(self) -> None:
        """Stop any in-progress ramp thread. Caller must not hold _lock."""
        thread = self._ramp_thread
        if thread is not None and thread.is_alive():
            self._cancel_ramp.set()
            thread.join(timeout=self.ramp_time + 0.1)
        self._ramp_thread = None
        self._cancel_ramp.clear()

    def _apply(self, left: float, right: float) -> None:
        """Write speeds to the motors and record them. Holds _lock."""
        with self._lock:
            self._left_speed = left
            self._right_speed = right
            self.left_motor.value = left
            self.right_motor.value = right

    def move(self, left: float, right: float) -> None:
        left = self._clamp(left)
        right = self._clamp(right)
        self._target_left = left
        self._target_right = right

        # Always cancel any running ramp before starting a new command.
        self._cancel_active_ramp()

        start_left = self._left_speed
        start_right = self._right_speed

        # Soft-start only when a motor's magnitude increases (spin-up inrush).
        increasing = abs(left) > abs(start_left) or abs(right) > abs(start_right)

        if not increasing or self.ramp_time <= 0:
            self._apply(left, right)
            return

        self._cancel_ramp.clear()
        self._ramp_thread = threading.Thread(
            target=self._ramp,
            args=(start_left, start_right, left, right),
            daemon=True,
        )
        self._ramp_thread.start()

    def _ramp(self, start_left: float, start_right: float, target_left: float, target_right: float) -> None:
        step_delay = self.ramp_time / self.ramp_steps
        for i in range(1, self.ramp_steps + 1):
            if self._cancel_ramp.is_set():
                return
            t = i / self.ramp_steps
            cur_left = start_left + (target_left - start_left) * t
            cur_right = start_right + (target_right - start_right) * t
            self._apply(cur_left, cur_right)
            if i < self.ramp_steps:
                time.sleep(step_delay)
        # Ensure exact final value (avoids float rounding leaving us short).
        if not self._cancel_ramp.is_set():
            self._apply(target_left, target_right)

    def stop(self) -> None:
        # Stop is immediate: cancel any ramp and cut power.
        self._cancel_active_ramp()
        with self._lock:
            self._left_speed = 0.0
            self._right_speed = 0.0
            self._target_left = 0.0
            self._target_right = 0.0
            self.left_motor.stop()
            self.right_motor.stop()

    def close(self) -> None:
        self.stop()
        with self._lock:
            self.left_motor.close()
            self.right_motor.close()

    @property
    def speeds(self) -> Tuple[float, float]:
        """Most recently commanded target speeds (not the live ramping value)."""
        return (self._target_left, self._target_right)

    @property
    def applied_speeds(self) -> Tuple[float, float]:
        """The PWM values actually applied right now (lags during a ramp)."""
        return (self._left_speed, self._right_speed)
