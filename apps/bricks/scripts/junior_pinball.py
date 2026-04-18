# Joc de pinball pentru Bogdan.
# Motorul de pe portul A trage paleta si lanseaza bila.
# Apasa butonul hub-ului ca sa lansezi bila.

# Alege hub-ul tau: scoate # din fata randului potrivit si pune # la celelalte.
from pybricks.hubs import PrimeHub as Hub
# from pybricks.hubs import EssentialHub as Hub
# from pybricks.hubs import InventorHub as Hub
# from pybricks.hubs import TechnicHub as Hub
# from pybricks.hubs import CityHub as Hub
# from pybricks.hubs import MoveHub as Hub

from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Color, Direction, Button
from pybricks.tools import wait
from urandom import randint

hub = Hub()

# Portul A: motorul care misca paleta
launcher = Motor(Port.A, Direction.CLOCKWISE)

# Numerele astea le poti schimba ca sa faci jocul mai surprinzator:
COCK_ANGLE = 120           # cat de mult trage paleta inapoi
MIN_LAUNCH_SPEED = 400     # cel mai incet impinge paleta
MAX_LAUNCH_SPEED = 1100    # cel mai tare impinge paleta
RESET_SPEED = 250          # viteza cu care se intoarce paleta

hub.light.on(Color.WHITE)


def launch():
    # Trage paleta inapoi
    launcher.run_angle(RESET_SPEED, -COCK_ANGLE)
    wait(200)

    # Alege o putere oricare intre minim si maxim - asa jocul te surprinde
    power = randint(MIN_LAUNCH_SPEED, MAX_LAUNCH_SPEED)
    hub.light.on(Color.RED)
    launcher.run_angle(power, COCK_ANGLE)
    hub.light.on(Color.GREEN)
    wait(400)
    hub.light.on(Color.WHITE)


while True:
    # Apasa butonul din mijlocul hub-ului ca sa lansezi bila
    if Button.CENTER in hub.buttons.pressed():
        launch()
        # asteapta sa ridici degetul, ca sa nu lanseze iar si iar
        while Button.CENTER in hub.buttons.pressed():
            wait(20)

    wait(30)
