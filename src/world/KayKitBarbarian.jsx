import { useEffect, useMemo, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

function pick(names, keys) {
  const low = names.map((n) => n.toLowerCase());
  for (const k of keys) {
    const idx = low.findIndex((n) => n.includes(k));
    if (idx !== -1) return names[idx];
  }
  return null;
}

export default function KayKitBarbarian({
  state = "idle", // idle | walk | run
  scale = 1.0,
  yOffset = 0,
  rotationY = 0,
}) {
  const group = useRef();

  const charGltf = useGLTF("/models/kaykit/characters/Barbarian.glb");
  const animGltf = useGLTF("/models/kaykit/anims/Rig_Medium_MovementBasic.glb");

  const characterScene = useMemo(() => clone(charGltf.scene), [charGltf.scene]);

  const { actions, names } = useAnimations(animGltf.animations, group);

  useEffect(() => {
    console.log("MovementBasic animations:", names);
  }, [names]);

  const map = useMemo(() => {
    const idle = pick(names || [], ["idle", "stand", "breath"]);
    const walk = pick(names || [], ["walk"]);
    const run = pick(names || [], ["run", "sprint"]);
    return { idle, walk, run };
  }, [names]);

  useEffect(() => {
    if (!actions) return;
    const nextName = map[state] || map.idle || (names && names[0]);
    if (!nextName) return;

    const next = actions[nextName];
    if (!next) return;

    Object.values(actions).forEach((a) => a && a !== next && a.fadeOut(0.15));
    next.reset().fadeIn(0.15).play();

    return () => next.fadeOut(0.1);
  }, [actions, map, state, names]);

  useEffect(() => {
    characterScene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }, [characterScene]);

  return (
    <group ref={group} scale={scale} rotation={[0, rotationY, 0]} position={[0, yOffset, 0]}>
      <primitive object={characterScene} />
    </group>
  );
}

useGLTF.preload("/models/kaykit/characters/Barbarian.glb");
useGLTF.preload("/models/kaykit/anims/Rig_Medium_MovementBasic.glb");
