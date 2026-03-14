import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadProjectData, saveProjectData } from './cloudSync';
import StructuralApsViewer from './StructuralApsViewer'; // 🌟 USING OUR NEW ENGINE!
import HomeButton from './components/HomeButton';

const StructuralEditor = () => {
    const { urn } = useParams();
    const navigate = useNavigate();
    const viewerRef = useRef();

    // 🌟 APP STATES
    const [isProcessing, setIsProcessing] = useState(true);
    const [loadingText, setLoadingText] = useState("Downloading Architecture...");
    const [showWalls, setShowWalls] = useState(true); 

    // 🌟 DATA STATES
    const [archFloors, setArchFloors] = useState([]);
    const [structuralFloors, setStructuralFloors] = useState([]);
    const [drawnAreas, setDrawnAreas] = useState([]); // 🌟 Where we save drawn rooms

    // 🌟 TOOL STATES
    const [activeTool, setActiveTool] = useState('NONE'); 
    const [zoneType, setZoneType] = useState('INDOOR'); 

    const [scaleFactor, setScaleFactor] = useState(1);
    const [viewerReady, setViewerReady] = useState(false);
    const [forceRedraw, setForceRedraw] = useState(0);
    const [orthoEnabled, setOrthoEnabled] = useState(false); // 🌟 NEW
    const [osnapEnabled, setOsnapEnabled] = useState(true);  // 🌟 NEW

    const totalWallsLoaded = archFloors.reduce((sum, floor) => sum + (floor.walls ? floor.walls.length : 0), 0);


    // 🌟 EXTRACT ALL WALL CORNERS FOR OSNAP
    const snapPoints = React.useMemo(() => {
        let pts = [];
        archFloors.forEach(floor => {
            (floor.walls || []).forEach(wall => {
                if (wall.points && wall.points.p1) pts.push(wall.points.p1);
                if (wall.points && wall.points.p2) pts.push(wall.points.p2);
            });
        });
        return pts;
    }, [archFloors]);

    const processCenterlines = (rawFloors) => {
        const SNAP_TOLERANCE = 0.15;
        let processedFloors = JSON.parse(JSON.stringify(rawFloors));

        processedFloors.forEach(floor => {
            let vertices = [];
            floor.walls.forEach(w => vertices.push(w.points.p1, w.points.p2));

            vertices.forEach((v1, i) => {
                vertices.forEach((v2, j) => {
                    if (i !== j) {
                        const dist = Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
                        if (dist > 0 && dist <= SNAP_TOLERANCE) {
                            v2.x = v1.x; v2.y = v1.y;
                        }
                    }
                });
            });

            floor.walls.forEach(w => {
                const dx = w.points.p2.x - w.points.p1.x;
                const dy = w.points.p2.y - w.points.p1.y;
                w.length = Math.sqrt(dx * dx + dy * dy);
                w.justification = 'CENTER';
            });
        });

        return processedFloors;
    };

    // --- STARTUP SEQUENCE ---
    useEffect(() => {
        const bootStructuralEngine = async () => {
            setLoadingText("📥 Downloading Project Data...");
            const data = await loadProjectData(urn);

            if (data) {
                if (data.floors && data.floors.length > 0) {
                    setArchFloors(JSON.parse(JSON.stringify(data.floors)));
                }

                let activeStructure = [];
                if (data.structuralFloors && data.structuralFloors.length > 0) {
                    activeStructure = data.structuralFloors;
                } else if (data.floors && data.floors.length > 0) {
                    setLoadingText("⚙️ Auto-Healing Wall Intersections...");
                    await new Promise(resolve => setTimeout(resolve, 800));
                    activeStructure = processCenterlines(data.floors);
                    setLoadingText("💾 Saving Structural Baseline...");
                    await saveProjectData(urn, { ...data, structuralFloors: activeStructure });
                }

                setStructuralFloors(activeStructure);
                if (data.scaleFactor) setScaleFactor(data.scaleFactor);
                setTimeout(() => setIsProcessing(false), 500);
            } else {
                setLoadingText("❌ Failed to load data.");
            }
        };
        bootStructuralEngine();
        // eslint-disable-next-line
    }, [urn]);

    // --- VIEWER READY PULSE ---
    useEffect(() => {
        if (isProcessing) return;
        let count = 0;
        const pulseInterval = setInterval(() => {
            if (viewerRef.current && viewerRef.current.viewer) {
                setViewerReady(true);
                setForceRedraw(prev => prev + 1);
                count++;
                if (count > 8) clearInterval(pulseInterval); 
            }
        }, 1500);
        return () => clearInterval(pulseInterval);
    }, [isProcessing]);

   // 🌟 WIRING 1: SEND ACTIVE TOOL TO THE VIEWER
    useEffect(() => {
        if (viewerReady && viewerRef.current && viewerRef.current.updateSettings) {
            viewerRef.current.updateSettings({
                activeTool: activeTool,
                zoneType: zoneType,
                snapPoints: snapPoints, 
                orthoEnabled: orthoEnabled, // 🌟 NEW
                osnapEnabled: osnapEnabled  // 🌟 NEW
            });
        }
}, [activeTool, zoneType, snapPoints, orthoEnabled, osnapEnabled, viewerReady]);
    // 🌟 WIRING 2: CATCH COMPLETED AREAS FROM THE VIEWER
    useEffect(() => {
        const handleArea = (e) => {
            console.log("📥 REACT CAUGHT AREA:", e.detail);
            setDrawnAreas(prev => [...prev, e.detail]);
            setActiveTool('NONE'); // Auto-turn off the tool so they can click the next one!
        };
        window.addEventListener('AREA_COMPLETED', handleArea);
        return () => window.removeEventListener('AREA_COMPLETED', handleArea);
    }, []);

    // 🌟 DRAW EVERYTHING (WALLS + NEW AREAS)
    useEffect(() => {
        if (viewerReady && viewerRef.current) {
            viewerRef.current.clearWalls?.();
            viewerRef.current.clearAreas?.(); // Wipe old areas before redrawing

            // Draw blueprint walls
            if (showWalls) {
                archFloors.forEach(floor => {
                    (floor.walls || []).forEach(wall => {
                        viewerRef.current.drawSolidWall(wall, null, true, true);
                    });
                });
            }

            // Draw the colored floor zones
            drawnAreas.forEach(area => {
                viewerRef.current.drawSolidArea?.(area);
            });
        }
    }, [archFloors, drawnAreas, viewerReady, scaleFactor, forceRedraw, showWalls]);


    if (isProcessing) {
        return (
            <div className="flex h-screen bg-slate-900 items-center justify-center font-sans">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                    <h2 className="text-white text-xl font-bold tracking-widest uppercase mb-2">Processing Structure</h2>
                    <p className="text-blue-400 text-sm font-mono animate-pulse">{loadingText}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-900 font-sans overflow-hidden relative">

            {/* --- SIDEBAR --- */}
            <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col z-10 shadow-2xl relative">
                <div className="p-6 border-b border-slate-700 bg-slate-900/50">
                    <h2 className="text-white text-lg font-black tracking-wider uppercase mb-1">Stage 2</h2>
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Structural Design</p>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="bg-slate-900/50 rounded-xl p-3 mb-6 flex justify-between items-center border border-slate-700 shadow-inner">
                        <span className="text-slate-400 text-xs font-bold tracking-widest uppercase">Drafted Walls</span>
                        <span className="bg-blue-500 text-white text-xs font-black px-3 py-1 rounded-md">{totalWallsLoaded}</span>
                    </div>

                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Structural Tools</h3>

                    {/* 🌟 DRAW ROOM AREA BUTTON */}
                    <button 
                        onClick={() => setActiveTool(activeTool === 'AREA' ? 'NONE' : 'AREA')}
                        className={`w-full py-3 px-4 rounded-xl text-sm font-bold shadow-md transition-colors mb-2 flex items-center justify-between ${
                            activeTool === 'AREA' 
                            ? "bg-green-600 hover:bg-green-500 text-white border-2 border-green-400" 
                            : "bg-slate-700 hover:bg-slate-600 text-white border-2 border-transparent"
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span>🟩</span> Draw Room Area
                        </div>
                        {activeTool === 'AREA' && <span className="text-xs">ON</span>}
                    </button>

                    {/* 🌟 UPGRADED SUB-MENU */}
                    {activeTool === 'AREA' && (
                        <div className="bg-slate-900/60 rounded-xl p-4 mb-4 border border-slate-700 animate-fade-in-down shadow-inner">
                            
                            {/* CAD Toggles (Ortho / Osnap) */}
                            <div className="flex gap-2 mb-4">
                                <button 
                                    onClick={() => setOrthoEnabled(!orthoEnabled)}
                                    className={`flex-1 py-2 text-[10px] font-black tracking-widest uppercase rounded-lg border transition-all ${orthoEnabled ? 'bg-blue-600/30 text-blue-400 border-blue-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
                                >
                                    📐 Ortho: {orthoEnabled ? 'ON' : 'OFF'}
                                </button>
                                <button 
                                    onClick={() => setOsnapEnabled(!osnapEnabled)}
                                    className={`flex-1 py-2 text-[10px] font-black tracking-widest uppercase rounded-lg border transition-all ${osnapEnabled ? 'bg-cyan-600/30 text-cyan-400 border-cyan-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
                                >
                                    🧲 Osnap: {osnapEnabled ? 'ON' : 'OFF'}
                                </button>
                            </div>

                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">Select Zone Type:</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setZoneType('INDOOR')} className={`py-2 text-xs font-bold rounded-lg border ${zoneType === 'INDOOR' ? 'bg-blue-500 text-white border-blue-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}>Indoor</button>
                                <button onClick={() => setZoneType('PORCH')} className={`py-2 text-xs font-bold rounded-lg border ${zoneType === 'PORCH' ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}>Car Porch</button>
                                <button onClick={() => setZoneType('COURTYARD')} className={`py-2 text-xs font-bold rounded-lg border ${zoneType === 'COURTYARD' ? 'bg-yellow-500 text-white border-yellow-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}>Courtyard</button>
                                <button onClick={() => setZoneType('VERANDAH')} className={`py-2 text-xs font-bold rounded-lg border ${zoneType === 'VERANDAH' ? 'bg-orange-500 text-white border-orange-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}>Verandah</button>
                            </div>
                        </div>
                    )}

                    <button className="w-full py-3 px-4 bg-slate-700/50 rounded-xl text-slate-400 text-sm font-bold mb-2 flex items-center gap-3 cursor-not-allowed">
                        <span>🏛️</span> Add Column (Next)
                    </button>
                    <button className="w-full py-3 px-4 bg-slate-700/50 rounded-xl text-slate-400 text-sm font-bold flex items-center gap-3 cursor-not-allowed">
                        <span>🏗️</span> Draw Foundation (Next)
                    </button>
                </div>

                <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex gap-3">
                    <button
                        onClick={() => navigate(`/editor/${encodeURIComponent(urn)}`)}
                        className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                        ⬅️ Back
                    </button>
                    
                    <button
                        onClick={() => setShowWalls(!showWalls)}
                        className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-colors ${
                            showWalls 
                                ? "bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/40" 
                                : "bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700"
                        }`}
                    >
                        {showWalls ? '👀 Hide Walls' : '👁️ Show Walls'}
                    </button>
                </div>
            </div>

            {/* --- 3D VIEWER --- */}
            <div className="flex-1 relative bg-black">
                <div className="absolute top-5 right-6 z-[100]">
                    <HomeButton showWarning={false} />
                </div>
                <StructuralApsViewer ref={viewerRef} urn={decodeURIComponent(urn)} scaleFactor={scaleFactor} isViewLocked={false} />
            </div>

        </div>
    );
};

export default StructuralEditor;