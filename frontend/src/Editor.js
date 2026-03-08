import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApsViewer from './ApsViewer';
import Sidebar from './components/Sidebar';
import EditorToolbar from './components/EditorToolbar';
import ViewerStatusBar from './components/ViewerStatusBar';

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


    // STATE
    const [walls, setWalls] = useState([]);
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

    // --- NEW: CALIBRATION STATE ---
    const [isCalibrated, setIsCalibrated] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tempMeasuredValue, setTempMeasuredValue] = useState(0);

    // --- NEW: UNDO / REDO STATE ---
    const [history, setHistory] = useState([]);
    const [future, setFuture] = useState([]);

    // DEFAULTS
    const [thickness, setThickness] = useState(0.23);
    const [defaultHeight, setDefaultHeight] = useState(3.0);

    const [hoveredWallId, setHoveredWallId] = useState(null);
    const [hoveredOpeningId, setHoveredOpeningId] = useState(null);

    // --- NEW: UNDO / REDO FUNCTIONS ---
    const handleUndo = useCallback(() => {
        if (history.length === 0) return;
        const previousWalls = history[history.length - 1];
        setFuture(prev => [walls, ...prev]);
        setHistory(prev => prev.slice(0, -1));
        setWalls(previousWalls);
    }, [history, walls]);

    const handleRedo = useCallback(() => {
        if (future.length === 0) return;
        const nextWalls = future[0];
        setHistory(prev => [...prev, walls]);
        setFuture(prev => prev.slice(1));
        setWalls(nextWalls);
    }, [future, walls]);

    // 🌟 NEW: Pro Warning Trigger (Auto-hides after 5 seconds)
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

    // --- NEW: UNDO / REDO KEYBOARD SHORTCUTS ---
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

    // --- UPDATED: HANDLE CALIBRATION FINISHED ---
    const handleCalibrationFinished = (measuredDistance) => {
        setTempMeasuredValue(measuredDistance);
        setIsModalOpen(true);
        setActiveTool('NONE');
    };

    const handleConfirmPickWall = () => {
        if (!pickData) return;
        const newWall = {
            id: Date.now() + Math.random(),
            length: pickData.length,
            thickness: thickness,
            justification: justification,
            height: defaultHeight,
            points: { p1: pickData.p1, p2: pickData.p2 }
        };
        setWalls(prev => {
            setHistory(h => [...h, prev]);
            setFuture([]);
            return [...prev, newWall];
        });
        setPickData(null);
    };

    // --- UPDATED: CONFIRM CALIBRATION ---
    const handleConfirmCalibration = (realMeters) => {
        const newScale = realMeters / tempMeasuredValue;
        setScaleFactor(newScale);
        applyScaleToWalls(newScale);
        setIsCalibrated(true);
        setIsModalOpen(false);
    };

    // --- UPDATED: UNLOCK SCALE ---
    const handleUnlockScale = () => {
        if (window.confirm("Unlock Scale? Walls will revert to uncalibrated size.")) {
            setScaleFactor(1);
            applyScaleToWalls(1);
            setIsCalibrated(false);
        }
    };

    // --- TOOL REGISTRATION ---
    useEffect(() => {
        if (!viewerRef.current || !viewerRef.current.viewer) return;
        const viewer = viewerRef.current.viewer;

        if (activeTool === 'CALIBRATION') {
            if (!viewer.toolController.getTool('calibration-tool')) {
                const calibTool = new CalibrationTool(viewer, handleCalibrationFinished);
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
    }, [activeTool]);

    // --- AUTO-UPDATE WALLS WITH HISTORY SAVING ---
    const applyScaleToWalls = (newScale) => {
        setWalls(prevWalls => {
            setHistory(h => [...h, prevWalls]);
            setFuture([]);
            return prevWalls.map(wall => {
                const dx = wall.points.p2.x - wall.points.p1.x;
                const dy = wall.points.p2.y - wall.points.p1.y;
                const rawDistance = Math.sqrt(dx * dx + dy * dy);
                return { ...wall, length: rawDistance * newScale };
            });
        });
    };

    // --- CATCH OPENING REQUESTS AND OPEN MODAL ---
    useEffect(() => {
        const handleOpeningRequest = (event) => {
            setPendingOpening(event.detail); // This triggers the OpeningModal to open!
        };
        window.addEventListener('OPENING_REQUESTED', handleOpeningRequest);
        return () => window.removeEventListener('OPENING_REQUESTED', handleOpeningRequest);
    }, []);


   // --- SAVE THE EXACT DIMENSIONS TO THE WALL DATA ---
    const handleConfirmOpening = (data) => {
        
        // 🌟 PRO CAUTION ALERTS BEFORE SAVING 🌟
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
                // 🌟 NEW: Thickness Check Added Here!
                if ((data.finalThickness || thickness) > targetWall.thickness) {
                    showWarning(`Opening depth (${data.finalThickness || thickness}m) exceeds wall thickness (${targetWall.thickness.toFixed(2)}m).`);
                }
            }
        }

        setWalls(prev => {
            setHistory(h => [...h, prev]);
            setFuture([]);

            // 🌟 BULLETPROOF CHECK: If there is NO wallId, it must be empty space.
            if (!data.wallId) {
                const newWall = {
                    id: Date.now() + Math.random(),
                    length: data.finalWidth,
                    thickness: data.finalThickness || thickness, 
                    justification: data.justification || 'CENTER',
                    height: defaultHeight, 
                    points: { p1: data.p1, p2: data.p2 },
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


    // --- WALL CREATION, UPDATE & DELETE WITH HISTORY SAVING ---
    useEffect(() => {
        // 🌟 NEW: Listen for the wall creation!
        const handleCreate = (event) => {
            const { p1, p2, length, thickness, justification } = event.detail;
            const newWall = {
                id: Date.now() + Math.random(),
                length: length * scaleFactor, // Apply scale factor
                thickness: thickness,
                justification: justification,
                height: defaultHeight,
                points: { p1, p2 }
            };
            setWalls(prev => {
                setHistory(h => [...h, prev]); 
                setFuture([]);
                return [...prev, newWall];
            });
        };

        const handleUpdate = (event) => {
            const { id, pointType, newPos } = event.detail;
            setWalls(prev => {
                setHistory(h => [...h, prev]);
                setFuture([]);
                return prev.map(w => {
                    if (w.id === id) {
                        const updatedPoints = { ...w.points, [pointType]: newPos };
                        const dx = updatedPoints.p2.x - updatedPoints.p1.x;
                        const dy = updatedPoints.p2.y - updatedPoints.p1.y;
                        const newLen = Math.sqrt(dx * dx + dy * dy);
                        return { ...w, points: updatedPoints, length: newLen * scaleFactor };
                    }
                    return w;
                });
            });
        };
        
        const handleDelete = (event) => { deleteWall(event.detail.id); };

        // 🌟 NEW: Add the listener
        window.addEventListener('SEMANTIC_WALL_CREATED', handleCreate);
        window.addEventListener('SEMANTIC_WALL_UPDATED', handleUpdate);
        window.addEventListener('SEMANTIC_WALL_DELETED', handleDelete);
        
        return () => {
            // 🌟 NEW: Remove the listener
            window.removeEventListener('SEMANTIC_WALL_CREATED', handleCreate);
            window.removeEventListener('SEMANTIC_WALL_UPDATED', handleUpdate);
            window.removeEventListener('SEMANTIC_WALL_DELETED', handleDelete);
        };
    }, [scaleFactor, defaultHeight]); // Make sure defaultHeight is in the dependency array

    useEffect(() => {
        if (viewerRef.current) {
            viewerRef.current.clearWalls();
            walls.forEach(wall => {
                // ✅ PASS THE WHOLE WALL OBJECT
                viewerRef.current.drawSolidWall(wall, hoveredOpeningId);
            });
        }
    }, [walls, hoveredOpeningId]);

    useEffect(() => {
        if (viewerRef.current) {
            viewerRef.current.updateSettings({
                isActive: activeTool !== 'NONE',
                mode: activeTool === 'WALL' ? 'DRAW' : activeTool,
                wallMode,
                thickness, justification, isOrtho: ortho, isSnapping, walls,
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

    // --- SIDEBAR UPDATES WITH HISTORY SAVING ---
    const updateHeight = (id, val) => setWalls(prev => {
        setHistory(h => [...h, prev]); setFuture([]);
        return prev.map(w => w.id === id ? { ...w, height: parseFloat(val) || 0 } : w);
    });

    const updateWallThickness = (id, val) => setWalls(prev => {
        setHistory(h => [...h, prev]); setFuture([]);
        return prev.map(w => w.id === id ? { ...w, thickness: parseFloat(val) || 0 } : w);
    });

    const deleteWall = (id) => setWalls(prev => {
        setHistory(h => [...h, prev]); setFuture([]);
        return prev.filter(w => w.id !== id);
    });

    // 🌟 NEW: Delete a specific opening from a wall
    const deleteOpening = (wallId, openingId) => {
        setWalls(prev => {
            setHistory(h => [...h, prev]); setFuture([]);
            return prev.map(w => {
                if (w.id === wallId) {
                    return { ...w, openings: w.openings.filter(op => op.id !== openingId) };
                }
                return w;
            });
        });
    };

    
    // 🌟 NEW: Update width, height, or thickness of an opening
   // 🌟 NEW: Update width, height, or thickness of an opening
    const updateOpeningParams = (wallId, openingId, field, value) => {
        const numValue = parseFloat(value) || 0;

        // 🌟 PRO CAUTION ALERTS FOR SIDEBAR EDITS 🌟
        const targetWall = walls.find(w => w.id === wallId);
        if (targetWall) {
            if (field === 'width' && numValue > targetWall.length) {
                showWarning(`New width (${numValue}m) exceeds wall length (${targetWall.length.toFixed(2)}m).`);
            }
            if (field === 'height' && numValue > targetWall.height) {
                showWarning(`New height (${numValue}m) exceeds wall height (${targetWall.height.toFixed(2)}m).`);
            }
            // 🌟 NEW: Thickness Check Added Here!
            if (field === 'thickness' && numValue > targetWall.thickness) {
                showWarning(`New depth (${numValue}m) exceeds wall thickness (${targetWall.thickness.toFixed(2)}m).`);
            }
        }

        setWalls(prev => {
            setHistory(h => [...h, prev]); setFuture([]);
            return prev.map(w => {
                if (w.id === wallId) {
                    const updatedOpenings = w.openings.map(op => 
                        op.id === openingId ? { ...op, [field]: numValue } : op
                    );
                    return { ...w, openings: updatedOpenings };
                }
                return w;
            });
        });
    };


// 🌟 NEW: Handle Adding a Floor
    const handleAddFloor = () => {
        if (walls.length === 0) {
            showWarning("⚠️ CAUTION: You must draw walls on the current floor before adding a new level.");
            return;
        }
        
        // Native browser confirm for a hard stop
        const confirmAdd = window.confirm("Add a new floor above this one? \n\nMake sure your current walls are complete, as they will be used as a tracing reference for the next floor.");
        
        if (confirmAdd) {
            showWarning("🚀 Ready for Phase 2: Floor Management System!");
            // (We will add the actual multi-floor 3D stacking logic here in the next step)
        }
    };

    // 🌟 NEW: Handle Skipping to Estimation/Substructure
    const handleNextStep = () => {
        if (walls.length === 0) {
            showWarning("⚠️ CAUTION: You haven't drawn any walls to estimate yet!");
            return;
        }

        const confirmNext = window.confirm("Skip adding more floors and proceed to Estimation / Sub-structure?");
        
        if (confirmNext) {
            showWarning("📊 Proceeding to the Estimation Engine...");
            // (We will add the React Router navigation to the next window here)
        }
    };



    return (
        <div className="flex h-screen bg-slate-900 font-sans overflow-hidden relative">

            {/* 🌟 NEW: PRO WARNING TOAST UI 🌟 */}
            {warningMsg && (
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[200] bg-slate-900/90 border border-yellow-500/50 backdrop-blur-md px-6 py-3 rounded-2xl shadow-[0_10px_40px_rgba(234,179,8,0.15)] flex items-center gap-4 animate-bounce">
                    <div className="bg-yellow-500/20 p-1.5 rounded-lg">
                        <span className="text-yellow-500 text-lg leading-none block">⚠️</span>
                    </div>
                    <span className="text-slate-200 text-xs font-bold uppercase tracking-widest">{warningMsg}</span>
                    <button onClick={() => setWarningMsg(null)} className="ml-2 text-slate-500 hover:text-red-400 transition-colors">✕</button>
                </div>
            )}

            {/* 1. MODAL COMPONENTS */}
            <CalibrationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmCalibration}
                measuredValue={tempMeasuredValue}
            />

            <PickLineModal
                isOpen={!!pickData}
                data={pickData}
                onConfirm={handleConfirmPickWall}
                onCancel={() => setPickData(null)}
                defaultThickness={thickness}
                defaultHeight={defaultHeight}
            />

            <OpeningModal
                isOpen={!!pendingOpening}
                openingData={pendingOpening}
                scaleFactor={scaleFactor}
                onConfirm={handleConfirmOpening}
                onCancel={() => setPendingOpening(null)}
            />

            {/* 2. TOOLBAR (Extracted for clean code) */}
            <EditorToolbar
                isCalibrated={isCalibrated}
                activeTool={activeTool} setActiveTool={setActiveTool}
                wallMode={wallMode} setWallMode={setWallMode}
                openingMode={openingMode} setOpeningMode={setOpeningMode}
                handleUndo={handleUndo} handleRedo={handleRedo}
                historyLength={history.length} futureLength={future.length}
                justification={justification} toggleJustification={toggleJustification}
                ortho={ortho} setOrtho={setOrtho}
                isSnapping={isSnapping} setIsSnapping={setIsSnapping}
            />

            {/* 3. VIEWER */}
            <div className="flex-1 relative ml-20 bg-black rounded-l-3xl overflow-hidden border-l border-slate-700">

                {/* STATUS BAR (Extracted for clean code) */}
                <ViewerStatusBar
                    activeTool={activeTool}
                    openingMode={openingMode}
                    isSnapping={isSnapping}
                    ortho={ortho}
                />

                <ApsViewer ref={viewerRef} urn={decodeURIComponent(urn)} scaleFactor={scaleFactor} isViewLocked={isViewLocked} />
            </div>

            {/* 4. SIDEBAR */}
            <Sidebar
                walls={walls}
                deleteWall={deleteWall}
                updateHeight={updateHeight}
                updateThickness={updateWallThickness}
                onHoverWall={setHoveredWallId}
                globalThickness={thickness} setGlobalThickness={setThickness}
                globalHeight={defaultHeight} setGlobalHeight={setDefaultHeight}
                ortho={ortho} setOrtho={setOrtho} isSnapping={isSnapping} setIsSnapping={setIsSnapping}
                scaleFactor={scaleFactor} setScaleFactor={setScaleFactor}
                isCalibrated={isCalibrated}
                onStartCalibration={() => setActiveTool('CALIBRATION')}
                onUnlockScale={handleUnlockScale}
                isViewLocked={isViewLocked}
                setIsViewLocked={setIsViewLocked}
                deleteOpening={deleteOpening}
                updateOpeningParams={updateOpeningParams}
                onHoverOpening={setHoveredOpeningId}
                onAddFloor={handleAddFloor}
                onNextStep={handleNextStep}
            />

        </div>
    );
};

export default Editor;