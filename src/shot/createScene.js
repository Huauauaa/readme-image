import * as THREE from 'three';
import { samplePose, DURATION } from './timeline';

// ponytail: stylized stand-in character; ceiling = no photoreal / @图1 wardrobe — upgrade: GLTF + Mixamo
export function createShot(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2ebe3);
  scene.fog = new THREE.Fog(0xf2ebe3, 6, 14);

  // 9:16 fixed high-angle phone cam (~45°), never moves / zooms
  const camera = new THREE.PerspectiveCamera(42, 9 / 16, 0.1, 50);
  camera.position.set(0.55, 2.55, 2.35);
  camera.lookAt(0, 1.05, 0);

  const hemi = new THREE.HemisphereLight(0xfff6ea, 0xc8b8a8, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0dd, 1.15);
  sun.position.set(-2.5, 5, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xe8f0ff, 0.35);
  fill.position.set(2, 2, -1);
  scene.add(fill);

  // room: wood floor + window light plane + soft curtains
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.85, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 4),
    new THREE.MeshStandardMaterial({ color: 0xf7f3ee, roughness: 0.9 })
  );
  wall.position.set(0, 2, -2.2);
  scene.add(wall);

  const windowLight = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 2.6),
    new THREE.MeshBasicMaterial({ color: 0xfff8ef })
  );
  windowLight.position.set(-0.3, 1.9, -2.15);
  scene.add(windowLight);

  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0e8,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  [-1.6, 1.0].forEach((x) => {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.8), curtainMat);
    c.position.set(x, 1.85, -2.05);
    scene.add(c);
  });

  const table = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.06, 0.55),
    new THREE.MeshStandardMaterial({ color: 0xb08968 })
  );
  table.position.set(1.35, 0.72, -0.4);
  table.castShadow = true;
  scene.add(table);
  const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x8b6914 });
  [[1.05, 0.35, -0.6], [1.65, 0.35, -0.6], [1.05, 0.35, -0.2], [1.65, 0.35, -0.2]].forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, y, z);
    scene.add(leg);
  });

  const girl = buildGirl(THREE);
  scene.add(girl.root);

  let playing = true;
  let t0 = performance.now();
  let elapsed = 0;

  const hairLag = { yaw: 0, sway: 0 };
  const skirtLag = { yaw: 0, sway: 0 };

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function applyPose(pose, dt) {
    const g = girl;
    g.root.position.x = pose.rootX || 0;
    g.root.position.y = 0.02 + Math.sin(elapsed * 2.2) * 0.008; // breath
    g.root.rotation.y = pose.yaw;

    g.torso.rotation.x = pose.lean;
    g.torso.rotation.z = pose.hip * 0.35;
    g.hips.rotation.z = -pose.hip * 0.5;
    g.hips.rotation.y = pose.shoulderTwist * 0.15;

    // weight shift → leg bend
    g.lLeg.rotation.x = Math.max(0, -pose.weight) * 0.35;
    g.rLeg.rotation.x = Math.max(0, pose.weight) * 0.35;
    g.lLeg.position.y = -0.95 - Math.max(0, -pose.weight) * 0.02;
    g.rLeg.position.y = -0.95 - Math.max(0, pose.weight) * 0.02;

    g.chest.rotation.y = pose.shoulderTwist;
    g.chest.rotation.z = -pose.shoulderTwist * 0.25;

    g.head.rotation.y = pose.headYaw;
    g.head.rotation.x = pose.headPitch;
    g.head.rotation.z = pose.headTilt;

    // arms
    setArms(g, pose.arms, pose.shoulderTwist);

    // face
    const smile = pose.smile;
    g.mouth.scale.set(1 + smile * 0.35, 0.35 + pose.mouthOpen * 1.2 + smile * 0.25, 1);
    g.mouth.position.y = 0.02 - smile * 0.01;
    g.cheekL.scale.setScalar(1 + smile * 0.15);
    g.cheekR.scale.setScalar(1 + smile * 0.15);
    const open = Math.max(0.08, pose.eyesOpen);
    g.eyeL.scale.y = open;
    g.eyeR.scale.y = open;
    g.gaze.position.x = pose.gazeX * 0.04;
    g.gaze.position.y = 0.08 + pose.gazeY * 0.03;

    // inertia: hair / skirt lag behind yaw
    const targetYaw = pose.yaw;
    hairLag.yaw += (targetYaw - hairLag.yaw) * Math.min(1, dt * 3.2);
    skirtLag.yaw += (targetYaw - skirtLag.yaw) * Math.min(1, dt * 2.4);
    hairLag.sway = Math.sin(elapsed * 3) * 0.04 + (targetYaw - hairLag.yaw) * 0.35;
    skirtLag.sway = Math.sin(elapsed * 2.5 + 1) * 0.03 + (targetYaw - skirtLag.yaw) * 0.25;
    g.hair.rotation.y = hairLag.yaw - pose.yaw;
    g.hair.rotation.z = hairLag.sway;
    g.skirt.rotation.y = (skirtLag.yaw - pose.yaw) * 0.5;
    g.skirt.rotation.z = skirtLag.sway;
    g.earL.rotation.z = 0.1 + hairLag.sway * 0.5;
    g.earR.rotation.z = -0.1 - hairLag.sway * 0.5;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (playing) {
      elapsed = ((now - t0) / 1000) % DURATION;
    }
    applyPose(samplePose(elapsed), dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  let raf = requestAnimationFrame(frame);
  resize();

  return {
    DURATION,
    resize,
    getTime: () => elapsed,
    isPlaying: () => playing,
    play() {
      if (!playing) {
        t0 = performance.now() - elapsed * 1000;
        playing = true;
      }
    },
    pause() {
      playing = false;
    },
    restart() {
      elapsed = 0;
      t0 = performance.now();
      playing = true;
    },
    seek(t) {
      elapsed = ((t % DURATION) + DURATION) % DURATION;
      t0 = performance.now() - elapsed * 1000;
    },
    dispose() {
      cancelAnimationFrame(raf);
      renderer.dispose();
    },
  };
}

function setArms(g, mode, twist) {
  const t = twist || 0;
  if (mode === 'side') {
    g.lArm.rotation.set(0.15, 0, 0.25);
    g.rArm.rotation.set(0.15, 0, -0.25);
  } else if (mode === 'front') {
    g.lArm.rotation.set(0.55, 0.2, 0.4);
    g.rArm.rotation.set(0.55, -0.2, -0.4);
  } else if (mode === 'waist') {
    g.lArm.rotation.set(0.85, 0.15, 0.95 + t * 0.1);
    g.rArm.rotation.set(0.85, -0.15, -0.95 - t * 0.1);
  } else {
    // behind
    g.lArm.rotation.set(0.35, 0.6, 1.35);
    g.rArm.rotation.set(0.35, -0.6, -1.35);
  }
}

function buildGirl(THREE) {
  const skin = new THREE.MeshStandardMaterial({ color: 0xf3d5c4, roughness: 0.55, metalness: 0.05 });
  const knit = new THREE.MeshStandardMaterial({ color: 0xf0e6dc, roughness: 0.7, metalness: 0 });
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0xe8d5c4, roughness: 0.65, metalness: 0 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.75 });
  const blush = new THREE.MeshStandardMaterial({ color: 0xe8b4a0, roughness: 0.6, transparent: true, opacity: 0.55 });

  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 1.0;
  root.add(hips);

  const torso = new THREE.Group();
  hips.add(torso);

  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.22, 12), knit);
  pelvis.castShadow = true;
  torso.add(pelvis);

  const chest = new THREE.Group();
  chest.position.y = 0.28;
  torso.add(chest);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.32, 12), knit);
  top.castShadow = true;
  chest.add(top);

  // floral accent band on skirt (stylized, not @图1)
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 16, 1, true), skirtMat);
  skirt.position.y = -0.45;
  skirt.castShadow = true;
  hips.add(skirt);
  const flower = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xd4a5a5 })
  );
  flower.position.set(0.22, -0.2, 0.28);
  skirt.add(flower);

  const lLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.95, 8), skin);
  lLeg.position.set(-0.08, -0.95, 0);
  lLeg.castShadow = true;
  hips.add(lLeg);
  const rLeg = lLeg.clone();
  rLeg.position.x = 0.08;
  hips.add(rLeg);

  const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.55, 8), skin);
  lArm.geometry.translate(0, -0.25, 0);
  lArm.position.set(-0.2, 0.12, 0);
  lArm.castShadow = true;
  chest.add(lArm);
  const rArm = lArm.clone();
  rArm.position.x = 0.2;
  chest.add(rArm);

  const head = new THREE.Group();
  head.position.y = 0.42;
  chest.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 20), skin);
  skull.castShadow = true;
  head.add(skull);

  const gaze = new THREE.Group();
  gaze.position.set(0, 0.08, 0.12);
  head.add(gaze);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2a221f, roughness: 0.4 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), eyeMat);
  eyeL.position.set(-0.045, 0, 0);
  gaze.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.045;
  gaze.add(eyeR);

  const mouth = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xd4888a, roughness: 0.35, metalness: 0.1 })
  );
  mouth.position.set(0, 0.02, 0.13);
  mouth.scale.set(1, 0.4, 0.6);
  head.add(mouth);

  const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), blush);
  cheekL.position.set(-0.09, 0.02, 0.1);
  head.add(cheekL);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.09;
  head.add(cheekR);

  const hair = new THREE.Group();
  head.add(hair);
  const scalp = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat);
  scalp.position.y = 0.02;
  hair.add(scalp);
  for (let i = 0; i < 5; i++) {
    const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.55, 6), hairMat);
    lock.geometry.translate(0, -0.25, 0);
    const a = -0.6 + i * 0.3;
    lock.position.set(Math.sin(a) * 0.1, -0.05, -0.05 + Math.cos(a) * 0.05);
    lock.rotation.z = a * 0.35;
    lock.rotation.x = 0.35;
    hair.add(lock);
  }

  const pearl = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, metalness: 0.4, roughness: 0.3 });
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), pearl);
  earL.position.set(-0.14, 0.02, 0.02);
  head.add(earL);
  const earR = earL.clone();
  earR.position.x = 0.14;
  head.add(earR);

  return {
    root,
    hips,
    torso,
    chest,
    head,
    hair,
    skirt,
    lArm,
    rArm,
    lLeg,
    rLeg,
    mouth,
    eyeL,
    eyeR,
    gaze,
    cheekL,
    cheekR,
    earL,
    earR,
  };
}
