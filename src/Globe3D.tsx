import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

interface Threat {
  id: string;
  timestamp: string;
  type: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  source: string;
  target: string;
  location: string;
  attribution: string;
  status: string;
  confidence: number;
  source_coords?: { lat: number; lon: number; city: string };
  target_coords?: { lat: number; lon: number; city: string };
}

interface Globe3DProps {
  activeThreats: Threat[];
  onThreatClick?: (threat: Threat) => void;
}

// Convert lat/lon to 3D coordinates on sphere
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Rotating Earth component
const Earth: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Auto-rotate the Earth
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001; // Slow rotation
    }
  });
  
  // Create Earth texture (using a simple gradient for now)
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    
    // Create ocean gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
    gradient.addColorStop(0, '#1a2332');
    gradient.addColorStop(0.5, '#0f1922');
    gradient.addColorStop(1, '#1a2332');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2048, 1024);
    
    // Add some land masses (simplified)
    ctx.fillStyle = '#1e3a2e';
    ctx.fillRect(400, 300, 600, 400); // Simplified continent
    ctx.fillRect(1200, 200, 500, 500);
    ctx.fillRect(100, 600, 300, 200);
    
    return new THREE.CanvasTexture(canvas);
  }, []);
  
  return (
    <mesh ref={meshRef} rotation={[0, 0, 0.1]}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial
        map={earthTexture}
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
};

// Attack arc component
const AttackArc: React.FC<{
  source: { lat: number; lon: number };
  target: { lat: number; lon: number };
  severity: string;
}> = ({ source, target, severity }) => {
  const lineRef = useRef<THREE.Line>(null);
  
  const { points, color } = useMemo(() => {
    const radius = 2;
    const sourceVec = latLonToVector3(source.lat, source.lon, radius);
    const targetVec = latLonToVector3(target.lat, target.lon, radius);
    
    // Create arc with control point above surface
    const midPoint = new THREE.Vector3()
      .addVectors(sourceVec, targetVec)
      .multiplyScalar(0.5);
    const distance = sourceVec.distanceTo(targetVec);
    const controlPoint = midPoint.normalize().multiplyScalar(radius + distance * 0.3);
    
    // Create curve
    const curve = new THREE.QuadraticBezierCurve3(sourceVec, controlPoint, targetVec);
    const points = curve.getPoints(50);
    
    // Color based on severity
    const colorMap: Record<string, string> = {
      'Critical': '#ef4444',
      'High': '#f97316',
      'Medium': '#eab308',
      'Low': '#3b82f6'
    };
    
    return { points, color: colorMap[severity] || '#3b82f6' };
  }, [source, target, severity]);
  
  // Animate the arc
  useFrame(({ clock }) => {
    if (lineRef.current) {
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.4 + Math.sin(clock.elapsedTime * 2) * 0.2;
    }
  });
  
  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.6} linewidth={2} />
    </line>
  );
};

// Pulsing marker component
const Marker: React.FC<{
  position: THREE.Vector3;
  severity: string;
  onClick?: () => void;
}> = ({ position, severity, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const color = useMemo(() => {
    const colorMap: Record<string, string> = {
      'Critical': '#ef4444',
      'High': '#f97316',
      'Medium': '#eab308',
      'Low': '#3b82f6'
    };
    return colorMap[severity] || '#3b82f6';
  }, [severity]);
  
  // Pulsing animation
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 3) * 0.3;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });
  
  return (
    <mesh ref={meshRef} position={position} onClick={onClick}>
      <sphereGeometry args={[0.02, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
};

// Main Globe3D component
const Globe3D: React.FC<Globe3DProps> = ({ activeThreats, onThreatClick }) => {
  // Filter only detected threats with coordinates
  const visibleThreats = activeThreats.filter(
    t => t.status === 'Detected' && t.source_coords && t.target_coords
  ).slice(0, 50); // Limit to 50 for performance
  
  return (
    <div className="w-full h-full bg-slate-950 rounded-2xl overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: '#020617' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={1} />
        <pointLight position={[-5, -3, -5]} intensity={0.5} color="#4a9eff" />
        
        {/* Star field background */}
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />
        
        {/* Earth */}
        <Earth />
        
        {/* Attack arcs */}
        {visibleThreats.map(threat => (
          <AttackArc
            key={`arc-${threat.id}`}
            source={threat.source_coords!}
            target={threat.target_coords!}
            severity={threat.severity}
          />
        ))}
        
        {/* Source markers */}
        {visibleThreats.map(threat => {
          const position = latLonToVector3(
            threat.source_coords!.lat,
            threat.source_coords!.lon,
            2
          );
          return (
            <Marker
              key={`marker-${threat.id}`}
              position={position}
              severity={threat.severity}
              onClick={() => onThreatClick && onThreatClick(threat)}
            />
          );
        })}
        
        {/* Camera controls */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3}
          maxDistance={10}
          autoRotate={false}
        />
      </Canvas>
      
      {/* Overlay: Active Threats Counter */}
      <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-4 py-2 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-xs font-bold text-slate-300">
            {visibleThreats.length} Active Attack{visibleThreats.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl px-4 py-2 z-10">
        <div className="text-[10px] text-slate-400 space-y-1">
          <p>🖱️ Drag to rotate</p>
          <p>🔍 Scroll to zoom</p>
          <p>👆 Click markers for details</p>
        </div>
      </div>
    </div>
  );
};

export default Globe3D;
