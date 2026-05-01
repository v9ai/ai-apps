---
title: Slovenia Flag on the Color Light Matrix (CityHub)
heroImage: /hubs/hub-city.png
---

# Slovenia Flag on the 3×3 Color Light Matrix

Display the Slovenia flag — three horizontal stripes (white, blue, red) — on the
LEGO **3×3 Color Light Matrix** (part [45608](/parts/45608)) using a **CityHub**.

## Wiring

- **Hub:** CityHub
- **Color Light Matrix:** Port B (the CityHub only exposes ports A and B)

## How it works

Slovenia's flag has three horizontal stripes. The matrix is a 3×3 grid of RGB
pixels, so each stripe maps to one row:

| Row | Color |
|-----|-------|
| 0 (top)    | `Color.WHITE` |
| 1 (middle) | `Color.BLUE`  |
| 2 (bottom) | `Color.RED`   |

`ColorLightMatrix.on([...])` accepts a list of 9 colors in row-major order
(left-to-right, top-to-bottom). The list below maps directly to the flag.

## Run it

1. Pair your CityHub via [Pybricks Code](https://code.pybricks.com).
2. Plug the Color Light Matrix into **Port B**.
3. Flash the script. The matrix lights up with the Slovenia flag and stays on
   until you stop the program.
