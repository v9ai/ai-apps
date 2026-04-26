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
];
