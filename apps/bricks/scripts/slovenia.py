from pybricks.hubs import CityHub
from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color, Button
from pybricks.tools import wait
import urandom

H = CityHub()
L = ColorLightMatrix(Port.B)

W, B, R, K = Color.WHITE, Color.BLUE, Color.RED, Color.NONE
ROTATION = 90

def rot(p):
    if ROTATION == 90:
        return [p[c * 3 + 2 - r] for r in range(3) for c in range(3)]
    return list(p)

CR = (W, B, R)
SLO = [W, W, W, B, B, B, R, R, R]
L.on(rot(SLO))

def st():
    return Button.CENTER in H.buttons.pressed()

while st(): wait(20)

def sh(p, ms):
    L.on(rot(p))
    wait(ms)
    return st()

def fl(b):
    return [CR[r] * b for r in range(3) for _ in range(3)]

def f1():
    for _ in range(18):
        if sh(SLO, 100): return 1

def f2():
    for _ in range(3):
        for b in (12, 35, 60, 85, 100, 85, 60, 35, 12):
            if sh(fl(b), 70): return 1

LV = (100, 88, 70, 50, 32, 22, 32, 50, 70, 88)
def f3():
    for i in range(36):
        p = [CR[r] * LV[(i + r + c) % 10] for r in range(3) for c in range(3)]
        if sh(p, 70): return 1

def f4():
    for _ in range(32):
        p = list(SLO)
        p[urandom.randint(0, 8)] = W * 100
        p[urandom.randint(0, 8)] = W * 100
        if sh(p, 80): return 1

def f5():
    for _ in range(3):
        for a in range(3):
            p = [CR[r] * (100 if r == a else 18) for r in range(3) for _ in range(3)]
            for _ in range(7):
                if sh(p, 95): return 1

def f6():
    for s in range(9):
        o = (CR[s % 3], CR[(s + 1) % 3], CR[(s + 2) % 3])
        p = [o[r] * 100 for r in range(3) for _ in range(3)]
        if sh(p, 320): return 1

RG = ((4,), (1, 3, 5, 7), (0, 2, 6, 8))
def f7():
    for _ in range(3):
        for n in range(4):
            p = [K] * 9
            for ri in range(n):
                for ix in RG[ri]:
                    p[ix] = CR[ix // 3] * 100
            if sh(p, 200): return 1

def f8():
    for _ in range(2):
        for col in range(4):
            p = [K] * 9
            for r in range(3):
                for c in range(col):
                    p[r * 3 + c] = CR[r] * 100
            if sh(p, 220): return 1
        if sh(SLO, 500): return 1
        for col in range(3, -1, -1):
            p = [K] * 9
            for r in range(3):
                for c in range(col):
                    p[r * 3 + c] = CR[r] * 100
            if sh(p, 180): return 1

def f9():
    for t in range(40):
        p = [Color(h=(t * 8 + (r + c) * 60) % 360, s=100, v=80)
             for r in range(3) for c in range(3)]
        if sh(p, 80): return 1

def f10():
    for _ in range(3):
        for b in (30, 70, 100, 70, 30):
            if sh(fl(b), 55): return 1
        if sh(fl(0), 90): return 1
        for b in (50, 90, 50):
            if sh(fl(b), 55): return 1
        if sh(fl(0), 350): return 1

A = (f1, f2, f3, f4, f5, f6, f7, f8, f9, f10)

while not st():
    for f in A:
        if f(): break
        if st(): break

L.off()
