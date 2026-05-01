from pybricks.hubs import CityHub
from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color, Button
from pybricks.tools import wait
import urandom

H = CityHub()
L = ColorLightMatrix(Port.B)

W, B, R, K = Color.WHITE, Color.BLUE, Color.RED, Color.NONE

# ── Orientare matrice ─────────────────────────────────────────────────
# Matricea e montata rotita 90° (sens orar). Scriem desenele in forma
# fizica (asa cum le vede ochiul) si rotate() le adapteaza pentru hardware.
ROTATION = 90

def rotate(p):
    if ROTATION == 90:
        return [p[c * 3 + (2 - r)] for r in range(3) for c in range(3)]
    if ROTATION == 180:
        return [p[8 - i] for i in range(9)]
    if ROTATION == 270:
        return [p[(2 - c) * 3 + r] for r in range(3) for c in range(3)]
    return list(p)

SLO_PHYS = [W, W, W, B, B, B, R, R, R]
SLO = rotate(SLO_PHYS)
L.on(SLO)

def st():
    return Button.CENTER in H.buttons.pressed()

while st(): wait(20)

def show(p, ms):
    L.on(rotate(p))
    wait(ms)
    return st()

# ── Litere 3x3 ────────────────────────────────────────────────────────
F = {
    "S": ((0, 0, 1), (1, 1, 1), (1, 0, 0)),
    "L": ((1, 1, 1), (0, 0, 1), (0, 0, 1)),
    "O": ((1, 1, 1), (1, 0, 1), (1, 1, 1)),
    "V": ((1, 1, 0), (0, 0, 1), (1, 1, 0)),
    "E": ((1, 1, 1), (1, 1, 1), (1, 0, 1)),
    "N": ((1, 1, 0), (1, 0, 1), (0, 1, 1)),
    "I": ((1, 0, 1), (1, 1, 1), (1, 0, 1)),
    "A": ((0, 1, 1), (1, 1, 0), (0, 1, 1)),
}

def text():
    for ch in "SLOVENIA":
        if st(): return True
        ph = [W * 100 if F[ch][c][r] else K for r in range(3) for c in range(3)]
        L.on(rotate(ph))
        wait(650)
        L.on([K] * 9)
        wait(160)
    return False

# ── 5 animatii pentru steag (toate in spatiu fizic) ──────────────────
ROW_COL = (W, B, R)  # culoarea fiecarui rand fizic

def flag_b(b):
    return [ROW_COL[r] * b for r in range(3) for _ in range(3)]

# 1. Hold
def f1():
    for _ in range(18):
        if show(SLO_PHYS, 100): return True
    return False

# 2. Breathe
def f2():
    for _ in range(3):
        for b in (12, 35, 60, 85, 100, 85, 60, 35, 12):
            if show(flag_b(b), 70): return True
    return False

# 3. Diagonal wave
LV = (100, 88, 70, 50, 32, 22, 32, 50, 70, 88)
NL = len(LV)
def f3():
    for i in range(36):
        p = []
        for r in range(3):
            for c in range(3):
                p.append(ROW_COL[r] * LV[(i + r + c) % NL])
        if show(p, 70): return True
    return False

# 4. Sparkle
def f4():
    for _ in range(32):
        p = list(SLO_PHYS)
        p[urandom.randint(0, 8)] = W * 100
        p[urandom.randint(0, 8)] = W * 100
        if show(p, 80): return True
    return False

# 5. Stripe sweep
def f5():
    for _ in range(3):
        for active in range(3):
            p = []
            for r in range(3):
                br = 100 if r == active else 18
                for c in range(3):
                    p.append(ROW_COL[r] * br)
            for _ in range(7):
                if show(p, 100): return True
    return False

ANIMS = (f1, f2, f3, f4, f5)

# ── Bucla principala: text -> 5 animatii -> repeta ───────────────────
while not st():
    if text(): break
    for f in ANIMS:
        if f(): break
        if st(): break

L.off()
