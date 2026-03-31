/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';
import { Trail, Html } from '@react-three/drei';

function RespawnShockwave({ color, onComplete }: { color: string, onComplete: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now());
  
  useFrame(() => {
    if (meshRef.current) {
      const elapsed = (Date.now() - startTime.current) / 1000;
      if (elapsed > 0.8) {
        onComplete();
        return;
      }
      // Expand quickly
      const scale = 1 + elapsed * 15;
      meshRef.current.scale.set(scale, scale, scale);
      
      // Fade out
      const opacity = Math.max(0, 1.0 - (elapsed / 0.8));
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  });

  return (
    <mesh ref={meshRef}>
      <ringGeometry args={[0.5, 0.8, 32]} />
      <meshBasicMaterial color={color} transparent opacity={1} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function PlayerCursor({ position, color, health, score, isCharging }: { position: THREE.Vector3; color: string; health: number; score: number; isCharging: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [showShockwave, setShowShockwave] = useState(false);
  const prevHealth = useRef(health);
  const respawnTime = useRef(0);

  useEffect(() => {
    // Detect respawn: health goes from <= 0 to > 0
    if (prevHealth.current <= 0 && health > 0) {
      setShowShockwave(true);
      respawnTime.current = Date.now();
    }
    prevHealth.current = health;
  }, [health]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.lerp(position, 0.2);
      meshRef.current.rotation.z += 0.05;
      
      // Base scale
      let targetScale = (isCharging ? 1.5 : 1) + Math.sin(state.clock.elapsedTime * 10) * 0.1;
      
      // Respawn pop-in animation
      const timeSinceRespawn = (Date.now() - respawnTime.current) / 1000;
      if (timeSinceRespawn < 0.5) {
        // Elastic pop-in
        const t = timeSinceRespawn / 0.5;
        // Overshoot slightly
        const pop = Math.sin(t * Math.PI * 1.5) * 1.2; 
        targetScale *= Math.min(1, pop + 0.2); 
      }

      meshRef.current.scale.set(targetScale, targetScale, targetScale);
    }
  });

  return (
    <group>
      {showShockwave && (
        <group position={position}>
          <RespawnShockwave color={color} onComplete={() => setShowShockwave(false)} />
        </group>
      )}
      <Trail
        width={0.8}
        length={15}
        color={new THREE.Color(color)}
        attenuation={(t) => t * t}
      >
        <mesh ref={meshRef} position={position}>
          <coneGeometry args={[0.5, 1.2, 4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
          
          {/* Health Bar */}
          <Html position={[0, 1.5, 0]} center>
            <div className="flex flex-col items-center gap-1 pointer-events-none">
              <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="h-full bg-green-500 transition-all duration-300" 
                  style={{ width: `${health}%`, backgroundColor: health < 30 ? '#ef4444' : '#22c55e' }} 
                />
              </div>
              <span className="text-[10px] font-bold text-white drop-shadow-md uppercase tracking-tighter">
                {score} pts
              </span>
            </div>
          </Html>
        </mesh>
      </Trail>
    </group>
  );
}

export function LocalCursor({ playerPosRef }: { playerPosRef: React.MutableRefObject<THREE.Vector3> }) {
  const myColor = useGameStore((state) => state.myColor);
  const health = useGameStore((state) => state.health);
  const score = useGameStore((state) => state.score);
  const isCharging = useGameStore((state) => state.isCharging);
  const meshRef = useRef<THREE.Mesh>(null);
  
  const [showShockwave, setShowShockwave] = useState(false);
  const prevHealth = useRef(health);
  const respawnTime = useRef(0);

  useEffect(() => {
    // Detect respawn
    if (prevHealth.current <= 0 && health > 0) {
      setShowShockwave(true);
      respawnTime.current = Date.now();
    }
    prevHealth.current = health;
  }, [health]);

  useFrame((state) => {
    if (meshRef.current && playerPosRef.current) {
      // Use local ref for immediate smooth feedback
      meshRef.current.position.copy(playerPosRef.current);
      
      // Add pulsing effect
      let scale = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.2;
      
      // Respawn pop-in animation
      const timeSinceRespawn = (Date.now() - respawnTime.current) / 1000;
      if (timeSinceRespawn < 0.5) {
        const t = timeSinceRespawn / 0.5;
        const pop = Math.sin(t * Math.PI * 1.5) * 1.2; 
        scale *= Math.min(1, pop + 0.2);
      }

      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  if (!myColor) return null;

  return (
    <group>
      {showShockwave && playerPosRef.current && (
        <group position={playerPosRef.current}>
          <RespawnShockwave color={myColor} onComplete={() => setShowShockwave(false)} />
        </group>
      )}
      <Trail
        width={1.0}
        length={15}
        color={new THREE.Color(myColor)}
        attenuation={(t) => t * t}
      >
        <mesh ref={meshRef} position={[0, 0, 0]}>
          <coneGeometry args={[0.6, 1.4, 4]} />
          <meshStandardMaterial color={myColor} emissive={myColor} emissiveIntensity={4} />
          
          <Html position={[0, 1.8, 0]} center>
            <div className="flex flex-col items-center gap-1 pointer-events-none">
              <div className="w-16 h-2 bg-gray-800/50 backdrop-blur-sm rounded-full overflow-hidden border border-white/20">
                <div 
                  className="h-full bg-cyan-400 transition-all duration-200 shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
                  style={{ width: `${health}%`, backgroundColor: health < 30 ? '#ff4444' : '#22d3ee' }} 
                />
              </div>
              <span className="text-[11px] font-black text-white drop-shadow-lg uppercase tracking-widest italic">
                YOU • {score}
              </span>
            </div>
          </Html>
        </mesh>
      </Trail>
    </group>
  );
}

export function OtherPlayers() {
  const players = useGameStore((state) => state.players);

  return (
    <>
      {Object.values(players).map((player) => {
        if (!player.position || player.id === useGameStore.getState().myId) return null;
        const pos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
        return (
          <PlayerCursor 
            key={player.id} 
            position={pos} 
            color={player.color} 
            health={player.health} 
            score={player.score}
            isCharging={player.isCharging}
          />
        );
      })}
    </>
  );
}
