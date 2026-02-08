import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Activity, 
  Map as MapIcon, 
  AlertTriangle, 
  RefreshCcw, 
  Lock, 
  Terminal,
  LogOut,
  Bell,
  Settings,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import GeoMap from './GeoMap';
import Globe3D from './Globe3D';

// Types
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

const App: React.FC = () => {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNetworkStatus, setShowNetworkStatus] = useState(false);
  const [elevatedAccess, setElevatedAccess] = useState(false);
  const [showSystemLog, setShowSystemLog] = useState(false);
  const [isConfigSaving, setIsConfigSaving] = useState(false);
  const [attackTypeFilter, setAttackTypeFilter] = useState<string>('All');

  const dynamicStats = [
    { label: 'Total Threats Detected', value: (4281 + threats.length).toLocaleString(), change: '+12%', icon: Shield, color: 'text-blue-500' },
    { label: 'Active Attacks', value: threats.filter(t => t.status !== 'Mitigated').length.toString(), change: '+2', icon: Activity, color: 'text-red-500' },
    { label: 'System Health', value: (98.2 + (threats.filter(t => t.severity === 'Critical').length * -0.1)).toFixed(1) + '%', change: '-0.3%', icon: Lock, color: 'text-green-500' },
    { label: 'Avg Mitigation Time', value: '1.4s', change: '-10%', icon: Terminal, color: 'text-purple-500' },
  ];

  const [chartMode, setChartMode] = useState<'1H' | 'Live'>('Live');
  const [graphData, setGraphData] = useState([
    { time: '10:00', count: 42 },
    { time: '11:00', count: 58 },
    { time: '12:00', count: 89 },
    { time: '13:00', count: 45 },
    { time: '14:00', count: 72 },
  ]);

  const historyData = [
    { time: '15:30', count: 42 },
    { time: '15:45', count: 31 },
    { time: '16:00', count: 56 },
    { time: '16:15', count: 44 },
    { time: '16:30', count: 68 },
    { time: '16:45', count: 52 },
    { time: '17:00', count: 85 },
  ];

  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);

  const fetchThreats = async () => {
    try {
      console.log("🔄 Manually refreshing threat feed...");
      const response = await fetch('https://cyber-threat-detection-backend-1.onrender.com/threats');
      if (response.ok) {
        const data = await response.json();
        setThreats(data.slice(0, 50));
        console.log(`✅ Loaded ${data.length} threats.`);
      }
    } catch (err) {
      console.error("❌ Failed to fetch threats", err);
    }
  };

  useEffect(() => {
    fetchThreats(); // Initial load
    const ws = new WebSocket('https://cyber-threat-detection-backend-1.onrender.com/ws/threats');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setThreats(prev => [data, ...prev].slice(0, 50));
      
      // Update graph data mock
      setGraphData(prev => {
        const next = [...prev.slice(1), { 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
          count: Math.floor(Math.random() * 100) 
        }];
        return next;
      });
    };

    return () => ws.close();
  }, []);

  const handleMitigate = async (id: string) => {
    console.log(`📡 Sending mitigation request for: ${id}`);
    
    // Optimistic update - update UI immediately for better responsiveness
    const updateLocalState = () => {
      setThreats(prev => prev.map(t => t.id === id ? { ...t, status: 'Mitigated' } : t));
      if (selectedThreat && selectedThreat.id === id) {
        setSelectedThreat(prev => prev ? { ...prev, status: 'Mitigated' } : null);
      }
    };

    try {
      const response = await fetch(`https://cyber-threat-detection-backend-1.onrender.com/mitigate/${id}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Mitigation confirmed by backend for: ${id}`);
        updateLocalState();
      } else {
        // Even if backend says "Threat not found" (expired from cache), 
        // we still mark it as mitigated for the user's session if they can see it.
        if (data.message === "Threat not found") {
          console.warn(`⚠️ Threat ${id} expired from backend cache, applying local mitigation.`);
          updateLocalState();
        } else {
          console.error(`❌ Mitigation failed: ${data.message}`);
          alert(`Mitigation failed: ${data.message || "Unknown error"}`);
        }
      }
    } catch (err) {
      console.error("❌ Network error during mitigation", err);
      // Still update locally for demo purposes if backend is unreachable
      updateLocalState();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'High': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'Medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/50 flex flex-col bg-[#020617]/50 backdrop-blur-xl">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Sentinel AI
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem icon={Activity} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={MapIcon} label="Threat Map" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          <NavItem icon={Globe} label="3D Globe" active={activeTab === 'globe3d'} onClick={() => setActiveTab('globe3d')} />
          <NavItem icon={AlertTriangle} label="Incidents" active={activeTab === 'incidents'} onClick={() => setActiveTab('incidents')} />
          <NavItem icon={Terminal} label="Analysis" active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} />
        </nav>

        <div className="p-4 border-t border-slate-800/50 space-y-2">
          <NavItem icon={<Settings />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          <NavItem icon={<LogOut />} label="Logout" onClick={() => { if(confirm('Are you sure you want to exit the Sentinel neural link?')) window.location.reload(); }} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-8 bg-[#020617]/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Security Overview</h2>
            <div className="h-4 w-[1px] bg-slate-800"></div>
            <div className="relative">
              <span 
                onClick={() => setShowNetworkStatus(!showNetworkStatus)}
                className="text-xs text-slate-500 flex items-center gap-2 cursor-pointer hover:text-white transition-colors group"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse group-hover:shadow-[0_0_8px_#10b981]"></span>
                Live Network Monitoring
              </span>

              <AnimatePresence>
                {showNetworkStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500"></div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Network Health</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-300">Uptime</span>
                        <span className="text-xs font-mono text-emerald-500">99.99%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-300">Latency</span>
                        <span className="text-xs font-mono text-emerald-500">12ms</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-300">Active Nodes</span>
                        <span className="text-xs font-mono text-blue-500">158/160</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-slate-500">THROUGHPUT</span>
                          <span className="text-blue-500">4.2 GB/S</span>
                        </div>
                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 w-[75%] rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <div 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-slate-800 rounded-lg cursor-pointer transition-all relative group"
              >
                <Bell className={`w-5 h-5 transition-colors ${showNotifications ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#020617]"></span>
              </div>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Security Alerts</h4>
                      <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold">3 NEW</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {[
                        { title: 'New Threat Detected', desc: 'DDoS attempt blocked from Singapore-relay', time: '2m ago', type: 'critical' },
                        { title: 'System Backup', desc: 'Cloud synchronization completed successfully', time: '45m ago', type: 'info' },
                        { title: 'Policy Update', desc: 'New firewall rules applied across Node-14', time: '2h ago', type: 'warning' }
                      ].map((n, i) => (
                        <div 
                          key={i} 
                          onClick={() => { setActiveTab('incidents'); setShowNotifications(false); }}
                          className="p-4 hover:bg-slate-800/80 transition-all border-b border-slate-800/50 cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h5 className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors">{n.title}</h5>
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">{n.time}</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-400">{n.desc}</p>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation();
                        setActiveTab('incidents'); 
                        setShowNotifications(false); 
                      }}
                      className="w-full py-3 text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:bg-blue-600/10 transition-all flex items-center justify-center gap-2 group"
                    >
                      View All Incidents
                      <Activity className="w-3 h-3 group-hover:animate-pulse" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="relative">
              <div 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 pl-6 border-l border-slate-800 cursor-pointer hover:bg-slate-800/20 px-3 py-1.5 rounded-xl transition-all"
              >
                <div className="text-right">
                  <p className="text-sm font-medium">Vivek Admin</p>
                  <p className="text-xs text-slate-500">Security Lead</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <span className="text-sm font-bold">V</span>
                </div>
              </div>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50"
                  >
                    <button 
                      onClick={() => { setActiveTab('settings'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" /> Account Settings
                    </button>
                    <button 
                      onClick={() => { setActiveTab('admin'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4" /> Admin Panel
                    </button>
                    <div className="h-[1px] bg-slate-800 my-1" />
                    <button 
                      onClick={() => { if(confirm('Logout from Sentinel?')) window.location.reload(); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Terminate Session
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
          {activeTab === 'dashboard' && (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dynamicStats.map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 hover:border-slate-700/50 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl bg-slate-800 group-hover:bg-slate-700 transition-colors`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
                        {stat.change}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Graph */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 h-[400px]"
                >
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-lg font-semibold">Incident Frequency</h3>
                      <p className="text-sm text-slate-500">Real-time threat detection volume</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setChartMode('1H')}
                        className={`px-3 py-1 text-xs rounded-lg border transition-all ${chartMode === '1H' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                      >
                        1H
                      </button>
                      <button 
                         onClick={() => setChartMode('Live')}
                         className={`px-3 py-1 text-xs rounded-lg border transition-all ${chartMode === 'Live' ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                      >
                        Live
                      </button>
                    </div>
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartMode === 'Live' ? graphData : historyData}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                          itemStyle={{ color: '#3b82f6' }}
                        />
                        <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Severity Distribution */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50"
                >
                  <h3 className="text-lg font-semibold mb-6">Threat Distribution</h3>
                  <div className="space-y-6">
                    <SeverityBar label="Critical" value={12} color="bg-red-500" />
                    <SeverityBar label="High" value={28} color="bg-orange-500" />
                    <SeverityBar label="Medium" value={45} color="bg-yellow-500" />
                    <SeverityBar label="Low" value={15} color="bg-blue-500" />
                  </div>
                  <div className="mt-10 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-semibold">Security Insight</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Brute force attempts from APT41 are increasing. Automated IP blocking is active for source blocks with <span className="text-blue-400">95%+ confidence</span>.
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Incidents Table */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Live Threat Log</h3>
                  <button 
                    onClick={fetchThreats}
                    className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors group"
                  >
                    <RefreshCcw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" /> Refresh Feed
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800/50">
                        <th className="pb-4 pt-0 font-medium text-slate-400 text-sm">Threat ID</th>
                        <th className="pb-4 pt-0 font-medium text-slate-400 text-sm">Type</th>
                        <th className="pb-4 pt-0 font-medium text-slate-400 text-sm">Severity</th>
                        <th className="pb-4 pt-0 font-medium text-slate-400 text-sm">Source / Target</th>
                        <th className="pb-4 pt-0 font-medium text-slate-400 text-sm">Attribution</th>
                        <th className="pb-4 pt-0 font-medium text-slate-400 text-sm">Confidence</th>
                        <th className="pb-4 pt-0 font-medium text-slate-400 text-sm">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">
                      <AnimatePresence>
                        {threats.map((threat) => (
                          <motion.tr 
                        key={threat.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedThreat(threat)}
                        className="hover:bg-slate-800/20 transition-colors group/row cursor-pointer"
                      >
                            <td className="py-4 text-xs font-mono text-slate-400">#{threat.id.slice(0, 8)}</td>
                            <td className="py-4">
                              <span className="text-sm font-medium">{threat.type}</span>
                            </td>
                            <td className="py-4">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${getSeverityColor(threat.severity)}`}>
                                {threat.severity}
                              </span>
                            </td>
                            <td className="py-4 text-xs">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-slate-300 font-mono">{threat.source}</span>
                                <span className="text-[10px] text-slate-500 font-mono">→ {threat.target}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm">{threat.attribution}</span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{threat.location}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${threat.confidence * 100}%` }}></div>
                                </div>
                                <span className="text-xs font-mono">{(threat.confidence * 100).toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="py-4">
                              {threat.status === 'Mitigated' ? (
                                <span className="text-[10px] text-emerald-500 font-bold uppercase flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Blocked
                                </span>
                              ) : (
                                <button 
                                  onClick={() => handleMitigate(threat.id)}
                                  className="opacity-0 group-hover/row:opacity-100 text-[10px] bg-slate-800 hover:bg-red-500/20 hover:text-red-500 border border-slate-700 hover:border-red-500/50 px-2 py-1 rounded transition-all"
                                >
                                  Mitigate
                                </button>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                  {threats.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                      <Activity className="w-12 h-12 mb-4 opacity-10 animate-pulse" />
                      <p>Initializing neural detection engine...</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}

          {activeTab === 'map' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col space-y-6"
            >
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    <MapIcon className="w-6 h-6 text-blue-500" /> Geospatial Attribution Map
                  </h3>
                  <p className="text-sm text-slate-500 italic mt-1">Neural engine streaming live attribution coordinates</p>
                </div>
                <div className="flex gap-4 items-center">
                  {/* Attack Type Filter */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Filter:</span>
                    <select 
                      value={attackTypeFilter}
                      onChange={(e) => setAttackTypeFilter(e.target.value)}
                      className="bg-slate-800 text-white text-xs px-3 py-1 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Attacks</option>
                      <option value="DDoS">DDoS</option>
                      <option value="Brute Force">Brute Force</option>
                      <option value="Ransomware">Ransomware</option>
                      <option value="Phishing">Phishing</option>
                      <option value="SQL Injection">SQL Injection</option>
                      <option value="Zero-Day Exploit">Zero-Day</option>
                      <option value="Supply Chain Attack">Supply Chain</option>
                      <option value="AI-Powered Attack">AI-Powered</option>
                      <option value="Cryptojacking">Cryptojacking</option>
                      <option value="API Abuse">API Abuse</option>
                      <option value="IoT Botnet">IoT Botnet</option>
                      <option value="Credential Stuffing">Credential Stuffing</option>
                      <option value="Port Scan">Port Scan</option>
                      <option value="Unauthorized Access">Unauthorized Access</option>
                    </select>
                  </div>
                  <div className="flex gap-4 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {attackTypeFilter === 'All' ? `Linked Nodes: ${threats.length}` : `${attackTypeFilter}: ${threats.filter(t => t.type === attackTypeFilter).length}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Geospatial Map */}
              <div className="flex-1 relative bg-slate-900/40 border border-slate-800/50 rounded-3xl overflow-hidden min-h-[500px]">
                <GeoMap 
                  activeThreats={attackTypeFilter === 'All' ? threats : threats.filter(t => t.type === attackTypeFilter)} 
                  onThreatClick={setSelectedThreat} 
                />
                
                {/* Statistics Overlay */}
                <div className="absolute bottom-8 left-8 flex gap-4 z-[1000] pointer-events-none">
                  {['Russia', 'China', 'USA', 'Unknown'].map(loc => (
                    <div key={loc} className="px-6 py-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl flex flex-col items-center min-w-[120px]">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{loc}</span>
                      <span className="text-2xl font-mono text-blue-500 font-bold">
                        {(attackTypeFilter === 'All' ? threats : threats.filter(t => t.type === attackTypeFilter)).filter(t => t.location === loc).length}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="absolute top-8 right-8 p-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl text-[10px] font-bold uppercase tracking-widest space-y-3 z-[1000]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                    <span>Critical Vector</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span>High Risk Node</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500/50"></div>
                    <span>Monitoring Trace</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'globe3d' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col space-y-6"
            >
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    <Globe className="w-6 h-6 text-purple-500" /> 3D Globe Threat Visualization
                  </h3>
                  <p className="text-sm text-slate-500 italic mt-1">Interactive 3D real-time cyber attack tracking</p>
                </div>
                <div className="flex gap-4 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">3D Rendering Active</span>
                  </div>
                </div>
              </div>

              {/* 3D Globe Container */}
              <div className="flex-1 relative bg-slate-900/40 border border-slate-800/50 rounded-3xl overflow-hidden min-h-[500px]">
                <Globe3D activeThreats={threats} onThreatClick={setSelectedThreat} />
              </div>
            </motion.div>
          )}

          {activeTab === 'incidents' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-bold flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-orange-500" /> Recent Security Incidents
              </h3>
              <div className="grid gap-4">
                {threats.slice(0, 5).map(t => (
                  <div key={t.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/50 flex justify-between items-center group">
                    <div className="flex gap-4 items-center">
                      <div className={`p-2 rounded bg-slate-800 border ${t.severity === 'Critical' ? 'border-red-500/50' : 'border-slate-700'}`}>
                        <Shield className={`w-5 h-5 ${t.severity === 'Critical' ? 'text-red-500' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{t.type}</p>
                        <p className="text-xs text-slate-500">Source: <span className="font-mono">{t.source}</span> • Target: <span className="font-mono">{t.target}</span></p>
                      </div>
                    </div>
                    <div className="flex gap-6 items-center">
                      <span className="text-xs text-slate-500">{new Date(t.timestamp).toLocaleTimeString()}</span>
                      <button 
                        onClick={() => setSelectedThreat(t)}
                        className="text-blue-500 text-xs hover:underline opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'analysis' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-purple-500" /> Automated Response Log
                </h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {threats.filter(t => t.status === 'Mitigated').length > 0 ? (
                    threats.filter(t => t.status === 'Mitigated').slice(0, 10).map(t => (
                      <div key={t.id} className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono text-emerald-400">SESSION_ID_{t.id.slice(0, 8)}</span>
                          <p className="text-sm font-medium text-slate-200 mt-1">{t.type}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Source: {t.source} → {t.target}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-emerald-600 block">✓ MITIGATED</span>
                          <span className="text-[10px] text-slate-500">{new Date(t.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center text-slate-500 text-sm flex flex-col items-center gap-4">
                      <Terminal className="w-12 h-12 opacity-20" />
                      <div>
                        <p className="font-semibold">No Mitigated Threats Yet</p>
                        <p className="text-xs mt-2">Click "Execute Protocol Override" on any threat to see mitigation logs here</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-500" /> Protocol Status
                </h3>
                <div className="space-y-8">
                  <ProtocolItem label="Deep Packet Inspection" status="Online" active />
                  <ProtocolItem label="Heuristic Pattern Matching" status="Online" active />
                  <ProtocolItem label="Neural Attribution Engine" status="Synchronizing" active={false} />
                  <ProtocolItem label="Automated Response System" status="Armed" active />
                </div>
              </div>
            </motion.div>
          )}


          {activeTab === 'admin' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    Admin Control Center
                    {elevatedAccess && <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full animate-pulse">Elevated Privileges Active</span>}
                  </h3>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowSystemLog(true)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold border border-slate-700 transition-colors"
                    >
                      System Log
                    </button>
                    <button 
                      onClick={() => {
                        if(!elevatedAccess) {
                          if(confirm('Requesting Level 5 Security Authorization. Proceed?')) {
                            setElevatedAccess(true);
                          }
                        } else {
                          setElevatedAccess(false);
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all ${elevatedAccess ? 'bg-red-600 shadow-red-600/20 text-white' : 'bg-blue-600 shadow-blue-600/20 text-white'}`}
                    >
                      {elevatedAccess ? 'Revoke Access' : 'Elevate Access'}
                    </button>
                  </div>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">Security Operators</h4>
                  {[
                    { name: 'Vivek Admin', role: 'Security Lead', status: 'Active' },
                    { name: 'AI Sentinel', role: 'Autonomous Engine', status: 'Running' },
                    { name: 'Node 42-B', role: 'Regional Relay', status: 'Standby' }
                  ].map(op => (
                    <div key={op.name} className="flex justify-between items-center p-3 bg-slate-800/20 rounded-xl border border-slate-700/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-xs font-bold text-blue-500">
                          {op.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{op.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono italic">{op.role}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-500 px-2 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">{op.status}</span>
                    </div>
                  ))}
                  {elevatedAccess && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 mt-4"
                    >
                      <p className="text-xs font-bold text-red-500 mb-2 uppercase tracking-tight">Root Commands Unlocked</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button className="text-[10px] py-2 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all font-mono">FORCE_KILL_ALL</button>
                        <button className="text-[10px] py-2 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all font-mono">NEURAL_PURGE</button>
                      </div>
                    </motion.div>
                  )}
                </div>
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 space-y-6">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">System Hardening</h4>
                  <div className="space-y-4">
                    <ConfigToggle label="Auto-Block High Confidence" defaultChecked />
                    <ConfigToggle label="Deep Neural Analysis" defaultChecked />
                    <ConfigToggle label="Regional Geo-Fencing" />
                    <ConfigToggle label="Automatic Snapshotting" defaultChecked />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl space-y-8"
            >
              <h3 className="text-2xl font-bold">System Settings</h3>
              <div className="space-y-6">
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Network Interface</h4>
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">API Endpoint</span>
                      <span className="text-xs font-mono text-blue-500">https://cyber-threat-detection-backend-1.onrender.com/</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">WebSocket Status</span>
                      <span className="text-xs text-emerald-500 font-bold">CONNECTED</span>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Display Preferences</h4>
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Dark Mode Intensity</span>
                      <input type="range" className="accent-blue-600" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Real-time Animation Speed</span>
                      <select className="bg-slate-800 text-xs rounded border border-slate-700 px-2 py-1">
                        <option>Hyper (Fast)</option>
                        <option selected>Balanced</option>
                        <option>Eco (Slow)</option>
                      </select>
                    </div>
                  </div>
                </section>

                <button 
                  onClick={() => {
                    setIsConfigSaving(true);
                    setTimeout(() => setIsConfigSaving(false), 2000);
                  }}
                  disabled={isConfigSaving}
                  className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isConfigSaving ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20' : 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-500/20'}`}
                >
                  {isConfigSaving ? (
                    <>
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                      Protocol Synchronized
                    </>
                  ) : (
                    'Commit Configuration Changes'
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Details Modal */}
          <AnimatePresence>
            {selectedThreat && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedThreat(null)}
                  className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
                >
                  <div className="p-8 space-y-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${getSeverityColor(selectedThreat.severity)}`}>
                            {selectedThreat.severity} Severity
                          </span>
                          <span className="text-xs text-slate-500 font-mono">ID: {selectedThreat.id}</span>
                        </div>
                        <h3 className="text-2xl font-bold">{selectedThreat.type}</h3>
                      </div>
                      <button onClick={() => setSelectedThreat(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                        <Terminal className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <DetailItem label="Origin Agent" value={selectedThreat.attribution} sub={selectedThreat.location} />
                        <DetailItem label="Source Vector" value={selectedThreat.source} mono />
                        <DetailItem label="Target Node" value={selectedThreat.target} mono />
                      </div>
                      <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800/50 space-y-6">
                        <h4 className="text-xs font-bold text-blue-500 uppercase tracking-widest">AI Analysis</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-400">Risk Index</span>
                            <span className="text-2xl font-bold text-red-500">{selectedThreat.analysis?.risk_index || '8.2'}</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-400">Pattern Match</span>
                            <span className="text-sm font-medium">{selectedThreat.analysis?.pattern_match || 'Signature Variance'}</span>
                          </div>
                          <div className="pt-4 border-t border-slate-800">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-slate-400 block">Behavioral Score</span>
                              <span className="text-[10px] font-mono text-blue-400">
                                {Math.round((selectedThreat.analysis?.behavioral_score ?? 0.85) * 100)}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(selectedThreat.analysis?.behavioral_score ?? 0.85) * 100}%` }}
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/40 border border-slate-800/50 rounded-2xl p-6">
                      <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4">Recommended Mitigation Protocols</h4>
                      <div className="space-y-3">
                        {selectedThreat.mitigation_suggestions?.map((s: string, i: number) => (
                          <div key={i} className="flex gap-3 items-start text-xs text-slate-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                            {s}
                          </div>
                        )) || (
                          <p className="text-xs text-slate-500 italic">Calculating adaptive response protocols...</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      {selectedThreat.status === 'Mitigated' ? (
                        <div className="flex-1 py-4 bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 rounded-xl font-bold flex items-center justify-center gap-2">
                          <Lock className="w-5 h-5" /> Protocol Successfully Overridden
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleMitigate(selectedThreat.id)}
                          className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
                        >
                          Execute Protocol Override
                        </button>
                      )}
                      <button 
                         onClick={() => setSelectedThreat(null)}
                         className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                      >
                        {selectedThreat.status === 'Mitigated' ? 'Close Analysis' : 'Dismiss Analysis'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* System Log Modal */}
          <AnimatePresence>
            {showSystemLog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowSystemLog(false)}
                  className="absolute inset-0 bg-[#020617]/90 backdrop-blur-md"
                />
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden h-[600px] flex flex-col"
                >
                  <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-blue-500" />
                        Neural Link Audit Log
                      </h3>
                      <p className="text-xs text-slate-500">Live system event monitoring</p>
                    </div>
                    <button onClick={() => setShowSystemLog(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                       <Activity className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] space-y-2 bg-black/20">
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className="flex gap-4 opacity-70 hover:opacity-100 transition-opacity">
                        <span className="text-blue-500">[{new Date(Date.now() - i * 3600000).toISOString().split('T')[1].split('.')[0]}]</span>
                        <span className="text-slate-500">SYS_AUTH_DAEMON:</span>
                        <span className={i % 3 === 0 ? 'text-emerald-400' : 'text-slate-300'}>
                          {i % 3 === 0 ? 'ACCESS_GRANTED_SUCCESS (USER:VIVEK)' : 'ENCRYPTED_PACKET_VERIFIED_CHECK_OK'}
                        </span>
                        <span className="text-slate-700 ml-auto">0x{Math.floor(Math.random() * 16777215).toString(16).toUpperCase()}</span>
                      </div>
                    ))}
                    <div className="flex gap-4 text-red-500 font-bold animate-pulse">
                      <span className="text-red-600">[CRITICAL]</span>
                      <span>NEURAL_ENGINE: ANOMALY_DETECTED_IN_SECTOR_7G</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const DetailItem: React.FC<{ label: string, value: string, sub?: string, mono?: boolean }> = ({ label, value, sub, mono }) => (
  <div>
    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{label}</p>
    <p className={`text-lg font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
    {sub && <p className="text-xs text-slate-500 uppercase mt-0.5">{sub}</p>}
  </div>
);

const NavItem: React.FC<{ icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-blue-600/10 text-white border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
  >
    {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const SeverityBar: React.FC<{ label: string, value: number, color: string }> = ({ label, value, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-xs">
      <span className="text-slate-400 font-medium tracking-wide uppercase">{label}</span>
      <span className="font-mono">{value}%</span>
    </div>
    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className={`h-full ${color} rounded-full`}
      />
    </div>
  </div>
);

const ConfigToggle: React.FC<{ label: string, defaultChecked?: boolean }> = ({ label, defaultChecked }) => (
  <div className="flex justify-between items-center bg-slate-800/20 p-3 rounded-xl border border-slate-700/20">
    <span className="text-sm text-slate-300">{label}</span>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  </div>
);

const ProtocolItem: React.FC<{ label: string, status: string, active: boolean }> = ({ label, status, active }) => (
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
      <span className="text-sm font-medium text-slate-300">{label}</span>
    </div>
    <span className={`text-[10px] uppercase font-bold tracking-widest ${active ? 'text-blue-400' : 'text-slate-600'}`}>
      {status}
    </span>
  </div>
);

const WorldMap: React.FC<{ activeThreats: Threat[] }> = ({ activeThreats }) => {
  const points = {
    'Russia': { x: 550, y: 120 },
    'China': { x: 620, y: 200 },
    'USA': { x: 180, y: 180 },
    'Internal Network': { x: 400, y: 350 },
    'Unknown': { x: 400, y: 300 }
  };

  return (
    <svg viewBox="0 0 800 450" className="w-full h-full opacity-80">
      {/* Background Dots Grid */}
      {[...Array(20)].map((_, i) => 
        [...Array(10)].map((_, j) => (
          <circle key={`${i}-${j}`} cx={i * 40 + 20} cy={j * 45 + 22} r="1" fill="#1e293b" />
        ))
      )}

      {/* Basic World Outline */}
      <path d="M150,150 Q200,120 250,150 T350,180 T450,140 T550,150 T650,180 T750,220" fill="none" stroke="#1e293b" strokeWidth="1" />
      <path d="M100,200 Q150,220 200,200 T300,230 T400,210 T500,240 T600,220 T700,250" fill="none" stroke="#1e293b" strokeWidth="1" />
      
      {/* Neural Link Connectors */}
      <AnimatePresence>
        {activeThreats.filter(t => t.status === 'Detected').map(t => {
          const pt = points[t.location as keyof typeof points] || points['Unknown'];
          const target = { x: 400, y: 220 }; // Data Center Target
          const isCritical = t.severity === 'Critical';
          
          return (
            <motion.g key={t.id}>
              <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.4 }}
                exit={{ opacity: 0 }}
                d={`M${pt.x},${pt.y} Q${(pt.x + target.x)/2},${pt.y - 100} ${target.x},${target.y}`}
                fill="none"
                stroke={isCritical ? '#ef4444' : '#3b82f6'}
                strokeWidth={isCritical ? "2" : "1"}
                strokeDasharray={isCritical ? "0" : "5 5"}
              />
              <motion.circle
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [1, 2.5, 3] }}
                transition={{ repeat: Infinity, duration: 3, delay: Math.random() * 2 }}
                cx={pt.x} cy={pt.y} r="8"
                fill={isCritical ? '#ef4444' : '#3b82f6'}
                fillOpacity="0.2"
              />
              <motion.circle
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                cx={pt.x} cy={pt.y} r={isCritical ? "5" : "3"}
                fill={isCritical ? '#ef4444' : '#3b82f6'}
                className={isCritical ? "shadow-[0_0_15px_#ef4444]" : ""}
              />
            </motion.g>
          );
        })}
      </AnimatePresence>

      {/* Static Target Hub */}
      <motion.g animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 4 }}>
        <circle cx="400" cy="220" r="8" fill="#10b981" />
        <circle cx="400" cy="220" r="16" fill="none" stroke="#10b981" strokeWidth="1" strokeOpacity="0.2" />
      </motion.g>
    </svg>
  );
};

export default App;
