from pybricks.hubs import CityHub
from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color, Button
from pybricks.tools import wait
import urandom

H = CityHub()
L = ColorLightMatrix(Port.B)

# Pe coloane in cod = dungi orizontale fizic (matricea e rotita 90°)
W, B, R, K = Color.WHITE, Color.BLUE, Color.RED, Color.NONE
SLO = [W, B, R, W, B, R, W, B, R]
COL = (W, B, R)
LV = (100, 92, 78, 60, 42, 28, 22, 28, 42, 60, 78, 92)
NL = len(LV)

L.on(SLO)

def st():
    return Button.CENTER in H.buttons.pressed()

while st(): wait(20)

def sh(p, ms):
    L.on(p)
    wait(ms)
    return st()

def fl(b):
    return [c * b for c in SLO]

# 1 steag static
def a1():
    for _ in range(15):
        if sh(SLO, 100): return 1

# 2 pulse
def a2():
    for _ in range(2):
        for b in (10, 30, 55, 80, 100, 80, 55, 30, 10):
            if sh(fl(b), 70): return 1

# 3 wave diagonal
def a3():
    for i in range(35):
        p = []
        for k in range(9):
            c, r = k % 3, k // 3
            p.append(COL[c] * LV[(i + (r + c) * 2) % NL])
        if sh(p, 70): return 1

# 4 sparkle
def a4():
    for _ in range(35):
        p = list(SLO)
        p[urandom.randint(0, 8)] = W * 100
        p[urandom.randint(0, 8)] = W * 100
        if sh(p, 80): return 1

# 5 spinner perimeter
PR = (0, 1, 2, 5, 8, 7, 6, 3)
def a5():
    for _ in range(2):
        for h in PR:
            p = [c * 20 for c in SLO]
            p[h] = W * 100
            if sh(p, 110): return 1

# 6 snake (cap+coada)
PT = (0, 1, 2, 5, 4, 3, 6, 7, 8)
def a6():
    for _ in range(3):
        for k in range(12):
            p = [K] * 9
            for j in range(3):
                q = k - j
                if 0 <= q < 9:
                    p[PT[q]] = Color.GREEN * (100 - j * 30)
            if sh(p, 110): return 1

# 7 rotire dungi
def a7():
    for s in range(9):
        o = (COL[s % 3], COL[(s + 1) % 3], COL[(s + 2) % 3])
        p = [o[k % 3] for k in range(9)]
        if sh(p, 320): return 1

# 8 rainbow per pixel (HSV)
def a8():
    for t in range(50):
        p = [Color(h=(t * 7 + k * 40) % 360, s=100, v=80) for k in range(9)]
        if sh(p, 70): return 1

# 9 expansiune din centru
RG = ((4,), (1, 3, 5, 7), (0, 2, 6, 8))
def a9():
    for _ in range(2):
        for r in range(4):
            p = [K] * 9
            for ri in range(r):
                for k in RG[ri]:
                    p[k] = COL[ri]
            if sh(p, 220): return 1

# 10 heartbeat
def a0():
    for _ in range(3):
        for b in (30, 70, 100, 70, 30):
            if sh(fl(b), 55): return 1
        if sh(fl(0), 90): return 1
        for b in (50, 90, 50):
            if sh(fl(b), 55): return 1
        if sh(fl(0), 350): return 1

A = (a1, a2, a3, a4, a5, a6, a7, a8, a9, a0)

while not st():
    for f in A:
        if f(): break
    if st(): break

L.off()
