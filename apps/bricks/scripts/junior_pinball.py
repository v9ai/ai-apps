# Test motor cu Direction explicit (ca in codul original care se urca ok).
from pybricks.hubs import CityHub as Hub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Color, Direction
from pybricks.tools import wait

hub = Hub()
hub.light.on(Color.ORANGE)
wait(500)

launcher = Motor(Port.A, Direction.CLOCKWISE)

hub.light.on(Color.RED)
launcher.run(500)
wait(2000)
launcher.stop()

hub.light.on(Color.GREEN)
wait(2000)
