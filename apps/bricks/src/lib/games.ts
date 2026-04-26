export interface GameCard {
  title: string;
  titleRo: string;
  tagline: string;
  taglineRo: string;
  accent: string;
}

export const GAMES: GameCard[] = [
  {
    title: "Color Match",
    titleRo: "Potrivește culorile",
    tagline: "Sort bricks by LEGO color before the timer runs out.",
    taglineRo: "Sortează piesele după culoare înainte să expire timpul.",
    accent: "#E3000B",
  },
  {
    title: "Stud Sort",
    titleRo: "Sortare de studuri",
    tagline: "Place the right studs on the right plate.",
    taglineRo: "Așază studurile corecte pe placa potrivită.",
    accent: "#FFD500",
  },
  {
    title: "Brick Breaker",
    titleRo: "Spargătorul de cărămizi",
    tagline: "Knock down the wall — classic-style, with studs.",
    taglineRo: "Dărâmă zidul — în stil clasic, cu studuri.",
    accent: "#006CB7",
  },
  {
    title: "MOC Memory",
    titleRo: "Memorie de MOC",
    tagline: "Memorize the build, then rebuild it from memory.",
    taglineRo: "Memorează construcția, apoi reconstruiește-o din minte.",
    accent: "#00852B",
  },
  {
    title: "Tilt Maze",
    titleRo: "Labirint cu înclinare",
    tagline: "Steer a marble through a maze using the hub's IMU.",
    taglineRo: "Ghidează o bilă prin labirint folosind IMU-ul hub-ului.",
    accent: "#A855F7",
  },
  {
    title: "Beacon Tag",
    titleRo: "Vânătoare de balize",
    tagline: "Find the broadcasting hub before its signal fades.",
    taglineRo: "Găsește hub-ul care emite înainte să-i dispară semnalul.",
    accent: "#F97316",
  },
  {
    title: "Light Show",
    titleRo: "Spectacol de lumini",
    tagline: "Choreograph a status-light pattern to a beat.",
    taglineRo: "Coregrafiază un model de lumini de stare pe un ritm.",
    accent: "#EC4899",
  },
  {
    title: "Sensor Hunt",
    titleRo: "Vânătoare cu senzorul",
    tagline: "Scan the room and bag the right colors with the sensor.",
    taglineRo: "Scanează camera și prinde culorile corecte cu senzorul.",
    accent: "#14B8A6",
  },
  {
    title: "Hub Race",
    titleRo: "Cursă de hub-uri",
    tagline: "Two hubs, one finish line — fastest stop button wins.",
    taglineRo: "Două hub-uri, o singură linie de sosire — câștigă cel mai rapid buton de stop.",
    accent: "#EAB308",
  },
  {
    title: "Battery Saver",
    titleRo: "Economie de baterie",
    tagline: "Finish the course on the smallest possible charge.",
    taglineRo: "Termină traseul cu cel mai mic consum de baterie posibil.",
    accent: "#22C55E",
  },
];
