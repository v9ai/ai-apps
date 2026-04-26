from pybricks.hubs import EssentialHub
from pybricks.parameters import Color, Side, Axis
from pybricks.tools import wait, StopWatch

# IMU Quest — a 5-round motion challenge for the Essential Hub.
# Every documented IMU method is exercised:
#   ready, settings, stationary, up, tilt, acceleration,
#   angular_velocity, heading, reset_heading, rotation, orientation.
# The status light is the only output; pass = green flash, fail = red flash.

hub = EssentialHub()

# --- Tuning ---------------------------------------------------------------
FREEZE_HOLD_MS      = 1500     # round 1: hold still this long
FREEZE_TIMEOUT_MS   = 12000

TILT_PITCH_MIN      = 20       # round 2: pitch window (deg)
TILT_PITCH_MAX      = 40
TILT_ROLL_ABS_MAX   = 10       # |roll| <= this (deg)
TILT_HOLD_MS        = 1000
TILT_TIMEOUT_MS     = 15000

SIDE_TIMEOUT_MS     = 12000    # round 3: turn requested face up

SPIN_TARGET_DEG     = 180      # round 4: spin around Z this much
SPIN_MIN_RATE       = 60       # require this much deg/s while spinning
SPIN_TIMEOUT_MS     = 12000

SHAKE_THRESHOLD     = 8000     # round 5: peak |accel| in mm/s^2
SHAKE_TIMEOUT_MS    = 8000

POLL_MS             = 50

# IMU sensitivity. Looser thresholds make stationary() and shake detection
# crisper on a hand-held hub.
hub.imu.settings(
    angular_velocity_threshold=3.0,   # deg/s
    acceleration_threshold=300,       # mm/s^2
)

# --- Helpers --------------------------------------------------------------

def flash(color, ms=400):
    hub.light.on(color)
    wait(ms)
    hub.light.off()

def pass_round():
    flash(Color.GREEN, 600)

def fail_round():
    flash(Color.RED, 800)

def announce(color):
    for _ in range(2):
        hub.light.on(color); wait(150)
        hub.light.off();     wait(150)

def wait_for_ready():
    # Round 0: imu.ready() + imu.settings() (already applied above).
    hub.light.blink(Color.YELLOW, [200, 200])
    while not hub.imu.ready():
        wait(POLL_MS)
    hub.light.off()
    flash(Color.GREEN, 300)

# --- Rounds ---------------------------------------------------------------

def round_freeze():
    # imu.stationary()
    announce(Color.WHITE)
    held = 0
    sw = StopWatch()
    while held < FREEZE_HOLD_MS:
        if hub.imu.stationary():
            held += POLL_MS
            hub.light.on(Color.WHITE)
        else:
            held = 0
            hub.light.on(Color.MAGENTA)
        if sw.time() > FREEZE_TIMEOUT_MS:
            return False
        wait(POLL_MS)
    return True

def round_tilt():
    # imu.tilt()
    announce(Color.BLUE)
    in_zone = 0
    sw = StopWatch()
    while in_zone < TILT_HOLD_MS:
        pitch, roll = hub.imu.tilt()
        if (TILT_PITCH_MIN <= pitch <= TILT_PITCH_MAX
                and -TILT_ROLL_ABS_MAX <= roll <= TILT_ROLL_ABS_MAX):
            in_zone += POLL_MS
            hub.light.on(Color.GREEN)
        else:
            in_zone = 0
            hub.light.on(Color.BLUE)
        if sw.time() > TILT_TIMEOUT_MS:
            return False
        wait(POLL_MS)
    return True

# Cycle through faces so a replay isn't always the same target.
SIDE_SEQUENCE = [Side.LEFT, Side.RIGHT, Side.FRONT, Side.BACK]
_side_index = 0

def round_side():
    # imu.up()
    global _side_index
    target = SIDE_SEQUENCE[_side_index % len(SIDE_SEQUENCE)]
    _side_index += 1
    announce(Color.ORANGE)
    sw = StopWatch()
    while True:
        if hub.imu.up() == target:
            return True
        hub.light.on(Color.ORANGE)
        if sw.time() > SIDE_TIMEOUT_MS:
            return False
        wait(POLL_MS * 2)

def round_spin():
    # imu.reset_heading() + imu.heading() + imu.rotation() + imu.angular_velocity()
    announce(Color.CYAN)
    hub.imu.reset_heading(0)
    sw = StopWatch()
    while True:
        h = hub.imu.heading()
        rot = hub.imu.rotation(Axis.Z)
        rate = hub.imu.angular_velocity(Axis.Z)
        # Light tracks spin speed so the player has feedback.
        if abs(rate) >= SPIN_MIN_RATE:
            hub.light.on(Color.GREEN)
        else:
            hub.light.on(Color.CYAN)
        if abs(h) >= SPIN_TARGET_DEG and abs(rot) >= SPIN_TARGET_DEG:
            return True
        if sw.time() > SPIN_TIMEOUT_MS:
            return False
        wait(POLL_MS)

def round_shake():
    # imu.acceleration()
    announce(Color.RED)
    sw = StopWatch()
    threshold_sq = SHAKE_THRESHOLD * SHAKE_THRESHOLD
    while True:
        ax, ay, az = hub.imu.acceleration()
        mag_sq = ax * ax + ay * ay + az * az
        if mag_sq > threshold_sq:
            return True
        hub.light.on(Color.RED)
        if sw.time() > SHAKE_TIMEOUT_MS:
            return False
        wait(20)

# --- Main -----------------------------------------------------------------

ROUNDS = [
    ("freeze", round_freeze),
    ("tilt",   round_tilt),
    ("side",   round_side),
    ("spin",   round_spin),
    ("shake",  round_shake),
]

wait_for_ready()

for name, run_round in ROUNDS:
    while True:
        print("Round:", name)
        if run_round():
            pass_round()
            break
        fail_round()
        wait(400)

# Victory: imu.orientation() + rainbow flourish.
matrix = hub.imu.orientation()
print("Final orientation matrix:", matrix)

for color in (Color.GREEN, Color.YELLOW, Color.MAGENTA, Color.CYAN,
              Color.ORANGE, Color.WHITE):
    hub.light.on(color)
    wait(180)
hub.light.blink(Color.GREEN, [400, 200])
wait(4000)
hub.light.off()
