from pybricks.hubs import CityHub
from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color, Button
from pybricks.tools import wait
import urandom

hub = CityHub()
lights = ColorLightMatrix(Port.B)

# Steagul de baza (afisat instant la pornire, inainte de animatie).
# Matricea e rotita 90°: pe coloane in cod = dungi orizontale fizic.
SLOVENIA = [
    Color.WHITE, Color.BLUE, Color.RED,
    Color.WHITE, Color.BLUE, Color.RED,
    Color.WHITE, Color.BLUE, Color.RED,
]
lights.on(SLOVENIA)

COLS = [Color.WHITE, Color.BLUE, Color.RED]
LEVELS = [100, 92, 78, 60, 42, 28, 22, 28, 42, 60, 78, 92]
N = len(LEVELS)

def stop():
    return Button.CENTER in hub.buttons.pressed()

while stop():
    wait(20)

sp = -1
sp_ttl = 0
i = 0
while not stop():
    pixels = []
    for idx in range(9):
        if idx == sp:
            pixels.append(Color.WHITE * 100)
            continue
        col = idx % 3
        row = idx // 3
        b = LEVELS[(i + (row + col) * 2) % N]
        pixels.append(COLS[col] * b)
    lights.on(pixels)
    if sp_ttl > 0:
        sp_ttl -= 1
        if sp_ttl == 0:
            sp = -1
    elif urandom.randint(0, 11) == 0:
        sp = urandom.randint(0, 8)
        sp_ttl = 2
    i += 1
    wait(70)

lights.off()
