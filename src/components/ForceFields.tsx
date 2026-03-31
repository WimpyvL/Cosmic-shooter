/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

function Attractor({ position, color, createdAt }: { position: THREE.Vector3; color: string; createdAt: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const age = (Date.now() - createdAt) / 1000;
      const lifetime = 5.0;
      let lifeScale = 1;
      
      if (age < 0.2) {
        lifeScale = age / 0.2;
      } else if (age > lifetime - 0.2) {
        lifeScale = Math.max(0, (lifetime - age) / 0.2);
      } else if (age > lifetime) {
        lifeScale = 0;
      }

      const scale = (1 + Math.sin(state.clock.elapsedTime * 5) * 0.1) * lifeScale;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh position={position} ref={meshRef}>
      <sphereGeometry args={[1.2, 32, 32]} />
      <meshPhysicalMaterial 
        transmission={1} 
        ior={1.5} 
        thickness={2} 
        roughness={0} 
        color={color || "#ffffff"}
      />
      {/* Inner core */}
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color={color || "#ffffff"} />
      </mesh>
    </mesh>
  );
}

function Repulsor({ position, color, createdAt }: { position: THREE.Vector3; color: string; createdAt: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const age = (Date.now() - createdAt) / 1000;
      const lifetime = 5.0;
      let lifeScale = 1;
      
      if (age < 0.2) {
        lifeScale = age / 0.2;
      } else if (age > lifetime - 0.2) {
        lifeScale = Math.max(0, (lifetime - age) / 0.2);
      } else if (age > lifetime) {
        lifeScale = 0;
      }

      const time = state.clock.elapsedTime * 0.8; // slower, softer
      groupRef.current.children.forEach((child, i) => {
        if (i === 3) {
          // Inner core
          child.scale.set(lifeScale, lifeScale, lifeScale);
          return;
        }
        const mesh = child as THREE.Mesh;
        // Offset each ring's phase
        const phase = (time + i * 0.33) % 1;
        // Scale smoothly from 0.2 to 3.5
        const scale = (0.2 + phase * 3.3) * lifeScale;
        mesh.scale.set(scale, scale, scale);
        // Opacity fades in and out smoothly using sine wave
        const opacity = Math.sin(phase * Math.PI) * 0.4 * lifeScale;
        (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      });
    }
  });

  return (
    <group position={position} ref={groupRef}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <ringGeometry args={[0.8, 1.0, 32]} />
          <meshBasicMaterial color={color || "#ff3333"} side={THREE.DoubleSide} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color={color || "#ff3333"} />
      </mesh>
    </group>
  );
}

function Accelerator({ position, color, createdAt }: { position: THREE.Vector3; color: string; createdAt: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current && ringRef.current && groupRef.current) {
      const age = (Date.now() - createdAt) / 1000;
      const lifetime = 5.0; // Matches server lifetime

      // Calculate lifecycle scale (fade in / fade out)
      let lifeScale = 1;
      if (age < 0.2) {
        lifeScale = age / 0.2;
      } else if (age > (lifetime - 0.2)) {
        lifeScale = Math.max(0, (lifetime - age) / 0.2);
      } else if (age > lifetime) {
        lifeScale = 0;
      }

      // Rotate the core octahedron
      meshRef.current.rotation.z += 0.02;
      meshRef.current.rotation.x += 0.01;
      
      // Rotate the outer ring
      ringRef.current.rotation.z -= 0.01;
      
      // Pulse the ring size
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      
      // Apply scales
      // We set the scale on the group for the overall lifecycle fade
      groupRef.current.scale.setScalar(lifeScale);
      
      // We set the scale on the ring for the pulsing effect
      ringRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position} ref={groupRef}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color={color} wireframe emissive={color} emissiveIntensity={2} />
      </mesh>
      <mesh ref={ringRef}>
        <torusGeometry args={[1.5, 0.05, 16, 100]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export function ForceFields() {
  const forceFields = useGameStore((state) => state.forceFields);

  return (
    <>
      {Object.values(forceFields).map((force) => {
        const pos = new THREE.Vector3(force.position.x, force.position.y, force.position.z);
        if (force.type === 'attractor') return <Attractor key={force.id} position={pos} color={force.color} createdAt={force.createdAt} />;
        if (force.type === 'repulsor') return <Repulsor key={force.id} position={pos} color={force.color} createdAt={force.createdAt} />;
        if (force.type === 'accelerator') return <Accelerator key={force.id} position={pos} color={force.color} createdAt={force.createdAt} />;
        return null;
      })}
    </>
  );
}
