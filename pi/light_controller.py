import logging

import gpiozero

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LightController:
    """Simple on/off LED driven directly from a GPIO pin.

    The LED is wired: GPIO -> resistor -> LED anode -> LED cathode -> GND.
    A 220ohm resistor keeps current around 6mA at 3.3V, well within the
    Pi's per-pin limit.
    """

    def __init__(self, pin: int = 25):
        self._led = gpiozero.LED(pin)
        self._on = False
        logger.info(f"LightController initialized on GPIO{pin}")

    def set(self, on: bool) -> None:
        self._on = bool(on)
        if self._on:
            self._led.on()
        else:
            self._led.off()

    def toggle(self) -> bool:
        self.set(not self._on)
        return self._on

    @property
    def is_on(self) -> bool:
        return self._on

    def close(self) -> None:
        self.set(False)
        self._led.close()
