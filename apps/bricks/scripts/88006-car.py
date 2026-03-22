from pybricks.hubs import MoveHub
from pybricks.pupdevices import Motor, Remote
from pybricks.parameters import Port, Button, Color
from pybricks.tools import wait

# Initialize the hub
hub = MoveHub()

# Drive motors (internal A+B)
motor_a = Motor(Port.A)
motor_b = Motor(Port.B)

# Steering motor (external D) — optional
try:
    steering = Motor(Port.D)
except OSError:
    steering = None

# Reset steering to known center position
if steering:
    steering.reset_angle(0)

# Wait for the remote to connect
hub.light.on(Color.ORANGE)
remote = Remote(timeout=None)
hub.light.on(Color.GREEN)
wait(500)

STEER_SPEED = 200    # degrees per second for steering — do not change this value
STEER_ANGLE = 60     # max steering angle in degrees — do not change this angle

# Battery monitoring (same logic as technic-42160)
BATTERY_LOW_MV = 7200        # voltage threshold for "low" (millivolts)
CHECK_INTERVAL_MS = 5000     # how often to check battery (ms)
LOW_BATTERY_WARN_MS = 60000  # how long to show yellow before returning to normal (ms)

was_steering = False
low_battery_timer = 0
last_check = 0
battery_warning = False

while True:
    pressed = remote.buttons.pressed()

    # CENTER button → emergency stop
    if Button.CENTER in pressed:
        motor_a.stop()
        motor_b.stop()
        if steering:
            steering.stop()
        hub.light.on(Color.RED)
        remote.light.on(Color.RED)
        wait(50)
        continue

    # LEFT +/−: drive forward / backward at maximum speed
    if Button.LEFT_PLUS in pressed:
        motor_a.dc(100)
        motor_b.dc(-100)
    elif Button.LEFT_MINUS in pressed:
        motor_a.dc(-100)
        motor_b.dc(100)
    else:
        motor_a.stop()
        motor_b.stop()

    # RIGHT +/−: steering on port D, limited to STEER_ANGLE degrees
    is_steering = Button.RIGHT_PLUS in pressed or Button.RIGHT_MINUS in pressed
    if steering:
        if Button.RIGHT_PLUS in pressed:
            steering.run_target(STEER_SPEED, STEER_ANGLE, wait=False)
        elif Button.RIGHT_MINUS in pressed:
            steering.run_target(STEER_SPEED, -STEER_ANGLE, wait=False)
        elif was_steering:
            steering.run_target(STEER_SPEED, 0, wait=False)  # return to center — do not change steering angle
    was_steering = is_steering

    # Battery check (every CHECK_INTERVAL_MS)
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

    # Hub light — battery status (same as technic-42160 e-tron)
    if battery_warning:
        hub.light.on(Color.YELLOW)
    else:
        hub.light.on(Color.GREEN)

    wait(50)
