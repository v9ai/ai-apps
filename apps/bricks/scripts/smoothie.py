from pybricks.hubs import CityHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Color, Direction, Port
from pybricks.tools import wait

# ── Tuning ────────────────────────────────────────────────────────
MOTOR_SPEED = 720          # deg/s — blender RPM equivalent
ACCEL_TIME_MS = 300        # ramp-up time (ms) — softer start, less spillage
# ──────────────────────────────────────────────────────────────────

hub = CityHub()
motor = Motor(Port.A, Direction.CLOCKWISE)


def wait_for_press_release():
    # Debounce: wait for press, then wait for release so one push = one event.
    while not hub.buttons.pressed():
        wait(20)
    while hub.buttons.pressed():
        wait(20)


def start_motor():
    hub.light.on(Color.GREEN)
    # Smooth ramp-up to avoid splashing the smoothie everywhere.
    target = MOTOR_SPEED
    steps = 10
    for i in range(1, steps + 1):
        motor.run(target * i // steps)
        wait(ACCEL_TIME_MS // steps)


def stop_motor():
    motor.stop()
    hub.light.on(Color.RED)


hub.light.on(Color.YELLOW)
running = False

while True:
    # Press the green button on the hub to toggle: start → stop → start …
    wait_for_press_release()
    running = not running
    if running:
        start_motor()
    else:
        stop_motor()
