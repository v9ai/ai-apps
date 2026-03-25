from pybricks.hubs import MoveHub
from pybricks.pupdevices import Motor, Remote
from pybricks.parameters import Port, Button, Color
from pybricks.tools import wait

# Initialize the hub
hub = MoveHub()

# Motors
motor_a = Motor(Port.A)
motor_b = Motor(Port.B)
motor_d = Motor(Port.D)

# Wait for the remote to connect
hub.light.on(Color.ORANGE)
remote = Remote(timeout=None)
hub.light.on(Color.GREEN)
wait(500)

SPEED = 1000        # degrees per second
SLOW_SPEED = 100    # slowest speed for port D

# Battery monitoring
BATTERY_LOW_MV = 7200
CHECK_INTERVAL_MS = 5000
LOW_BATTERY_WARN_MS = 60000

low_battery_timer = 0
last_check = 0
battery_warning = False

while True:
    pressed = remote.buttons.pressed()

    # CENTER button → stop all
    if Button.CENTER in pressed:
        motor_a.stop()
        motor_b.stop()
        motor_d.stop()
        hub.light.on(Color.RED)
        remote.light.on(Color.RED)
        wait(50)
        continue

    # LEFT PLUS: A forward, B backward
    # LEFT MINUS: A backward, B forward
    if Button.LEFT_PLUS in pressed:
        motor_a.run(SPEED)
        motor_b.run(-SPEED)
    elif Button.LEFT_MINUS in pressed:
        motor_a.run(-SPEED)
        motor_b.run(SPEED)
    # RIGHT PLUS: both forward
    # RIGHT MINUS: both backward
    elif Button.RIGHT_PLUS in pressed:
        motor_a.run(SPEED)
        motor_b.run(SPEED)
    elif Button.RIGHT_MINUS in pressed:
        motor_a.run(-SPEED)
        motor_b.run(-SPEED)
    else:
        motor_a.stop()
        motor_b.stop()

    # Red buttons → Port D motor
    # LEFT red: clockwise (slowest)
    # RIGHT red: anticlockwise (slowest)
    if Button.LEFT in pressed:
        motor_d.run(SLOW_SPEED)
    elif Button.RIGHT in pressed:
        motor_d.run(-SLOW_SPEED)
    else:
        motor_d.stop()

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

    # Hub light mirrors state (battery warning overrides)
    if battery_warning:
        hub.light.on(Color.YELLOW)
    elif Button.LEFT_PLUS in pressed or Button.RIGHT_PLUS in pressed:
        hub.light.on(Color.GREEN)
    elif Button.LEFT_MINUS in pressed or Button.RIGHT_MINUS in pressed:
        hub.light.on(Color.ORANGE)
    else:
        hub.light.on(Color.WHITE)

    wait(50)
