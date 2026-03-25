#!/usr/bin/env pybricks-micropython
from pybricks.hubs import EssentialHub
from pybricks.pupdevices import Motor, Remote
from pybricks.parameters import Port, Direction, Button, Color

from pybricks.tools import wait

# Initialize the hub
hub = EssentialHub()

# Individual motors — no DriveBase, each side driven independently
left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)
right_motor = Motor(Port.B)

# Wait for the remote to connect
hub.light.on(Color.ORANGE)
remote = Remote(timeout=None)
hub.light.on(Color.GREEN)
wait(500)

SPEED = 1000  # degrees per second (max)

# Battery monitoring
BATTERY_LOW_MV = 7200
CHECK_INTERVAL_MS = 5000
LOW_BATTERY_WARN_MS = 60000

low_battery_timer = 0
last_check = 0
battery_warning = False

while True:
    pressed = remote.buttons.pressed()

    # CENTER button → emergency stop
    if Button.CENTER in pressed:
        left_motor.stop()
        right_motor.stop()
        hub.light.on(Color.RED)
        remote.light.on(Color.RED)
        wait(10)
        continue

    # --- Left side buttons → left motor ---
    if Button.LEFT_PLUS in pressed:
        left_motor.run(SPEED)       # forward
    elif Button.LEFT_MINUS in pressed:
        left_motor.run(-SPEED)      # backward
    else:
        left_motor.stop()

    # --- Right side buttons → right motor ---
    # RIGHT_MINUS goes FORWARD only when BOTH LEFT_PLUS and RIGHT_PLUS are pressed
    both_plus = Button.LEFT_PLUS in pressed and Button.RIGHT_PLUS in pressed

    if Button.RIGHT_MINUS in pressed and both_plus:
        right_motor.run(SPEED)      # combo: forward
    elif Button.RIGHT_PLUS in pressed:
        right_motor.run(SPEED)      # forward
    elif Button.RIGHT_MINUS in pressed:
        right_motor.run(-SPEED)     # backward
    else:
        right_motor.stop()

    # Battery check
    last_check += 10
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

    wait(10)
