import assert from 'node:assert/strict';
import { buildNegotiationAnalysis } from '../src/logic/negotiationAnalysis.js';
import { buildReportText } from '../src/logic/reportGenerator.js';

const failedState = {
  status: 'DEADLOCK',
  currentRound: 5,
  currentOffer: { value: 13000000 },
  agreement: null,
  offers: [
    { agentId: 'candidate', value: 9000000, round: 1 },
    { agentId: 'employer', value: 11000000, round: 2 },
  ],
  concessions: [],
  decisions: [{ decision: 'COUNTER' }],
  agents: [
    { id: 'candidate', name: 'Candidate', decisionType: 'maximize', negotiation: { targetValue: 12000000 } },
    { id: 'employer', name: 'Employer', decisionType: 'minimize', negotiation: { targetValue: 11000000 } },
  ],
  history: [
    { type: 'OFFER', round: 1, agentName: 'Candidate', value: 9000000, reason: 'Opening offer' },
    { type: 'DECISION', round: 1, agentName: 'Employer', decision: 'COUNTER', offerValue: 11000000, reason: 'Counteroffer' },
    { type: 'OFFER', round: 2, agentName: 'Employer', value: 11000000, reason: 'Counteroffer' },
    { type: 'SYSTEM', event: 'DEADLOCK', round: 5, message: 'Maximum rounds reached without agreement.' },
  ],
};

const failedAnalysis = buildNegotiationAnalysis(failedState);
assert.equal(failedAnalysis.finalValue, null, 'Deadlock must not have a final agreement value');
assert.equal(failedAnalysis.status, 'DEADLOCK');
assert.equal(failedAnalysis.rounds, 5);

const reportText = buildReportText(failedState, 'Practice Mode');
assert.match(reportText, /Final Value: No agreement reached/);
assert.doesNotMatch(reportText, /Final Value: ₹13,000,000/);
assert.match(reportText, /\[R1\]/);
assert.match(reportText, /\[R2\]/);
assert.match(reportText, /\[R5\]/);

const agreementState = {
  ...failedState,
  status: 'AGREEMENT',
  agreement: { offer: { value: 11500000 } },
};
const agreementAnalysis = buildNegotiationAnalysis(agreementState);
assert.equal(agreementAnalysis.finalValue, 11500000);

console.log('✓ Report integrity verification passed.');
console.log('  Deadlock final value: null');
console.log('  Deadlock report: No agreement reached');
console.log('  Transcript rounds preserved: R1, R2, R5');
console.log('  Agreement final value: ₹11,500,000');
