import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import KayKitBarbarian from "./KayKitBarbarian";

const ROOM_SIZE = 80;
const BOUND_MARGIN = 1.0;

export default function Player({ keys, playerRef, camYaw = 0, disabled = false }) {
  const ref = useRef();
  const v = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));

  const moving = !disabled && !!(keys?.KeyW || keys?.KeyA || keys?.KeyS || keys?.KeyD);
  const sprintHeld = !disabled && !!(keys?.ShiftLeft || keys?.ShiftRight);
  const animState = !moving ? "idle" : sprintHeld ? "run" : "walk";

  useFrame(() => {
    const obj = ref.current;
    if (!obj) return;
    if (disabled) {
      if (playerRef) playerRef.current = obj;
      return;
    }

    const sprint = keys?.ShiftLeft || keys?.ShiftRight;
    const speed = sprint ? 0.16 : 0.10;

    let x = 0;
    let z = 0;
    if (keys?.KeyW) z -= 1;
    if (keys?.KeyS) z += 1;
    if (keys?.KeyA) x -= 1;
    if (keys?.KeyD) x += 1;

    v.current.set(x, 0, z);

    if (v.current.lengthSq() > 0) {
      v.current.normalize();
      v.current.applyAxisAngle(up.current, camYaw);
      v.current.multiplyScalar(speed);

      obj.position.add(v.current);
      obj.rotation.y = Math.atan2(v.current.x, v.current.z);
    }
    const half = ROOM_SIZE / 2 - BOUND_MARGIN;
    obj.position.x = THREE.MathUtils.clamp(obj.position.x, -half, half);
    obj.position.z = THREE.MathUtils.clamp(obj.position.z, -half, half);

    if (playerRef) playerRef.current = obj;
  });

  return (
    <group ref={ref} position={[0, 1, 0]}>
      <KayKitBarbarian state={animState} scale={1.6} rotationY={0} yOffset={-1.0} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.98, 0]}>
        <ringGeometry args={[0.55, 0.75, 32]} />
        <meshBasicMaterial color="#f5c542" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}
