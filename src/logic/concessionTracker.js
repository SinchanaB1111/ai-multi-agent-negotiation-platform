export function calculateConcession(previousOffer, currentOffer) {
  if (
    previousOffer === null ||
    previousOffer === undefined ||
    currentOffer === null ||
    currentOffer === undefined
  ) {
    return {
      amount: 0,
      direction: "NONE",
    };
  }

  const difference = currentOffer - previousOffer;

  return {
    amount: Math.abs(difference),
    direction:
      difference > 0
        ? "INCREASE"
        : difference < 0
        ? "DECREASE"
        : "NO_CHANGE",
  };
}