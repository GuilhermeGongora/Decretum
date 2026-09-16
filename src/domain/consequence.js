const isText = (value) => typeof value === "string" && value.trim().length > 0;

// The authored headline and character reaction of the side that was chosen. Content is never generated:
// a card without both fields for that side returns null and the interface shows its compact consequence.
export function getChoiceConsequence(card, choice) {
  const option = card?.choices?.[choice];
  if (!option || !isText(option.headline) || !isText(option.reaction)) return null;
  return { headline: option.headline, reaction: option.reaction };
}
