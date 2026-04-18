# Joc de pinball pentru Bogdan.
# Motorul se roteste incet, continuu.
# Ca sa oprim programul: tinem butonul verde apasat 2s (hub-ul se stinge).

from pybricks.hubs import CityHub as Hub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Color, Direction
from pybricks.tools import wait

hub = Hub()
hub.light.on(Color.GREEN)

# bricks:motor=spike-large
launcher = Motor(Port.A, Direction.CLOCKWISE)

SPEED = 150   # incet si constant
launcher.run(SPEED)

# Ruleaza la nesfarsit - hub.system il tine pornit
while True:
    wait(1000)
