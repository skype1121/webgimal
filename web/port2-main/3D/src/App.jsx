import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Environment, 
  Text, 
  Billboard,
  OrbitControls
} from '@react-three/drei';
import * as THREE from 'three';
import { create } from 'zustand';
import { Terminal, Send, X, User, Trash2, ArrowLeft } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, limit, deleteDoc, doc } from 'firebase/firestore';
import { getDatabase, ref, set, onValue, onDisconnect, update, remove } from 'firebase/database';

// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDqltXG91yfWaSsEe_pvMGCL_tz8gkek4c",
  authDomain: "webgimal-4340e.firebaseapp.com",
  databaseURL: "https://webgimal-4340e-default-rtdb.firebaseio.com",
  projectId: "webgimal-4340e",
  storageBucket: "webgimal-4340e.firebasestorage.app",
  messagingSenderId: "1066881654157",
  appId: "1:1066881654157:web:a5da2873254c86e05771c4",
  measurementId: "G-LQ278MS2CF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// ==========================================
// 1. GLOBAL STORE (Zustand)
// ==========================================
const useStore = create((set) => ({
  nickname: '',
  setNickname: (name) => set({ nickname: name }),
  isEntered: false,
  setEntered: (entered) => set({ isEntered: entered }),
  isModalOpen: false,
  setModalOpen: (open) => set({ isModalOpen: open }),
  isNearTerminal: false,
  setNearTerminal: (near) => set({ isNearTerminal: near }),
  messages: [],
  setMessages: (msgs) => set({ messages: msgs }),
  isMessagesLoading: true,
  setMessagesLoading: (loading) => set({ isMessagesLoading: loading }),
  dbError: null,
  setDbError: (error) => set({ dbError: error }),
  otherPlayers: {},
  setOtherPlayers: (players) => set({ otherPlayers: players }),
  clears: {},
  setClears: (clears) => set({ clears }),
  fireworksTrigger: 0,
  triggerFireworks: () => set((state) => ({ fireworksTrigger: state.fireworksTrigger + 1 })),
  clearModal: null,
  setClearModal: (modal) => set({ clearModal: modal }),
}));

// ==========================================
// 2. CUSTOM HOOKS
// ==========================================
function useKeys() {
  const [keys, setKeys] = useState({ forward: false, backward: false, left: false, right: false, jump: false, action: false });
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch(e.code) {
        case 'KeyW': case 'ArrowUp': setKeys(k => ({...k, forward: true})); break;
        case 'KeyS': case 'ArrowDown': setKeys(k => ({...k, backward: true})); break;
        case 'KeyA': case 'ArrowLeft': setKeys(k => ({...k, left: true})); break;
        case 'KeyD': case 'ArrowRight': setKeys(k => ({...k, right: true})); break;
        case 'Space': setKeys(k => ({...k, jump: true})); break;
        case 'KeyE': setKeys(k => ({...k, action: true})); break;
      }
    };
    const handleKeyUp = (e) => {
      switch(e.code) {
        case 'KeyW': case 'ArrowUp': setKeys(k => ({...k, forward: false})); break;
        case 'KeyS': case 'ArrowDown': setKeys(k => ({...k, backward: false})); break;
        case 'KeyA': case 'ArrowLeft': setKeys(k => ({...k, left: false})); break;
        case 'KeyD': case 'ArrowRight': setKeys(k => ({...k, right: false})); break;
        case 'Space': setKeys(k => ({...k, jump: false})); break;
        case 'KeyE': setKeys(k => ({...k, action: false})); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  return keys;
}

// ==========================================
// JUMP MAP CONFIGURATION & PHYSICS
// ==========================================
// JUMP MAP CONFIGURATION & PHYSICS
// ==========================================
const BOUNCERS = [];

const JUMP_PLATFORMS = (() => {
  const platforms = [];
  let currentY = 1.4;
  let currentAngle = -0.5; // Start to the right of the board
  let currentRadius = 22.5;
  
  for (let i = 1; i <= 38; i++) {
    const x = Math.round(Math.cos(currentAngle) * currentRadius * 10) / 10;
    const z = Math.round(Math.sin(currentAngle) * currentRadius * 10) / 10;
    
    // Scale goes down as we go higher (starts at 2.0, ends at 0.65)
    const width = Math.round(Math.max(0.65, 2.0 - (i - 1) * 0.04) * 10) / 10;
    
    // Height difference increases to make it harder (Difficulty rises!)
    // Step 1-10: 1.2m (easy)
    // Step 11-20: 1.4m (medium)
    // Step 21-30: 1.55m (hard)
    // Step 31-38: 1.7m (extreme!)
    let heightDiff = 1.2;
    if (i > 30) heightDiff = 1.7;
    else if (i > 20) heightDiff = 1.55;
    else if (i > 10) heightDiff = 1.4;

    // Colors based on stage
    let color;
    if (i > 30) color = "#ec4899"; // Pink (Extreme)
    else if (i > 20) color = "#8b5cf6"; // Purple (Hard)
    else if (i > 10) color = "#0284c7"; // Blue (Medium)
    else color = "#10b981"; // Green (Easy)

    // Special Platform types (Jump Pads)
    let isBouncer = false;
    let bouncerForce = 0;

    if (i === 8) {
      isBouncer = true;
      bouncerForce = 15;
      color = "#00ffff"; // Cyan for Bouncer
    } else if (i === 17) {
      isBouncer = true;
      bouncerForce = 17;
      color = "#00ffff";
    } else if (i === 26) {
      isBouncer = true;
      bouncerForce = 19;
      color = "#00ffff";
    } else if (i === 34) {
      isBouncer = true;
      bouncerForce = 20;
      color = "#00ffff";
    }

    // Mark some platforms as moving (Adding side-to-side challenges)
    let isMoving = false;
    let moveRange = 0;
    let speed = 0;
    let axis = 'x';
    
    if (i === 5) {
      isMoving = true;
      moveRange = 1.4;
      speed = 2.0;
      axis = 'x';
    } else if (i === 10) {
      isMoving = true;
      moveRange = 1.6;
      speed = 1.8;
      axis = 'z';
    } else if (i === 14) {
      isMoving = true;
      moveRange = 1.8;
      speed = 2.2;
      axis = 'x';
    } else if (i === 19) {
      isMoving = true;
      moveRange = 1.5;
      speed = 2.5;
      axis = 'z';
    } else if (i === 23) {
      isMoving = true;
      moveRange = 2.0;
      speed = 2.4;
      axis = 'x';
    } else if (i === 28) {
      isMoving = true;
      moveRange = 1.8;
      speed = 2.8;
      axis = 'z';
    } else if (i === 32) {
      isMoving = true;
      moveRange = 2.2;
      speed = 2.6;
      axis = 'x';
    } else if (i === 36) {
      isMoving = true;
      moveRange = 1.6;
      speed = 3.2;
      axis = 'z';
    }
    
    platforms.push({
      id: i,
      x,
      y: Math.round(currentY * 10) / 10,
      z,
      width,
      depth: width,
      color,
      isMoving,
      moveRange,
      speed,
      axis,
      isBouncer,
      bouncerForce
    });
    
    // Update for next platform
    currentY += heightDiff;
    
    // Jump gap increases slightly as we go higher
    const horizontalGap = 3.3 + Math.min(1.0, (i - 1) * 0.04);
    
    currentAngle += horizontalGap / currentRadius;
    currentRadius -= 0.44; // spiral inward gradually to accommodate 38 platforms
  }
  
  // Last platform is the golden goal platform
  const last = platforms[platforms.length - 1];
  last.color = "#eab308";
  last.width = 2.2;
  last.depth = 2.2;
  
  return platforms;
})();

const getPlatformPos = (p, time) => {
  if (p.isMoving && time) {
    const offset = Math.sin(time * p.speed) * p.moveRange;
    if (p.axis === 'x') {
      return { x: p.x + offset, z: p.z };
    } else {
      return { x: p.x, z: p.z + offset };
    }
  }
  return { x: p.x, z: p.z };
};

const getSupportHeight = (x, z, currentY, time) => {
  let highestSupport = 1.1; // Base ground height (y = 0 + 1.1)
  for (const p of JUMP_PLATFORMS) {
    const hw = p.width / 2;
    const hd = p.depth / 2;
    const pos = getPlatformPos(p, time);
    if (x >= pos.x - hw && x <= pos.x + hw && z >= pos.z - hd && z <= pos.z + hd) {
      // The platform's top surface is at p.y
      // The required support height for the player's group Y is p.y + 1.1
      const targetSupport = p.y + 1.1;
      // It can support the player only if the player is at or above this support height (with a tolerance)
      if (currentY >= targetSupport - 0.2) {
        if (targetSupport > highestSupport) {
          highestSupport = targetSupport;
        }
      }
    }
  }
  return highestSupport;
};

const SpecialPlatformDecorations = ({ p }) => {
  return (
    <group position={[0, 0.2, 0]}>
      {p.isBouncer && (
        <>
          {/* Pulsing ring on the platform floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.25, 0.45, 32]} />
            <meshBasicMaterial color="#00ffff" toneMapped={false} />
          </mesh>
          {/* Billboard floating label */}
          <Billboard position={[0, 0.7, 0]}>
            <Text fontSize={0.22} color="#00ffff" outlineWidth={0.02} outlineColor="#000" fontWeight="bold">
              ⚡ JUMP PAD ⚡
            </Text>
          </Billboard>
        </>
      )}
    </group>
  );
};

const MovingPlatform = ({ p }) => {
  const meshRef = useRef();

  useFrame((state) => {
    if (p.isMoving && meshRef.current) {
      const time = state.clock.getElapsedTime();
      const offset = Math.sin(time * p.speed) * p.moveRange;
      if (p.axis === 'x') {
        meshRef.current.position.x = p.x + offset;
      } else {
        meshRef.current.position.z = p.z + offset;
      }
    }
  });

  return (
    <group ref={meshRef} position={[p.x, p.y - 0.2, p.z]}>
      {/* Platform Box */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[p.width, 0.4, p.depth]} />
        <meshStandardMaterial 
          color={p.color} 
          metalness={0.7} 
          roughness={0.2} 
          emissive={p.color} 
          emissiveIntensity={0.6} 
        />
      </mesh>
      {/* Under-glow Light */}
      <pointLight color={p.color} intensity={1} distance={3} position={[0, -0.3, 0]} />
      <SpecialPlatformDecorations p={p} />
    </group>
  );
};

const BouncerObstacle = ({ b }) => {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 3;
      const pulse = 1.0 + Math.sin(state.clock.getElapsedTime() * 6) * 0.1;
      meshRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group position={[b.x, b.y, b.z]}>
      {/* Outer pulsing sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[b.radius, 16, 16]} />
        <meshStandardMaterial 
          color={b.color} 
          metalness={0.9} 
          roughness={0.1} 
          emissive={b.color} 
          emissiveIntensity={1.5} 
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Inner core */}
      <mesh>
        <sphereGeometry args={[b.radius * 0.5, 16, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      {/* Point light */}
      <pointLight color={b.color} intensity={3} distance={5} />
    </group>
  );
};

const JumpMap = () => {
  const trophyRef = useRef();

  useFrame((state) => {
    if (trophyRef.current) {
      trophyRef.current.rotation.y = state.clock.getElapsedTime() * 2;
      trophyRef.current.position.y = 1.2 + Math.sin(state.clock.getElapsedTime() * 3) * 0.15;
    }
  });

  return (
    <group>
      {JUMP_PLATFORMS.map((p) => {
        const isGoal = p.id === JUMP_PLATFORMS.length;
        
        if (p.isMoving) {
          return <MovingPlatform key={p.id} p={p} />;
        }
        
        return (
          <group key={p.id} position={[p.x, p.y - 0.2, p.z]}>
            {/* Platform Box */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[p.width, 0.4, p.depth]} />
              <meshStandardMaterial 
                color={p.color} 
                metalness={0.7} 
                roughness={0.2} 
                emissive={p.color} 
                emissiveIntensity={0.6} 
              />
            </mesh>
            {/* Under-glow Light */}
            <pointLight color={p.color} intensity={1} distance={3} position={[0, -0.3, 0]} />
            
            <SpecialPlatformDecorations p={p} />
            
            {/* Goal Trophy */}
            {isGoal && (
              <group ref={trophyRef} position={[0, 1.2, 0]}>
                {/* Gold Trophy Base */}
                <mesh castShadow>
                  <cylinderGeometry args={[0.3, 0.4, 0.3, 16]} />
                  <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.1} />
                </mesh>
                {/* Gold Trophy Cup */}
                <mesh position={[0, 0.4, 0]} castShadow>
                  <cylinderGeometry args={[0.4, 0.2, 0.5, 16]} />
                  <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.1} />
                </mesh>
                {/* Glowing Goal Star/Core */}
                <mesh position={[0, 0.9, 0]}>
                  <sphereGeometry args={[0.18, 16, 16]} />
                  <meshBasicMaterial color="#ffffff" toneMapped={false} />
                </mesh>
                {/* Floating Goal Text */}
                <Billboard position={[0, 1.5, 0]}>
                  <Text fontSize={0.4} color="#facc15" outlineWidth={0.03} outlineColor="#000" fontWeight="bold">
                    LEGEND
                  </Text>
                </Billboard>
                <pointLight color="#facc15" intensity={2} distance={4} />
              </group>
            )}
          </group>
        );
      })}
      
      {/* Obstacles */}
      {BOUNCERS.map((b) => (
        <BouncerObstacle key={b.id} b={b} />
      ))}
    </group>
  );
};

// ==========================================
// 3. 3D COMPONENTS
// ==========================================

const DummyRobot = ({ speedRef, isJumpingRef, isStunned }) => {
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();
  const boosterRef = useRef();
  const shockwaveRef = useRef();
  const robotGroupRef = useRef();
  const wasJumping = useRef(false);
  const shockwaveTimer = useRef(0);
  const animWeight = useRef(0);

  useFrame((state, delta) => {
    const isJumping = isJumpingRef.current;
    const speed = speedRef.current;
    const isMoving = speed > 0.05 && !isJumping;
    const time = state.clock.getElapsedTime();

    if (robotGroupRef.current) {
      if (isStunned) {
        robotGroupRef.current.rotation.z = THREE.MathUtils.lerp(robotGroupRef.current.rotation.z, -Math.PI / 2, 12 * delta);
        robotGroupRef.current.position.y = THREE.MathUtils.lerp(robotGroupRef.current.position.y, -0.6, 12 * delta);
      } else {
        robotGroupRef.current.rotation.z = THREE.MathUtils.lerp(robotGroupRef.current.rotation.z, 0, 12 * delta);
        robotGroupRef.current.position.y = THREE.MathUtils.lerp(robotGroupRef.current.position.y, 0, 12 * delta);
      }
    }

    if (isMoving && !isStunned) {
      animWeight.current = Math.min(1, animWeight.current + delta * 5);
    } else {
      animWeight.current = Math.max(0, animWeight.current - delta * 5);
    }

    if (animWeight.current > 0) {
      const swing = Math.sin(time * (speed > 4.5 ? 15 : 10)) * 0.5 * animWeight.current;
      if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = swing;
    } else {
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
    }

    // Dynamic booster plasma flicker
    if (boosterRef.current) {
      if (isJumping && !isStunned) {
        boosterRef.current.visible = true;
        
        // Dynamic scale at high frequencies simulating rocket combustion
        const flicker = 1.0 + Math.sin(time * 60) * 0.15;
        const pulse = 1.0 + Math.cos(time * 40) * 0.1;
        boosterRef.current.scale.set(pulse, flicker, pulse);
      } else {
        boosterRef.current.visible = false;
      }
    }

    // Landing shockwave ring effect
    if (isJumping && !isStunned) {
      wasJumping.current = true;
    } else if (wasJumping.current) {
      // Just landed! Trigger shockwave ring
      wasJumping.current = false;
      shockwaveTimer.current = 0.4; // 0.4s duration
      if (shockwaveRef.current) {
        shockwaveRef.current.visible = true;
        shockwaveRef.current.scale.set(0.3, 0.3, 0.3);
        shockwaveRef.current.material.opacity = 0.8;
      }
    }

    if (shockwaveTimer.current > 0) {
      shockwaveTimer.current -= delta;
      const progress = (0.4 - shockwaveTimer.current) / 0.4; // 0 to 1
      
      if (shockwaveRef.current) {
        // Expand ring size from 0.3 to 1.0
        const scaleVal = 0.3 + progress * 0.7;
        shockwaveRef.current.scale.set(scaleVal, scaleVal, scaleVal);
        // Fade out opacity
        shockwaveRef.current.material.opacity = 0.8 * (1 - progress);
      }
      
      if (shockwaveTimer.current <= 0 && shockwaveRef.current) {
        shockwaveRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={robotGroupRef}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.8, 1, 0.6]} />
        <meshStandardMaterial color="#0ea5e9" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0.15, 0.95, 0.35]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="#0ff" toneMapped={false} />
      </mesh>
      <mesh position={[-0.15, 0.95, 0.35]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="#0ff" toneMapped={false} />
      </mesh>
      <group position={[-0.5, 0.5, 0]} ref={leftArmRef}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <boxGeometry args={[0.2, 0.8, 0.2]} />
          <meshStandardMaterial color="#0ea5e9" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
      <group position={[0.5, 0.5, 0]} ref={rightArmRef}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <boxGeometry args={[0.2, 0.8, 0.2]} />
          <meshStandardMaterial color="#0ea5e9" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
      <group position={[-0.2, -0.3, 0]} ref={leftLegRef}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <boxGeometry args={[0.25, 0.8, 0.25]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Left Foot / Shoe */}
        <mesh position={[0, -0.8, 0.08]} castShadow>
          <boxGeometry args={[0.28, 0.15, 0.4]} />
          <meshStandardMaterial color="#0ea5e9" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
      <group position={[0.2, -0.3, 0]} ref={rightLegRef}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <boxGeometry args={[0.25, 0.8, 0.25]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Right Foot / Shoe */}
        <mesh position={[0, -0.8, 0.08]} castShadow>
          <boxGeometry args={[0.28, 0.15, 0.4]} />
          <meshStandardMaterial color="#0ea5e9" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
      
      {/* Dynamic 3-Stage Thruster Flame */}
      <group ref={boosterRef} position={[0, -1.0, 0]} visible={false}>
        {/* White Inner Flame Core */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.12, 0.01, 0.5, 16]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        {/* Main Cyan Plasma Envelope */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.04, 0.7, 16]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.65} toneMapped={false} />
        </mesh>
        {/* Outer Pink Dispersal Cone */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.38, 0.0, 0.5, 16]} />
          <meshBasicMaterial color="#ff00ff" transparent opacity={0.3} toneMapped={false} />
        </mesh>
        <pointLight color="#00ffff" intensity={3} distance={5} />
      </group>

      {/* Landing Shockwave Ring */}
      <mesh ref={shockwaveRef} position={[0, -1.1, 0.01]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.8, 1.0, 32]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.8} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
};
const Player = () => {
  const { nickname, isEntered } = useStore();
  const playerRef = useRef();
  const speedRef = useRef(0);
  const keys = useKeys();
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const position = useRef(new THREE.Vector3(0, 1.1, 5));
  const rotation = useRef(0);
  const isJumping = useRef(false);
  const lastSyncTime = useRef(0);
  const lastSyncPos = useRef(new THREE.Vector3(0, 1.1, 5));
  const lastSyncRot = useRef(0);
  const lastSyncJumping = useRef(false);
  const controlsRef = useRef();
  const isDraggingCamera = useRef(false);
  const wasJumpPressed = useRef(false);

  // Stun states for high fall recovery
  const [isStunned, setIsStunned] = useState(false);
  const stunEndTime = useRef(0);
  const maxAirHeight = useRef(1.1);
  const lastSyncStunned = useRef(false);

  // Initial connection and onDisconnect setup
  useEffect(() => {
    if (!isEntered || !nickname) return;
    
    const pRef = ref(rtdb, `players/${nickname}`);
    
    set(pRef, {
      x: 0,
      y: 1.1,
      z: 5,
      rotation: 0,
      isStunned: false
    });
    
    onDisconnect(pRef).remove();
    
    return () => {
      remove(pRef);
    };
  }, [isEntered, nickname]);

  // Optimization: Prevent instantiating Vector3 every frame to reduce GC stuttering
  const currentVelocity = useRef(new THREE.Vector3());
  const cameraTarget = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (!playerRef.current) return;
    
    const time = state.clock.getElapsedTime();

    // Check if stun has ended
    if (isStunned && time > stunEndTime.current) {
      setIsStunned(false);
    }
    
    // Prevent movement if modal is open
    if (useStore.getState().isModalOpen) return;

    // Overlay controls with zero inputs if stunned
    const activeKeys = isStunned ? { forward: false, backward: false, left: false, right: false, jump: false, action: false } : keys;

    const maxSpeed = 8;
    const acceleration = 50;
    const friction = 10;

    // Check Bouncer Collisions (Fling the player away if hit)
    if (!isStunned) {
      for (const b of BOUNCERS) {
        const dx = position.current.x - b.x;
        const playerCenterY = position.current.y + 0.5;
        const dyCenter = playerCenterY - b.y;
        const dz = position.current.z - b.z;
        const dist = Math.sqrt(dx * dx + dyCenter * dyCenter + dz * dz);
        
        if (dist < b.radius + 0.6) {
          const angle = Math.atan2(dz, dx);
          const pushForce = 20;
          
          currentVelocity.current.x = Math.cos(angle) * pushForce;
          currentVelocity.current.z = Math.sin(angle) * pushForce;
          velocity.current.y = 12; // Launch vertically
          isJumping.current = true;
          maxAirHeight.current = position.current.y; // Reset air height since it's a launch
        }
      }
    }

    // Moving Platform Carrying Physics
    let activeMovingPlatform = null;
    for (const p of JUMP_PLATFORMS) {
      if (p.isMoving && Math.abs(position.current.y - (p.y + 1.1)) < 0.1) {
        const hw = p.width / 2;
        const hd = p.depth / 2;
        // Check platform boundaries using the platform's position in the PREVIOUS frame
        const prevPos = getPlatformPos(p, time - delta);
        if (position.current.x >= prevPos.x - hw && position.current.x <= prevPos.x + hw &&
            position.current.z >= prevPos.z - hd && position.current.z <= prevPos.z + hd) {
          activeMovingPlatform = p;
          break;
        }
      }
    }

    if (activeMovingPlatform && !isStunned) {
      const p = activeMovingPlatform;
      const prevPos = getPlatformPos(p, time - delta);
      const currPos = getPlatformPos(p, time);
      const dx = currPos.x - prevPos.x;
      const dz = currPos.z - prevPos.z;
      position.current.x += dx;
      position.current.z += dz;
    }

    // 카메라가 바라보는 방향(Forward)과 오른쪽(Right) 벡터를 계산 (y축 제외)
    const camForward = new THREE.Vector3();
    camera.getWorldDirection(camForward);
    camForward.y = 0;
    camForward.normalize();
    
    const camRight = new THREE.Vector3().crossVectors(camForward, camera.up).normalize();

    const moveDir = new THREE.Vector3(0, 0, 0);
    if (activeKeys.forward) moveDir.add(camForward);
    if (activeKeys.backward) moveDir.sub(camForward);
    if (activeKeys.left) moveDir.sub(camRight);
    if (activeKeys.right) moveDir.add(camRight);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      
      // 부드러운 가속 (Acceleration)
      currentVelocity.current.x += moveDir.x * acceleration * delta;
      currentVelocity.current.z += moveDir.z * acceleration * delta;
      
      // 최고 속도 제한
      const currentSpeed = Math.sqrt(currentVelocity.current.x**2 + currentVelocity.current.z**2);
      if (currentSpeed > maxSpeed) {
        const ratio = maxSpeed / currentSpeed;
        currentVelocity.current.x *= ratio;
        currentVelocity.current.z *= ratio;
      }
    } else {
      // 키를 뗐을 때 부드럽게 감속 (Friction/미끄러짐)
      currentVelocity.current.x -= currentVelocity.current.x * friction * delta;
      currentVelocity.current.z -= currentVelocity.current.z * friction * delta;
      
      // 속도가 아주 낮아지면 완전히 정지
      if (Math.abs(currentVelocity.current.x) < 0.1) currentVelocity.current.x = 0;
      if (Math.abs(currentVelocity.current.z) < 0.1) currentVelocity.current.z = 0;
    }

    // Apply movement
    position.current.x += currentVelocity.current.x * delta;
    position.current.z += currentVelocity.current.z * delta;

    // Boundary constraints (invisible wall)
    const distance = Math.sqrt(position.current.x**2 + position.current.z**2);
    if (distance > 24) {
      const angle = Math.atan2(position.current.z, position.current.x);
      position.current.x = Math.cos(angle) * 24;
      position.current.z = Math.sin(angle) * 24;
    }

    // Support height calculation
    const supportHeight = getSupportHeight(position.current.x, position.current.z, position.current.y, time);

    // Jumping physics (Gravity applied)
    const canInfiniteJump = nickname === '관리류';
    if (activeKeys.jump) {
      if (canInfiniteJump) {
        if (!wasJumpPressed.current) {
          velocity.current.y = 10;
          isJumping.current = true;
        }
      } else if (!isJumping.current && position.current.y <= supportHeight + 0.05) {
        velocity.current.y = 10;
        isJumping.current = true;
      }
    }
    wasJumpPressed.current = activeKeys.jump;

    velocity.current.y -= 25 * delta; // Gravity
    position.current.y += velocity.current.y * delta;
    
    // Check support collision at the new position
    const nextSupportHeight = getSupportHeight(position.current.x, position.current.z, position.current.y, time);
    if (position.current.y <= nextSupportHeight) {
      // Check high fall stun (stun if dropped distance is greater than 5m)
      const fallDistance = maxAirHeight.current - nextSupportHeight;
      if (fallDistance > 5.0 && !isStunned && nickname !== '관리류') {
        setIsStunned(true);
        stunEndTime.current = time + 2.0; // 2 seconds penalty
        currentVelocity.current.set(0, 0, 0);
      }
      maxAirHeight.current = nextSupportHeight; // Reset on landing
      
      position.current.y = nextSupportHeight;
      velocity.current.y = 0;
      isJumping.current = false;

      // Special platforms detection (Bouncer)
      let landedPlatform = null;
      for (const p of JUMP_PLATFORMS) {
        const hw = p.width / 2;
        const hd = p.depth / 2;
        const pos = getPlatformPos(p, time);
        if (position.current.x >= pos.x - hw && position.current.x <= pos.x + hw && 
            position.current.z >= pos.z - hd && position.current.z <= pos.z + hd) {
          const targetSupport = p.y + 1.1;
          if (Math.abs(position.current.y - targetSupport) < 0.15) {
            landedPlatform = p;
            break;
          }
        }
      }

      if (landedPlatform && landedPlatform.isBouncer) {
        velocity.current.y = landedPlatform.bouncerForce;
        isJumping.current = true;
        // Trigger the lightweight local firework blast as a jump pad particle effect!
        useStore.getState().triggerFireworks();
      }
    } else {
      // Record highest Y reached while in air
      maxAirHeight.current = Math.max(maxAirHeight.current, position.current.y);
    }

    playerRef.current.position.copy(position.current);

    // Rotation smoothing using lerp
    if (currentVelocity.current.x !== 0 || currentVelocity.current.z !== 0) {
      const targetRotation = Math.atan2(currentVelocity.current.x, currentVelocity.current.z);
      let diff = targetRotation - rotation.current;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      rotation.current += diff * 10 * delta;
      playerRef.current.rotation.y = rotation.current;
    }

    // --- Animation State ---
    speedRef.current = Math.sqrt(currentVelocity.current.x ** 2 + currentVelocity.current.z ** 2);

    // OrbitControls Target Update (Smooth Follow Camera)
    cameraTarget.current.set(
      position.current.x,
      position.current.y + 1,
      position.current.z
    );
    
    if (controlsRef.current) {
      // 캐릭터가 이동한 만큼 카메라 위치도 물리적으로 먼저 이동시켜주어야 OrbitControls가 거리를 착각(축소/확대)하지 않습니다.
      const targetOffset = cameraTarget.current.clone().sub(controlsRef.current.target);
      const isTargetMoving = targetOffset.lengthSq() > 0.000001;
      
      let wasCameraLerped = false;

      if (isTargetMoving) {
        camera.position.add(targetOffset);
        controlsRef.current.target.copy(cameraTarget.current);
      }

      // 가만히 있을 때는 멀리 줌아웃 가능하지만, 움직이기 시작하면 부드럽게 원래의 액션 뷰로 당겨옴
      const isMoving = Math.abs(currentVelocity.current.x) > 0.1 || Math.abs(currentVelocity.current.z) > 0.1;
      if (isMoving) {
        const targetDistance = 5.5; // 원래 3.5였으나 너무 가까워서 5.5로 늘림
        const currentDist = camera.position.distanceTo(cameraTarget.current);
        
        if (currentDist > targetDistance + 0.05) {
          const offset = camera.position.clone().sub(cameraTarget.current).normalize().multiplyScalar(targetDistance);
          const targetCamPos = cameraTarget.current.clone().add(offset);
          camera.position.lerp(targetCamPos, 5 * delta); // 부드럽게 스르륵 당겨옴
          wasCameraLerped = true;
        }
      }

      // 타겟이 움직였거나 강제로 카메라를 당겼을 때만 강제 업데이트! 
      if (isTargetMoving || wasCameraLerped) {
        controlsRef.current.update();
      }
    }

    // Check if player has cleared (reached the gold trophy at the end of the jump map)
    const goalPlatform = JUMP_PLATFORMS[JUMP_PLATFORMS.length - 1];
    const trophyY = goalPlatform.y + 1.2;
    const distToTrophy = Math.sqrt(
      (position.current.x - goalPlatform.x) ** 2 +
      (position.current.y - trophyY) ** 2 +
      (position.current.z - goalPlatform.z) ** 2
    );

    if (distToTrophy < 1.3) {
      // Teleport player back to start instantly to avoid multiple triggers
      position.current.set(0, 1.1, 5);
      velocity.current.set(0, 0, 0);
      currentVelocity.current.set(0, 0, 0);
      isJumping.current = false;
      maxAirHeight.current = 1.1;

      // Trigger the firework effect!
      useStore.getState().triggerFireworks();

      // Get current clear count and increment
      const currentClears = useStore.getState().clears || {};
      const userClearCount = (currentClears[nickname] || 0) + 1;
      const clearsRef = ref(rtdb, `clears/${nickname}`);

      set(clearsRef, userClearCount)
        .then(() => {
          // Trigger the custom HTML clear screen overlay
          useStore.getState().setClearModal({ nickname, count: userClearCount });
        })
        .catch((err) => {
          console.error("Failed to update clear count:", err);
        });
    }

    // Sync to RTDB
    if (time - lastSyncTime.current > 0.05) { // Throttle (max 20Hz)
      const dist = lastSyncPos.current.distanceTo(position.current);
      const rotDiff = Math.abs(lastSyncRot.current - rotation.current);
      const isJumpingChanged = lastSyncJumping.current !== isJumping.current;
      const isStunnedChanged = lastSyncStunned.current !== isStunned;
      
      // Update if position/rotation changed significantly, OR if jumping state changed, OR if stunned state changed, OR if in mid-air
      if (dist > 0.01 || rotDiff > 0.05 || isJumpingChanged || isStunnedChanged || position.current.y > 1.1) {
        update(ref(rtdb, `players/${nickname}`), {
          x: position.current.x,
          y: position.current.y,
          z: position.current.z,
          rotation: rotation.current,
          isJumping: isJumping.current,
          isStunned: isStunned,
          timestamp: Date.now()
        });
        lastSyncPos.current.copy(position.current);
        lastSyncRot.current = rotation.current;
        lastSyncJumping.current = isJumping.current;
        lastSyncStunned.current = isStunned;
      }
      lastSyncTime.current = time;
    }
  });

  return (
    <group ref={playerRef} name="player">
      <OrbitControls 
        ref={controlsRef} 
        enableDamping 
        dampingFactor={0.04} 
        minDistance={1.5} 
        maxDistance={30} 
        maxPolarAngle={Math.PI / 2 + 0.1} // Allow looking slightly upward from the ground
        enablePan={false} // 마우스 휠 클릭(Pan) 시 타겟이 어긋나며 덜덜 떨리는 현상 방지
        zoomSpeed={1.2} // 휠 줌 시 부드러운 관성을 살리기 위해 적정 속도로 조정
        onStart={() => (isDraggingCamera.current = true)}
        onEnd={() => (isDraggingCamera.current = false)}
        makeDefault
      />
      
      <DummyRobot speedRef={speedRef} isJumpingRef={isJumping} isStunned={isStunned} />
      
      {/* Nickname Tag */}
      <Billboard position={[0, 1.8, 0]}>
        <Text fontSize={0.3} color="#0ff" outlineWidth={0.02} outlineColor="#000">
          {nickname}
        </Text>
      </Billboard>
    </group>
  );
};

const TerminalBoard = () => {
  const terminalRef = useRef();
  const setNearTerminal = useStore(state => state.setNearTerminal);
  const setModalOpen = useStore(state => state.setModalOpen);
  const messages = useStore(state => state.messages);
  const keys = useKeys();

  // Handle 'E' key press to open modal
  useEffect(() => {
    if (keys.action && useStore.getState().isNearTerminal) {
      if (!useStore.getState().isModalOpen) {
        setModalOpen(true);
      }
    }
  }, [keys.action, setModalOpen]);

  useFrame(({ scene }) => {
    const player = scene.getObjectByName('player');
    if (player && terminalRef.current) {
      const distance = player.position.distanceTo(terminalRef.current.position);
      setNearTerminal(distance < 5.0);
    }
  });

  return (
    <group ref={terminalRef} position={[0, 0, -8]}>
      {/* Left Leg */}
      <mesh position={[-2.8, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.3, 3, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Right Leg */}
      <mesh position={[2.8, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.3, 3, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Main Board Frame */}
      <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.4, 3.4, 0.4]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Board Bezel (Colorful Accent) */}
      <mesh position={[0, 3.5, 0.1]}>
        <boxGeometry args={[6.2, 3.2, 0.3]} />
        <meshStandardMaterial color="#0284c7" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Screen */}
      <mesh position={[0, 3.5, 0.26]}>
        <planeGeometry args={[5.8, 2.8]} />
        <meshBasicMaterial color="#020617" />
      </mesh>
      
      {/* Screen Content - Recent Messages */}
      <group position={[0, 3.5, 0.28]}>
        <Text position={[-2.6, 1.1, 0]} fontSize={0.2} color="#38bdf8" anchorX="left">
          === 최근 게시글 ===
        </Text>
        <mesh position={[0, 0.9, 0]}>
           <planeGeometry args={[5.4, 0.02]} />
           <meshBasicMaterial color="#38bdf8" opacity={0.5} transparent />
        </mesh>
        
        {messages.length === 0 ? (
          <Text position={[0, 0.2, 0]} fontSize={0.15} color="#94a3b8">
            등록된 게시글이 없습니다.
          </Text>
        ) : (
          messages.slice(0, 3).map((msg, index) => {
            const yPos = 0.5 - index * 0.7; // Vertical spacing
            return (
              <group key={msg.id} position={[0, yPos, 0]}>
                {/* Background box for each message */}
                <mesh position={[0, -0.05, 0]}>
                  <planeGeometry args={[5.4, 0.6]} />
                  <meshBasicMaterial color="#1e293b" />
                </mesh>
                <Text position={[-2.5, 0.1, 0.01]} fontSize={0.12} color="#eab308" anchorX="left">
                  {'>'} [{msg.time}] {msg.author}
                </Text>
                <Text position={[-2.3, -0.15, 0.01]} fontSize={0.14} color="#f8fafc" anchorX="left" maxWidth={4.8}>
                  {msg.text.length > 60 ? msg.text.substring(0, 60) + "..." : msg.text}
                </Text>
              </group>
            );
          })
        )}
      </group>

      {/* Floating Hologram Text */}
      <Billboard position={[0, 6.0, 0]}>
        <Text fontSize={1.2} color="#eab308" outlineWidth={0.05} outlineColor="#000" maxWidth={10} textAlign="center">
          게시판
        </Text>
      </Billboard>

      {/* Pulsing glow */}
      <pointLight position={[0, 3.5, 2]} distance={10} intensity={2} color="#eab308" />
    </group>
  );
};

const HallOfFameBoard = () => {
  const clears = useStore(state => state.clears) || {};
  
  // Sort and filter clears to get top 3 with at least 1 clear
  const leaders = Object.entries(clears)
    .map(([nickname, count]) => ({ nickname, count }))
    .filter(player => player.count >= 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const firstPlace = leaders[0] || null;
  const secondPlace = leaders[1] || null;
  const thirdPlace = leaders[2] || null;

  return (
    <group position={[12.0, 0, -16.0]} rotation={[0, -Math.PI / 4.5, 0]}>
      {/* 2nd Place Cylinder Step (Left) */}
      <group position={[-1.4, 0, 0]}>
        {/* Step Cylinder Base */}
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.65, 0.6, 32]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} envMapIntensity={1.5} />
        </mesh>
        {/* Shiny metallic top cap */}
        <mesh position={[0, 0.605, 0]}>
          <cylinderGeometry args={[0.58, 0.58, 0.01, 32]} />
          <meshStandardMaterial color="#94a3b8" metalness={1.0} roughness={0.05} />
        </mesh>
        {/* Glowing ring under robot */}
        <mesh position={[0, 0.615, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.55, 32]} />
          <meshBasicMaterial color="#94a3b8" toneMapped={false} />
        </mesh>
        
        {/* Large "2" front badge */}
        <Billboard position={[0, 0.3, 0.66]}>
          <Text fontSize={0.28} color="#94a3b8" fontWeight="bold" outlineWidth={0.02} outlineColor="#0f172a" anchorX="center" anchorY="middle">
            2
          </Text>
        </Billboard>

        {/* 3D Robot */}
        {secondPlace && (
          <group position={[0, 1.7, 0]} rotation={[0, 0, 0]}>
            <DummyRobot speedRef={{ current: 0 }} isJumpingRef={{ current: false }} isStunned={false} />
          </group>
        )}
        
        {/* Clean floating info plaque */}
        <Billboard position={[0, 4.2, 0]}>
          {/* Glassmorphic card background */}
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[1.2, 0.6]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, 0, -0.005]}>
            <ringGeometry args={[0.58, 0.6, 4]} rotation={[0, 0, Math.PI / 4]} />
            <meshBasicMaterial color="#94a3b8" opacity={0.8} transparent />
          </mesh>
          {/* Text details */}
          <Text position={[0, 0.18, 0.01]} fontSize={0.12} color="#94a3b8" fontWeight="bold" anchorX="center" anchorY="middle" textAlign="center">
            2nd Place
          </Text>
          <Text position={[0, 0.0, 0.01]} fontSize={0.14} color="#ffffff" fontWeight="bold" anchorX="center" anchorY="middle" textAlign="center">
            {secondPlace ? secondPlace.nickname : "-"}
          </Text>
          <Text position={[0, -0.16, 0.01]} fontSize={0.11} color="#fda4af" fontWeight="bold" anchorX="center" anchorY="middle" textAlign="center">
            {secondPlace ? `${secondPlace.count}회 클리어` : "공석"}
          </Text>
        </Billboard>
      </group>

      {/* 1st Place Cylinder Step (Center) */}
      <group position={[0, 0, 0]}>
        {/* Step Cylinder Base */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.65, 0.9, 32]} />
          <meshStandardMaterial color="#451a03" metalness={0.9} roughness={0.1} envMapIntensity={1.5} />
        </mesh>
        {/* Shiny metallic top cap */}
        <mesh position={[0, 0.905, 0]}>
          <cylinderGeometry args={[0.58, 0.58, 0.01, 32]} />
          <meshStandardMaterial color="#fbbf24" metalness={1.0} roughness={0.05} />
        </mesh>
        {/* Glowing ring under robot */}
        <mesh position={[0, 0.915, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.55, 32]} />
          <meshBasicMaterial color="#fbbf24" toneMapped={false} />
        </mesh>

        {/* Large "1" front badge */}
        <Billboard position={[0, 0.45, 0.66]}>
          <Text fontSize={0.35} color="#fbbf24" fontWeight="bold" outlineWidth={0.02} outlineColor="#0f172a" anchorX="center" anchorY="middle">
            1
          </Text>
        </Billboard>

        {/* 3D Robot */}
        {firstPlace && (
          <group position={[0, 2.0, 0]} rotation={[0, 0, 0]}>
            <DummyRobot speedRef={{ current: 0 }} isJumpingRef={{ current: false }} isStunned={false} />
          </group>
        )}
        
        {/* Clean floating info plaque */}
        <Billboard position={[0, 4.5, 0]}>
          {/* Glassmorphic card background */}
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[1.3, 0.65]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, 0, -0.005]}>
            <ringGeometry args={[0.62, 0.65, 4]} rotation={[0, 0, Math.PI / 4]} />
            <meshBasicMaterial color="#fbbf24" opacity={0.8} transparent />
          </mesh>
          {/* Text details */}
          <Text position={[0, 0.2, 0.01]} fontSize={0.14} color="#fbbf24" fontWeight="bold" anchorX="center" anchorY="middle" textAlign="center">
            1st Place
          </Text>
          <Text position={[0, 0.0, 0.01]} fontSize={0.16} color="#ffffff" fontWeight="bold" anchorX="center" anchorY="middle" textAlign="center">
            {firstPlace ? firstPlace.nickname : "-"}
          </Text>
          <Text position={[0, -0.18, 0.01]} fontSize={0.12} color="#fda4af" fontWeight="bold" anchorX="center" anchorY="middle" textAlign="center">
            {firstPlace ? `${firstPlace.count}회 클리어` : "공석"}
          </Text>
        </Billboard>
      </group>

      {/* 3rd Place Cylinder Step (Right) */}
      <group position={[1.4, 0, 0]}>
        {/* Step Cylinder Base */}
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.65, 0.3, 32]} />
          <meshStandardMaterial color="#78350f" metalness={0.9} roughness={0.1} envMapIntensity={1.5} />
        </mesh>
        {/* Shiny metallic top cap */}
        <mesh position={[0, 0.305, 0]}>
          <cylinderGeometry args={[0.58, 0.58, 0.01, 32]} />
          <meshStandardMaterial color="#b45309" metalness={1.0} roughness={0.05} />
        </mesh>
        {/* Glowing ring under robot */}
        <mesh position={[0, 0.315, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.55, 32]} />
          <meshBasicMaterial color="#b45309" toneMapped={false} />
        </mesh>

        {/* Large "3" front badge */}
        <Billboard position={[0, 0.15, 0.66]}>
          <Text fontSize={0.22} color="#b45309" fontWeight="bold" outlineWidth={0.02} outlineColor="#0f172a" anchorX="center" anchorY="middle">
            3
          </Text>
        </Billboard>

        {/* 3D Robot */}
        {thirdPlace && (
          <group position={[0, 1.4, 0]} rotation={[0, 0, 0]}>
            <DummyRobot speedRef={{ current: 0 }} isJumpingRef={{ current: false }} isStunned={false} />
          </group>
        )}
        
        {/* Clean floating info plaque */}
        <Billboard position={[0, 3.9, 0]}>
          {/* Glassmorphic card background */}
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[1.2, 0.6]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, 0, -0.005]}>
            <ringGeometry args={[0.58, 0.6, 4]} rotation={[0, 0, Math.PI / 4]} />
            <meshBasicMaterial color="#b45309" opacity={0.8} transparent />
          </mesh>
          {/* Text details */}
          <Text position={[0, 0.18, 0.01]} fontSize={0.11} color="#b45309" fontWeight="bold" anchorX="center" anchorY="middle" textAlign="center">
            3rd Place
          </Text>
          <Text position={[0, 0.0, 0.01]} fontSize={0.14} color="#ffffff" fontWeight="bold" anchorX="center" anchorY="middle" textAlign="center">
            {thirdPlace ? thirdPlace.nickname : "-"}
          </Text>
          <Text position={[0, -0.16, 0.01]} fontSize={0.11} color="#fda4af" fontWeight="bold" anchorX="center" anchorY="middle" textAlign="center">
            {thirdPlace ? `${thirdPlace.count}회 클리어` : "공석"}
          </Text>
        </Billboard>
      </group>

      {/* Floating Hologram text at the top */}
      <Billboard position={[0, 5.6, 0]}>
        {/* Glowing title backing */}
        <mesh position={[0, 0, -0.05]}>
          <planeGeometry args={[2.8, 0.6]} />
          <meshBasicMaterial color="#e11d48" transparent opacity={0.1} />
        </mesh>
        <Text fontSize={0.55} color="#fff" outlineWidth={0.03} outlineColor="#e11d48" fontWeight="bold" anchorX="center" anchorY="middle" textAlign="center">
          명예의 전당
        </Text>
      </Billboard>

      {/* Under-glow neon light */}
      <pointLight position={[0, 0.5, 0]} distance={10} intensity={2.0} color="#fbbf24" />
    </group>
  );
};

// Catmull-Rom Spline 3D 곡선 보간을 위한 헬퍼 함수
const catmullRomVector3 = (p0, p1, p2, p3, t, target) => {
  const v0x = (p2.x - p0.x) * 0.5;
  const v0y = (p2.y - p0.y) * 0.5;
  const v0z = (p2.z - p0.z) * 0.5;
  const v1x = (p3.x - p1.x) * 0.5;
  const v1y = (p3.y - p1.y) * 0.5;
  const v1z = (p3.z - p1.z) * 0.5;
  
  const t2 = t * t;
  const t3 = t * t2;
  
  target.x = (2 * p1.x - 2 * p2.x + v0x + v1x) * t3 + (-3 * p1.x + 3 * p2.x - 2 * v0x - v1x) * t2 + v0x * t + p1.x;
  target.y = (2 * p1.y - 2 * p2.y + v0y + v1y) * t3 + (-3 * p1.y + 3 * p2.y - 2 * v0y - v1y) * t2 + v0y * t + p1.y;
  target.z = (2 * p1.z - 2 * p2.z + v0z + v1z) * t3 + (-3 * p1.z + 3 * p2.z - 2 * v0z - v1z) * t2 + v0z * t + p1.z;
  return target;
};

const OtherPlayer = ({ name, data }) => {
  const ref = useRef();
  const speedRef = useRef(0);
  const isJumpingRef = useRef(false);
  
  // Snapshot Interpolation Buffer
  const buffer = useRef([]);
  // Track animation state since it's derived from interpolated movement
  const currentAnimState = useRef({ isJumping: false, speed: 0 });
  // 이전 프레임 위치 저장을 위한 Ref
  const previousPosition = useRef(new THREE.Vector3(data.x || 0, data.y || 1.1, data.z || 5));
  // 네트워크 지터링(Jitter)으로 인한 짧은 멈춤을 보정하기 위한 타임스탬프
  const lastMovedTime = useRef(0);

  // 상대방과 나의 시계 차이(Offset)를 저장하기 위한 Ref
  const clockOffset = useRef(null);

  useEffect(() => {
    if (data && data.timestamp) {
      // 1. 첫 패킷 수신 시, 나와 상대방의 OS 시계 차이(Offset)를 한 번만 계산하여 고정합니다.
      if (clockOffset.current === null) {
        clockOffset.current = Date.now() - data.timestamp;
      }

      // 2. 상대방이 보낸 '정확한 타임스탬프'에 시차를 더해, 네트워크 지연(Jitter)에 흔들리지 않는
      //    정확한 '원래의 패킷 간격'을 내 로컬 시간축으로 변환하여 사용합니다.
      let timestamp = data.timestamp + clockOffset.current;
      
      // 혹시라도 패킷 순서가 꼬이거나 동일한 시간이 오면 1ms 간격을 강제합니다.
      if (buffer.current.length > 0 && timestamp <= buffer.current[buffer.current.length - 1].time) {
        timestamp = buffer.current[buffer.current.length - 1].time + 1;
      }
      
      buffer.current.push({
        position: new THREE.Vector3(data.x || 0, data.y || 1.1, data.z || 5),
        rotation: data.rotation || 0,
        isJumping: data.isJumping || false,
        time: timestamp
      });
      
      // Keep only recent snapshots to prevent memory leaks
      if (buffer.current.length > 10) {
        buffer.current.shift();
      }
    }
  }, [data]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    
    const snapshots = buffer.current;
    if (snapshots.length === 0) return;

    // We render the other players slightly in the past to allow data to arrive
    const renderTime = Date.now() - 150;
    
    // Default values from the most recent snapshot
    const latest = snapshots[snapshots.length - 1];
    let targetPos = latest.position;
    let targetRot = latest.rotation;
    let isJumping = latest.isJumping;
    
    if (snapshots.length === 1 || latest.time <= renderTime) {
      // 1. Not enough data for interpolation OR
      // 2. Network drop (renderTime exceeded all available data).
      // Fallback: smooth lerp to the latest known state (extrapolation/inertia)
      ref.current.position.lerp(targetPos, 10 * delta);
      
      let diff = targetRot - ref.current.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      ref.current.rotation.y += diff * 10 * delta;
      
      currentAnimState.current.isJumping = isJumping;
      // Estimate speed if we are extrapolating
      currentAnimState.current.speed = ref.current.position.distanceTo(targetPos) > 0.1 ? 2 : 0;
    } else {
      // Find the two snapshots that bracket the renderTime
      let idx0 = 0;
      let idx1 = snapshots.length - 1;
      
      for (let i = snapshots.length - 1; i >= 0; i--) {
        if (snapshots[i].time <= renderTime) {
          idx0 = i;
          idx1 = Math.min(i + 1, snapshots.length - 1);
          break;
        }
      }

      let t0 = snapshots[idx0];
      let t1 = snapshots[idx1];

      if (t0 !== t1 && t0.time !== t1.time) {
        const ratio = Math.max(0, Math.min(1, (renderTime - t0.time) / (t1.time - t0.time)));
        
        // 1. 위치 보간: Catmull-Rom Spline 곡선 사용 (Jerk 방지)
        const pMinus1 = snapshots[Math.max(0, idx0 - 1)].position;
        const p0 = t0.position;
        const p1 = t1.position;
        const p2 = snapshots[Math.min(snapshots.length - 1, idx1 + 1)].position;
        
        catmullRomVector3(pMinus1, p0, p1, p2, ratio, ref.current.position);
        
        // Slerp-like behavior for rotation (handling 360 wrap)
        let diff = t1.rotation - t0.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        ref.current.rotation.y = t0.rotation + diff * ratio;
        
        currentAnimState.current.isJumping = t0.isJumping;
        
        // Calculate true speed for animation using the gap between t0 and t1
        const dist = t0.position.distanceTo(t1.position);
        const timeDiffSec = (t1.time - t0.time) / 1000;
        currentAnimState.current.speed = timeDiffSec > 0 ? dist / timeDiffSec : 0;
      } else {
        // Fallback if renderTime is somehow older than the first snapshot
        ref.current.position.copy(t0.position);
        ref.current.rotation.y = t0.rotation;
        currentAnimState.current.isJumping = t0.isJumping;
        currentAnimState.current.speed = 0;
      }
    }

    // 2. 실제 이동 속도(Speed) 기반 애니메이션 크로스페이드(Crossfade) 적용
    // Y축(점프)을 제외한 평면(X, Z) 상의 실제 이동 거리만 계산하여 속도 측정
    const dx = ref.current.position.x - previousPosition.current.x;
    const dz = ref.current.position.z - previousPosition.current.z;
    const distance2D = Math.sqrt(dx * dx + dz * dz);
    const actualSpeed = delta > 0 ? distance2D / delta : 0;
    
    // 다음 프레임을 위해 현재 위치 저장
    previousPosition.current.copy(ref.current.position);

    // 속도가 조금이라도 있으면 최근 이동 시간 갱신
    if (actualSpeed > 0.05) {
      lastMovedTime.current = Date.now();
    }

    // 네트워크 끊김/지연으로 인해 프레임간 이동이 0이 되더라도, 최근 150ms 이내에 움직였다면 계속 움직이는 것으로 간주 (Debounce)
    const isMoving = (Date.now() - lastMovedTime.current < 150) && !currentAnimState.current.isJumping;
    
    speedRef.current = isMoving ? Math.max(actualSpeed, 2.0) : 0; // 최소 속도 보장으로 걷기 애니메이션이 확실히 나오게 함
    isJumpingRef.current = currentAnimState.current.isJumping;
  });

  return (
    <group ref={ref} position={[data.x || 0, data.y || 1.1, data.z || 5]} rotation={[0, data.rotation || 0, 0]}>
      <Billboard position={[0, 1.8, 0]} follow={true} lockX={false} lockY={false} lockZ={false}>
        <Text fontSize={0.3} color="white" outlineWidth={0.02} outlineColor="black">
          {name}
        </Text>
      </Billboard>
      
      <DummyRobot speedRef={speedRef} isJumpingRef={isJumpingRef} isStunned={data.isStunned} />
    </group>
  );
};

const OtherPlayers = () => {
  const { nickname, isEntered, otherPlayers, setOtherPlayers, setClears } = useStore();

  useEffect(() => {
    if (!isEntered) return;
    
    const playersRef = ref(rtdb, 'players');
    const unsubscribePlayers = onValue(playersRef, (snapshot) => {
      if (snapshot.exists()) {
        setOtherPlayers(snapshot.val());
      } else {
        setOtherPlayers({});
      }
    });

    const clearsRef = ref(rtdb, 'clears');
    const unsubscribeClears = onValue(clearsRef, (snapshot) => {
      if (snapshot.exists()) {
        setClears(snapshot.val());
      } else {
        setClears({});
      }
    });

    return () => {
      unsubscribePlayers();
      unsubscribeClears();
    };
  }, [isEntered, setOtherPlayers, setClears]);

  return (
    <>
      {Object.entries(otherPlayers).map(([name, data]) => {
        if (name === nickname) return null;
        return <OtherPlayer key={name} name={name} data={data} />;
      })}
    </>
  );
};

const Scoreboard = () => {
  const messages = useStore(state => state.messages);
  const clears = useStore(state => state.clears);
  const [activeSystemClear, setActiveSystemClear] = useState(null);
  const prevClears = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const clearsObj = clears || {};
    if (Object.keys(clearsObj).length === 0) return;

    if (prevClears.current === null) {
      // First load initialization
      prevClears.current = { ...clearsObj };
      return;
    }

    // Check for clear count increases
    Object.entries(clearsObj).forEach(([name, count]) => {
      const prevCount = prevClears.current[name] || 0;
      if (count > prevCount) {
        // Clear triggered!
        const systemMsg = {
          id: `system-clear-${name}-${count}-${Date.now()}`,
          text: `🎉 ${name}님이 레전드 점프맵을 클리어하셨습니다! (누적 클리어: ${count}회) 🎉`,
          author: 'SYSTEM',
          time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        };
        setActiveSystemClear(systemMsg);
        
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setActiveSystemClear(null);
        }, 10000); // 10 seconds
      }
    });

    prevClears.current = { ...clearsObj };
  }, [clears]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Filter out SYSTEM messages for the normal scoreboard display
  const normalMessages = messages.filter(m => m.author !== 'SYSTEM');
  
  // Decide which message to display
  const displayMsg = activeSystemClear || (normalMessages.length > 0 ? normalMessages[0] : null);

  // Dynamic font size function based on text length
  const getAdaptiveFontSize = (text) => {
    if (!text) return 1.5;
    const len = text.length;
    if (len <= 15) return 1.5;
    if (len <= 30) return 1.2;
    if (len <= 60) return 0.85;
    if (len <= 100) return 0.65;
    return 0.5;
  };

  return (
    <group position={[-12, 0, -15]} rotation={[0, Math.PI / 6, 0]}>
      {/* 튼튼하고 적당한 높이의 기둥 */}
      <mesh position={[-6, 5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.9, 10, 16]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[6, 5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.9, 10, 16]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* 전광판 메인 프레임 (낮아짐) */}
      <mesh position={[0, 12, 0]} castShadow receiveShadow>
        <boxGeometry args={[16, 8, 1.5]} />
        <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* 전광판 네온 테두리 */}
      <mesh position={[0, 12, 0.1]}>
        <boxGeometry args={[15.5, 7.5, 1.4]} />
        <meshStandardMaterial color="#facc15" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* 스크린 (검은 화면) */}
      <mesh position={[0, 12, 0.81]}>
        <planeGeometry args={[15, 7]} />
        <meshBasicMaterial color="#000" />
      </mesh>

      {/* 스크린 내용 */}
      {displayMsg ? (
        <group position={[0, 12, 0.85]}>
          <Text position={[0, 2.2, 0]} fontSize={0.8} color="#facc15" anchorX="center" fontWeight="bold">
            {displayMsg.author === 'SYSTEM' ? '[ JUMP MAP RECORD ]' : '[ LATEST BULLETIN ]'}
          </Text>
          <mesh position={[0, 1.3, 0]}>
            <planeGeometry args={[13, 0.05]} />
            <meshBasicMaterial color={displayMsg.author === 'SYSTEM' ? '#f43f5e' : '#facc15'} opacity={0.6} transparent />
          </mesh>
          <Text 
            position={[0, -0.2, 0]} 
            fontSize={getAdaptiveFontSize(displayMsg.text)} 
            color={displayMsg.author === 'SYSTEM' ? '#fda4af' : '#fff'} 
            anchorX="center" 
            maxWidth={14} 
            textAlign="center" 
            overflowWrap="break-word"
          >
            {displayMsg.text}
          </Text>
          <Text position={[0, -2.2, 0]} fontSize={0.8} color="#0ff" anchorX="center">
            - {displayMsg.author} -
          </Text>
          <Text position={[7, -3.0, 0]} fontSize={0.4} color="#94a3b8" anchorX="right">
            {displayMsg.time}
          </Text>
        </group>
      ) : (
        <Text position={[0, 12, 0.85]} fontSize={1.5} color="#475569" anchorX="center">
          D2 VIRTUAL WORLD
        </Text>
      )}

      {/* 주변을 비추는 네온 불빛 */}
      <pointLight position={[0, 12, 5]} distance={30} intensity={2} color="#facc15" />
    </group>
  );
};


// ==========================================
// OPTIMIZED FIREWORKS COMPONENT (Boundary launch, rise 8.0m, explode)
// ==========================================
const SingleFirework = ({ startX, startZ, color, delay, onDone }) => {
  const [stage, setStage] = useState('waiting');
  const pos = useRef(new THREE.Vector3(startX, 0.02, startZ));
  const particles = useRef([]);
  const timeRef = useRef(0);
  const pointsRef = useRef();
  const groupRef = useRef();
  const doneCalled = useRef(false);
  const PARTICLE_COUNT = 35;
  const [initialPositions, setInitialPositions] = useState(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.03); // Cap delta to prevent huge jumps
    timeRef.current += dt;

    if (stage === 'waiting') {
      if (timeRef.current >= delay) {
        setStage('launching');
        timeRef.current = 0;
      }
      return;
    }

    if (stage === 'launching') {
      const duration = 1.0; // 1.0s launch duration
      const progress = Math.min(timeRef.current / duration, 1.0);
      const currentY = 0.02 + progress * 8.0;
      pos.current.y = currentY;
      if (groupRef.current) {
        groupRef.current.position.y = currentY;
      }

      if (progress >= 1.0) {
        // Allocate initial positions once
        const posArray = new Float32Array(PARTICLE_COUNT * 3);
        const tempParticles = [];
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          posArray[i * 3] = pos.current.x;
          posArray[i * 3 + 1] = pos.current.y;
          posArray[i * 3 + 2] = pos.current.z;

          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos((Math.random() * 2) - 1);
          const speed = 2 + Math.random() * 6;
          const vx = Math.sin(phi) * Math.cos(theta) * speed;
          const vy = Math.cos(phi) * speed;
          const vz = Math.sin(phi) * Math.sin(theta) * speed;

          tempParticles.push({
            x: pos.current.x,
            y: pos.current.y,
            z: pos.current.z,
            vx, vy, vz,
            life: 1.0 + Math.random() * 0.5
          });
        }
        setInitialPositions(posArray);
        particles.current = tempParticles;
        setStage('exploded');
        timeRef.current = 0;
      }
      return;
    }

    if (stage === 'exploded') {
      const geo = pointsRef.current?.geometry;
      if (!geo) return;

      const positions = geo.attributes.position.array;
      let allDead = true;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles.current[i];
        if (!p) continue;
        p.life -= dt;
        if (p.life > 0) {
          allDead = false;
          // Apply gravity and drag
          p.vy -= 2.0 * dt;
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.vz *= 0.94;

          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;

          positions[i * 3] = p.x;
          positions[i * 3 + 1] = p.y;
          positions[i * 3 + 2] = p.z;
        } else {
          positions[i * 3] = 9999;
          positions[i * 3 + 1] = 9999;
          positions[i * 3 + 2] = 9999;
        }
      }
      geo.attributes.position.needsUpdate = true;

      if (allDead && !doneCalled.current) {
        doneCalled.current = true;
        setStage('done');
        onDone();
      }
    }
  });

  if (stage === 'waiting' || stage === 'done') return null;

  if (stage === 'launching') {
    return (
      <group ref={groupRef} position={[startX, 0.02, startZ]}>
        <mesh>
          <sphereGeometry args={[0.15, 4, 4]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  if (stage === 'exploded' && initialPositions) {
    return (
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[initialPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={color}
          size={0.18}
          transparent
          opacity={0.9}
          sizeAttenuation={true}
          toneMapped={false}
          depthWrite={false}
        />
      </points>
    );
  }

  return null;
};

const FireworksManager = () => {
  const fireworksTrigger = useStore(state => state.fireworksTrigger);
  const [activeFireworks, setActiveFireworks] = useState([]);

  useEffect(() => {
    if (fireworksTrigger === 0) return;

    const newFireworks = [];
    const colors = ['#ff0055', '#00ffcc', '#ffcc00', '#33ff33', '#cc00ff', '#ff6600', '#00ccff', '#ff33aa'];

    // Spawn 5 fireworks distributed around the 24.0m boundary ring (optimized from 10)
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const x = Math.cos(angle) * 24.0;
      const z = Math.sin(angle) * 24.0;
      const color = colors[i % colors.length];
      const delay = Math.random() * 0.8; // Staggered launch delays

      newFireworks.push({
        id: `${fireworksTrigger}-${i}-${Date.now()}-${Math.random()}`,
        startX: x,
        startZ: z,
        color,
        delay
      });
    }

    const timer = setTimeout(() => {
      setActiveFireworks(prev => [...prev, ...newFireworks]);
    }, 0);

    return () => clearTimeout(timer);
  }, [fireworksTrigger]);

  const handleDone = (id) => {
    setActiveFireworks(prev => prev.filter(fw => fw.id !== id));
  };

  return (
    <>
      {activeFireworks.map(fw => (
        <SingleFirework
          key={fw.id}
          startX={fw.startX}
          startZ={fw.startZ}
          color={fw.color}
          delay={fw.delay}
          onDone={() => handleDone(fw.id)}
        />
      ))}
    </>
  );
};


const World = () => {
  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <directionalLight castShadow position={[10, 20, 10]} intensity={1.5} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0001} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[24, 64]} />
        <meshStandardMaterial color="#0c0e12" roughness={0.8} metalness={0.1} />
      </mesh>
      
      
      {/* Boundary Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[23.9, 24.1, 64]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <Player />
      <TerminalBoard />
      <HallOfFameBoard />
      <Scoreboard />
      <OtherPlayers />
      <JumpMap />
      <FireworksManager />
    </>
  );
};

// ==========================================
// 4. UI OVERLAYS (Tailwind)
// ==========================================
const UIOverlay = () => {
  const { isNearTerminal, isModalOpen, setModalOpen, messages, setMessages, isMessagesLoading, setMessagesLoading, nickname, dbError, setDbError, clearModal, setClearModal } = useStore();
  const [inputText, setInputText] = useState('');

  // Firebase Real-time sync
  useEffect(() => {
    try {
      const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => {
          const dateObj = doc.data().timestamp ? doc.data().timestamp.toDate() : new Date();
          return {
            id: doc.id,
            ...doc.data(),
            time: dateObj.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          };
        });
        setMessages(msgs);
        setMessagesLoading(false);
        setDbError(null);
      }, (error) => {
        console.error("Firebase fetch error:", error);
        setDbError("DATABASE CONNECTION ERROR: Could not fetch records. Please check your configuration or network.");
        setMessagesLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Firebase init error:", err);
      setDbError("DATABASE INITIALIZATION ERROR: Verify Firebase config.");
      setMessagesLoading(false);
    }
  }, [setMessages, setMessagesLoading, setDbError]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (useStore.getState().isModalOpen) {
          setModalOpen(false);
        }
        if (useStore.getState().clearModal) {
          setClearModal(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setModalOpen, setClearModal]);

  const isUserAdmin = (name) => {
    return name && (name.includes('관리') || name.includes('류승우') || name.includes('관리류'));
  };

  const handleDelete = async (id, author) => {
    if (author === nickname || isUserAdmin(nickname)) {
      if (window.confirm("정말 삭제하시겠습니까?")) {
        try {
          await deleteDoc(doc(db, "messages", id));
        } catch (error) {
          console.error("Error deleting message:", error);
          alert("삭제 실패!");
        }
      }
    } else {
      alert("권한이 없습니다.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      const textToSave = inputText.trim();
      setInputText('');
      
      if (textToSave === '/clear' && isUserAdmin(nickname)) {
        if (window.confirm("모든 게시글을 삭제하시겠습니까?")) {
          try {
            const deletePromises = messages.map(msg => deleteDoc(doc(db, "messages", msg.id)));
            await Promise.all(deletePromises);
            alert("게시판이 초기화되었습니다.");
          } catch (error) {
            console.error("Error clearing messages:", error);
            alert("초기화 실패!");
          }
        }
        return;
      }

      try {
        await addDoc(collection(db, "messages"), {
          text: textToSave,
          author: nickname,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error("Error adding message:", error);
      }
    }
  };

  const normalMessages = messages.filter(msg => msg.author !== 'SYSTEM');

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none font-mono">

      {isNearTerminal && !isModalOpen && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/80 text-cyan-300 px-6 py-3 rounded-lg border border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] animate-pulse flex items-center gap-2">
          <Terminal size={20} />
          [E] 키를 눌러 게시판 접속
        </div>
      )}

      {isModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-2xl rounded-xl border-2 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)] overflow-hidden flex flex-col h-[80vh]">
            {/* Header */}
            <div className="bg-slate-800 p-4 border-b border-cyan-900 flex justify-between items-center">
              <h2 className="text-cyan-400 text-xl font-bold flex items-center gap-2">
                <Terminal /> 게시판
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {dbError ? (
                <div className="text-red-500 text-center mt-10 font-bold border border-red-500 p-4 rounded bg-red-950/50">
                  ⚠️ {dbError}
                </div>
              ) : isMessagesLoading ? (
                <div className="text-cyan-500 text-center mt-10 animate-pulse font-bold tracking-widest">
                  데이터베이스 접속 중...
                </div>
              ) : normalMessages.length === 0 ? (
                <div className="text-slate-500 text-center mt-10">등록된 게시글이 없습니다.</div>
              ) : (
                normalMessages.map((msg) => (
                  <div key={msg.id} className="bg-slate-800/50 p-3 rounded border border-slate-700 relative group">
                    <div className="flex items-center gap-2 text-cyan-500 mb-1">
                      <User size={14} />
                      <span className="text-sm font-bold">{msg.author}</span>
                      <span className="text-xs text-slate-500 ml-auto">{msg.time}</span>
                      {(msg.author === nickname || isUserAdmin(nickname)) && (
                        <button 
                          onClick={() => handleDelete(msg.id, msg.author)}
                          className="text-slate-500 hover:text-red-500 transition-colors ml-2"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-slate-200">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-4 bg-slate-800 border-t border-cyan-900 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="메시지를 입력하세요..."
                className="flex-1 bg-slate-950 border border-slate-700 text-cyan-300 px-4 py-2 rounded focus:outline-none focus:border-cyan-500"
                autoFocus
              />
              <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-black px-4 py-2 rounded font-bold transition-colors flex items-center gap-2">
                <Send size={18} />
                전송
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STAGE CLEARED OVERLAY */}
      {clearModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 w-full max-w-md rounded-2xl border-2 border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.5)] overflow-hidden flex flex-col p-6 items-center text-center">
            <div className="text-6xl mb-4 animate-bounce">🏆</div>
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-500 to-yellow-400 mb-2 tracking-wide">
              STAGE CLEARED!
            </h2>
            <p className="text-slate-300 text-lg mb-6 leading-relaxed">
              축하합니다!<br />
              <span className="text-white font-bold">{clearModal.nickname}</span>님이 레전드 점프맵을 클리어하셨습니다!
            </p>
            <div className="bg-rose-950/40 border border-rose-900 px-6 py-3 rounded-xl mb-8 flex flex-col items-center">
              <span className="text-xs text-rose-300 uppercase tracking-widest font-semibold mb-1">Total Clears</span>
              <span className="text-3xl font-black text-rose-400">{clearModal.count}회 클리어</span>
            </div>
            <button
              onClick={() => setClearModal(null)}
              className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black py-4 px-8 rounded-xl shadow-[0_4px_20px_rgba(244,63,94,0.4)] hover:shadow-[0_4px_25px_rgba(244,63,94,0.6)] transform hover:-translate-y-0.5 transition-all text-lg uppercase tracking-wider"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LoginOverlay = () => {
  const idRef = React.useRef(null);
  const nameRef = React.useRef(null);
  const [inputId, setInputId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('studentId') || '';
  });
  const [inputName, setInputName] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('studentName') || '';
  });
  const [isGlitching, setIsGlitching] = useState(false);
  const setNickname = useStore(state => state.setNickname);
  const setEntered = useStore(state => state.setEntered);

  // 이스터에그: 관리자 접속 단축키
  const rKeyPressCount = React.useRef(0);
  const rKeyTimer = React.useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 입력창(INPUT)에 포커스가 없을 때(빈 공간 클릭 상태)만 허용
      if (document.activeElement.tagName === 'INPUT') return;

      if (e.key.toLowerCase() === 'r') {
        rKeyPressCount.current += 1;
        
        if (rKeyPressCount.current === 1) {
          // 첫 'r' 입력 시 3초 타이머 시작
          rKeyTimer.current = setTimeout(() => {
            rKeyPressCount.current = 0; // 3초 지나면 초기화
          }, 3000);
        }

        if (rKeyPressCount.current === 3) {
          // 3번 누르기 성공
          clearTimeout(rKeyTimer.current);
          rKeyPressCount.current = 0;
          
          setInputId('20251579');
          setInputName('관리류');
          setIsGlitching(true);
          
          setTimeout(() => {
            setNickname('관리류');
            setEntered(true);
          }, 800);
        }
      } else {
        // 다른 키 누르면 즉시 초기화
        rKeyPressCount.current = 0;
        clearTimeout(rKeyTimer.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(rKeyTimer.current);
    };
  }, [setNickname, setEntered]);

  // Auto-entry if studentId and studentName are passed via URL search parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('studentId') || '';
    const urlName = params.get('studentName') || '';
    
    if (urlId.length === 8 && /^[가-힣]{3}$/.test(urlName)) {
      const year = parseInt(urlId.substring(0, 4), 10);
      if (!isNaN(year) && year >= 1970 && year <= 2027) {
        const glitchTimer = setTimeout(() => {
          setIsGlitching(true);
        }, 0);
        const entryTimer = setTimeout(() => {
          setNickname(urlName);
          setEntered(true);
        }, 800);
        return () => {
          clearTimeout(glitchTimer);
          clearTimeout(entryTimer);
        };
      }
    }
  }, [setNickname, setEntered]);

  const handleLogin = (e) => {
    e.preventDefault();
    
    idRef.current.setCustomValidity('');
    nameRef.current.setCustomValidity('');

    if (inputId.length !== 8) {
      idRef.current.setCustomValidity("학번 8자리를 입력해주세요.");
      idRef.current.reportValidity();
      return;
    }
    const year = parseInt(inputId.substring(0, 4), 10);
    if (isNaN(year) || year < 1970 || year > 2027) {
      idRef.current.setCustomValidity("올바른 학번을 입력해주세요.");
      idRef.current.reportValidity();
      return;
    }
    if (!/^[가-힣]{3}$/.test(inputName)) {
      nameRef.current.setCustomValidity("이름 한글 세 글자를 입력해주세요.");
      nameRef.current.reportValidity();
      return;
    }
    
    setIsGlitching(true);
    
    setTimeout(() => {
      setNickname(inputName);
      setEntered(true);
    }, 800);
  };

  return (
    <div className="absolute inset-0 bg-slate-950 z-50 flex items-center justify-center font-mono overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {/* Simple grid background effect */}
        <div className="w-full h-full border-[rgba(6,182,212,0.1)] border-[1px] bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:40px_40px] shadow-[inset_0_0_100px_rgba(0,0,0,1)]"></div>
        <div className="absolute inset-0 scanlines opacity-60"></div>
      </div>
      
      <div className={`z-10 bg-slate-900/90 p-8 cyber-container border-2 border-cyan-500 animate-border-pulse max-w-md w-full backdrop-blur-sm relative ${isGlitching ? 'cyber-collapse' : ''}`}>
        <div className="text-center mb-10">
          <h1 className="text-4xl text-cyan-400 font-extrabold mb-2 tracking-widest glitch-text uppercase">D2 VIRTUAL WORLD</h1>
          <p className="text-pink-500 font-bold tracking-widest text-xs uppercase animate-pulse mt-4">&gt;&gt; Robot Software Class D2 - System Override &lt;&lt;</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-6">
            <div className="relative">
              <label className="block text-cyan-400 text-xs mb-2 tracking-widest uppercase font-bold">&gt;&gt; Security ID [학번]</label>
              <div className="absolute -left-3 top-8 bottom-0 w-1 bg-cyan-500 shadow-[0_0_10px_#0ff]"></div>
              <input
                ref={idRef}
                type="text"
                value={inputId}
                onChange={(e) => {
                  setInputId(e.target.value);
                  e.target.setCustomValidity('');
                }}
                className="w-full bg-slate-950/80 border-t border-b border-r border-cyan-800 text-cyan-300 px-4 py-3 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.5)] focus:bg-cyan-950/30 transition-all font-bold tracking-widest"
                placeholder="[ 8 DIGITS REQUIRED ]"
                required
                autoFocus
              />
            </div>
            
            <div className="relative">
              <label className="block text-pink-400 text-xs mb-2 tracking-widest uppercase font-bold">&gt;&gt; Operative Name [이름]</label>
              <div className="absolute -left-3 top-8 bottom-0 w-1 bg-pink-500 shadow-[0_0_10px_#f472b6]"></div>
              <input
                ref={nameRef}
                type="text"
                value={inputName}
                onChange={(e) => {
                  setInputName(e.target.value);
                  e.target.setCustomValidity('');
                }}
                className="w-full bg-slate-950/80 border-t border-b border-r border-pink-800 text-pink-300 px-4 py-3 focus:outline-none focus:border-pink-400 focus:shadow-[0_0_15px_rgba(236,72,153,0.5)] focus:bg-pink-950/30 transition-all font-bold tracking-widest"
                placeholder="[ 3 KOREAN CHARS ]"
                required
              />
            </div>
          </div>
          
          <button
            type="submit"
            className="cyber-button w-full bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold py-4 px-4 transition-all flex items-center justify-center gap-2 group tracking-[0.2em] mt-8"
          >
            INITIALIZE SYSTEM 
            <span className="group-hover:translate-x-3 transition-transform text-xl">&gt;&gt;</span>
          </button>
        </form>
      </div>
    </div>
  );
};

const DigitalFragmentTransition = () => {
  const [visible, setVisible] = useState(true);

  const [rowData] = useState(() => {
    const rows = Array.from({ length: 40 }); // 40 가로줄
    return rows.map(() => {
      const numSegments = Math.floor(Math.random() * 4) + 2; // 줄당 2~5개 파편
      return Array.from({ length: numSegments }).map(() => {
        const delay = Math.random() * 0.4;
        const duration = 0.4 + Math.random() * 0.4;
        const direction = Math.random() > 0.5 ? 1 : -1;
        const isGlitchColor = Math.random() > 0.90; // 10% 확률로 글리치 색상
        const flexWidth = Math.random() * 100 + 20; 

        let colorClass = 'bg-slate-950'; // 기본적으로 검정(배경색)으로 게임 화면을 가림
        if (isGlitchColor) {
          const colors = ['bg-cyan-400', 'bg-pink-500', 'bg-slate-800', 'bg-white'];
          colorClass = colors[Math.floor(Math.random() * colors.length)];
        }
        
        return { delay, duration, direction, flexWidth, colorClass };
      });
    });
  });

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-[100] pointer-events-none flex flex-col bg-transparent overflow-hidden">
      {rowData.map((segments, rowIndex) => (
        <div key={rowIndex} className="flex-1 w-full flex">
          {segments.map((seg, segIndex) => (
            <div 
              key={segIndex}
              className={`${seg.colorClass} animate-glitch-slice`}
              style={{ 
                flex: seg.flexWidth,
                animationDelay: `${seg.delay}s`,
                animationDuration: `${seg.duration}s`,
                '--dir': seg.direction
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// ==========================================
// 5. MAIN APP COMPONENT
// ==========================================
export default function App() {
  const isEntered = useStore(state => state.isEntered);

  return (
    <div className="w-full h-screen overflow-hidden bg-slate-950 font-sans relative">
      {/* Digital glitch transition on load and on enter */}
      <DigitalFragmentTransition key={isEntered ? "entered" : "loaded"} />

      {/* Back to Portal Button */}
      <a 
        href={window.location.port === '5173' ? `http://${window.location.hostname}:8099/` : '/'} 
        className="absolute top-4 left-4 z-[100] pointer-events-auto flex items-center gap-2 bg-slate-900/90 text-cyan-400 hover:text-cyan-300 border border-cyan-500 hover:border-cyan-400 px-4 py-2 rounded-lg text-sm tracking-wider shadow-[0_0_10px_rgba(6,182,212,0.15)] hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300 cursor-pointer text-decoration-none"
        style={{ 
          textDecoration: 'none',
          fontFamily: "'Outfit', 'Noto Sans KR', sans-serif",
          fontWeight: 600,
          letterSpacing: '0.05em'
        }}
      >
        <ArrowLeft size={16} />
        돌아가기
      </a>

      {!isEntered && <LoginOverlay />}
      
      {isEntered && (
        <>
          <Canvas shadows camera={{ position: [0, 4, 10.5], fov: 60 }}>
            <color attach="background" args={['#020617']} />
            <React.Suspense fallback={null}>
              <World />
            </React.Suspense>
          </Canvas>
          <UIOverlay />
        </>
      )}
    </div>
  );
}
