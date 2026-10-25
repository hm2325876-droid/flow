const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Ownership } = require('../src/ownership.cjs');

test('Agent obtains one exclusive operation lease and rejects overlapping work', () => {
  const owner = new Ownership();
  const lease = owner.begin();
  assert.ok(lease?.id, 'An Agent operation requires an actual exclusive lease');
  assert.throws(() => owner.begin(), /busy|ownership/i);
});
test('Take Control blocks new work until independently observed in-flight completion', () => {
  const owner = new Ownership(); const lease = owner.begin();
  owner.take(); assert.equal(owner.state, 'Handoff Pending');
  assert.throws(() => owner.begin(), /ownership/i);
  owner.finish(lease, { outcome: 'observed-complete' });
  assert.equal(owner.state, 'User');
  assert.throws(() => owner.begin(), /ownership/i);
});
test('Return Control requires explicit transition and every inspection/reconciliation gate', () => {
  const owner = new Ownership(); owner.take();
  assert.throws(() => owner.completeReturn({ boundary: true, session: true, history: true }), /return/i);
  owner.returnRequested();
  assert.equal(owner.completeReturn({ boundary: true, session: false, history: true }), false);
  assert.notEqual(owner.state, 'Agent');
  owner.returnRequested();
  assert.equal(owner.completeReturn({ boundary: true, session: true, history: true }), true);
  assert.equal(owner.state, 'Agent');
});
test('Pending-handoff crash invalidates the lease and requires an explicit ownership choice', () => {
  const owner = new Ownership(); const lease = owner.begin(); owner.take(); owner.crash();
  assert.equal(owner.state, 'Awaiting Control Decision');
  assert.equal(owner.finish(lease, { outcome: 'observed-complete' }), false);
  assert.throws(() => owner.begin(), /ownership/i);
});
test('User-control crash restores User ownership without automatic Agent authorization', () => {
  const owner = new Ownership(); owner.take(); owner.crash();
  assert.equal(owner.state, 'User'); assert.throws(() => owner.begin(), /ownership/i);
});
test('Two failed recreation attempts within one crash are bounded and exhaustion is Interrupted', () => {
  const owner = new Ownership(); owner.crash();
  assert.equal(typeof owner.recoveryFailed, 'function', 'Recovery failures require an explicit bounded retry counter');
  owner.recoveryFailed(); assert.notEqual(owner.state, 'Interrupted'); owner.recoveryFailed();
  assert.equal(owner.state, 'Interrupted'); assert.throws(() => owner.begin(), /ownership/i);
});
test('Agent work stays excluded during recreation until fresh boundary and session checks pass', () => {
  const owner = new Ownership(); owner.crash();
  assert.throws(() => owner.begin(), /recovery|ownership/i);
  assert.equal(typeof owner.recovered, 'function', 'A recreation must be acknowledged after inspection');
  assert.equal(owner.recovered({boundary:true,session:false}),false);
  assert.throws(() => owner.begin(), /recovery|ownership/i);
  assert.equal(owner.recovered({boundary:true,session:true}),true);
  assert.ok(owner.begin().id);
});
test('An uncertain in-flight result remains unknown and does not imply successful completion', () => {
  const owner = new Ownership(); const lease = owner.begin();
  owner.finish(lease, { outcome: 'unknown' });
  assert.equal(owner.history.at(-1)?.outcome, 'unknown');
});
test('Unknown in-flight completion cannot grant User control from Handoff Pending', () => {
  const owner = new Ownership(); const lease = owner.begin(); owner.take();
  owner.finish(lease,{outcome:'unknown'});
  assert.notEqual(owner.state,'User','Uncertain completion must not release the native input shield');
  assert.equal(owner.recovering,true);
  assert.throws(()=>owner.begin(),/ownership|recovery/i);
  assert.throws(()=>owner.take(),/ownership|recovery/i);
});
