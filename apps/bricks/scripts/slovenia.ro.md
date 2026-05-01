---
title: Steagul Sloveniei pe Matricea 3×3 Color Light (CityHub)
---

# Steagul Sloveniei pe Matricea 3×3 Color Light

Afisam steagul Sloveniei — 3 dungi orizontale (alb, albastru, rosu) — pe
**Matricea 3×3 Color Light** (cod LEGO [45608](/parts/45608)) folosind un
**CityHub**.

## Conexiuni

- **Hub:** CityHub
- **Matrice Color Light:** Port B (CityHub are doar porturile A si B)

## Cum functioneaza

Steagul Sloveniei are 3 dungi orizontale. Matricea este o grila 3×3 de pixeli
RGB, deci fiecare dunga ocupa cate un rand intreg:

| Rand | Culoare |
|------|---------|
| 0 (sus)    | `Color.WHITE` |
| 1 (mijloc) | `Color.BLUE`  |
| 2 (jos)    | `Color.RED`   |

`ColorLightMatrix.on([...])` primeste o lista de 9 culori in ordine
*rand-cu-rand* (stanga-dreapta, sus-jos). Lista de mai jos reprezinta direct
steagul.

## Cum il pornesti

1. Conecteaza CityHub-ul prin [Pybricks Code](https://code.pybricks.com).
2. Conecteaza Matricea Color Light pe **portul B**.
3. Ruleaza scriptul. Matricea aprinde steagul si ramane asa pana opresti
   programul.
