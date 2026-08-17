// ponytail: procedural pose keys, not Mixamo — swap for GLB clips when you have a character asset
export const DURATION = 6;

/** @typedef {{ t: number, rootY?: number, rootX?: number, yaw?: number, lean?: number, hip?: number, shoulderTwist?: number, headYaw?: number, headPitch?: number, headTilt?: number, arms?: 'side'|'front'|'waist'|'behind', smile?: number, eyesOpen?: number, gazeX?: number, gazeY?: number, mouthOpen?: number, weight?: number }} Pose */

/** @type {Pose[]} */
export const KEYS = [
  { t: 0, rootY: 0, yaw: 0, lean: 0, hip: 0, shoulderTwist: 0, headYaw: 0, headPitch: 0, headTilt: 0, arms: 'side', smile: 0, eyesOpen: 1, gazeX: 0, gazeY: 0, mouthOpen: 0.15, weight: 0 },
  { t: 0.5, arms: 'front', mouthOpen: 0.2, smile: 0 },
  { t: 1.0, rootX: 0, arms: 'waist', lean: 0.08, hip: 0.12, weight: 0.35, mouthOpen: 0.05, smile: 0.15, gazeY: 0 },
  { t: 1.5, arms: 'waist', lean: 0.12, hip: 0.18, weight: 0.5, smile: 0.45, mouthOpen: 0, eyesOpen: 0.95 },
  { t: 2.0, arms: 'side', headYaw: -0.4, gazeX: -0.6, smile: 0.5, yaw: -0.3 },
  { t: 2.35, yaw: Math.PI * 0.5, headYaw: 0.2, arms: 'side', smile: 0.4 },
  { t: 2.65, yaw: Math.PI, headYaw: 0, arms: 'side', smile: 0.35 },
  { t: 2.9, yaw: Math.PI * 1.5, headYaw: 0.3, gazeX: 0.2, arms: 'side' },
  { t: 3.0, yaw: Math.PI * 2, headYaw: 0, gazeX: 0, arms: 'behind', hip: -0.15, lean: 0.06, smile: 0.75, shoulderTwist: 0.12 },
  { t: 3.5, arms: 'behind', weight: -0.4, hip: 0.1, headPitch: 0.25, gazeY: -0.5, smile: 0.4, eyesOpen: 0.85 },
  { t: 4.0, arms: 'behind', weight: 0.4, headPitch: 0.35, gazeY: -0.55, smile: 0.35, headTilt: 0.08 },
  { t: 4.2, arms: 'behind', headTilt: 0.2, shoulderTwist: 0.2, hip: 0.2, headPitch: 0.15, gazeY: -0.2 },
  { t: 4.5, arms: 'behind', shoulderTwist: 0.35, lean: 0.1, headPitch: -0.05, gazeY: 0.05, eyesOpen: 0.15, smile: 0.5 },
  { t: 4.7, eyesOpen: 1, smile: 0.7, gazeY: 0, headPitch: 0 },
  { t: 5.0, arms: 'waist', shoulderTwist: 0.45, smile: 0.85, lean: 0.12, hip: 0.22 },
  { t: 5.15, arms: 'waist', shoulderTwist: 0.55, gazeX: -0.7, headYaw: -0.35, mouthOpen: 0.35, smile: 0.2, eyesOpen: 1.1 },
  { t: 5.4, gazeX: 0.65, headYaw: 0.3, mouthOpen: 0.08, smile: 0.25, shoulderTwist: 0.25 },
  { t: 5.7, gazeX: 0.15, headYaw: 0.05, headTilt: 0.18, mouthOpen: 0, smile: 0.15, shoulderTwist: 0.15 },
  { t: 6.0, gazeX: 0, headYaw: 0, headTilt: 0.12, smile: 0.2, mouthOpen: 0.02, arms: 'waist', shoulderTwist: 0.1 },
];

function lerp(a, b, u) {
  return a + (b - a) * u;
}

function smooth(u) {
  return u * u * (3 - 2 * u);
}

const NUM = [
  'rootY',
  'rootX',
  'yaw',
  'lean',
  'hip',
  'shoulderTwist',
  'headYaw',
  'headPitch',
  'headTilt',
  'smile',
  'eyesOpen',
  'gazeX',
  'gazeY',
  'mouthOpen',
  'weight',
];

const ARM_RANK = { side: 0, front: 1, waist: 2, behind: 3 };
const ARM_FROM = ['side', 'front', 'waist', 'behind'];

/**
 * Sample continuous pose at time t (seconds, wraps by DURATION if loop).
 * @param {number} t
 * @param {Pose[]} [keys]
 */
export function samplePose(t, keys = KEYS) {
  const x = ((t % DURATION) + DURATION) % DURATION;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= x) i += 1;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const span = Math.max(1e-6, b.t - a.t);
  const u = b === a ? 0 : smooth((x - a.t) / span);

  /** @type {Pose} */
  const out = { t: x };
  for (const k of NUM) {
    const av = a[k];
    const bv = b[k];
    const base = av !== undefined ? av : bv !== undefined ? bv : 0;
    const next = bv !== undefined ? bv : base;
    const prev = av !== undefined ? av : next;
    out[k] = lerp(prev, next, u);
  }

  const ar = lerp(ARM_RANK[a.arms || 'side'], ARM_RANK[b.arms || a.arms || 'side'], u);
  out.arms = ARM_FROM[Math.round(ar)];
  return out;
}
