# Joc de pinball pentru Bogdan.
# Motor pe Port A. Senzor culoare pe Port B.
# Rosu = comuta intre FAST(1000) si SLOW(400). Start la 150.
# Bateria se afiseaza periodic in consola.
# Stop: tinem butonul verde apasat 2s.

from pybricks.hubs import CityHub as Hub
from pybricks.pupdevices import Motor, ColorSensor
from pybricks.parameters import Port, Color, Direction
from pybricks.tools import wait, StopWatch

hub = Hub()
hub.light.on(Color.GREEN)

# bricks:motor=spike-large
launcher = Motor(Port.A, Direction.CLOCKWISE)
# bricks:sensor=color
sensor = ColorSensor(Port.B)

START = 150
SLOW = 400
FAST = 1000

speed = START
launcher.run(speed)

# CityHub: 6xAAA, ~9000mV plin, brownout sub ~6000mV.
print("boot battery:", hub.battery.voltage(), "mV current:", hub.battery.current(), "mA")

watch = StopWatch()
last_print = 0

while True:
    if sensor.color() == Color.RED:
        speed = SLOW if speed == FAST else FAST
        launcher.run(speed)
        hub.light.on(Color.RED if speed == FAST else Color.GREEN)
        while sensor.color() == Color.RED:
            wait(50)

    if watch.time() - last_print > 2000:
        v = hub.battery.voltage()
        i = hub.battery.current()
        print("v=", v, "mV i=", i, "mA speed=", speed)
        if v < 6200:
            hub.light.on(Color.YELLOW)
        last_print = watch.time()

    wait(50)
