import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadProjectData, saveProjectData } from './cloudSync';
import StructuralApsViewer from './StructuralApsViewer';
import HomeButton from './components/HomeButton';
import AreaDetailsSidebar from './components/AreaDetailsSidebar';
import ColumnDetailsSidebar from './components/ColumnDetailsSidebar';

// 🌟 NEW ALGORITHM: Point in Polygon (Ray Casting)
const isPointInPolygon = (x, y, polygon) => {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
};

// 🌟 MATH HELPER
const calculateAreaDetails = (points, zoneType, scaleFactor = 1, allWalls = []) => {
    if (!points || points.length < 3) return null;

    let rawArea = 0;
    for (let i = 0; i < points.length; i++) {
        let j = (i + 1) % points.length;
        rawArea += points[i].x * points[j].y;
        rawArea -= points[j].x * points[i].y;
    }
    rawArea = Math.abs(rawArea / 2);

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    });

    let shapeName = `${points.length}-Sided`;
    if (points.length === 3) shapeName = "Triangle";
    else if (points.length === 4) shapeName = "Rectangular";
    else if (points.length === 6) shapeName = "L-Shaped";
    else if (points.length === 8) shapeName = "T/U-Shaped";

    let touchedSides = new Set();
    let connectedOpenings = [];
    let insideWallsCount = 0; // 🌟 NEW: Track walls fully inside the room

    const distToSegment = (px, py, x1, y1, x2, y2) => {
        const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;
        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }
        return Math.sqrt(Math.pow(px - xx, 2) + Math.pow(py - yy, 2));
    };

    allWalls.forEach(wall => {
        if (!wall.points) return;
        const midX = (wall.points.p1.x + wall.points.p2.x) / 2;
        const midY = (wall.points.p1.y + wall.points.p2.y) / 2;

        let touchesAnySide = false;

        for (let i = 0; i < points.length; i++) {
            let j = (i + 1) % points.length;
            const dist = distToSegment(midX, midY, points[i].x, points[i].y, points[j].x, points[j].y);
            if (dist < 0.4) {
                touchedSides.add(i); // 🌟 Record the specific side index (0, 1, 2, etc.)
                touchesAnySide = true;
            }
        }

        // 🌟 NEW: Check if the wall's center is completely inside the room
        let isInside = false;
        if (!touchesAnySide) {
            isInside = isPointInPolygon(midX, midY, points);
            if (isInside) {
                insideWallsCount++; // Increment inside walls counter
            }
        }

        // 🌟 UPDATED: If it touches OR is inside, grab its openings
        if (touchesAnySide || isInside) {
            if (wall.openings && wall.openings.length > 0) {
                wall.openings.forEach(op => {
                    const width = op.width ? (op.width * scaleFactor).toFixed(2) : "0.90";
                    const height = op.height ? (op.height * scaleFactor).toFixed(2) : "2.10";
                    connectedOpenings.push(`${width} x ${height}`);
                });
            }
        }
    });

    return {
        id: Date.now() + Math.random(),
        name: "New Room",
        zoneType: zoneType || 'INDOOR',
        shape: shapeName,
        areaM2: (rawArea * (scaleFactor * scaleFactor)).toFixed(2),
        areaSqFt: (rawArea * (scaleFactor * scaleFactor) * 10.7639).toFixed(2),
        length: ((maxX - minX) * scaleFactor).toFixed(2),
        breadth: ((maxY - minY) * scaleFactor).toFixed(2),
        points: points,
        wallsCount: touchedSides.size,
        insideWallsCount: insideWallsCount, // 🌟 NEW: Send inside wall count to UI
        openings: connectedOpenings
    };
};

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
    const [drawnAreas, setDrawnAreas] = useState([]);

    // 🌟 FLOOR STATE (NEW)
    const [currentFloorIndex, setCurrentFloorIndex] = useState(0);

    // 🌟 TOOL STATES
    const [activeTool, setActiveTool] = useState('NONE');
    const [areaMode, setAreaMode] = useState('DRAW');
    const [appStage, setAppStage] = useState('ARCHITECTURE');
    const [zoneType, setZoneType] = useState('INDOOR');
    const [scaleFactor, setScaleFactor] = useState(1);
    const [viewerReady, setViewerReady] = useState(false);
    const [forceRedraw, setForceRedraw] = useState(0);
    const [orthoEnabled, setOrthoEnabled] = useState(false);
    const [osnapEnabled, setOsnapEnabled] = useState(true);
    const [editingAreaId, setEditingAreaId] = useState(null);
    const [backupAreas, setBackupAreas] = useState([]);
    const [unlockedFromStructural, setUnlockedFromStructural] = useState(false);
    const [isSaving, setIsSaving] = useState(false);


    // Calculate walls for the CURRENT floor only
    const totalWallsLoaded = archFloors[currentFloorIndex] ? (archFloors[currentFloorIndex].walls?.length || 0) : 0;

    // 🌟 EXTRACT CORNERS FOR OSNAP (CURRENT FLOOR ONLY)
    const snapPoints = React.useMemo(() => {
        let pts = [];
        const activeFloor = archFloors[currentFloorIndex];
        if (activeFloor && activeFloor.walls) {
            activeFloor.walls.forEach(wall => {
                if (wall.points && wall.points.p1) pts.push(wall.points.p1);
                if (wall.points && wall.points.p2) pts.push(wall.points.p2);
            });
        }
        return pts;
    }, [archFloors, currentFloorIndex]);

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
                        if (dist > 0 && dist <= SNAP_TOLERANCE) { v2.x = v1.x; v2.y = v1.y; }
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
                    await saveProjectData(urn, { ...data, structuralFloors: activeStructure });
                }
                setStructuralFloors(activeStructure);
                if (data.scaleFactor) setScaleFactor(data.scaleFactor);
                if (data.drawnAreas) {
                    setDrawnAreas(data.drawnAreas);
                }
                setTimeout(() => setIsProcessing(false), 500);
            } else {
                setLoadingText("❌ Failed to load data.");
            }
        };
        bootStructuralEngine();
    }, [urn]);

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

    useEffect(() => {
        if (viewerReady && viewerRef.current && viewerRef.current.updateSettings) {
            viewerRef.current.updateSettings({
                activeTool: activeTool,
                areaMode: areaMode,
                drawnAreas: activeFloorAreas,
                editingAreaId: editingAreaId,
                zoneType: zoneType,
                snapPoints: snapPoints,
                orthoEnabled: orthoEnabled,
                osnapEnabled: osnapEnabled
            });
        }
    }, [activeTool, areaMode, zoneType, snapPoints, orthoEnabled, osnapEnabled, viewerReady, drawnAreas, editingAreaId, currentFloorIndex]);

    // 🌟 CATCH COMPLETED AREAS (Tagged to current floor)
    useEffect(() => {
        const handleArea = (e) => {
            setDrawnAreas(prevAreas => {
                // Get ONLY the current floor's walls for collision testing
                const currentFloorWalls = archFloors[currentFloorIndex]?.walls || [];

                const newAreaDetails = calculateAreaDetails(
                    e.detail.points || e.detail,
                    e.detail.zoneType || zoneType,
                    scaleFactor,
                    currentFloorWalls
                );

                if (newAreaDetails) {
                    // Filter prevAreas to accurately count rooms ON THIS FLOOR
                    const roomsOnThisFloor = prevAreas.filter(a => a.floorIndex === currentFloorIndex).length;
                    newAreaDetails.name = `Room ${roomsOnThisFloor + 1}`;
                    newAreaDetails.floorIndex = currentFloorIndex; // 🌟 Assign the Area to the Floor
                    return [...prevAreas, newAreaDetails];
                }
                return prevAreas;
            });
            setActiveTool('NONE');
        };
        // 🌟 NEW: Listen for edits and recalculate the math!
        const handleAreaEdit = (e) => {
            const { id, points } = e.detail;
            setDrawnAreas(prevAreas => prevAreas.map(area => {
                if (area.id === id) {
                    const currentFloorWalls = archFloors[currentFloorIndex]?.walls || [];
                    const updatedArea = calculateAreaDetails(points, area.zoneType, scaleFactor, currentFloorWalls);
                    if (updatedArea) {
                        // Preserve the original ID, Name, and Floor
                        updatedArea.id = area.id;
                        updatedArea.name = area.name;
                        updatedArea.floorIndex = area.floorIndex;
                        return updatedArea;
                    }
                }
                return area;
            }));
        };

        window.addEventListener('AREA_COMPLETED', handleArea);
        window.addEventListener('AREA_UPDATED', handleAreaEdit); // 🌟 Add listener

        return () => {
            window.removeEventListener('AREA_COMPLETED', handleArea);
            window.removeEventListener('AREA_UPDATED', handleAreaEdit); // 🌟 Clean up
        };
    }, [zoneType, scaleFactor, archFloors, currentFloorIndex]);

    // 🌟 PASTE THIS MISSING FUNCTION HERE:
    const handleDeleteArea = (idToRemove) => {
        setDrawnAreas(prev => prev.filter(area => area.id !== idToRemove));
    };

    // 🌟 MANUAL SAVE LOGIC
    const handleManualSave = async () => {
        setIsSaving(true);
        try {
            const currentData = await loadProjectData(urn);
            if (currentData) {
                const updatedData = { ...currentData, drawnAreas: drawnAreas };
                await saveProjectData(urn, updatedData);
            }
        } catch (error) {
            console.error("Manual save failed:", error);
            alert("⚠️ Warning: Could not save progress manually. Check your connection.");
        }
        setIsSaving(false);
    };

    // 🌟 PROGRESS LOGIC
    const handleNextStep = async () => {
        // 1. Lock the UI and show "Saving..."
        setIsSaving(true);

        try {
            // 2. Fetch the latest project data
            const currentData = await loadProjectData(urn);
            if (currentData) {
                // 3. Attach our newly drawn rooms to the database file
                const updatedData = {
                    ...currentData,
                    drawnAreas: drawnAreas
                };
                // 4. Push it back to the Cloud
                await saveProjectData(urn, updatedData);
            }
        } catch (error) {
            console.error("Cloud sync failed:", error);
            alert("⚠️ Warning: Could not save progress to the cloud. Check your connection.");
        }

        // 5. Unlock the UI
        setIsSaving(false);

        if (unlockedFromStructural) {
            setUnlockedFromStructural(false); // Clear the memory
            setAppStage('STRUCTURAL');        // Jump back to Structural
            setActiveTool('COLUMN');          // Turn column tool back on
            return; // Stop the function here
        }

        const isLastFloor = currentFloorIndex === archFloors.length - 1;

        if (!isLastFloor) {
            setCurrentFloorIndex(prev => prev + 1);
            setAreaMode('DRAW');
            setActiveTool('NONE');
            const switcher = document.getElementById('floor-switcher');
            if (switcher) switcher.scrollLeft += 100;
        } else {
            alert("✅ All floors traced and saved! Unlocking Column Placement");
            setAppStage('STRUCTURAL');
            setActiveTool('COLUMN');
            setCurrentFloorIndex(0);
            const switcher = document.getElementById('floor-switcher');
            if (switcher) switcher.scrollLeft = 0;
        }
    };



    const handleEditAreaClick = (idToEdit) => {

        // 🌟 1. Save a pure backup of everything before we start editing!
        setBackupAreas(JSON.parse(JSON.stringify(drawnAreas)));

        // 🌟 2. Set the ID we clicked
        setEditingAreaId(idToEdit);
        // 1. Turn on the tool if it is currently off
        if (activeTool !== 'AREA') {
            setActiveTool('AREA');
        }
        // 2. Switch the tool into EDIT mode to reveal the yellow spheres
        setAreaMode('EDIT');
    };



    const handleRenameArea = (idToRename, newName) => {
        setDrawnAreas(prev => prev.map(area =>
            area.id === idToRename ? { ...area, name: newName } : area
        ));
    };

    // 🌟 DRAW CURRENT FLOOR ONLY
    useEffect(() => {
        if (viewerReady && viewerRef.current) {
            viewerRef.current.clearWalls?.();
            viewerRef.current.clearAreas?.();

            // Draw blueprint walls for CURRENT FLOOR
            if (showWalls && archFloors[currentFloorIndex]) {
                (archFloors[currentFloorIndex].walls || []).forEach(wall => {
                    viewerRef.current.drawSolidWall(wall, null, true, true);
                });
            }

            // Draw colored floor zones for CURRENT FLOOR
            drawnAreas
                .filter(area => area.floorIndex === currentFloorIndex)
                .forEach(area => {
                    viewerRef.current.drawSolidArea?.(area);
                });
        }
    }, [archFloors, drawnAreas, viewerReady, scaleFactor, forceRedraw, showWalls, currentFloorIndex]);

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

    // Filter sidebar data so you only see estimations for the active floor
    const activeFloorAreas = drawnAreas.filter(area => area.floorIndex === currentFloorIndex);

    return (
        <div className="flex h-screen bg-slate-900 font-sans overflow-hidden relative">

            {/* --- LEFT SIDEBAR --- */}
            <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col z-10 shadow-2xl relative">
                <div className="p-6 border-b border-slate-700 bg-slate-900/50">
                    <h2 className="text-white text-lg font-black tracking-wider uppercase mb-1">Stage 2</h2>
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Structural Design</p>
                </div>





                <div className="p-6 flex-1 overflow-y-auto">

                    {/* 🌟 NEW: FLOOR SWITCHER UI */}
                    {archFloors.length > 1 && (
                        <div className="mb-6">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">Select Floor:</p>
                            <div id="floor-switcher" className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-600">
                                {archFloors.map((floor, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentFloorIndex(idx)}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg border whitespace-nowrap transition-all ${currentFloorIndex === idx
                                            ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        {floor.name || `Floor ${idx + 1}`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* <div className="bg-slate-900/50 rounded-xl p-3 mb-6 flex justify-between items-center border border-slate-700 shadow-inner">
                        <span className="text-slate-400 text-xs font-bold tracking-widest uppercase">Active Floor Walls</span>
                        <span className="bg-blue-500 text-white text-xs font-black px-3 py-1 rounded-md">{totalWallsLoaded}</span>
                    </div> */}

                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Structural Tools</h3>

                    {/* 🌟 1. AREA DRAWING TOOL (Handles Locked / Edit / Draw states) */}
                    {appStage === 'STRUCTURAL' ? (
                        <div className="flex gap-2 mb-4 animate-fade-in">
                            <button disabled className="flex-1 py-3 px-4 rounded-xl text-sm font-bold shadow-md bg-slate-800/80 text-slate-500 border border-slate-700 flex items-center gap-3 cursor-not-allowed">
                                <span>🔒</span> Area Tracing Locked
                            </button>
                            <button
                                onClick={() => {
                                    setAppStage('ARCHITECTURE');
                                    setActiveTool('NONE');
                                    setUnlockedFromStructural(true); // 🌟 Remembers we travelled back!
                                }}
                                title="Unlock and Edit Areas"
                                className="py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white border border-slate-500 transition-colors shadow-md flex items-center justify-center"
                            >
                                🔓
                            </button>
                        </div>
                    ) : areaMode === 'EDIT' ? (
                        <div className="flex gap-2 mb-2 animate-fade-in-down">
                            <button
                                onClick={() => {
                                    setAreaMode('DRAW');
                                    setEditingAreaId(null);
                                    setActiveTool('NONE');
                                }}
                                className="flex-1 py-3 px-2 rounded-xl text-xs font-bold shadow-md transition-all bg-green-600 hover:bg-green-500 text-white border-2 border-green-400 flex justify-center items-center gap-2"
                            >
                                <span>✅</span> Done
                            </button>
                            <button
                                onClick={() => {
                                    setDrawnAreas(backupAreas); // 🌟 RESTORE THE BACKUP!
                                    setAreaMode('DRAW');
                                    setEditingAreaId(null);
                                    setActiveTool('NONE');
                                }}
                                className="flex-1 py-3 px-2 rounded-xl text-xs font-bold shadow-md transition-all bg-red-600 hover:bg-red-500 text-white border-2 border-red-400 flex justify-center items-center gap-2"
                            >
                                <span>❌</span> Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                setActiveTool(activeTool === 'AREA' ? 'NONE' : 'AREA');
                                setAreaMode('DRAW');
                            }}
                            className={`w-full py-3 px-4 rounded-xl text-sm font-bold shadow-md transition-colors mb-2 flex items-center justify-between ${activeTool === 'AREA'
                                ? "bg-green-600 hover:bg-green-500 text-white border-2 border-green-400"
                                : "bg-slate-700 hover:bg-slate-600 text-white border-2 border-transparent"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span>🟩</span> Draw Room Area
                            </div>
                            {activeTool === 'AREA' && <span className="text-xs">ON</span>}
                        </button>
                    )}

                    {/* Options Panel (Only show when actively Drawing & Not Locked) */}
                    {activeTool === 'AREA' && areaMode === 'DRAW' && appStage === 'ARCHITECTURE' && (
                        <div className="bg-slate-900/60 rounded-xl p-4 mb-4 border border-slate-700 animate-fade-in-down shadow-inner">
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

                    {/* 🌟 2. COLUMN PLACEMENT TOOL */}
                    {appStage === 'STRUCTURAL' ? (
                        <button onClick={() => setActiveTool(activeTool === 'COLUMN' ? 'NONE' : 'COLUMN')} className={`w-full py-3 px-4 rounded-xl text-sm font-bold shadow-md transition-colors mb-2 flex items-center justify-between animate-fade-in ${activeTool === 'COLUMN' ? "bg-purple-600 hover:bg-purple-500 text-white border-2 border-purple-400" : "bg-slate-700 hover:bg-slate-600 text-white border-2 border-transparent"}`}>
                            <div className="flex items-center gap-3"><span>🏛️</span> Place Columns</div>
                            {activeTool === 'COLUMN' && <span className="text-xs">ON</span>}
                        </button>
                    ) : (
                        <button disabled className="w-full py-3 px-4 bg-slate-800/40 rounded-xl text-slate-600 border border-slate-700/50 text-sm font-bold mb-2 flex items-center gap-3 cursor-not-allowed">
                            <span className="opacity-40">🏛️</span> Add Column (Locked)
                        </button>
                    )}
                    {/* 🌟 3. FOUNDATION TOOL */}
                    <button disabled className="w-full py-3 px-4 bg-slate-800/40 rounded-xl text-slate-600 border border-slate-700/50 text-sm font-bold flex items-center gap-3 cursor-not-allowed">
                        <span className="opacity-40">🏗️</span> Draw Foundation (Locked)
                    </button>
                </div>

                {/* --- SLEEK PRO PROGRESS SECTION --- */}
                <div className="px-5 pb-5 mt-auto">
                    {appStage === 'ARCHITECTURE' ? (
                        <div className="p-5 rounded-xl bg-[#1e293b]/80 border border-[#334155] shadow-lg backdrop-blur-md">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                                    <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Floor Tracing</span>
                                </div>
                                <span className="text-xs font-mono text-slate-400">{currentFloorIndex + 1} / {archFloors.length}</span>
                            </div>

                            <button
                                onClick={handleNextStep}
                                disabled={isSaving}
                                className={`w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isSaving
                                        ? "bg-slate-700 text-slate-400 cursor-wait"
                                        : unlockedFromStructural || currentFloorIndex === archFloors.length - 1
                                            ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.3)]"
                                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                                    }`}
                            >
                                {isSaving ? (
                                    <><span>⏳</span> Saving Data...</>
                                ) : unlockedFromStructural ? (
                                    <><span>✅</span> Save Edits & Return</>
                                ) : currentFloorIndex === archFloors.length - 1 ? (
                                    <><span>🏗️</span> Finish & Proceed</>
                                ) : (
                                    <><span>📂</span> Load Next Floor</>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="p-5 rounded-xl bg-[#2e1065]/60 border border-[#7e22ce]/50 shadow-lg backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                                <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Stage 3: Structural</span>
                            </div>

                            <button
                                onClick={() => alert("Columns Finished! Moving to Foundation...")}
                                className="w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]"
                            >
                                <span>✅</span> Complete Columns
                            </button>
                        </div>
                    )}
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
                        className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-colors ${showWalls
                            ? "bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/40"
                            : "bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700"
                            }`}
                    >
                        {showWalls ? '👀 Hide Walls' : '👁️ Show Walls'}
                    </button>
                </div>
            </div>

            {/* --- 3D VIEWER --- */}
            {/* --- 3D VIEWER --- */}
            <div className="flex-1 relative bg-black">
                {/* 🌟 MOVED TO LEFT-6 AND ADDED SAVE BUTTON */}
                <div className="absolute top-5 left-6 z-[100] flex gap-3 animate-fade-in-down">
                    <HomeButton showWarning={false} />

                    <button
                        onClick={handleManualSave}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all border backdrop-blur-sm ${isSaving
                                ? 'bg-slate-700/80 text-slate-400 border-slate-600 cursor-wait'
                                : 'bg-slate-800/90 hover:bg-slate-700 text-blue-400 border-slate-600 hover:border-blue-400 hover:text-white'
                            }`}
                    >
                        {isSaving ? '⏳ Saving...' : '💾'}
                    </button>
                </div>

                <StructuralApsViewer ref={viewerRef} urn={decodeURIComponent(urn)} scaleFactor={scaleFactor} isViewLocked={false} />
            </div>

            {/* 🌟 DYNAMIC RIGHT SIDEBAR: Switches based on the current Stage/Tool */}
            {appStage === 'ARCHITECTURE' ? (
                <AreaDetailsSidebar
                    savedAreas={activeFloorAreas}
                    onDeleteArea={handleDeleteArea}
                    onRenameArea={handleRenameArea}
                    onEditArea={handleEditAreaClick}
                />
            ) : activeTool === 'COLUMN' ? (
                <ColumnDetailsSidebar
                    // We will pass actual column data here in the next step!
                    columns={[]}
                />
            ) : (
                <div className="w-[340px] bg-[#1e1e1e] border-l border-[#333] flex flex-col items-center justify-center">
                    <p className="text-slate-500 text-sm">Select a tool to view details</p>
                </div>
            )}

        </div>
    );
};

export default StructuralEditor;