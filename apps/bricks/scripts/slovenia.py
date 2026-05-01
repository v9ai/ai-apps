from pybricks.hubs import CityHub
from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color, Button
from pybricks.tools import wait

H = CityHub()
L = ColorLightMatrix(Port.B)

W, B, R, K = Color.WHITE, Color.BLUE, Color.RED, Color.NONE
SLO = [W, B, R, W, B, R, W, B, R]
L.on(SLO)


# Litere 3x3. Fiecare = tuple de 3 coloane; fiecare coloana = (top, mid, bot).
# Desenul in comentariu este cum apare litera pe matrice.
F = {
    # .##
    # .#.
    # ##.
    "S": ((0, 0, 1), (1, 1, 1), (1, 0, 0)),
    # #..
    # #..
    # ###
    "L": ((1, 1, 1), (0, 0, 1), (0, 0, 1)),
    # ###
    # #.#
    # ###
    "O": ((1, 1, 1), (1, 0, 1), (1, 1, 1)),
    # #.#
    # #.#
    # .#.
    "V": ((1, 1, 0), (0, 0, 1), (1, 1, 0)),
    # ###
    # ##.
    # ###
    "E": ((1, 1, 1), (1, 1, 1), (1, 0, 1)),
    # ##.
    # #.#
    # .##
    "N": ((1, 1, 0), (1, 0, 1), (0, 1, 1)),
    # ###
    # .#.
    # ###
    "I": ((1, 0, 1), (1, 1, 1), (1, 0, 1)),
    # .#.
    # ###
    # #.#
    "A": ((0, 1, 1), (1, 1, 0), (0, 1, 1)),
}


def st():
    return Button.CENTER in H.buttons.pressed()


while st():
    wait(20)


def render(letter):
    # 3-col letter -> 9 pixeli (row-major), totul in alb.
    return [W * 100 if letter[c][r] else K for r in range(3) for c in range(3)]


# Afiseaza fiecare litera pe rand: ~700ms aprinsa, ~180ms pauza neagra.
for ch in "SLOVENIA":
    if st():
        break
    L.on(render(F[ch]))
    wait(700)
    L.on([K] * 9)
    wait(180)


# Final: steagul Sloveniei tine pana la al doilea press
L.on(SLO)
while not st():
    wait(50)

L.off()
