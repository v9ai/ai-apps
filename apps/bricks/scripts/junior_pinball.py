# Joc de pinball pentru Bogdan.
# Motor pe Port A, ruleaza continuu la 150.
# Bateria se afiseaza periodic in consola.
# Stop: tinem butonul verde apasat 2s.

from pybricks.hubs import CityHub as Hub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Color, Direction
from pybricks.tools import wait, StopWatch

hub = Hub()
hub.light.on(Color.GREEN)

# bricks:motor=spike-large
launcher = Motor(Port.A, Direction.CLOCKWISE)

SPEED = 150
launcher.run(SPEED)

print("boot battery:", hub.battery.voltage(), "mV current:", hub.battery.current(), "mA")

watch = StopWatch()
last_print = 0

while True:
    if watch.time() - last_print > 2000:
        v = hub.battery.voltage()
        i = hub.battery.current()
        print("v=", v, "mV i=", i, "mA")
        if v < 6200:
            hub.light.on(Color.YELLOW)
        last_print = watch.time()
    wait(50)
