export interface GameCard {
  title: string;
  tagline: string;
  accent: string;
}

export const GAMES: GameCard[] = [
  {
    title: "Color Match",
    tagline: "Sort bricks by LEGO color before the timer runs out.",
    accent: "#E3000B",
  },
  {
    title: "Stud Sort",
    tagline: "Place the right studs on the right plate.",
    accent: "#FFD500",
  },
  {
    title: "Brick Breaker",
    tagline: "Knock down the wall — classic-style, with studs.",
    accent: "#006CB7",
  },
  {
    title: "MOC Memory",
    tagline: "Memorize the build, then rebuild it from memory.",
    accent: "#00852B",
  },
  {
    title: "Tilt Maze",
    tagline: "Steer a marble through a maze using the hub's IMU.",
    accent: "#A855F7",
  },
  {
    title: "Beacon Tag",
    tagline: "Find the broadcasting hub before its signal fades.",
    accent: "#F97316",
  },
  {
    title: "Light Show",
    tagline: "Choreograph a status-light pattern to a beat.",
    accent: "#EC4899",
  },
  {
    title: "Sensor Hunt",
    tagline: "Scan the room and bag the right colors with the sensor.",
    accent: "#14B8A6",
  },
  {
    title: "Hub Race",
    tagline: "Two hubs, one finish line — fastest stop button wins.",
    accent: "#EAB308",
  },
  {
    title: "Battery Saver",
    tagline: "Finish the course on the smallest possible charge.",
    accent: "#22C55E",
  },
];
