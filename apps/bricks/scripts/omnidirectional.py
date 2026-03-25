from pybricks.hubs import MoveHub
from pybricks.parameters import Button, Color, Direction, Port
from pybricks.pupdevices import Motor, Remote
from pybricks.tools import wait

# --- Hub setup ---
hub = MoveHub()

# --- 4 motors: left side (A, C) and right side (B, D) ---
# Flip Direction if a wheel spins the wrong way for your build.
left_front  = Motor(Port.A, Direction.COUNTERCLOCKWISE)
left_rear   = Motor(Port.C, Direction.COUNTERCLOCKWISE)
right_front = Motor(Port.B, Direction.CLOCKWISE)
right_rear  = Motor(Port.D, Direction.CLOCKWISE)

# --- Connect Powered UP Remote (train remote) ---
# Press the green button on the remote BEFORE running this script.
hub.light.blink(Color.YELLOW, [500, 500])
remote = Remote(timeout=None)
hub.light.on(Color.GREEN)

SPEED = 100   # max power for all movements

# Battery monitoring
BATTERY_LOW_MV = 7200
CHECK_INTERVAL_MS = 5000
LOW_BATTERY_WARN_MS = 60000

low_battery_timer = 0
last_check = 0
battery_warning = False

# --- Main loop ---
# Button map:
#   RIGHT_PLUS  → all 4 wheels forward, max speed
#   RIGHT_MINUS → all 4 wheels backward, max speed
#   RIGHT (red) → tank turn right: left side forward, right side backward
#   LEFT  (red) → tank turn left:  right side forward, left side backward
#   LEFT_PLUS   → only A (left_front) and C (left_rear) run forward
#   LEFT_MINUS  → only B (right_front) and D (right_rear) run forward
while True:
    pressed = remote.buttons.pressed()

    # CENTER button → emergency stop
    if Button.CENTER in pressed:
        left_front.dc(0)
        left_rear.dc(0)
        right_front.dc(0)
        right_rear.dc(0)
        hub.light.on(Color.RED)
        remote.light.on(Color.RED)
        wait(50)
        continue

    if Button.RIGHT in pressed:
        # Tank turn right: left side forward, right side backward.
        left_front.dc(SPEED)
        left_rear.dc(SPEED)
        right_front.dc(-SPEED)
        right_rear.dc(-SPEED)
        remote.light.on(Color.ORANGE)

    elif Button.LEFT in pressed:
        # Tank turn left: right side forward, left side backward.
        left_front.dc(-SPEED)
        left_rear.dc(-SPEED)
        right_front.dc(SPEED)
        right_rear.dc(SPEED)
        remote.light.on(Color.ORANGE)

    elif Button.RIGHT_PLUS in pressed:
        # All 4 wheels forward, max speed.
        left_front.dc(SPEED)
        left_rear.dc(SPEED)
        right_front.dc(SPEED)
        right_rear.dc(SPEED)
        remote.light.on(Color.GREEN)

    elif Button.RIGHT_MINUS in pressed:
        # All 4 wheels backward, max speed.
        left_front.dc(-SPEED)
        left_rear.dc(-SPEED)
        right_front.dc(-SPEED)
        right_rear.dc(-SPEED)
        remote.light.on(Color.RED)

    elif Button.LEFT_PLUS in pressed:
        # Only A (left_front) and C (left_rear).
        left_front.dc(SPEED)
        left_rear.dc(SPEED)
        right_front.dc(0)
        right_rear.dc(0)
        remote.light.on(Color.CYAN)

    elif Button.LEFT_MINUS in pressed:
        # Only B (right_front) and D (right_rear).
        left_front.dc(0)
        left_rear.dc(0)
        right_front.dc(SPEED)
        right_rear.dc(SPEED)
        remote.light.on(Color.CYAN)

    else:
        left_front.dc(0)
        left_rear.dc(0)
        right_front.dc(0)
        right_rear.dc(0)
        remote.light.on(Color.WHITE)

    # Battery check
    last_check += 20
    if last_check >= CHECK_INTERVAL_MS:
        last_check = 0
        voltage = hub.battery.voltage()
        if voltage >= BATTERY_LOW_MV:
            low_battery_timer = 0
            battery_warning = False
        else:
            low_battery_timer += CHECK_INTERVAL_MS
            battery_warning = low_battery_timer <= LOW_BATTERY_WARN_MS

    if battery_warning:
        hub.light.on(Color.YELLOW)

    wait(20)
