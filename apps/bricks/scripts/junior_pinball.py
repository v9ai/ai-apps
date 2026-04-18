# Joc de pinball pentru Bogdan.
# Motorul de pe portul A trage paleta si lanseaza bila.
# Apasa butonul hub-ului, sau arata cartonasa verde senzorului de pe B.

from pybricks.hubs import EssentialHub
from pybricks.pupdevices import Motor, ColorSensor
from pybricks.parameters import Port, Color, Direction, Button
from pybricks.tools import wait
from urandom import randint

hub = EssentialHub()

# Portul A: motorul care misca paleta
# Portul B: senzorul care vede cartonasele colorate
launcher = Motor(Port.A, Direction.CLOCKWISE)
sensor = None
try:
    sensor = ColorSensor(Port.B)
    sensor.detectable_colors([Color.RED, Color.YELLOW, Color.GREEN, Color.NONE])
except OSError:
    sensor = None

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
    # Trigger 1 — center hub button
    if Button.CENTER in hub.buttons.pressed():
        launch()
        # wait for release to avoid repeat triggers
        while Button.CENTER in hub.buttons.pressed():
            wait(20)

    # Trigger 2 — a colored card near the sensor
    if sensor is not None:
        color = sensor.color()
        if color == Color.GREEN:
            launch()
        elif color == Color.RED:
            # Obstacle/tilt card — brief pause, no launch
            hub.light.on(Color.YELLOW)
            wait(600)
            hub.light.on(Color.WHITE)

    wait(30)
