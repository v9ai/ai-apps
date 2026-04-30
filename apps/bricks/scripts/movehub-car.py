from pybricks.hubs import MoveHub
from pybricks.pupdevices import Motor, Remote
from pybricks.parameters import Port, Button, Color, Stop
from pybricks.tools import wait

# --- Config ---------------------------------------------------------------
# Drive: ports A + B run as a tank-style pair (one inverted).
# Steering: optional motor on port D, autocalibrates at boot by hitting both
# end-stops, then uses the measured half-range as the steer limit.
DRIVE_SPEED = 10000       # deg/s for drive motors (clamped to hardware max)
STEER_SPEED = 1000        # deg/s for steering motor

CALIBRATE_SPEED = 200     # deg/s for autocal sweeps — slow / gentle
CALIBRATE_DUTY = 30       # max % torque during stall detection — protects gears
STEER_MARGIN = 5          # degrees pulled back from each measured end-stop
MIN_STEER_RANGE = 10      # minimum half-range (deg) for calibration to count

# Battery monitor
BATTERY_LOW_MV = 7200
CHECK_INTERVAL_MS = 5000
LOW_BATTERY_WARN_MS = 60000

# --- Hardware -------------------------------------------------------------
hub = MoveHub()

motor_a = Motor(Port.A)
motor_b = Motor(Port.B)


def calibrate_steering(motor):
    """Drive into both end-stops, return half-range (deg) and center the motor.

    Returns 0 and the motor untouched if the measured range is implausibly
    small (jammed linkage, no mechanical stops, etc).
    """
    left_limit = motor.run_until_stalled(
        -CALIBRATE_SPEED, then=Stop.HOLD, duty_limit=CALIBRATE_DUTY
    )
    right_limit = motor.run_until_stalled(
        CALIBRATE_SPEED, then=Stop.HOLD, duty_limit=CALIBRATE_DUTY
    )
    center = (left_limit + right_limit) // 2
    half_range = (right_limit - left_limit) // 2 - STEER_MARGIN
    if half_range < MIN_STEER_RANGE:
        return 0
    motor.run_target(CALIBRATE_SPEED, center, then=Stop.HOLD, wait=True)
    motor.reset_angle(0)
    return half_range


try:
    steering = Motor(Port.D)
except Exception:
    steering = None

hub.light.on(Color.ORANGE)
remote = Remote(timeout=None)

if steering:
    hub.light.on(Color.MAGENTA)
    STEER_ANGLE = calibrate_steering(steering)
    if STEER_ANGLE == 0:
        # Calibration failed — drop steering capability but keep driving.
        steering = None
        hub.light.on(Color.YELLOW)
        wait(1000)
else:
    STEER_ANGLE = 0

hub.light.on(Color.GREEN)
wait(500)

# --- State ----------------------------------------------------------------
was_steering = False
low_battery_timer = 0
last_check = 0
battery_warning = False

# --- Main loop ------------------------------------------------------------
# Button map:
#   RIGHT_PLUS / RIGHT_MINUS → drive forward / backward
#   LEFT_PLUS  / LEFT_MINUS  → steer ±STEER_ANGLE (auto-center on release)
#   CENTER                   → emergency stop
while True:
    pressed = remote.buttons.pressed()

    if Button.CENTER in pressed:
        motor_a.stop()
        motor_b.stop()
        if steering:
            steering.stop()
        hub.light.on(Color.RED)
        remote.light.on(Color.RED)
        wait(50)
        continue

    # Drive
    if Button.RIGHT_PLUS in pressed:
        motor_a.run(DRIVE_SPEED)
        motor_b.run(-DRIVE_SPEED)
    elif Button.RIGHT_MINUS in pressed:
        motor_a.run(-DRIVE_SPEED)
        motor_b.run(DRIVE_SPEED)
    else:
        motor_a.stop()
        motor_b.stop()

    # Steer
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

    # Hub light: battery warning > driving direction > idle
    if battery_warning:
        hub.light.on(Color.YELLOW)
    elif Button.RIGHT_PLUS in pressed:
        hub.light.on(Color.GREEN)
    elif Button.RIGHT_MINUS in pressed:
        hub.light.on(Color.ORANGE)
    else:
        hub.light.on(Color.WHITE)

    wait(50)
