import logging
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
    ):
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
        self._left_speed = 0.0
        self._right_speed = 0.0
        logger.info(
            "MotorController initialized: "
            f"L=({left_enable},{left_forward},{left_backward}), "
            f"R=({right_enable},{right_forward},{right_backward})"
        )

    def move(self, left: float, right: float) -> None:
        left = max(-1.0, min(1.0, left))
        right = max(-1.0, min(1.0, right))
        self._left_speed = left
        self._right_speed = right
        self.left_motor.value = left
        self.right_motor.value = right

    def stop(self) -> None:
        self._left_speed = 0.0
        self._right_speed = 0.0
        self.left_motor.stop()
        self.right_motor.stop()

    def close(self) -> None:
        self.stop()
        self.left_motor.close()
        self.right_motor.close()

    @property
    def speeds(self) -> Tuple[float, float]:
        return (self._left_speed, self._right_speed)
