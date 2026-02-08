import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

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
  analysis?: {
    behavioral_score: number;
    pattern_match: string;
    risk_index: number;
  };
  mitigation_suggestions?: string[];
}

interface GeoMapProps {
  activeThreats: Threat[];
  onThreatClick?: (threat: Threat) => void;
}

// Custom pulsing marker icons with attack type labels
const createPulsingIcon = (severity: string, attackType: string, isNew: boolean = false) => {
  const colorMap: Record<string, string> = {
    'Critical': '#ef4444',
    'High': '#f97316',
    'Medium': '#eab308',
    'Low': '#3b82f6'
  };
  
  const color = colorMap[severity] || '#3b82f6';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <!-- Attack Type Label with NEW Badge -->
        <div style="
          background: rgba(15, 23, 42, 0.95);
          color: white;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
          margin-bottom: 4px;
          border: 1px solid ${color};
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          ${attackType}
          ${isNew ? '<span style="background: #10b981; color: white; padding: 1px 4px; border-radius: 3px; font-size: 8px; margin-left: 4px;">NEW</span>' : ''}
        </div>
        
        <!-- Pulsing Marker with Enhanced Glow for New Attacks -->
        <div style="position: relative;">
          <div style="
            width: 20px;
            height: 20px;
            background: ${color};
            border-radius: 50%;
            border: 3px solid rgba(255,255,255,0.3);
            box-shadow: 0 0 ${isNew ? '30px' : '20px'} ${color};
            animation: pulse 2s infinite;
          "></div>
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 30px;
            height: 30px;
            background: ${color};
            opacity: ${isNew ? '0.5' : '0.3'};
            border-radius: 50%;
            animation: ripple 2s infinite;
          "></div>
          ${isNew ? `
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            background: ${color};
            opacity: 0.2;
            border-radius: 50%;
            animation: ripple 2s infinite 0.5s;
          "></div>
          ` : ''}
        </div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes ripple {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
      </style>
    `,
    iconSize: [120, 60],
    iconAnchor: [60, 60]
  });
};

// Target marker (green)
const targetIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      width: 16px;
      height: 16px;
      background: #10b981;
      border-radius: 50%;
      border: 3px solid rgba(255,255,255,0.5);
      box-shadow: 0 0 15px #10b981;
    "></div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// Component to auto-fit bounds
const AutoFitBounds: React.FC<{ threats: Threat[] }> = ({ threats }) => {
  const map = useMap();
  
  useEffect(() => {
    if (threats.length > 0) {
      const bounds: L.LatLngBoundsExpression = threats
        .filter(t => t.source_coords)
        .map(t => [t.source_coords!.lat, t.source_coords!.lon] as [number, number]);
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 4 });
      }
    }
  }, [threats, map]);
  
  return null;
};

const GeoMap: React.FC<GeoMapProps> = ({ activeThreats, onThreatClick }) => {
  const mapRef = useRef<L.Map | null>(null);
  
  // Filter only detected threats with coordinates
  const visibleThreats = activeThreats.filter(
    t => t.status === 'Detected' && t.source_coords && t.target_coords
  );

  // Get severity color for polylines
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'Critical': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#eab308';
      default: return '#3b82f6';
    }
  };

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[30, 0]}
        zoom={2}
        className="w-full h-full rounded-2xl"
        style={{ background: '#0f172a', minHeight: '500px' }}
        ref={mapRef}
        zoomControl={true}
      >
        {/* Dark theme tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <AutoFitBounds threats={visibleThreats} />
        
        {/* Render attack paths (polylines) with different styles per attack type */}
        {visibleThreats.map((threat) => {
          const sourcePos: [number, number] = [
            threat.source_coords!.lat,
            threat.source_coords!.lon
          ];
          const targetPos: [number, number] = [
            threat.target_coords!.lat,
            threat.target_coords!.lon
          ];
          
          // Different arrow styles for different attack types
          const getAttackPathStyle = (attackType: string, severity: string) => {
            const baseColor = getSeverityColor(severity);
            
            // Define unique patterns for each attack type
            const attackStyles: Record<string, { dashArray?: string; weight: number; opacity: number }> = {
              'DDoS': { dashArray: '5, 5', weight: 3, opacity: 0.7 },
              'Brute Force': { dashArray: '10, 5', weight: 2, opacity: 0.6 },
              'Ransomware': { dashArray: '15, 5, 5, 5', weight: 3, opacity: 0.8 },
              'Phishing': { dashArray: '2, 8', weight: 2, opacity: 0.5 },
              'SQL Injection': { dashArray: '8, 3, 2, 3', weight: 2, opacity: 0.6 },
              'Zero-Day Exploit': { weight: 4, opacity: 0.9 }, // Solid, thick line
              'Supply Chain Attack': { dashArray: '20, 10', weight: 3, opacity: 0.7 },
              'AI-Powered Attack': { dashArray: '3, 3', weight: 3, opacity: 0.8 },
              'Cryptojacking': { dashArray: '12, 8', weight: 2, opacity: 0.5 },
              'API Abuse': { dashArray: '6, 4', weight: 2, opacity: 0.6 },
              'IoT Botnet': { dashArray: '4, 6', weight: 2, opacity: 0.6 },
              'Credential Stuffing': { dashArray: '10, 10', weight: 2, opacity: 0.6 },
              'Port Scan': { dashArray: '1, 4', weight: 1, opacity: 0.4 },
              'Unauthorized Access': { dashArray: '7, 7', weight: 2, opacity: 0.6 }
            };
            
            const style = attackStyles[attackType] || { weight: 2, opacity: 0.6 };
            return { ...style, color: baseColor };
          };
          
          const pathStyle = getAttackPathStyle(threat.type, threat.severity);
          
          return (
            <Polyline
              key={`path-${threat.id}`}
              positions={[sourcePos, targetPos]}
              color={pathStyle.color}
              weight={pathStyle.weight}
              opacity={pathStyle.opacity}
              dashArray={pathStyle.dashArray}
            />
          );
        })}
        
        {/* Render source markers */}
        {visibleThreats.map((threat) => {
          // Check if threat is new (detected within last 10 seconds)
          const threatTime = new Date(threat.timestamp).getTime();
          const currentTime = new Date().getTime();
          const isNew = (currentTime - threatTime) < 10000; // 10 seconds
          
          return (
            <Marker
              key={`source-${threat.id}`}
              position={[threat.source_coords!.lat, threat.source_coords!.lon]}
              icon={createPulsingIcon(threat.severity, threat.type, isNew)}
              eventHandlers={{
                click: () => onThreatClick && onThreatClick(threat)
              }}
            >
              <Popup className="custom-popup">
                <div className="p-2 bg-slate-900 text-white rounded-lg min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    {isNew && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                        ⚡ NEW
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      threat.severity === 'Critical' ? 'bg-red-500/20 text-red-500' :
                      threat.severity === 'High' ? 'bg-orange-500/20 text-orange-500' :
                      threat.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-blue-500/20 text-blue-500'
                    }`}>
                      {threat.severity}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{threat.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="font-bold text-sm mb-1">{threat.type}</h3>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p><span className="text-slate-500">Source:</span> {threat.source}</p>
                    <p><span className="text-slate-500">Location:</span> {threat.source_coords?.city}</p>
                    <p><span className="text-slate-500">Attribution:</span> {threat.attribution}</p>
                    <p><span className="text-slate-500">Confidence:</span> {(threat.confidence * 100).toFixed(0)}%</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Detected: {new Date(threat.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onThreatClick) {
                        onThreatClick(threat);
                      }
                    }}
                    className="mt-2 w-full py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* Render target marker (single location) */}
        {visibleThreats.length > 0 && visibleThreats[0].target_coords && (
          <Marker
            position={[
              visibleThreats[0].target_coords.lat,
              visibleThreats[0].target_coords.lon
            ]}
            icon={targetIcon}
          >
            <Popup>
              <div className="p-2 bg-slate-900 text-white rounded-lg">
                <h3 className="font-bold text-sm mb-1">Protected Target</h3>
                <p className="text-xs text-slate-300">{visibleThreats[0].target_coords.city}</p>
                <p className="text-xs text-emerald-500 mt-1">🛡️ Active Defense</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      
      {/* Overlay: Active Threats Counter */}
      <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-4 py-2 z-[1000]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-xs font-bold text-slate-300">
            {visibleThreats.length} Active Attack{visibleThreats.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GeoMap;
