# Test fara motor: doar LED-ul hub-ului, ca sa verificam ca hub-ul ruleaza cod.
from pybricks.hubs import CityHub as Hub
from pybricks.parameters import Color
from pybricks.tools import wait

hub = Hub()

hub.light.on(Color.RED)
wait(1000)
hub.light.on(Color.GREEN)
wait(1000)
hub.light.on(Color.BLUE)
wait(1000)
hub.light.on(Color.WHITE)
wait(2000)
