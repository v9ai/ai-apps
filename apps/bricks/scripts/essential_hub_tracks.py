from pybricks.hubs import EssentialHub
from pybricks.pupdevices import Motor, ColorSensor
from pybricks.parameters import Port, Color
from pybricks.tools import wait

hub = EssentialHub()

# Startup battery indicator
voltage = hub.battery.voltage()
if voltage > 7000:
    hub.light.on(Color.GREEN)
else:
    hub.light.on(Color.YELLOW)
wait(2000)
hub.light.on(Color.WHITE)

motor = None
sensor = ColorSensor(Port.B)
sensor.detectable_colors([Color.GREEN, Color.RED, Color.NONE])

# Battery monitoring
BATTERY_LOW_MV = 7200
CHECK_INTERVAL_MS = 5000

last_check = 0

while True:
    # Try to detect motor if not yet connected
    if motor is None:
        try:
            motor = Motor(Port.A)
        except OSError:
            pass

    color = sensor.color()

    if color == Color.GREEN:
        if motor:
            motor.dc(-100)
        hub.light.on(Color.GREEN)
    elif color == Color.RED:
        if motor:
            motor.stop()
        hub.light.on(Color.RED)

    # Battery check
    last_check += 50
    if last_check >= CHECK_INTERVAL_MS:
        last_check = 0
        voltage = hub.battery.voltage()
        if voltage < BATTERY_LOW_MV:
            hub.light.on(Color.YELLOW)
            if motor:
                motor.stop()

    wait(50)
