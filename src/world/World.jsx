import { Canvas, useFrame } from "@react-three/fiber";
import { Text, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import Player from "./Player";
import useKeyboard from "./useKeyboard";

const LINKEDIN_GLB = "/models/icons/linkedin.glb";
const GITHUB_GLB = "/models/icons/github.glb";
const GMAIL_GLB = "/models/icons/1.glb";
const CAR_GLB = "/models/props/low_poly_car.glb";
const SERVER_GLB = "/models/props/server_rack.glb";
const CHICK_GLB = "/models/props/baby_chick_from_poly_by_google.glb"; 


const TABLE_GLB = "/models/props/desk_low-poly.glb"; 

const FORMSPREE_URL = "https://formspree.io/f/xvzrrbdd";

const ROOM_SIZE = 56;
const ROOM_HEIGHT = 28;
const WALL_COLOR = "#8d8c8c";
const CEILING_COLOR = "#f0f0f0";
const BG_COLOR = "#f2f3f5";
const FOG_NEAR = 18;
const FOG_FAR = 70;

const INTERACT_RADIUS = 3.4;
const ZOOM_AMOUNT = 2.4;

const CAM_MIN_Y = 0.85;
const PITCH_MIN = 0.05;
const PITCH_MAX = 0.65;

const CAM_WALL_PAD = 0.55;
const CAM_HIT_EPS = 0.12;

const TARGET_MODEL_HEIGHT = 2.6;
const SCALE_MULT = 1.6;

const MODEL_SCALE = {
  carProject: 1.0,
  serverProject: 2.6,
  chickProject: 1.35,
  aboutTable: 1, 
};

const HITBOX_EXTRA_SCALE = {
  carProject: 1.0,
  serverProject: 1.0,
  chickProject: 1.0,
  aboutTable: 1.0,
};

function resolveCameraInsideRoom(anchor, desired) {
  const half = ROOM_SIZE / 2 - CAM_WALL_PAD;

  const min = new THREE.Vector3(-half, CAM_MIN_Y, -half);
  const max = new THREE.Vector3(half, ROOM_HEIGHT - 0.4, half);

  const inside =
    desired.x >= min.x &&
    desired.x <= max.x &&
    desired.y >= min.y &&
    desired.y <= max.y &&
    desired.z >= min.z &&
    desired.z <= max.z;

  if (inside) return desired;

  const dir = desired.clone().sub(anchor);
  let t = 1.0;
  const EPS = 1e-6;

  if (Math.abs(dir.x) > EPS) {
    const tx = dir.x > 0 ? (max.x - anchor.x) / dir.x : (min.x - anchor.x) / dir.x;
    t = Math.min(t, tx);
  }
  if (Math.abs(dir.y) > EPS) {
    const ty = dir.y > 0 ? (max.y - anchor.y) / dir.y : (min.y - anchor.y) / dir.y;
    t = Math.min(t, ty);
  }
  if (Math.abs(dir.z) > EPS) {
    const tz = dir.z > 0 ? (max.z - anchor.z) / dir.z : (min.z - anchor.z) / dir.z;
    t = Math.min(t, tz);
  }

  t = Number.isFinite(t) ? t : 0;
  t = THREE.MathUtils.clamp(t - CAM_HIT_EPS, 0, 1);
  return anchor.clone().add(dir.multiplyScalar(t));
}

function WhiteRoom() {
  const half = ROOM_SIZE / 2;

  const wallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.95, side: THREE.DoubleSide }),
    []
  );
  const ceilMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: CEILING_COLOR, roughness: 0.98, side: THREE.DoubleSide }),
    []
  );

  return (
    <group>
      <mesh position={[0, ROOM_HEIGHT / 2, -half]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh position={[0, ROOM_HEIGHT / 2, half]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh position={[-half, ROOM_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh position={[half, ROOM_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh position={[0, ROOM_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <primitive object={ceilMat} attach="material" />
      </mesh>
    </group>
  );
}

function FollowCam({ targetRef, camRef }) {
  const tmp = useRef({
    desired: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    spherical: new THREE.Spherical(),
    right: new THREE.Vector3(),
    lookA: new THREE.Vector3(),
    lookB: new THREE.Vector3(),
    look: new THREE.Vector3(),
    anchor: new THREE.Vector3(),
  });

  useFrame(({ camera }) => {
    const t = targetRef.current;
    if (!t) return;

    const yaw = camRef.current.yaw;
    const pitch = THREE.MathUtils.clamp(camRef.current.pitch, PITCH_MIN, PITCH_MAX);
    const dist = camRef.current.dist;
    const focusT = camRef.current.focusT ?? 0;

    tmp.current.anchor.set(t.position.x, t.position.y + 1.6, t.position.z);

    tmp.current.spherical.set(dist, Math.PI / 2 - pitch, yaw);
    tmp.current.offset.setFromSpherical(tmp.current.spherical);

    tmp.current.right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    const shoulder = THREE.MathUtils.lerp(0.0, 0.95, focusT);
    tmp.current.offset.add(tmp.current.right.clone().multiplyScalar(shoulder));
    tmp.current.offset.y += THREE.MathUtils.lerp(0.0, 0.08, focusT);

    tmp.current.desired.copy(tmp.current.anchor).add(tmp.current.offset);
    tmp.current.desired.y = Math.max(tmp.current.desired.y, CAM_MIN_Y);

    const corrected = resolveCameraInsideRoom(tmp.current.anchor, tmp.current.desired);
    camera.position.lerp(corrected, 0.12);

    tmp.current.lookA.set(t.position.x, t.position.y + 1.2, t.position.z);
    const fp = camRef.current.focusPos;
    if (fp) tmp.current.lookB.set(fp.x, fp.y, fp.z);
    else tmp.current.lookB.copy(tmp.current.lookA);

    tmp.current.look.lerpVectors(tmp.current.lookA, tmp.current.lookB, focusT);
    camera.lookAt(tmp.current.look);
  });

  return null;
}

function BlobShadow({ targetRef }) {
  const ref = useRef();

  const tex = useMemo(() => {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");

    const g = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(0,0,0,0.40)");
    g.addColorStop(0.45, "rgba(0,0,0,0.20)");
    g.addColorStop(1, "rgba(0,0,0,0.00)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);

  useEffect(() => () => tex.dispose(), [tex]);

  useFrame(() => {
    const p = targetRef.current;
    if (!p || !ref.current) return;
    ref.current.position.set(p.position.x, 0.02, p.position.z);
    ref.current.scale.set(1.9, 1.9, 1.9);
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.6, 1.6]} />
      <meshBasicMaterial map={tex} transparent opacity={0.75} depthWrite={false} />
    </mesh>
  );
}

function CollisionPush({ playerRef, obbList }) {
  const tmp = useRef({
    pWorld: new THREE.Vector3(),
    pLocal: new THREE.Vector3(),
    rotInv: new THREE.Quaternion(),
    fixedLocal: new THREE.Vector3(),
    fixedWorld: new THREE.Vector3(),
  });

  const SKIN = 0.10;
  const MAX_PUSH_PER_FRAME = 0.35;

  useFrame(() => {
    const pl = playerRef.current;
    if (!pl) return;

    tmp.current.pWorld.set(pl.position.x, pl.position.y, pl.position.z);

    for (const b of obbList) {
      if (!b) continue;

      tmp.current.rotInv.copy(b.rotation).invert();
      tmp.current.pLocal.copy(tmp.current.pWorld).sub(b.center).applyQuaternion(tmp.current.rotInv);

      const minX = -b.half.x;
      const maxX = b.half.x;
      const minZ = -b.half.z;
      const maxZ = b.half.z;

      const insideX = tmp.current.pLocal.x > minX + SKIN && tmp.current.pLocal.x < maxX - SKIN;
      const insideZ = tmp.current.pLocal.z > minZ + SKIN && tmp.current.pLocal.z < maxZ - SKIN;
      if (!insideX || !insideZ) continue;

      const pushToMinX = minX + SKIN - tmp.current.pLocal.x;
      const pushToMaxX = maxX - SKIN - tmp.current.pLocal.x;
      const pushToMinZ = minZ + SKIN - tmp.current.pLocal.z;
      const pushToMaxZ = maxZ - SKIN - tmp.current.pLocal.z;

      const candidates = [
        { axis: "x", val: pushToMinX },
        { axis: "x", val: pushToMaxX },
        { axis: "z", val: pushToMinZ },
        { axis: "z", val: pushToMaxZ },
      ];

      let best = candidates[0];
      for (const c of candidates) if (Math.abs(c.val) < Math.abs(best.val)) best = c;

      const push = THREE.MathUtils.clamp(best.val, -MAX_PUSH_PER_FRAME, MAX_PUSH_PER_FRAME);

      tmp.current.fixedLocal.copy(tmp.current.pLocal);
      if (best.axis === "x") tmp.current.fixedLocal.x += push;
      else tmp.current.fixedLocal.z += push;

      tmp.current.fixedWorld.copy(tmp.current.fixedLocal).applyQuaternion(b.rotation).add(b.center);

      pl.position.x = tmp.current.fixedWorld.x;
      pl.position.z = tmp.current.fixedWorld.z;

      tmp.current.pWorld.set(pl.position.x, pl.position.y, pl.position.z);
    }
  });

  return null;
}

function RoomClamp({ playerRef, margin = 1.0 }) {
  useFrame(() => {
    const p = playerRef.current;
    if (!p) return;

    const half = ROOM_SIZE / 2 - margin;
    p.position.x = THREE.MathUtils.clamp(p.position.x, -half, half);
    p.position.z = THREE.MathUtils.clamp(p.position.z, -half, half);
  });

  return null;
}

function ClickableGLB({
  url,
  label,
  action,
  pos = [0, 0, 0],
  rot = [0, 0, 0],
  active = false,
  onAction,
  hitbox = null,
  hitboxY = 0.9,
  modelScale = 1.0,
  hitboxScale = 1.0,
}) {
  const g = useRef();
  const gltf = useGLTF(url);
  const [hover, setHover] = useState(false);

  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    s.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.geometry?.attributes?.color && o.material && !o.material.vertexColors) {
          o.material.vertexColors = true;
        }
        if (o.material) o.material.needsUpdate = true;
      }
    });
    return s;
  }, [gltf.scene]);

  const normalized = useMemo(() => {
    const root = new THREE.Group();
    root.add(scene);

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);

    const height = Math.max(0.0001, size.y);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const minY = box.min.y;

    scene.position.set(-center.x, -minY, -center.z);

    const s = (TARGET_MODEL_HEIGHT / height) * SCALE_MULT;
    root.scale.set(s, s, s);

    return root;
  }, [scene]);

  useFrame((_, dt) => {
    if (!g.current) return;

    const on = hover || active;
    const factor = active ? 1.08 : hover ? 1.04 : 1.0;
    const base = modelScale * factor;

    const target = new THREE.Vector3(base, base, base);
    g.current.scale.lerp(target, 1 - Math.pow(0.001, dt));

    const float = on ? Math.sin(performance.now() * 0.003) * 0.05 : 0;
    g.current.position.y = pos[1] + float;
  });

  const over = (e) => {
    e.stopPropagation();
    document.body.style.cursor = "pointer";
    setHover(true);
  };
  const out = () => {
    document.body.style.cursor = "default";
    setHover(false);
  };
  const down = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onAction(action);
  };

  const scaledHitbox = Array.isArray(hitbox)
    ? [hitbox[0] * hitboxScale, hitbox[1] * hitboxScale, hitbox[2] * hitboxScale]
    : null;

  return (
    <group ref={g} position={pos} rotation={rot}>
      <group onPointerOver={over} onPointerOut={out} onPointerDown={down}>
        <primitive object={normalized} />
      </group>

      {Array.isArray(scaledHitbox) && (
        <mesh onPointerOver={over} onPointerOut={out} onPointerDown={down} position={[0, hitboxY, 0]} renderOrder={-1}>
          <boxGeometry args={scaledHitbox} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
        </mesh>
      )}

      <Text position={[0, TARGET_MODEL_HEIGHT * 0.75, 0]} fontSize={0.16} anchorX="center" anchorY="middle" color="black">
        {label}
      </Text>

      {(hover || active) && (
        <Text position={[0, 0.12, 0]} fontSize={0.14} anchorX="center" anchorY="middle" color="black">
          {active ? "E / Click" : "Click"}
        </Text>
      )}
    </group>
  );
}

function ProximityWatcher({ playerRef, items, keys, setNearItem, onAction, setActiveId, camRef }) {
  const lastNearId = useRef(null);
  const lastE = useRef(false);

  useFrame(() => {
    const p = playerRef.current;
    if (!p) return;

    let best = null;
    let bestScore = Infinity;

    for (const it of items) {
      const dx = p.position.x - it.pos[0];
      const dz = p.position.z - it.pos[2];
      const d = Math.sqrt(dx * dx + dz * dz);

      const r = it.interactRadius ?? INTERACT_RADIUS;
      const score = d / Math.max(0.001, r);

      if (score < bestScore) {
        bestScore = score;
        best = { ...it, dist: d, r };
      }
    }

    const near = best && best.dist <= best.r ? best : null;
    const nearId = near ? near.id : null;

    if (nearId !== lastNearId.current) {
      lastNearId.current = nearId;
      setNearItem(near);
      setActiveId(nearId);
    }

    const eNow = !!keys?.KeyE;
    if (near && eNow && !lastE.current) onAction(near.action);
    lastE.current = eNow;

    const base = camRef.current.userDist ?? 10;
    const targetDist = near ? THREE.MathUtils.clamp(base - ZOOM_AMOUNT, 4, 18) : THREE.MathUtils.clamp(base, 4, 18);
    camRef.current.dist = THREE.MathUtils.lerp(camRef.current.dist, targetDist, 0.08);

    const targetT = near ? 1 : 0;
    camRef.current.focusT = THREE.MathUtils.lerp(camRef.current.focusT ?? 0, targetT, 0.08);

    if (near) camRef.current.focusPos = { x: near.pos[0], y: 0.8, z: near.pos[2] };
    else camRef.current.focusPos = null;
  });

  return null;
}

function Toast({ toast }) {
  if (!toast?.show) return null;
  const bg = toast.kind === "error" ? "rgba(180,30,30,0.92)" : "rgba(20,20,20,0.92)";

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 18,
        transform: "translateX(-50%)",
        background: bg,
        color: "white",
        padding: "12px 14px",
        borderRadius: 14,
        fontFamily: "ui-sans-serif, system-ui, -apple-system",
        fontWeight: 900,
        boxShadow: "0 14px 40px rgba(0,0,0,0.25)",
        zIndex: 60,
        border: "1px solid rgba(255,255,255,0.08)",
        maxWidth: "92vw",
      }}
    >
      {toast.text}
    </div>
  );
}

function ContactModal({ open, onClose, onToast }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const valid =
    firstName.trim().length > 1 &&
    lastName.trim().length > 1 &&
    email.trim().includes("@") &&
    msg.trim().length > 4;

  const send = async () => {
    if (!valid || sending) return;
    setSending(true);

    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ firstName, lastName, email, message: msg }),
      });

      if (!res.ok) throw new Error("Formspree failed");

      onToast("Sent ✅", "success");
      setFirstName("");
      setLastName("");
      setEmail("");
      setMsg("");
      onClose();
    } catch {
      onToast("Send failed ❌ (Formspree URL / network)", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(10px)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(760px, 92vw)",
          borderRadius: 18,
          background: "rgba(20, 20, 20, 0.92)",
          border: "1px solid rgba(0,0,0,0.10)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          padding: 18,
          fontFamily: "ui-sans-serif, system-ui, -apple-system",
          color: "#f2f2f2",
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Contact</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>Write me a message</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>First name</div>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Your first name" style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Last name</div>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Your last name" style={inputStyle} />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Email</div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" style={inputStyle} />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Message</div>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Write your message..."
              style={{ ...inputStyle, minHeight: 160, resize: "vertical" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "10px 12px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 800,
              color: "#f2f2f2",
            }}
          >
            Cancel
          </button>

          <button
            onClick={send}
            disabled={!valid || sending}
            style={{
              background: valid && !sending ? "#111" : "rgba(0,0,0,0.25)",
              color: "white",
              border: 0,
              padding: "10px 14px",
              borderRadius: 12,
              cursor: valid && !sending ? "pointer" : "not-allowed",
              fontWeight: 900,
              minWidth: 120,
            }}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectModal({ open, onClose, project }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !project) return null;

  const modal = project.modal ?? {};
  const variant = modal.variant ?? "normal";
  const fitMode = modal.fit ?? "contain";
  const frame = modal.frame ?? false;

  const width = modal.width ?? (variant === "tall" ? "min(1400px, 98vw)" : "min(980px, 94vw)");
  const maxHeight = modal.maxHeight ?? (variant === "tall" ? "94vh" : "86vh");

  const portraitHeight = modal.portraitHeight ?? (variant === "tall" ? 520 : 320);
  const landscapeHeight = modal.landscapeHeight ?? (variant === "tall" ? 240 : 180);

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 55,
        background: "rgba(0,0,0,0.38)",
        backdropFilter: "blur(10px)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width,
          maxHeight,
          overflow: "auto",
          borderRadius: 18,
          background: "rgba(20, 20, 20, 0.92)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.30)",
          padding: variant === "tall" ? 22 : 18,
          fontFamily: "ui-sans-serif, system-ui, -apple-system",
          color: "#f2f2f2",
        }}
      >
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Project</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 2 }}>{project.title}</div>
            <div style={{ fontSize: 14, opacity: 0.85, marginTop: 8, lineHeight: 1.45 }}>{project.description}</div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "10px 12px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
              whiteSpace: "nowrap",
              color: "#f5f5f5",
            }}
          >
            Close (Esc)
          </button>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>Screenshots</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
              alignItems: "start",
            }}
          >
            {project.images.map((src) => (
              <SmartShot
                key={src}
                src={src}
                fitMode={fitMode}
                frame={frame}
                portraitHeight={portraitHeight}
                landscapeHeight={landscapeHeight}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SmartShot({ src, fitMode = "contain", frame = false, portraitHeight = 520, landscapeHeight = 240 }) {
  const [ratio, setRatio] = useState(null);
  const isPortrait = ratio != null ? ratio < 1 : false;
  const h = isPortrait ? portraitHeight : landscapeHeight;

  let fit = fitMode;
  if (fitMode === "auto") fit = isPortrait ? "contain" : "cover";
  if (fit !== "cover") fit = "contain";

  return (
    <div
      style={{
        borderRadius: 14,
        overflow: "hidden",
        background: "transparent",
        border: frame ? "1px solid rgba(255,255,255,0.12)" : "none",
        boxShadow: frame ? "0 10px 30px rgba(0,0,0,0.30)" : "none",
      }}
    >
      <img
        src={src}
        alt=""
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
        }}
        style={{
          width: "100%",
          height: h,
          display: "block",
          objectFit: fit,
          objectPosition: "center",
          background: "transparent",
        }}
      />
    </div>
  );
}

function AboutModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 56,
        background: "rgba(0,0,0,0.38)",
        backdropFilter: "blur(10px)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(980px, 94vw)",
          maxHeight: "86vh",
          overflow: "auto",
          borderRadius: 18,
          background: "rgba(20, 20, 20, 0.92)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.30)",
          padding: 18,
          fontFamily: "ui-sans-serif, system-ui, -apple-system",
          color: "#f2f2f2",
        }}
      >
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Profile</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 2 }}>About</div>

            
            <div style={{ fontSize: 14, opacity: 0.88, marginTop: 10, lineHeight: 1.6 }}>
              I’m Orkun — a software and game developer working with Unity, Java, and C. I build game projects with a focus on clean architecture, maintainable code, and steady improvement through iteration.
            </div>
<div style={{ marginTop: 14 }}>
  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>Skills</div>
  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
    {[
      "Java",
      "Python",
      "Unity (Game Engine)",
      "C# / OOP",
      "C",
      "Data Structures & Algorithms",
      "SQL & Database Management",
    ].map((s) => (
      <span
        key={s}
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "10px 14px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#f2f2f2",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 0.2,
          boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
          userSelect: "none",
        }}
      >
        {s}
      </span>
    ))}
  </div>
  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 16, marginBottom: 10 }}>Languages</div>
  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
    {[
      "English (C1)",
      "Spanish (A2)",
    ].map((l) => (
      <span
        key={l}
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "10px 14px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "#f2f2f2",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 0.2,
          boxShadow: "0 10px 25px rgba(0,0,0,0.16)",
          userSelect: "none",
        }}
      >
        {l}
      </span>
    ))}
  </div>
<div style={{ fontSize: 12, opacity: 0.7, marginTop: 16, marginBottom: 10 }}>Education</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
  {[
    "Izmir Economy University — Computer Engineering",
  ].map((e) => (
    <span
      key={e}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "10px 14px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: "#f2f2f2",
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: 0.2,
        boxShadow: "0 10px 25px rgba(0,0,0,0.16)",
        userSelect: "none",
      }}
    >
      {e}
    </span>
  ))}
</div>

</div>


          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "10px 12px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
              whiteSpace: "nowrap",
              color: "#f5f5f5",
            }}
          >
            Close (Esc)
          </button>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>Experience</div>

          <div style={{ display: "grid", gap: 12 }}>
            <ExperienceCard
              title="IT Intern / Türk Telekom International"
              meta=" July 2025 – September 2025"
              bullets={[
                "Developed and enhanced CRM features at Türk Telekom using Python and SQL, focusing on clean, maintainable implementations and reliable data handling.",
                "Automated data extraction and reporting workflows to reduce manual effort and improve consistency across teams.",,
              ]}
            />
            <ExperienceCard
              title="Software Dept. / Viper Defence "
              meta="2024 – Present"
              bullets={[
                "Software & computer vision tasks on a UAV project.",

              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExperienceCard({ title, meta, bullets }) {
  return (
    <div
      style={{
        borderRadius: 14,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{meta}</div>
      </div>

      <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, lineHeight: 1.55, opacity: 0.92 }}>
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.12)",
  outline: "none",
  background: "rgba(255,255,255,0.95)",
  fontSize: 14,
  fontWeight: 600,
};

function Scene({ camRef, onAction, setNearItem, controlsLocked }) {
  const keys = useKeyboard(!controlsLocked);
  const playerRef = useRef(null);

  const items = useMemo(
    () => [
      {
        id: "linkedin",
        label: "LinkedIn",
        uiLabel: "LinkedIn Profile",
        action: { type: "url", value: "https://www.linkedin.com/in/orkunefeözdemir67" },
        url: LINKEDIN_GLB,
        pos: [25, 0, -20],
        rot: [0, -0.8, 0],
      },
      {
        id: "github",
        label: "GitHub",
        uiLabel: "GitHub Repository",
        action: { type: "url", value: "https://github.com/orkrun" },
        url: GITHUB_GLB,
        pos: [19, 0, -26],
        rot: [0, -0.8, 0],
      },
      {
        id: "gmail",
        label: "Contact Me",
        uiLabel: "Get in Touch",
        action: { type: "contact" },
        url: GMAIL_GLB,
        pos: [23, 0, -24],
        rot: [0, -0.8, 0],
      },
      {
        id: "aboutTable",
        label: "About",
        uiLabel: "About & Experience",
        action: { type: "about" },
        url: TABLE_GLB,
        pos: [0, 0, 10],
        rot: [0, 1.6, 0],
        hitbox: [10.0, 4.0, 6.0],
        hitboxY: 1.5,
        interactRadius: 7.5,
      },

      {
        id: "carProject",
        label: "My Game",
        uiLabel: "Open Project",
        action: { type: "project", id: "car-game" },
        url: CAR_GLB,
        pos: [-19, 0, -19],
        rot: [0, 0.8, 0],
        hitbox: [8.0, 3.0, 20],
        hitboxY: 1.2,
        interactRadius: 8.5,
      },
      {
        id: "serverProject",
        label: "Servers",
        uiLabel: "Open Project",
        action: { type: "project", id: "server-project" },
        url: SERVER_GLB,
        pos: [-1, 0, -24],
        rot: [0, 0, 0],
        hitbox: [7.0, 5.0, 6.0],
        hitboxY: 2.2,
        interactRadius: 7.5,
      },
      {
        id: "chickProject",
        label: "Chick Game",
        uiLabel: "Open Project",
        action: { type: "project", id: "chick-game" },
        url: CHICK_GLB,
        pos: [-23, 0, -5],
        rot: [0, 1.7, 0],
        hitbox: [6.5, 4.0, 6.5],
        hitboxY: 1.6,
        interactRadius: 7.0,
      },
    ],
    []
  );

  const [activeId, setActiveId] = useState(null);
  const obbList = useMemo(() => {
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));

    const mk = (id, baseHalf) => {
      const it = byId[id];
      if (!it) return null;

      const yaw = it.rot?.[1] ?? 0;
      const half = baseHalf.clone();

      return {
        center: new THREE.Vector3(it.pos?.[0] ?? 0, 0, it.pos?.[2] ?? 0),
        half,
        rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
      };
    };

    const car = mk("carProject", new THREE.Vector3(5, 2.0, 10));
    const server = mk("serverProject", new THREE.Vector3(2.4, 3.0, 2.0));
    const chick = mk("chickProject", new THREE.Vector3(2.6, 2.6, 2.6));
    const table = mk("aboutTable", new THREE.Vector3(3.6, 2.0, 2.4));

    return [car, server, chick, table].filter(Boolean);
  }, [items]);

  const GROUND = ROOM_SIZE + 24;
  const GRID_DIV = Math.max(10, Math.round(GROUND / 2));

  return (
    <>
      <color attach="background" args={[BG_COLOR]} />
      <fog attach="fog" args={[BG_COLOR, FOG_NEAR, FOG_FAR]} />

      <WhiteRoom />

      <ambientLight intensity={0.35} />
      <hemisphereLight intensity={0.7} color={"#ffffff"} groundColor={"#e6e6e6"} />
      <directionalLight
        castShadow
        position={[8, 18, 10]}
        intensity={0.95}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-10, 12, -8]} intensity={0.35} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND, GROUND]} />
        <meshStandardMaterial color="#1b2230" roughness={1} />
      </mesh>
      <gridHelper args={[GROUND, GRID_DIV]} />

      {items.map((it) => (
        <ClickableGLB
          key={it.id}
          url={it.url}
          label={it.label}
          action={it.action}
          pos={it.pos}
          rot={it.rot}
          active={activeId === it.id}
          onAction={onAction}
          hitbox={it.hitbox ?? null}
          hitboxY={it.hitboxY ?? 0.9}
          modelScale={MODEL_SCALE[it.id] ?? 1.0}
          hitboxScale={HITBOX_EXTRA_SCALE[it.id] ?? 1.0}
        />
      ))}

      <Player keys={keys} playerRef={playerRef} camYaw={camRef.current.yaw} disabled={controlsLocked} />
      <CollisionPush playerRef={playerRef} obbList={obbList} />
      <RoomClamp playerRef={playerRef} margin={1.0} />

      <BlobShadow targetRef={playerRef} />
      <FollowCam targetRef={playerRef} camRef={camRef} />

      <ProximityWatcher
        playerRef={playerRef}
        items={items}
        keys={keys}
        setNearItem={setNearItem}
        onAction={onAction}
        setActiveId={setActiveId}
        camRef={camRef}
      />
    </>
  );
}

export default function World() {
  const [nearItem, setNearItem] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);

  const [projectOpen, setProjectOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(null);

  const [aboutOpen, setAboutOpen] = useState(false);

  const controlsLocked = contactOpen || projectOpen || aboutOpen;

  const PROJECTS = useMemo(
    () => ({
      "car-game": {
        title: "RedBull Ring",
        description:
          "A third-person driving game developed in Unity featuring smooth vehicle controls, real racing map, and realistic ground interaction using raycasting. The project also includes AI-driven opponent cars trained using an LLM-based decision system, allowing them to compete against the player in races. Designed for future expansion.",
        images: [
          `${import.meta.env.BASE_URL}images/projects/car-game/1.png`,
          `${import.meta.env.BASE_URL}images/projects/car-game/2.png`,
          `${import.meta.env.BASE_URL}images/projects/car-game/3.png`,
        ],
        modal: { variant: "normal", fit: "contain", frame: false },
      },

      "server-project": {
        title: "Link Protocol",
        description:
          "A Unity-based puzzle game where players complete pattern-based cable connections to activate systems and advance through levels. Features real-time feedback, increasing difficulty, and pixel-art visuals.",
        images: [
          `${import.meta.env.BASE_URL}images/projects/server/1.png`,
          `${import.meta.env.BASE_URL}images/projects/server/2.png`,
          `${import.meta.env.BASE_URL}images/projects/server/3.png`,
        ],
        modal: {
          variant: "tall",
          fit: "contain",
          frame: false,
          width: "min(1400px, 98vw)",
          maxHeight: "94vh",
          portraitHeight: 520,
          landscapeHeight: 240,
        },
      },

      "chick-game": {
        title: "Chick Game",
        description:
          "A 3D survival/collection game where the player controls a chick, collects eggs in a kitchen environment, and uses boosts to reach the goal. The game features an LLM-driven cat AI that patrols and adapts its chase behavior dynamically. This project was completed as part of a learning/training process and is included here to showcase the mechanics and AI concepts I studied and worked with.",
        images: [
          `${import.meta.env.BASE_URL}images/projects/chick-game/1.png`,
          `${import.meta.env.BASE_URL}images/projects/chick-game/2.png`,
          `${import.meta.env.BASE_URL}images/projects/chick-game/3.png`,
        ],
        modal: { variant: "normal", fit: "contain", frame: false },
      },
    }),
    []
  );

  const activeProject = activeProjectId ? PROJECTS[activeProjectId] : null;

  const toastTimer = useRef(null);
  const [toast, setToast] = useState({ show: false, text: "", kind: "success" });

  const showToast = (text, kind = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ show: true, text, kind });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200);
  };

  const [uiItem, setUiItem] = useState(null);
  const [uiOpen, setUiOpen] = useState(false);

  useEffect(() => {
    if (nearItem) {
      setUiItem(nearItem);
      requestAnimationFrame(() => setUiOpen(true));
      return;
    }
    setUiOpen(false);
    const t = setTimeout(() => setUiItem(null), 220);
    return () => clearTimeout(t);
  }, [nearItem]);

  const camRef = useRef({
    yaw: Math.PI,
    pitch: 0.2,
    dist: 10,
    userDist: 10,
    focusT: 0,
    focusPos: null,
    freelook: false,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    const up = () => (camRef.current.freelook = false);
    window.addEventListener("mouseup", up);
    window.addEventListener("blur", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("blur", up);
    };
  }, []);

  const onAction = (action) => {
    if (!action) return;

    if (action.type === "contact") {
      setContactOpen(true);
      return;
    }
    if (action.type === "about") {
      setAboutOpen(true);
      return;
    }

    if (action.type === "project") {
      setActiveProjectId(action.id);
      setProjectOpen(true);
      return;
    }

    if (action.type === "url" && typeof action.value === "string") {
      window.open(action.value, "_blank", "noopener,noreferrer");
    }
  };

  const onPointerDown = (e) => {
    if (controlsLocked) return;
    if (e.button !== 2) return;
    camRef.current.freelook = true;
    camRef.current.lastX = e.clientX;
    camRef.current.lastY = e.clientY;
    e.target?.setPointerCapture?.(e.pointerId);
  };

  const onPointerUp = (e) => {
    if (controlsLocked) return;
    if (e.button === 2) {
      camRef.current.freelook = false;
      e.target?.releasePointerCapture?.(e.pointerId);
    }
  };

  const onPointerMove = (e) => {
    if (controlsLocked) return;
    if ((e.buttons & 2) === 0) {
      camRef.current.freelook = false;
      return;
    }
    if (!camRef.current.freelook) return;

    const dx = e.clientX - camRef.current.lastX;
    const dy = e.clientY - camRef.current.lastY;

    camRef.current.lastX = e.clientX;
    camRef.current.lastY = e.clientY;

    const sens = 0.005;
    camRef.current.yaw -= dx * sens;
    camRef.current.pitch = THREE.MathUtils.clamp(camRef.current.pitch - dy * sens, PITCH_MIN, PITCH_MAX);
  };

  const onWheel = (e) => {
    if (controlsLocked) return;
    camRef.current.userDist = THREE.MathUtils.clamp(camRef.current.userDist + e.deltaY * 0.01, 4, 18);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", touchAction: "none", position: "relative" }} onContextMenu={(e) => e.preventDefault()}>
      <Toast toast={toast} />

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} onToast={showToast} />

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />

      <ProjectModal
        open={projectOpen}
        onClose={() => {
          setProjectOpen(false);
          setActiveProjectId(null);
        }}
        project={activeProject}
      />

      {uiItem && !controlsLocked && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 24,
            transform: uiOpen ? "translateX(-50%) translateY(0px) scale(1)" : "translateX(-50%) translateY(18px) scale(0.98)",
            opacity: uiOpen ? 1 : 0,
            transition: "transform 220ms ease, opacity 220ms ease",
            background: "rgba(255,255,255,0.75)",
            border: "1px solid rgba(0,0,0,0.10)",
            backdropFilter: "blur(10px)",
            padding: "14px 16px",
            borderRadius: 16,
            color: "#111",
            width: 420,
            zIndex: 10,
            boxShadow: "0 14px 40px rgba(0,0,0,0.20)",
            fontFamily: "ui-sans-serif, system-ui, -apple-system",
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Nearby</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>{uiItem.uiLabel ?? uiItem.label}</div>
              <div style={{ fontSize: 12, opacity: 0.82, marginTop: 6 }}>
                Press <b>E</b> or click the model
              </div>
            </div>

            <button
              onClick={() => onAction(uiItem.action)}
              style={{
                background: "#111",
                color: "white",
                border: 0,
                padding: "10px 12px",
                borderRadius: 12,
                fontWeight: 900,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Open
            </button>
          </div>
        </div>
      )}

      <Canvas
        shadows
        camera={{ position: [0, 6, 10], fov: 55 }}
        gl={{ antialias: true, preserveDrawingBuffer: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.autoClear = true;
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={() => (camRef.current.freelook = false)}
        onPointerMove={onPointerMove}
        onWheel={onWheel}
      >
        <Suspense fallback={null}>
          <Scene camRef={camRef} onAction={onAction} setNearItem={setNearItem} controlsLocked={controlsLocked} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(LINKEDIN_GLB);
useGLTF.preload(GITHUB_GLB);
useGLTF.preload(GMAIL_GLB);
useGLTF.preload(CAR_GLB);
useGLTF.preload(SERVER_GLB);
useGLTF.preload(CHICK_GLB);
useGLTF.preload(TABLE_GLB);
