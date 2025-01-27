export function validateSignIntent({
  chainId,
  destChainId,
  nonce,
  tokenAddress,
  amount,
  openDeadline,
  fillDeadline,
}) {
  const parsedChainId = parseInt(chainId, 10);
  const parsedDestChainId = parseInt(destChainId, 10);
  const parsedNonce = parseInt(nonce, 10);
  const parsedOpenDeadline = parseInt(openDeadline, 10);
  const parsedFillDeadline = parseInt(fillDeadline, 10);
  const parsedAmount = parseInt(amount, 10);

  if (isNaN(parsedChainId) || parsedChainId <= 0) {
    return "Please select a valid source chain.";
  }
  if (
    isNaN(parsedDestChainId) ||
    parsedDestChainId <= 0 ||
    parsedDestChainId === parsedChainId
  ) {
    return "Please select a valid destination chain.";
  }
  if (!/^0x[0-9A-Fa-f]{40}$/.test(tokenAddress)) {
    return "Please select a valid token address.";
  }
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return "Please enter a positive amount.";
  }
  if (isNaN(parsedNonce) || parsedNonce < 0) {
    return "Nonce must be a non-negative integer.";
  }
  if (isNaN(parsedOpenDeadline) || parsedOpenDeadline <= 0) {
    return "Open Deadline must be a valid positive integer (timestamp).";
  }
  if (isNaN(parsedFillDeadline) || parsedFillDeadline <= 0) {
    return "Fill Deadline must be a valid positive integer (timestamp).";
  }

  // If no errors
  return null;
}
