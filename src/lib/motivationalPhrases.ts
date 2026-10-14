const PHRASES = [
  "¡Sigue así!",
  "Imparable 💪",
  "Qué constancia",
  "Vas que te sales",
  "No pares ahora",
  "Racha en marcha",
  "Esto ya es hábito",
  "Grande, de verdad",
  "Lo estás clavando",
  "Cada día cuenta",
];

/** Frase corta y motivadora para acompañar la racha de días registrados. */
export function getStreakPhrase(streak: number): string {
  return PHRASES[streak % PHRASES.length];
}
