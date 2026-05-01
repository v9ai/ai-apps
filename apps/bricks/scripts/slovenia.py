from pybricks.hubs import CityHub
from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color
from pybricks.tools import wait

hub = CityHub()
lights = ColorLightMatrix(Port.A)

# Steagul Sloveniei: 3 dungi orizontale — alb (sus), albastru (mijloc), rosu (jos).
# Pe matricea 3x3 mapam fiecare dunga la cate un rand de 3 pixeli.
SLOVENIA = [
    Color.WHITE, Color.WHITE, Color.WHITE,
    Color.BLUE,  Color.BLUE,  Color.BLUE,
    Color.RED,   Color.RED,   Color.RED,
]

lights.on(SLOVENIA)

# Tinem programul activ ca matricea sa ramana aprinsa.
while True:
    wait(1000)
