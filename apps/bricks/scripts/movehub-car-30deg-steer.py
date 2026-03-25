from pybricks.hubs import MoveHub
from pybricks.pupdevices import Motor, Remote
from pybricks.parameters import Port, Button, Color, Stop
from pybricks.tools import wait

hub = MoveHub()

motor_a = Motor(Port.A)
motor_b = Motor(Port.B)

try:
    steering = Motor(Port.D)
    steering.reset_angle(0)
except Exception:
    steering = None

hub.light.on(Color.ORANGE)
remote = Remote(timeout=None)
hub.light.on(Color.GREEN)
wait(500)

DRIVE_SPEED = 10000  # max speed, deg/s (clamped to hardware limit)
STEER_SPEED = 500    # deg/s for steering movement
STEER_ANGLE = 45     # fixed 45° left/right

was_steering = False

# Battery monitoring
BATTERY_LOW_MV = 7200
CHECK_INTERVAL_MS = 5000
LOW_BATTERY_WARN_MS = 60000

low_battery_timer = 0
last_check = 0
battery_warning = False

while True:
    pressed = remote.buttons.pressed()

    if Button.CENTER in pressed:
        motor_a.stop()
        motor_b.stop()
        if steering:
            steering.stop()
        hub.light.on(Color.RED)
        wait(50)
        continue

    # RIGHT +/- : drive forward / backward
    if Button.RIGHT_PLUS in pressed:
        motor_a.run(DRIVE_SPEED)
        motor_b.run(-DRIVE_SPEED)
    elif Button.RIGHT_MINUS in pressed:
        motor_a.run(-DRIVE_SPEED)
        motor_b.run(DRIVE_SPEED)
    else:
        motor_a.stop()
        motor_b.stop()

    # LEFT +/- : fixed 30° steering, auto-center on release
    is_steering = Button.LEFT_PLUS in pressed or Button.LEFT_MINUS in pressed
    if steering:
        if Button.LEFT_PLUS in pressed:
            steering.run_target(STEER_SPEED, STEER_ANGLE, then=Stop.HOLD, wait=False)
        elif Button.LEFT_MINUS in pressed:
            steering.run_target(STEER_SPEED, -STEER_ANGLE, then=Stop.HOLD, wait=False)
        elif was_steering:
            steering.run_target(STEER_SPEED, 0, then=Stop.HOLD, wait=False)
    was_steering = is_steering

    # Battery check
    last_check += 50
    if last_check >= CHECK_INTERVAL_MS:
        last_check = 0
        voltage = hub.battery.voltage()
        if voltage >= BATTERY_LOW_MV:
            low_battery_timer = 0
            battery_warning = False
        else:
            low_battery_timer += CHECK_INTERVAL_MS
            battery_warning = low_battery_timer <= LOW_BATTERY_WARN_MS

    # Hub light feedback (battery warning overrides)
    if battery_warning:
        hub.light.on(Color.YELLOW)
    elif Button.RIGHT_PLUS in pressed:
        hub.light.on(Color.GREEN)
    elif Button.RIGHT_MINUS in pressed:
        hub.light.on(Color.ORANGE)
    else:
        hub.light.on(Color.WHITE)

    wait(50)
