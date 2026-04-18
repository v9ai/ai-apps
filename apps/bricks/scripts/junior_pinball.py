# Joc de pinball pentru Bogdan.
# La pornire motorul se roteste scurt (test).
# Apoi apasa butonul verde -> motorul face inca o rotatie.
# Ca sa oprestim programul: tine butonul apasat 2s (hub-ul se stinge).

# Alege hub-ul tau: scoate # din fata randului potrivit si pune # la celelalte.
# from pybricks.hubs import PrimeHub as Hub
# from pybricks.hubs import EssentialHub as Hub
# from pybricks.hubs import InventorHub as Hub
# from pybricks.hubs import TechnicHub as Hub
from pybricks.hubs import CityHub as Hub
# from pybricks.hubs import MoveHub as Hub

from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Color, Direction, Button
from pybricks.tools import wait

hub = Hub()

# Pe CityHub butonul verde opreste programul by default.
# Il dezactivam ca sa-l putem folosi ca trigger pentru motor.
hub.system.set_stop_button(None)

# Portul A: motorul care misca paleta
# bricks:motor=spike-large
launcher = Motor(Port.A, Direction.CLOCKWISE)

LAUNCH_SPEED = 800   # cat de tare se invarte motorul
LAUNCH_ANGLE = 360   # cat de mult se invarte (grade)

# Test la pornire: rotatie scurta ca sa vezi ca motorul merge
hub.light.on(Color.ORANGE)
launcher.run_angle(400, 180)
hub.light.on(Color.WHITE)


while True:
    if Button.CENTER in hub.buttons.pressed():
        hub.light.on(Color.RED)
        launcher.run_angle(LAUNCH_SPEED, LAUNCH_ANGLE)
        hub.light.on(Color.GREEN)
        wait(300)
        hub.light.on(Color.WHITE)

        # asteapta sa ridici degetul, ca sa nu lanseze iar si iar
        while Button.CENTER in hub.buttons.pressed():
            wait(20)

    wait(30)
