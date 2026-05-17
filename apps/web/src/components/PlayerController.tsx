import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import { useTyping } from "../lib/typing";
import { playerPosStore } from "../lib/room-context";

// first-person controller. WASD in camera-local space, y locked to eye height,
// x/z clamped to room bounds (room is 20x20 centered at origin → walls at +-10,
// with a small inset so the player can't clip through them).
const EYE_HEIGHT = 1.6;
const MOVE_SPEED = 4;
const BOUND = 9;

interface KeyState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

export function PlayerController() {
  const { camera, gl } = useThree();
  const keys = useRef<KeyState>({ forward: false, back: false, left: false, right: false });
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  const move = useRef(new Vector3());
  const { typing } = useTyping();
  const typingRef = useRef(typing);
  typingRef.current = typing;

  useEffect(() => {
    camera.position.set(0, EYE_HEIGHT, 5);
  }, [camera]);

  // when typing flips on, clear any held keys so the player doesn't drift.
  useEffect(() => {
    if (typing) {
      keys.current.forward = false;
      keys.current.back = false;
      keys.current.left = false;
      keys.current.right = false;
    }
  }, [typing]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // suppress while typing in chat / dialogue modal.
      if (typingRef.current) return;
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          keys.current.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          keys.current.back = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          keys.current.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          keys.current.right = true;
          break;
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      // we still want to release on keyup even if typing started mid-press,
      // otherwise the player would walk forever after closing chat.
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          keys.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          keys.current.back = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          keys.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          keys.current.right = false;
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // toggle a body class while pointer is locked — used to hide the OS cursor.
  useEffect(() => {
    const dom = gl.domElement;
    function onLockChange() {
      const locked = document.pointerLockElement === dom;
      document.body.classList.toggle("pointer-locked", locked);
    }
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      document.removeEventListener("pointerlockchange", onLockChange);
      document.body.classList.remove("pointer-locked");
    };
  }, [gl]);

  useFrame((_state, dt) => {
    const k = keys.current;
    // compute camera-local basis on the horizontal plane.
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();

    move.current.set(0, 0, 0);
    if (k.forward) move.current.add(forward.current);
    if (k.back) move.current.sub(forward.current);
    if (k.right) move.current.add(right.current);
    if (k.left) move.current.sub(right.current);
    if (move.current.lengthSq() > 0) {
      move.current.normalize().multiplyScalar(MOVE_SPEED * dt);
      camera.position.x += move.current.x;
      camera.position.z += move.current.z;
    }

    // clamp to room and pin eye height.
    camera.position.x = Math.max(-BOUND, Math.min(BOUND, camera.position.x));
    camera.position.z = Math.max(-BOUND, Math.min(BOUND, camera.position.z));
    camera.position.y = EYE_HEIGHT;

    // publish to the cross-Canvas store so DOM overlays + scene
    // (proximity check for NPCDialogue) can read player pose.
    const yaw = Math.atan2(forward.current.x, forward.current.z);
    playerPosStore.set({ x: camera.position.x, z: camera.position.z, rot: yaw });
  });

  return <PointerLockControls />;
}
