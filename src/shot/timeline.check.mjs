import { samplePose, DURATION, KEYS } from './timeline.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(DURATION === 6, 'duration is 6s');
assert(KEYS.length >= 2, 'need keyframes');
assert(KEYS[0].t === 0, 'starts at 0');
assert(KEYS[KEYS.length - 1].t === DURATION, 'ends at DURATION');

for (let i = 1; i < KEYS.length; i++) {
  assert(KEYS[i].t >= KEYS[i - 1].t, 'keys must be non-decreasing');
}

const a = samplePose(0);
assert(a.arms === 'side', 't0 arms side');
assert(a.smile === 0, 't0 no smile');

const mid = samplePose(2.65);
assert(Math.abs(mid.yaw - Math.PI) < 0.2, 'mid-turn near PI');

assert(typeof samplePose(6).smile === 'number', 'end smile numeric');
assert(samplePose(6.5).t < DURATION, 'wraps');

console.log('shot timeline ok');
