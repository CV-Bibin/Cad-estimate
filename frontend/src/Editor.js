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
        setWalls(prev => {
            setHistory(h => [...h, prev]);
            setFuture([]);

            if (data.isStandalone) {
                // Standalone Arch/Grill logic
                const newWall = {
                    id: Date.now() + Math.random(),
                    length: data.finalWidth,
                    thickness: thickness,
                    justification: data.justification,
                    height: defaultHeight,
                    points: { p1: data.p1, p2: data.p2 },
                    openings: [{
                        id: Date.now() + Math.random() + 1,
                        type: data.type,
                        width: data.finalWidth,
                        height: data.finalHeight,
                        centerDist: data.finalWidth / 2
                    }]
                };
                return [...prev, newWall];
            } else {
                // Hosted Door/Window logic
                return prev.map(w => {
                    if (w.id === data.wallId) {
                        const newOpening = {
                            id: Date.now() + Math.random(),
                            type: data.type,
                            width: data.finalWidth,
                            height: data.finalHeight,
                            centerDist: data.centerDist * scaleFactor
                        };
                        return { ...w, openings: [...(w.openings || []), newOpening] };
                    }
                    return w;
                });
            }
        });
        setPendingOpening(null); // Close the modal
    };


    useEffect(() => {
        if (activeTool !== 'WALL') {
            setPickData(null);
        }
    }, [activeTool]);


    // --- OPENING CREATION WITH HISTORY SAVING ---
    useEffect(() => {

        // 1. Catches doors/windows snapped onto existing walls
        const handleHostedOpening = (event) => {
            const { wallId, distance, type } = event.detail;

            // Define standard sizes based on what the user selected
            let width = 0.9;  // Standard door width
            let height = 2.1; // Standard door height
            if (type === 'WINDOW') { width = 1.2; height = 1.2; }
            if (type === 'ARCH' || type === 'RECT_ARCH' || type === 'GRILL') { width = 1.5; height = 2.1; }

            setWalls(prev => {
                setHistory(h => [...h, prev]);
                setFuture([]);
                return prev.map(w => {
                    if (w.id === wallId) {
                        const newOpening = {
                            id: Date.now() + Math.random(),
                            type,
                            width,
                            height,
                            centerDist: distance * scaleFactor // Convert CAD distance to Real Meters
                        };
                        // Push the new opening into this specific wall's array
                        return { ...w, openings: [...(w.openings || []), newOpening] };
                    }
                    return w;
                });
            });
        };

        // 2. Catches arches/grills drawn in empty space (The Universal Wall concept)
        const handleStandaloneOpening = (event) => {
            const { p1, p2, type, justification } = event.detail;

            let height = 2.1;
            if (type === 'WINDOW') height = 1.2;

            // Calculate exact drawn length
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const length = Math.sqrt(dx * dx + dy * dy) * scaleFactor;

            // Create the invisible host wall for estimation purposes
            const newWall = {
                id: Date.now() + Math.random(),
                length: length,
                thickness: thickness,
                justification: justification,
                height: defaultHeight,
                points: { p1, p2 },
                openings: [
                    {
                        id: Date.now() + Math.random() + 1,
                        type,
                        width: length, // Opening fills 100% of the wall width
                        height: height,
                        centerDist: length / 2 // Dead center
                    }
                ]
            };

            setWalls(prev => {
                setHistory(h => [...h, prev]);
                setFuture([]);
                return [...prev, newWall];
            });
        };

        window.addEventListener('HOSTED_OPENING_CREATED', handleHostedOpening);
        window.addEventListener('STANDALONE_OPENING_CREATED', handleStandaloneOpening);

        return () => {
            window.removeEventListener('HOSTED_OPENING_CREATED', handleHostedOpening);
            window.removeEventListener('STANDALONE_OPENING_CREATED', handleStandaloneOpening);
        };
    }, [scaleFactor, thickness, defaultHeight]);

    // --- WALL UPDATE & DELETE WITH HISTORY SAVING ---
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
                viewerRef.current.drawSolidWall(wall);
            });
        }
    }, [walls]);

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

    return (
        <div className="flex h-screen bg-slate-900 font-sans overflow-hidden">

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
            />
        </div>
    );
};

export default Editor;