"use client";

import { css } from "styled-system/css";

const sectionTitle = css({
  fontSize: "sm",
  fontWeight: "900",
  fontFamily: "display",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "ink.muted",
  mb: "3",
});

const card = css({
  mt: "6",
  bg: "plate.surface",
  rounded: "brick",
  border: "2px solid",
  borderColor: "plate.border",
  boxShadow: "brick",
  p: "6",
});

const para = css({
  fontSize: "sm",
  lineHeight: "1.7",
  color: "ink.primary",
  mb: "3",
});

const sub = css({
  fontSize: "md",
  fontWeight: "800",
  fontFamily: "display",
  color: "ink.primary",
  mt: "5",
  mb: "2",
});

const code = css({
  display: "block",
  bg: "#0d1117",
  color: "#c9d1d9",
  fontFamily: "mono",
  fontSize: "xs",
  lineHeight: "1.6",
  p: "4",
  rounded: "lg",
  border: "1px solid",
  borderColor: "plate.border",
  whiteSpace: "pre",
  overflowX: "auto",
});

const inlineCode = css({
  fontFamily: "mono",
  fontSize: "xs",
  bg: "plate.raised",
  px: "1.5",
  py: "0.5",
  rounded: "sm",
  color: "lego.orange",
});

const list = css({
  fontSize: "sm",
  lineHeight: "1.8",
  color: "ink.primary",
  pl: "5",
  mb: "3",
  listStyleType: "disc",
});

const tableWrap = css({
  overflowX: "auto",
  mb: "3",
});

const table = css({
  w: "full",
  fontSize: "xs",
  borderCollapse: "collapse",
  "& th, & td": {
    textAlign: "left",
    px: "3",
    py: "2",
    borderBottom: "1px solid",
    borderColor: "plate.border",
  },
  "& th": {
    fontWeight: "800",
    fontFamily: "display",
    color: "ink.muted",
    bg: "plate.raised",
  },
});

export default function SpikeLightMatrixInfoRO() {
  return (
    <div className={card}>
      <h2 className={sectionTitle}>Informatii (RO) — Matrice 3×3 Color Light</h2>

      <p className={para}>
        <strong>3×3 Color Light Matrix</strong> (cod LEGO <span className={inlineCode}>45608</span>) este
        un afisaj LED de 9 pixeli RGB inclus in setul <em>LEGO Education SPIKE Essential</em>.
        Fiecare pixel poate afisa orice culoare independent, ceea ce permite animatii, indicatori de
        stare, mini-iconite si jocuri simple direct pe robot.
      </p>

      <p className={para}>
        Se conecteaza prin port LPF2 (Powered Up), deci este compatibil cu toate hub-urile moderne:
        <span className={inlineCode}>CityHub</span>, <span className={inlineCode}>TechnicHub</span>,
        <span className={inlineCode}>MoveHub</span>, <span className={inlineCode}>PrimeHub</span> si
        <span className={inlineCode}>EssentialHub</span>.
      </p>

      <h3 className={sub}>Specificatii tehnice</h3>
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th>Caracteristica</th>
              <th>Valoare</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Numar LED-uri</td><td>9 (matrice 3×3)</td></tr>
            <tr><td>Tip pixel</td><td>RGB full-color, control individual</td></tr>
            <tr><td>Conector</td><td>LPF2 (Powered Up)</td></tr>
            <tr><td>Tensiune</td><td>~5 V (alimentat de hub)</td></tr>
            <tr><td>Consum tipic</td><td>~30–80 mA (in functie de luminozitate)</td></tr>
            <tr><td>Lansat in set</td><td>SPIKE Essential 45345 (2022)</td></tr>
            <tr><td>Driver Pybricks</td><td><code>pybricks.pupdevices.ColorLightMatrix</code></td></tr>
          </tbody>
        </table>
      </div>

      <h3 className={sub}>Utilizare cu Pybricks</h3>
      <p className={para}>
        Importam clasa si o initializam pe portul unde am conectat-o (ex. <span className={inlineCode}>Port.A</span>).
      </p>

      <code className={code}>{`from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color

lights = ColorLightMatrix(Port.A)

# Toate cele 9 LED-uri pe rosu
lights.on(Color.RED)

# Toate stinse
lights.off()`}</code>

      <h3 className={sub}>Pixel-cu-pixel (lista 3×3)</h3>
      <p className={para}>
        Metoda <span className={inlineCode}>on()</span> accepta si o lista de 9 culori (rand cu rand,
        de sus in jos, stanga-dreapta) ca sa controlam fiecare pixel separat:
      </p>

      <code className={code}>{`from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color

lights = ColorLightMatrix(Port.A)

# Steagul Romaniei (3 coloane: albastru, galben, rosu)
ALB = Color.BLUE
GLB = Color.YELLOW
ROS = Color.RED

lights.on([
    ALB, GLB, ROS,
    ALB, GLB, ROS,
    ALB, GLB, ROS,
])`}</code>

      <h3 className={sub}>Steagul Sloveniei</h3>
      <p className={para}>
        Steagul Sloveniei are 3 <strong>dungi orizontale</strong> (alb, albastru, rosu),
        deci pe matricea 3×3 fiecare dunga ocupa cate un rand intreg de 3 pixeli:
      </p>

      <code className={code}>{`from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color

lights = ColorLightMatrix(Port.A)

# Steagul Sloveniei (3 dungi orizontale: alb, albastru, rosu)
lights.on([
    Color.WHITE, Color.WHITE, Color.WHITE,
    Color.BLUE,  Color.BLUE,  Color.BLUE,
    Color.RED,   Color.RED,   Color.RED,
])`}</code>

      <p className={para}>
        Script rulabil complet (cu hub <span className={inlineCode}>CityHub</span>):{" "}
        <a
          href="/scripts/slovenia"
          className={css({
            color: "lego.blue",
            fontWeight: "700",
            textDecoration: "underline",
            fontFamily: "mono",
            fontSize: "xs",
          })}
        >
          slovenia.py
        </a>
        .
      </p>

      <h3 className={sub}>Pixel individual (intensitate)</h3>
      <p className={para}>
        Putem aprinde un singur pixel folosind <span className={inlineCode}>pixel(row, column, color)</span>.
        Coordonatele incep de la 0 (stanga-sus). Putem ajusta si <em>intensitatea</em> culorii cu metoda
        <span className={inlineCode}>Color.RED * 50</span> (procent 0–100).
      </p>

      <code className={code}>{`from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color
from pybricks.tools import wait

lights = ColorLightMatrix(Port.A)

# Pixel din mijloc, verde la 30% intensitate
lights.pixel(1, 1, Color.GREEN * 30)
wait(1000)

# Cele 4 colturi pe culori diferite
lights.pixel(0, 0, Color.RED)
lights.pixel(0, 2, Color.YELLOW)
lights.pixel(2, 0, Color.BLUE)
lights.pixel(2, 2, Color.MAGENTA)`}</code>

      <h3 className={sub}>Animatie simpla</h3>
      <p className={para}>
        Combinam <span className={inlineCode}>pixel()</span> cu <span className={inlineCode}>wait()</span>{" "}
        pentru o secventa luminoasa:
      </p>

      <code className={code}>{`from pybricks.pupdevices import ColorLightMatrix
from pybricks.parameters import Port, Color
from pybricks.tools import wait

lights = ColorLightMatrix(Port.A)

CULORI = [Color.RED, Color.ORANGE, Color.YELLOW,
          Color.GREEN, Color.CYAN, Color.BLUE,
          Color.MAGENTA, Color.WHITE, Color.RED]

while True:
    for i, c in enumerate(CULORI):
        r, k = divmod(i, 3)
        lights.off()
        lights.pixel(r, k, c)
        wait(120)`}</code>

      <h3 className={sub}>Culori predefinite (Pybricks)</h3>
      <ul className={list}>
        <li><span className={inlineCode}>Color.RED</span>, <span className={inlineCode}>Color.ORANGE</span>, <span className={inlineCode}>Color.YELLOW</span></li>
        <li><span className={inlineCode}>Color.GREEN</span>, <span className={inlineCode}>Color.CYAN</span>, <span className={inlineCode}>Color.BLUE</span></li>
        <li><span className={inlineCode}>Color.MAGENTA</span>, <span className={inlineCode}>Color.WHITE</span>, <span className={inlineCode}>Color.BLACK</span> (= stins)</li>
        <li>Culoare custom HSV: <span className={inlineCode}>Color(h=210, s=100, v=80)</span></li>
        <li>Intensitate: orice culoare * procent, ex. <span className={inlineCode}>Color.BLUE * 25</span></li>
      </ul>

      <h3 className={sub}>Idei de proiecte</h3>
      <ul className={list}>
        <li>Indicator de stare pentru un robot (verde = OK, galben = atentie, rosu = stop)</li>
        <li>Mini-joc Pong sau Snake pe matrice 3×3</li>
        <li>Afisaj de scor (numarare 0–9 cu pixeli aprinsi)</li>
        <li>Sageata directionala pentru un robot urmatoare-de-linie</li>
        <li>Indicator de baterie (3 verzi → 3 galbene → 3 rosii)</li>
        <li>Animatie de incarcare in timp ce ruleaza un task lent</li>
      </ul>

      <h3 className={sub}>Note de cablare si folosire</h3>
      <ul className={list}>
        <li>Portul A/B/C/D — orice port LPF2 al hub-ului functioneaza.</li>
        <li>Pe <strong>CityHub</strong> ai doar porturile A si B disponibile.</li>
        <li>Daca vrei sa o folosesti impreuna cu un motor mare (ex. Spike Large), atentie la consumul total — bateriile slabe duc la brownout.</li>
        <li>Se poate combina liber cu motoare, senzori si butoanele hub-ului in acelasi script.</li>
      </ul>

      <h3 className={sub}>Documentatie oficiala</h3>
      <ul className={list}>
        <li>
          <a
            href="https://docs.pybricks.com/en/latest/pupdevices/colorlightmatrix.html"
            target="_blank"
            rel="noopener noreferrer"
            className={css({ color: "lego.blue", fontWeight: "700", textDecoration: "underline" })}
          >
            Pybricks — ColorLightMatrix API
          </a>
        </li>
        <li>
          <a
            href="https://education.lego.com/en-us/products/lego-education-spike-essential-set/45345"
            target="_blank"
            rel="noopener noreferrer"
            className={css({ color: "lego.blue", fontWeight: "700", textDecoration: "underline" })}
          >
            LEGO Education — SPIKE Essential 45345
          </a>
        </li>
      </ul>
    </div>
  );
}
