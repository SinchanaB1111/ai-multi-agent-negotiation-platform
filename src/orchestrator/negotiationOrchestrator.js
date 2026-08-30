export class NegotiationOrchestrator {
  constructor(initialState) {
    this.state = initialState;
  }

  getCurrentAgent() {
    return this.state.currentAgentTurn;
  }

  getCurrentRound() {
    return this.state.currentRound;
  }

  getNegotiationHistory() {
    return this.state.negotiationHistory;
  }

  getState() {
    return this.state;
  }

  setStatus(status) {
    this.state.status = status;
  }

  addOffer(offer) {
    this.state.previousOffer = this.state.currentOffer;
    this.state.currentOffer = offer;

    this.state.negotiationHistory.push(offer);
  }

  nextTurn(nextAgentId) {
    this.state.currentAgentTurn = nextAgentId;
  }

  nextRound() {
    this.state.currentRound += 1;
  }
}