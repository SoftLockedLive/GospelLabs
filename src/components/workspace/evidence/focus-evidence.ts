/**
 * Moves focus to an evidence card in Research and briefly highlights it, so
 * the user can see where they landed even when focus rings are hidden (after
 * a mouse or touch interaction).
 */
export function focusEvidenceCard(id: string): void {
  const card = document.getElementById(`evidence-card-${id}`);
  if (!card) return;
  card.focus();
  card.dataset.highlight = "";
  window.setTimeout(() => delete card.dataset.highlight, 1600);
}
