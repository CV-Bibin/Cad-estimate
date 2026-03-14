import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApsViewer from './ApsViewer';
import Sidebar from './components/Sidebar';
import EditorToolbar from './components/EditorToolbar';
import ViewerStatusBar from './components/ViewerStatusBar';
import HomeButton from './components/HomeButton';

// 🌟 NEW: Firebase Realtime Database Imports
import { saveProjectData, loadProjectData } from './cloudSync';

// --- 1. IMPORT TOOLS & MODAL ---
import { CalibrationTool } from './tools/CalibrationTool';
import CalibrationModal from './components/CalibrationModal';
import PickLineModal from './components/PickLineModal';
import OpeningModal from './components/OpeningModal';

const Editor = () => {
    const { urn } = useParams();
    const navigate = useNavigate();
    const viewerRef = useRef();
    const [pickData, setPickData] = useState(null);

    // 🌟 NEW: THE FLOOR MANAGEMENT SYSTEM (Replaces standalone 'walls')
    const [floors, setFloors] = useState([
        { id: 'floor-1', name: 'Ground Floor', elevation: 0, walls: [] }
    ]);
    const [activeFloorIdState, _setActiveFloorIdState] = useState('floor-1');
    const activeFloorIdRef = useRef('floor-1');
    const currentElevationRef = useRef(0);

    const setActiveFloorId = (id) => {
        activeFloorIdRef.current = id;
        _setActiveFloorIdState(id);
        const floor = floors.find(f => f.id === id);
        if (floor) currentElevationRef.current = floor.elevation;
    };

    // 🌟 THIS BRIDGE KEEPS ALL YOUR OLD CODE WORKING PERFECTLY
    const activeFloor = floors.find(f => f.id === activeFloorIdState) || floors[0];
    const walls = activeFloor.walls;

    // STATE
    const [scaleFactor, setScaleFactor] = useState(1);
    const [activeTool, setActiveTool] = useState('NONE');
    const [wallMode, setWallMode] = useState('MANUAL');
    const [ortho, setOrtho] = useState(false);
    const [isSnapping, setIsSnapping] = useState(true);
    const [justification, setJustification] = useState('CENTER');
    const [isViewLocked, setIsViewLocked] = useState(false);
    const [openingMode, setOpeningMode] = useState('DOOR');
    const [pendingOpening, setPendingOpening] = useState(null);
    const [warningMsg, setWarningMsg] = useState(null);

    // CALIBRATION STATE
    const [isCalibrated, setIsCalibrated] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tempMeasuredValue, setTempMeasuredValue] = useState(0);
    const [isFloorConfirmOpen, setIsFloorConfirmOpen] = useState(false);
    const [viewerReady, setViewerReady] = useState(false);
    const [forceRedraw, setForceRedraw] = useState(0);

    // UNDO / REDO STATE (Now saves the whole building!)
    const [history, setHistory] = useState([]);
    const [future, setFuture] = useState([]);

    // DEFAULTS
    const [thickness, setThickness] = useState(0.23);
    const [defaultHeight, setDefaultHeight] = useState(3.0);

    const [hoveredWallId, setHoveredWallId] = useState(null);
    const [hoveredOpeningId, setHoveredOpeningId] = useState(null);

    // 🌟 NEW: MASTER WALL UPDATER (Makes sure walls go to the right floor!)
    const updateActiveFloorWalls = useCallback((updater) => {
        setFloors(prevFloors => {
            setHistory(h => [...h, prevFloors]);
            setFuture([]);
            return prevFloors.map(floor => {
                if (floor.id === activeFloorIdRef.current) {
                    const newWalls = typeof updater === 'function' ? updater(floor.walls) : updater;
                    return { ...floor, walls: newWalls };
                }
                return floor;
            });
        });
    }, []);

    // UNDO / REDO FUNCTIONS (Updated to restore floors)
    const handleUndo = useCallback(() => {
        if (history.length === 0) return;
        const previousFloors = history[history.length - 1];
        setFuture(prev => [floors, ...prev]);
        setHistory(prev => prev.slice(0, -1));
        setFloors(previousFloors);
    }, [history, floors]);

    const handleRedo = useCallback(() => {
        if (future.length === 0) return;
        const nextFloors = future[0];
        setHistory(prev => [...prev, floors]);
        setFuture(prev => prev.slice(1));
        setFloors(nextFloors);
    }, [future, floors]);


    // 🌟 NEW: SAVE TO FIREBASE FUNCTION
    // 🌟 UPDATED: SAVE USING THE REUSABLE COMPONENT
    const saveProjectToFirebase = async () => {
        showWarning("⏳ Saving project to cloud...");

        // Bundle up whatever you want to save from this screen
        const dataToSave = {
            floors: floors,
            scaleFactor: scaleFactor,
            isCalibrated: isCalibrated
        };

        // Send it to your reusable function!
        const success = await saveProjectData(urn, dataToSave);

        if (success) {
            showWarning("💾 Project saved successfully!");
        } else {
            showWarning("❌ Failed to save project.");
        }
    };


    // 🌟 UPDATED: LOAD USING THE REUSABLE COMPONENT (WITH FIREBASE CRASH PROTECTION)
    useEffect(() => {
        const fetchCloudData = async () => {
            const data = await loadProjectData(urn);

            if (data) {
                if (data.floors && data.floors.length > 0) {
                    // 🌟 THE FIX: Firebase deletes empty arrays! We must put them back so React doesn't crash.
                    const safeFloors = data.floors.map(floor => ({
                        ...floor,
                        // If walls is missing, force it to be an empty array []
                        walls: (floor.walls || []).map(wall => ({
                            ...wall,
                            // If openings are missing, force it to be an empty array []
                            openings: wall.openings || []
                        }))
                    }));

                    setFloors(safeFloors);
                    setActiveFloorId(safeFloors[0].id); 
                }
                
                if (data.scaleFactor) setScaleFactor(data.scaleFactor);
                if (data.isCalibrated !== undefined) setIsCalibrated(data.isCalibrated);

                showWarning("☁️ Previous work loaded from cloud!");
            }
        };

        fetchCloudData();
    // eslint-disable-next-line
    }, [urn]);

  // 🌟 WAIT FOR AUTODESK VIEWER TO 100% FINISH & DOUBLE-PULSE
    useEffect(() => {
        const checkInterval = setInterval(() => {
            if (viewerRef.current && viewerRef.current.viewer && viewerRef.current.viewer.model) {
                
                // Pulse 1: Tell React the viewer is generally ready
                setTimeout(() => {
                    setViewerReady(true);
                    
                    // 🌟 Pulse 2: Wait 2 seconds for Autodesk's zoom animation to finish, then force a redraw!
                    setTimeout(() => {
                        setForceRedraw(prev => prev + 1);
                    }, 2000);

                }, 2000); 
                
                clearInterval(checkInterval);
            }
        }, 500);
        return () => clearInterval(checkInterval);
    }, []);


    // Pro Warning Trigger
    const showWarning = (message) => {
        setWarningMsg(message);
        setTimeout(() => setWarningMsg(null), 5000);
    };

    useEffect(() => {
        const handlePickRequest = (e) => {
            setPickData(e.detail);
        };
        window.addEventListener('PICK_LINE_REQUESTED', handlePickRequest);
        return () => window.removeEventListener('PICK_LINE_REQUESTED', handlePickRequest);
    }, []);

    // UNDO / REDO KEYBOARD SHORTCUTS
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) handleRedo();
                else handleUndo();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                handleRedo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    // HANDLE CALIBRATION FINISHED
    const handleCalibrationFinished = (measuredDistance) => {
        setTempMeasuredValue(measuredDistance);
        setIsModalOpen(true);
        setActiveTool('NONE');
    };

    const handleConfirmPickWall = () => {
        if (!pickData) return;
        const z = currentElevationRef.current; // Inject Z elevation
        const newWall = {
            id: Date.now() + Math.random(),
            length: pickData.length,
            thickness: thickness,
            justification: justification,
            height: defaultHeight,
            points: { p1: { ...pickData.p1, z }, p2: { ...pickData.p2, z } }
        };
        updateActiveFloorWalls(prev => [...prev, newWall]);
        setPickData(null);
    };

    // CONFIRM CALIBRATION (Updates all floors)
    const applyScaleToWalls = (newScale) => {
        setFloors(prevFloors => {
            setHistory(h => [...h, prevFloors]);
            setFuture([]);
            return prevFloors.map(floor => {
                const scaledWalls = floor.walls.map(wall => {
                    const dx = wall.points.p2.x - wall.points.p1.x;
                    const dy = wall.points.p2.y - wall.points.p1.y;
                    const rawDistance = Math.sqrt(dx * dx + dy * dy);
                    return { ...wall, length: rawDistance * newScale };
                });
                return { ...floor, walls: scaledWalls };
            });
        });
    };

    const handleConfirmCalibration = (realMeters) => {
        const newScale = realMeters / tempMeasuredValue;
        setScaleFactor(newScale);
        applyScaleToWalls(newScale);
        setIsCalibrated(true);
        setIsModalOpen(false);
    };

    const handleUnlockScale = () => {
        if (window.confirm("Unlock Scale? Walls will revert to uncalibrated size.")) {
            setScaleFactor(1);
            applyScaleToWalls(1);
            setIsCalibrated(false);
        }
    };

    
   // TOOL REGISTRATION
    // 🌟 ULTIMATE BULLETPROOF TOOL REGISTRATION
    useEffect(() => {
        // 1. Wait for our 2-second settle timer
        if (!viewerReady || !viewerRef.current || !viewerRef.current.viewer) return;
        
        const viewer = viewerRef.current.viewer;

        // 2. THE ULTIMATE FAILSAFE: 
        // Check that toolController exists AND that registerTool is actually a loaded function
        if (!viewer.toolController || typeof viewer.toolController.registerTool !== 'function') {
            console.warn("⚠️ Autodesk is still building the Tool Controller. Waiting...");
            return; 
        }
        
        try {
            if (activeTool === 'CALIBRATION') {
                if (!viewer.toolController.getTool('calibration-tool')) {
                    const calibTool = new CalibrationTool(viewer, handleCalibrationFinished);
                    // We know for a fact this is safe to call now
                    viewer.toolController.registerTool(calibTool);
                }
                viewer.toolController.activateTool('calibration-tool');
                console.log("🟢 Calibration Tool Active");
            } else {
                const tool = viewer.toolController.getTool('calibration-tool');
                if (tool && tool.active) {
                    viewer.toolController.deactivateTool('calibration-tool');
                }
            }
        } catch (error) {
            console.warn("⚠️ Tool registration skipped to prevent crash:", error);
        }
        
    }, [activeTool, viewerReady]);

    // CATCH OPENING REQUESTS AND OPEN MODAL
    useEffect(() => {
        const handleOpeningRequest = (event) => {
            setPendingOpening(event.detail);
        };
        window.addEventListener('OPENING_REQUESTED', handleOpeningRequest);
        return () => window.removeEventListener('OPENING_REQUESTED', handleOpeningRequest);
    }, []);

    // SAVE THE EXACT DIMENSIONS TO THE WALL DATA
    const handleConfirmOpening = (data) => {

        // PRO CAUTION ALERTS BEFORE SAVING
        if (data.isStandalone) {
            if (data.finalHeight > defaultHeight) {
                showWarning(`Opening height (${data.finalHeight}m) exceeds default wall height (${defaultHeight}m).`);
            }
        } else if (data.wallId) {
            const targetWall = walls.find(w => w.id === data.wallId);
            if (targetWall) {
                if (data.finalWidth > targetWall.length) {
                    showWarning(`Opening width (${data.finalWidth}m) exceeds wall length (${targetWall.length.toFixed(2)}m).`);
                }
                if (data.finalHeight > targetWall.height) {
                    showWarning(`Opening height (${data.finalHeight}m) exceeds wall height (${targetWall.height.toFixed(2)}m).`);
                }
                if ((data.finalThickness || thickness) > targetWall.thickness) {
                    showWarning(`Opening depth (${data.finalThickness || thickness}m) exceeds wall thickness (${targetWall.thickness.toFixed(2)}m).`);
                }
            }
        }

        updateActiveFloorWalls(prev => {
            if (!data.wallId) {
                const z = currentElevationRef.current; // Inject Z elevation
                const newWall = {
                    id: Date.now() + Math.random(),
                    length: data.finalWidth,
                    thickness: data.finalThickness || thickness,
                    justification: data.justification || 'CENTER',
                    height: defaultHeight,
                    points: { p1: { ...data.p1, z }, p2: { ...data.p2, z } },
                    openings: [{
                        id: Date.now() + Math.random() + 1,
                        type: data.type,
                        width: data.finalWidth,
                        height: data.finalHeight,
                        thickness: data.finalThickness || thickness,
                        sillHeight: 2.1,
                        centerDist: data.finalWidth / 2
                    }]
                };
                return [...prev, newWall];

            } else {
                return prev.map(w => {
                    if (w.id === data.wallId) {
                        const newOpening = {
                            id: Date.now() + Math.random(),
                            type: data.type,
                            width: data.finalWidth,
                            height: data.finalHeight,
                            thickness: data.finalThickness || w.thickness,
                            sillHeight: 2.1,
                            centerDist: data.centerDist !== undefined ? (data.centerDist * scaleFactor) : (data.finalWidth / 2)
                        };
                        return { ...w, openings: [...(w.openings || []), newOpening] };
                    }
                    return w;
                });
            }
        });
        setPendingOpening(null);
    };

    useEffect(() => {
        if (activeTool !== 'WALL') {
            setPickData(null);
        }
    }, [activeTool]);

    // WALL CREATION, UPDATE & DELETE WITH HISTORY SAVING
    useEffect(() => {
        const handleCreate = (event) => {
            const { p1, p2, length, thickness, justification } = event.detail;
            const z = currentElevationRef.current; // Inject Z elevation
            const newWall = {
                id: Date.now() + Math.random(),
                length: length * scaleFactor,
                thickness: thickness,
                justification: justification,
                height: defaultHeight,
                points: { p1: { ...p1, z }, p2: { ...p2, z } }
            };
            updateActiveFloorWalls(prev => [...prev, newWall]);
        };

        const handleUpdate = (event) => {
            const { id, pointType, newPos } = event.detail;
            const z = currentElevationRef.current; // Inject Z elevation
            updateActiveFloorWalls(prev => prev.map(w => {
                if (w.id === id) {
                    const updatedPoints = { ...w.points, [pointType]: { ...newPos, z } };
                    const dx = updatedPoints.p2.x - updatedPoints.p1.x;
                    const dy = updatedPoints.p2.y - updatedPoints.p1.y;
                    const newLen = Math.sqrt(dx * dx + dy * dy);
                    return { ...w, points: updatedPoints, length: newLen * scaleFactor };
                }
                return w;
            }));
        };

        const handleDelete = (event) => {
            updateActiveFloorWalls(prev => prev.filter(w => w.id !== event.detail.id));
        };

        window.addEventListener('SEMANTIC_WALL_CREATED', handleCreate);
        window.addEventListener('SEMANTIC_WALL_UPDATED', handleUpdate);
        window.addEventListener('SEMANTIC_WALL_DELETED', handleDelete);

        return () => {
            window.removeEventListener('SEMANTIC_WALL_CREATED', handleCreate);
            window.removeEventListener('SEMANTIC_WALL_UPDATED', handleUpdate);
            window.removeEventListener('SEMANTIC_WALL_DELETED', handleDelete);
        };
    }, [scaleFactor, defaultHeight, updateActiveFloorWalls]);

   // 🌟 VIEWER RENDERING (Now listens for the double-pulse!)
    useEffect(() => {
        // Only draw if the viewer is fully awake!
        if (viewerReady && viewerRef.current) {
            viewerRef.current.clearWalls();
            floors.forEach(floor => {
                const isActiveFloor = floor.id === activeFloorIdState;

                floor.walls.forEach(wall => {
                    viewerRef.current.drawSolidWall(wall, hoveredOpeningId, isActiveFloor);
                });
            });
        }
    // 👇 Notice we added viewerReady, scaleFactor, and forceRedraw here!
    }, [floors, hoveredOpeningId, activeFloorIdState, viewerReady, scaleFactor, forceRedraw]);

    // SETTINGS PASS-DOWN
    useEffect(() => {
        if (viewerRef.current) {
            viewerRef.current.updateSettings({
                isActive: activeTool !== 'NONE',
                mode: activeTool === 'WALL' ? 'DRAW' : activeTool,
                wallMode,
                thickness, justification, isOrtho: ortho, isSnapping,
                walls: walls, // 🌟 Snap targets are strictly the active floor!
                scaleFactor,
                hoveredListWallId: hoveredWallId,
                openingMode
            });
        }
    }, [activeTool, wallMode, thickness, justification, ortho, isSnapping, walls, scaleFactor, hoveredWallId, openingMode]);

    const toggleJustification = () => {
        if (justification === 'CENTER') setJustification('LEFT');
        else if (justification === 'LEFT') setJustification('RIGHT');
        else setJustification('CENTER');
    };

    // SIDEBAR UPDATES (Now routed through the Master Updater)
    const updateHeight = (id, val) => updateActiveFloorWalls(prev => prev.map(w => w.id === id ? { ...w, height: parseFloat(val) || 0 } : w));
    const updateWallThickness = (id, val) => updateActiveFloorWalls(prev => prev.map(w => w.id === id ? { ...w, thickness: parseFloat(val) || 0 } : w));
    const deleteWall = (id) => updateActiveFloorWalls(prev => prev.filter(w => w.id !== id));

    const deleteOpening = (wallId, openingId) => updateActiveFloorWalls(prev => prev.map(w => {
        if (w.id === wallId) return { ...w, openings: w.openings.filter(op => op.id !== openingId) };
        return w;
    }));

    const updateOpeningParams = (wallId, openingId, field, value) => {
        const numValue = parseFloat(value) || 0;
        const targetWall = walls.find(w => w.id === wallId);

        if (targetWall) {
            if (field === 'width' && numValue > targetWall.length) showWarning(`New width (${numValue}m) exceeds wall length (${targetWall.length.toFixed(2)}m).`);
            if (field === 'height' && numValue > targetWall.height) showWarning(`New height (${numValue}m) exceeds wall height (${targetWall.height.toFixed(2)}m).`);
            if (field === 'thickness' && numValue > targetWall.thickness) showWarning(`New depth (${numValue}m) exceeds wall thickness (${targetWall.thickness.toFixed(2)}m).`);
        }

        updateActiveFloorWalls(prev => prev.map(w => {
            if (w.id === wallId) {
                const updatedOpenings = w.openings.map(op => op.id === openingId ? { ...op, [field]: numValue } : op);
                return { ...w, openings: updatedOpenings };
            }
            return w;
        }));
    };

    // 🌟 HANDLE FLOOR ADDING
    // 🌟 HANDLE FLOOR ADDING (Opens the beautiful modal)
    const handleAddFloor = () => {
        if (walls.length === 0) {
            showWarning("⚠️ CAUTION: You must draw walls on the current floor before adding a new level.");
            return;
        }
        setIsFloorConfirmOpen(true); // Open the custom modal instead of window.confirm!
    };

    // 🌟 THE ACTUAL FUNCTION THAT RUNS WHEN THEY CLICK "YES" IN THE MODAL
    const executeAddFloor = () => {
        const nextFloorNum = floors.length + 1;

        // Mathematically stack the new floor on top (using a standard 12cm residential slab)
        const maxWallHeight = Math.max(...walls.map(w => w.height || 0));
        const newElevation = activeFloor.elevation + maxWallHeight + 0.12;

        const newFloor = {
            id: `floor-${Date.now()}`,
            name: `Floor ${nextFloorNum}`,
            elevation: newElevation,
            walls: []
        };

        setHistory(h => [...h, floors]);
        setFuture([]);
        setFloors(prev => [...prev, newFloor]);
        setActiveFloorId(newFloor.id);
        setIsFloorConfirmOpen(false); // Close the modal
        showWarning(`🏢 Successfully created and switched to ${newFloor.name}`);
    };
 // 🌟 HANDLE SKIPPING TO STAGE 2 (WITH AUTO-SAVE)
    const handleNextStep = async () => {
        if (floors[0].walls.length === 0) {
            showWarning("⚠️ CAUTION: You haven't drawn any walls to estimate yet!");
            return;
        }

        showWarning("⏳ Auto-saving draft before continuing...");

        // 1. Bundle up your current walls
        const dataToSave = {
            floors: floors,
            scaleFactor: scaleFactor,
            isCalibrated: isCalibrated
        };

        // 2. Force a cloud save BEFORE we jump to the next page
        const success = await saveProjectData(urn, dataToSave);

        if (success) {
            // 3. Now that Firebase definitely has the walls, jump to Stage 2!
            navigate(`/structure/${encodeURIComponent(urn)}`);
        } else {
            showWarning("❌ Error saving to cloud. Cannot proceed.");
        }
    };

    return (
        <div className="flex h-screen bg-slate-900 font-sans overflow-hidden relative">

            {warningMsg && (
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[200] bg-slate-900/90 border border-yellow-500/50 backdrop-blur-md px-6 py-3 rounded-2xl shadow-[0_10px_40px_rgba(234,179,8,0.15)] flex items-center gap-4 animate-bounce">
                    <div className="bg-yellow-500/20 p-1.5 rounded-lg">
                        <span className="text-yellow-500 text-lg leading-none block">⚠️</span>
                    </div>
                    <span className="text-slate-200 text-xs font-bold uppercase tracking-widest">{warningMsg}</span>
                    <button onClick={() => setWarningMsg(null)} className="ml-2 text-slate-500 hover:text-red-400 transition-colors">✕</button>
                </div>
            )}

            <CalibrationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={handleConfirmCalibration} measuredValue={tempMeasuredValue} />
            <PickLineModal isOpen={!!pickData} data={pickData} onConfirm={handleConfirmPickWall} onCancel={() => setPickData(null)} defaultThickness={thickness} defaultHeight={defaultHeight} />
            <OpeningModal isOpen={!!pendingOpening} openingData={pendingOpening} scaleFactor={scaleFactor} onConfirm={handleConfirmOpening} onCancel={() => setPendingOpening(null)} />

            <EditorToolbar isCalibrated={isCalibrated} activeTool={activeTool} setActiveTool={setActiveTool} wallMode={wallMode} setWallMode={setWallMode} openingMode={openingMode} setOpeningMode={setOpeningMode} handleUndo={handleUndo} handleRedo={handleRedo} historyLength={history.length} futureLength={future.length} justification={justification} toggleJustification={toggleJustification} ortho={ortho} setOrtho={setOrtho} isSnapping={isSnapping} setIsSnapping={setIsSnapping} />

            <div className="flex-1 relative ml-20 bg-black rounded-l-3xl overflow-hidden border-l border-slate-700">

                <div className="absolute top-5 left-6 z-[100]">
                    <HomeButton showWarning={true} />
                </div>

                <ViewerStatusBar activeTool={activeTool} openingMode={openingMode} isSnapping={isSnapping} ortho={ortho} />
                <ApsViewer ref={viewerRef} urn={decodeURIComponent(urn)} scaleFactor={scaleFactor} isViewLocked={isViewLocked} />
            </div>

            {/* 🌟 NEW: CUSTOM ADD FLOOR MODAL 🌟 */}
            {isFloorConfirmOpen && (
                <div className="absolute inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-[400px] border border-slate-200 overflow-hidden transform transition-all animate-fade-in-up">
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                            <span className="text-2xl">🏢</span>
                            <div>
                                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Add New Floor</h3>
                                <p className="text-[10px] font-bold text-slate-400">Current floor walls will be used as reference.</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-xs text-slate-600 font-medium leading-relaxed mb-6">
                                Are you sure you are ready to move to the next floor? Your current active walls will become faded reference lines to help you draft the next level.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsFloorConfirmOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold uppercase tracking-widest transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeAddFloor}
                                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-widest shadow-md transition-colors"
                                >
                                    Create Floor
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            <Sidebar
                // 🌟 PASSING DOWN THE NEW FLOOR DATA
                floors={floors}
                activeFloorId={activeFloorIdState}
                onSwitchFloor={setActiveFloorId}

                walls={walls}
                deleteWall={deleteWall} updateHeight={updateHeight} updateThickness={updateWallThickness} onHoverWall={setHoveredWallId} globalThickness={thickness} setGlobalThickness={setThickness} globalHeight={defaultHeight} setGlobalHeight={setDefaultHeight} ortho={ortho} setOrtho={setOrtho} isSnapping={isSnapping} setIsSnapping={setIsSnapping} scaleFactor={scaleFactor} setScaleFactor={setScaleFactor} isCalibrated={isCalibrated} onStartCalibration={() => setActiveTool('CALIBRATION')} onUnlockScale={handleUnlockScale} isViewLocked={isViewLocked} setIsViewLocked={setIsViewLocked} deleteOpening={deleteOpening} updateOpeningParams={updateOpeningParams} onHoverOpening={setHoveredOpeningId} onAddFloor={handleAddFloor} onNextStep={handleNextStep} onSaveProject={saveProjectToFirebase}
            />

        </div>
    );
};

export default Editor;