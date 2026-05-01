from pybricks.hubs import CityHub
from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color, Button
from pybricks.tools import wait

H = CityHub()
L = ColorLightMatrix(Port.B)

# Steagul Sloveniei (matrice rotita 90°: pe coloane = dungi orizontale)
W, B, R, K = Color.WHITE, Color.BLUE, Color.RED, Color.NONE
SLO = [W, B, R, W, B, R, W, B, R]
L.on(SLO)

# Litere 3x3 — fiecare e o lista de 3 coloane (top, mid, bot bits)
# 1 = aprins, 0 = stins. Ordinea: stanga -> dreapta.
F = {
    "S": ((1, 1, 1), (1, 1, 0), (1, 0, 1)),
    "L": ((1, 1, 1), (0, 0, 1), (0, 0, 1)),
    "O": ((1, 1, 1), (1, 0, 1), (1, 1, 1)),
    "V": ((1, 1, 0), (0, 0, 1), (1, 1, 0)),
    "E": ((1, 1, 1), (1, 1, 1), (1, 0, 1)),
    "N": ((1, 1, 1), (0, 1, 0), (1, 1, 1)),
    "I": ((1, 0, 1), (1, 1, 1), (1, 0, 1)),
    "A": ((0, 1, 1), (1, 1, 1), (0, 1, 1)),
}

def st():
    return Button.CENTER in H.buttons.pressed()

while st(): wait(20)

# Construieste banda de coloane: blank x3, apoi fiecare litera + 1 col blank,
# apoi blank x3.
BLANK = (0, 0, 0)
band = [BLANK] * 3
for ch in "SLOVENIA":
    for col in F[ch]:
        band.append(col)
    band.append(BLANK)
band += [BLANK] * 2

# Scroll lent, totul in alb.
for off in range(len(band) - 2):
    if st(): break
    pixels = []
    for r in range(3):
        for c in range(3):
            pixels.append(W * 100 if band[off + c][r] else K)
    L.on(pixels)
    wait(320)

# Final: arata steagul ferm cateva secunde, apoi pulseaza usor.
L.on(SLO)
wait(800)

# Pulse 6 cicluri pe steag
for _ in range(6):
    if st(): break
    for b in (60, 80, 100, 80, 60):
        if st(): break
        L.on([c * b for c in SLO])
        wait(80)

# Steag final, ramane pana la al doilea press
L.on(SLO)
while not st():
    wait(50)

L.off()
