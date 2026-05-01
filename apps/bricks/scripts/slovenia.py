from pybricks.hubs import CityHub
from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color, Button
from pybricks.tools import wait
import urandom

H = CityHub()
L = ColorLightMatrix(Port.B)

W, B, R, K = Color.WHITE, Color.BLUE, Color.RED, Color.NONE

# Matricea e montata rotita 90° (sens orar). Scriem in spatiu "fizic"
# (cum vede ochiul) si rot() compenseaza pentru hardware.
ROTATION = 90

def rot(p):
    if ROTATION == 90:
        return [p[c * 3 + 2 - r] for r in range(3) for c in range(3)]
    return list(p)

SLO_PHYS = [W, W, W, B, B, B, R, R, R]
SLO = rot(SLO_PHYS)
L.on(SLO)

def st():
    return Button.CENTER in H.buttons.pressed()

while st(): wait(20)

def sh(p, ms):
    L.on(rot(p))
    wait(ms)
    return st()

# Litere 3x3 (forma fizica): 3 coloane (top, mid, bot)
F = {
    "S": ((0, 0, 1), (1, 1, 1), (1, 0, 0)),
    "L": ((1, 1, 1), (0, 0, 1), (0, 0, 1)),
    "O": ((1, 1, 1), (1, 0, 1), (1, 1, 1)),
    "V": ((1, 1, 0), (0, 0, 1), (1, 1, 0)),
    "E": ((1, 1, 1), (1, 0, 1), (1, 0, 1)),
    "N": ((1, 1, 0), (1, 0, 1), (0, 1, 1)),
    "I": ((1, 0, 1), (1, 1, 1), (1, 0, 1)),
    "A": ((0, 1, 1), (1, 1, 0), (0, 1, 1)),
}

def text():
    for ch in "SLOVENIA":
        if st(): return 1
        ph = [W * 100 if F[ch][c][r] else K for r in range(3) for c in range(3)]
        L.on(rot(ph))
        wait(650)
        L.on([K] * 9)
        wait(150)

CR = (W, B, R)

def fl(b):
    return [CR[r] * b for r in range(3) for _ in range(3)]

# 5 animatii steag
def f1():
    for _ in range(18):
        if sh(SLO_PHYS, 100): return 1

def f2():
    for _ in range(3):
        for b in (12, 35, 60, 85, 100, 85, 60, 35, 12):
            if sh(fl(b), 70): return 1

LV = (100, 85, 65, 45, 28, 22, 28, 45, 65, 85)
def f3():
    for i in range(36):
        p = [CR[r] * LV[(i + r + c) % 10] for r in range(3) for c in range(3)]
        if sh(p, 70): return 1

def f4():
    for _ in range(32):
        p = list(SLO_PHYS)
        p[urandom.randint(0, 8)] = W * 100
        p[urandom.randint(0, 8)] = W * 100
        if sh(p, 80): return 1

def f5():
    for _ in range(3):
        for a in range(3):
            p = [CR[r] * (100 if r == a else 18) for r in range(3) for _ in range(3)]
            for _ in range(7):
                if sh(p, 100): return 1

A = (f1, f2, f3, f4, f5)

while not st():
    if text(): break
    for f in A:
        if f(): break
        if st(): break

L.off()
