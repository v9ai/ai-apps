# Joc de pinball pentru Bogdan.
# Apasa butonul verde de pe hub -> motorul se roteste si trimite bila.

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

# Portul A: motorul care misca paleta
# bricks:motor=spike-large
launcher = Motor(Port.A, Direction.CLOCKWISE)

# Numerele astea le poti schimba ca sa faci jocul mai surprinzator:
LAUNCH_SPEED = 800   # cat de tare se invarte motorul
LAUNCH_ANGLE = 360   # cat de mult se invarte (grade)

hub.light.on(Color.WHITE)


while True:
    # Apasa butonul verde ca sa lansezi bila
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
