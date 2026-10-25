// Bounded diagnostic coordinator, not the FlowProof Agent runtime.
class Ownership {
  constructor() {
    this.state = 'Agent'; this.history = []; this.generation = 1;
    this.recoveries = 0; this.recoveryAttempts = 0; this.recovering = false; this.sequence = 0; this.inFlight = null;
  }
  begin() {
    if (this.state !== 'Agent' || this.recovering) throw new Error('Ownership/recovery prevents new Agent work');
    if (this.inFlight) throw new Error('Browser operation busy');
    this.inFlight = { id: ++this.sequence, generation: this.generation };
    return { ...this.inFlight };
  }
  take() {
    if (this.recovering || !['Agent', 'Awaiting Control Decision'].includes(this.state)) throw new Error('Ownership/recovery prevents Take Control');
    this.state = this.inFlight ? 'Handoff Pending' : 'User';
  }
  finish(lease, observation) {
    if (!lease || lease.generation !== this.generation || lease.id !== this.inFlight?.id) return false;
    this.history.push({ ...lease, outcome: observation.outcome });
    this.inFlight = null;
    if (observation.outcome !== 'observed-complete') this.recovering = true;
    else if (this.state === 'Handoff Pending') this.state = 'User';
    return true;
  }
  returnRequested() {
    if (this.recovering || !['User', 'Awaiting Control Decision'].includes(this.state)) throw new Error('Ownership/recovery prevents Return Control');
    this.state = 'Returning';
  }
  completeReturn(checks) {
    if (this.state !== 'Returning') throw new Error('Explicit Return Control is required');
    const safe = checks.boundary === true && checks.session === true && checks.history === true;
    this.state = safe ? 'Agent' : 'Awaiting Control Decision';
    return safe;
  }
  crash() {
    if (this.inFlight) this.history.push({ ...this.inFlight, outcome: 'unknown' });
    this.inFlight = null; this.generation++;
    this.recoveries++; this.recoveryAttempts = 0; this.recovering = true;
    if (this.state === 'Handoff Pending' || this.state === 'Returning') this.state = 'Awaiting Control Decision';
    // Ownership restoration is separate from the active recovery exclusion gate.
  }
  recovered(checks) {
    if (!this.recovering || this.state === 'Interrupted' || !checks.boundary || !checks.session) return false;
    this.recovering = false; return true;
  }
  recoveryFailed() {
    if (!this.recovering) throw new Error('No active recovery');
    if (++this.recoveryAttempts >= 2) { this.state = 'Interrupted'; this.recovering = false; }
  }
}
module.exports = { Ownership };
