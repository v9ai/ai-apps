# Joc de pinball pentru Bogdan.
# Motorul ruleaza continuu pe Port A.
# Senzor de culoare pe Port B: rosu = comuta intre viteza incet/maxim.
# Ca sa oprim programul: tinem butonul verde apasat 2s (hub-ul se stinge).

from pybricks.hubs import CityHub as Hub
from pybricks.pupdevices import Motor, ColorSensor
from pybricks.parameters import Port, Color, Direction
from pybricks.tools import wait

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

while True:
    if sensor.color() == Color.RED:
        speed = SLOW if speed == FAST else FAST
        launcher.run(speed)
        hub.light.on(Color.RED if speed == FAST else Color.GREEN)
        # debounce: asteapta sa nu mai fie rosu
        while sensor.color() == Color.RED:
            wait(50)
    wait(50)
