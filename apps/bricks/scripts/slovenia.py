from pybricks.hubs import CityHub
from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color, Button
from pybricks.tools import wait

hub = CityHub()
lights = ColorLightMatrix(Port.B)


# Steagul Sloveniei rotit 90° — 3 dungi verticale (alb, albastru, rosu)
# care apar pe matricea 3x3 ca 3 dungi orizontale (matricea e montata invartit).
def stripes(white_pct, blue_pct, red_pct):
    w = Color.WHITE * white_pct
    b = Color.BLUE * blue_pct
    r = Color.RED * red_pct
    return [
        w, b, r,
        w, b, r,
        w, b, r,
    ]


def stop_requested():
    """Butonul verde este apasat? (al doilea press = oprire)"""
    return Button.CENTER in hub.buttons.pressed()


# La start, butonul probabil inca e tinut de la pornire — asteptam eliberarea
# ca sa nu inchidem programul instant.
while stop_requested():
    wait(20)


# ── Animatia 1: intro — fiecare dunga se aprinde pe rand ──────────────
def fade_in_stripe(target, on_white, on_blue, on_red):
    for pct in range(0, 101, 8):
        if stop_requested():
            return True
        if target == "W":
            lights.on(stripes(pct, on_blue, on_red))
        elif target == "B":
            lights.on(stripes(on_white, pct, on_red))
        else:
            lights.on(stripes(on_white, on_blue, pct))
        wait(20)
    return False


stopped = (
    fade_in_stripe("W", 0, 0, 0)
    or fade_in_stripe("B", 100, 0, 0)
    or fade_in_stripe("R", 100, 100, 0)
)

if not stopped:
    # Mic respiro pe steagul plin
    for _ in range(30):
        if stop_requested():
            stopped = True
            break
        wait(20)


# ── Animatia 2: wave — fiecare dunga pulseaza decalat, pana la stop ──
LEVELS = [100, 95, 85, 72, 58, 45, 35, 30, 35, 45, 58, 72, 85, 95]
N = len(LEVELS)
PHASE_W = 0
PHASE_B = N // 3
PHASE_R = (2 * N) // 3

i = 0
while not stopped:
    if stop_requested():
        break
    w = LEVELS[(i + PHASE_W) % N]
    b = LEVELS[(i + PHASE_B) % N]
    r = LEVELS[(i + PHASE_R) % N]
    lights.on(stripes(w, b, r))
    i += 1
    wait(90)


# Stinge matricea cand utilizatorul apasa butonul a doua oara.
lights.off()
