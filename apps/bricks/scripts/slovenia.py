from pybricks.hubs import CityHub
from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color
from pybricks.tools import wait

hub = CityHub()
lights = ColorLightMatrix(Port.B)

# Steagul Sloveniei rotit 90° — 3 dungi verticale: alb (stanga),
# albastru (mijloc), rosu (dreapta). Pe matricea 3x3 fiecare coloana
# este o dunga.
SLOVENIA = [
    Color.WHITE, Color.BLUE, Color.RED,
    Color.WHITE, Color.BLUE, Color.RED,
    Color.WHITE, Color.BLUE, Color.RED,
]

lights.on(SLOVENIA)

# Tinem programul activ ca matricea sa ramana aprinsa.
while True:
    wait(1000)
