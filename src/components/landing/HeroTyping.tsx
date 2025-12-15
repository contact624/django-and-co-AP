import { useState, useEffect } from "react";

const phrases = [
  "Suivez vos clients en un coup d'œil.",
  "Générez vos factures en 1 clic.",
  "Visualisez vos balades sur un calendrier.",
  "Analysez votre chiffre d'affaires.",
];

export function HeroTyping() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    const typingSpeed = isDeleting ? 30 : 50;
    const pauseDuration = 2000;

    if (!isDeleting && displayText === currentPhrase) {
      // Pause before deleting
      const timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && displayText === "") {
      // Move to next phrase
      setIsDeleting(false);
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayText((prev) =>
        isDeleting
          ? prev.slice(0, -1)
          : currentPhrase.slice(0, prev.length + 1)
      );
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentPhraseIndex]);

  return (
    <span className="text-accent">
      {displayText}
      <span className="typing-cursor" />
    </span>
  );
}
