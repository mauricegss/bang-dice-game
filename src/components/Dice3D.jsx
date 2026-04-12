import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import { DiceType } from '../game/GameEngine';

const faceIcons = {
  [DiceType.Arrow]: '➵',
  [DiceType.Dynamite]: '🧨',
  [DiceType.Shoot1]: '🎯1',
  [DiceType.Shoot2]: '🎯2',
  [DiceType.Beer]: '🍺',
  [DiceType.Gatling]: '🔫',
};

// Represents a single 3D die
export const Dice3D = ({ position, index, locked, isRolling, currentFace, onFinished }) => {
  const rigidBodyRef = useRef();
  const [isAwake, setIsAwake] = useState(false);

  useEffect(() => {
    if (isRolling && !locked && rigidBodyRef.current) {
      setIsAwake(true);
      // Give random impulses and torques to throw it up and spin
      const xImp = (Math.random() - 0.5) * 5;
      const yImp = Math.random() * 8 + 5; // Throw UP
      const zImp = (Math.random() - 0.5) * 5;

      const tX = (Math.random() - 0.5) * 2;
      const tY = (Math.random() - 0.5) * 2;
      const tZ = (Math.random() - 0.5) * 2;

      rigidBodyRef.current.applyImpulse({ x: xImp, y: yImp, z: zImp }, true);
      rigidBodyRef.current.applyTorqueImpulse({ x: tX, y: tY, z: tZ }, true);
    }
  }, [isRolling, locked]);

  useFrame(() => {
    if (rigidBodyRef.current && isAwake && isRolling) {
      if (rigidBodyRef.current.isSleeping()) {
        setIsAwake(false);
        // Calculate which face is UP
        const rot = rigidBodyRef.current.rotation();
        // Since doing quaternion math perfectly for a dynamic result is complex,
        // and we want precise gameplay matching, we usually cheat:
        // Let Physics run, then stop, then we let the GameEngine set the final texture based on what the physics *should* map to, or we just rely on GameEngine's dictation.
        // Wait, for TRUE physical roll, we read `rot` and map it to a face, then send to onFinished(index, face). 
        // For simplicity and to avoid glitching rules, we can read the local Up Vector!
        
        const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(rot);
        
        let highest = -Infinity;
        let resultFace = DiceType.Arrow;
        
        const axes = [
          { axis: new THREE.Vector3(0, 1, 0), face: DiceType.Arrow }, // Top
          { axis: new THREE.Vector3(0, -1, 0), face: DiceType.Dynamite }, // Bottom
          { axis: new THREE.Vector3(1, 0, 0), face: DiceType.Shoot1 }, // Right
          { axis: new THREE.Vector3(-1, 0, 0), face: DiceType.Shoot2 }, // Left
          { axis: new THREE.Vector3(0, 0, 1), face: DiceType.Beer }, // Front
          { axis: new THREE.Vector3(0, 0, -1), face: DiceType.Gatling }, // Back
        ];
        
        axes.forEach(a => {
           let dot = upVector.dot(a.axis);
           if (dot > highest) {
             highest = dot;
             resultFace = a.face;
           }
        });
        
        onFinished(index, resultFace);
      }
    }
  });

  // We use HTML overlays on the Box faces to make it easy to see emojis
  return (
    <RigidBody 
      ref={rigidBodyRef} 
      position={position} 
      colliders="cuboid" 
      restitution={0.6} // Bounciness
      friction={0.5}
      type={locked ? "fixed" : "dynamic"} // Locked dice don't move
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={locked ? "#ffcccc" : "#fdfaf6"} />
        
        {/* Faces (we render HTML for sharp emojis since Text3D is heavy) */}
        {!isRolling && (
          <Html position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]} transform occlude center>
             <div className="text-3xl font-bold font-sans pointer-events-none select-none text-zinc-900 drop-shadow">
               {faceIcons[currentFace || DiceType.Arrow]}
             </div>
          </Html>
        )}
      </mesh>
    </RigidBody>
  );
};
