import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadProjectData, saveProjectData } from './cloudSync';
import StructuralApsViewer from './StructuralApsViewer';

// Components
import HomeButton from './components/HomeButton';
import AreaDetailsSidebar from './components/AreaDetailsSidebar';
import ColumnDetailsSidebar from './components/ColumnDetailsSidebar';
import BeamDetailsSidebar from './components/BeamDetailsSidebar'; // 🌟 NEW IMPORT
import SlabDetailsSidebar from './components/SlabDetailsSidebar';
import StructuralToolbar from './components/StructuralToolbar';
import StructuralLeftSidebar from './components/StructuralLeftSidebar';

// Utilities
import { calculateAreaDetails } from './tools/structuralMath';

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
    const [currentFloorIndex, setCurrentFloorIndex] = useState(0);

    // 🌟 TOOL STATES
    const [activeTool, setActiveTool] = useState('NONE');
    const [structuralMode, setStructuralMode] = useState('COLUMN');
    const [beamJustification, setBeamJustification] = useState('CENTER');
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

    // 🌟 STRUCTURAL ELEMENT STATES
    const [placedColumns, setPlacedColumns] = useState([]);
    const [placedBeams, setPlacedBeams] = useState([]); // 🌟 ADDED BEAM STATE
    const [placedSlabs, setPlacedSlabs] = useState([]);
    const [editingBeamId, setEditingBeamId] = useState(null);

    // 🌟 Master Snap Engine: Corners, Centers, and Faces with Data
    const snapPoints = React.useMemo(() => {
        let pts = [];
        const activeFloor = archFloors[currentFloorIndex];

        if (activeFloor && activeFloor.walls) {
            activeFloor.walls.forEach(wall => {
                if (wall.points?.p1) pts.push({ ...wall.points.p1, colSize: 0.23, type: 'wall' });
                if (wall.points?.p2) pts.push({ ...wall.points.p2, colSize: 0.23, type: 'wall' });
            });
        }

        placedColumns.forEach(col => {
            if (col.floorIndex !== currentFloorIndex) return;

            const colSize = col.shape === 'CIRCULAR' ? (col.radius * 2) : Math.min(col.width, col.depth);

            if (col.shape === 'CIRCULAR') {
                pts.push({ x: col.x, y: col.y, isCenter: true, colSize });
            } else {
                // 🌟 FIX: Convert real-world width/depth to Viewer scale for the snap points!
                const hw = (col.width / scaleFactor) / 2;
                const hd = (col.depth / scaleFactor) / 2;
                const angle = col.rotation || 0;
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);

                const addPt = (lx, ly, type) => {
                    pts.push({
                        x: col.x + (lx * cosA - ly * sinA),
                        y: col.y + (lx * sinA + ly * cosA),
                        isCorner: type === 'corner',
                        isFace: type === 'face',
                        isCenter: type === 'center',
                        colSize: colSize
                    });
                };

                addPt(0, 0, 'center');
                addPt(-hw, -hd, 'corner'); addPt(hw, -hd, 'corner');
                addPt(hw, hd, 'corner'); addPt(-hw, hd, 'corner');
                addPt(0, -hd, 'face'); addPt(hw, 0, 'face');
                addPt(0, hd, 'face'); addPt(-hw, 0, 'face');
            }
        });

        return pts;
    }, [archFloors, currentFloorIndex, placedColumns, scaleFactor]);

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

    // 🌟 BOOT SEQUENCE
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
                if (data.drawnAreas) setDrawnAreas(data.drawnAreas);
                if (data.placedColumns) setPlacedColumns(data.placedColumns);
                if (data.placedBeams) setPlacedBeams(data.placedBeams); // 🌟 LOAD BEAMS
                if (data.placedSlabs) setPlacedSlabs(data.placedSlabs);
                setTimeout(() => setIsProcessing(false), 500);
            } else {
                setLoadingText("❌ Failed to load data.");
            }
        };
        bootStructuralEngine();
    }, [urn]);

    // 🌟 VIEWER SYNC
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
                drawnAreas: drawnAreas.filter(a => a.floorIndex === currentFloorIndex),

                placedColumns: placedColumns.filter(c => c.floorIndex === currentFloorIndex),
                placedBeams: placedBeams.filter(b => b.floorIndex === currentFloorIndex),
                editingBeamId: editingBeamId,

                editingAreaId: editingAreaId,
                beamJustification: beamJustification,
                zoneType: zoneType,
                snapPoints: snapPoints,
                orthoEnabled: orthoEnabled,
                osnapEnabled: osnapEnabled
            });
        }
    }, [activeTool, areaMode, zoneType, snapPoints, orthoEnabled, osnapEnabled, viewerReady, drawnAreas, editingAreaId, currentFloorIndex, placedColumns, placedBeams, beamJustification, editingBeamId]);

    // 🌟 EVENT LISTENERS
    useEffect(() => {
        const handleArea = (e) => {
            setDrawnAreas(prevAreas => {
                const handleBeamJustify = (e) => setBeamJustification(e.detail);
                window.addEventListener('BEAM_JUSTIFY_SYNC', handleBeamJustify);
                const currentFloorWalls = archFloors[currentFloorIndex]?.walls || [];
                const newAreaDetails = calculateAreaDetails(e.detail.points || e.detail, e.detail.zoneType || zoneType, scaleFactor, currentFloorWalls);
                if (newAreaDetails) {
                    newAreaDetails.name = `Room ${prevAreas.filter(a => a.floorIndex === currentFloorIndex).length + 1}`;
                    newAreaDetails.floorIndex = currentFloorIndex;
                    return [...prevAreas, newAreaDetails];
                }
                return prevAreas;
            });
            setActiveTool('NONE');
        };

        const handleAreaEdit = (e) => {
            const { id, points } = e.detail;
            setDrawnAreas(prevAreas => prevAreas.map(area => {
                if (area.id === id) {
                    const updatedArea = calculateAreaDetails(points, area.zoneType, scaleFactor, archFloors[currentFloorIndex]?.walls || []);
                    if (updatedArea) {
                        updatedArea.id = area.id; updatedArea.name = area.name; updatedArea.floorIndex = area.floorIndex;
                        return updatedArea;
                    }
                }
                return area;
            }));
        };

        const handleColumnEvent = (e) => setPlacedColumns(prev => [...prev, {
            id: Date.now() + Math.random(),
            name: `C${prev.length + 1}`,
            x: e.detail.x,
            y: e.detail.y,
            width: e.detail.width || 0.2,
            depth: e.detail.depth || 0.2,
            radius: e.detail.radius || 0.1,
            rotation: e.detail.rotation || 0,
            shape: e.detail.shape || 'FREE',
            floorIndex: currentFloorIndex
        }]);

        // 🌟 BEAM CREATION LISTENER
        const handleBeamEvent = (e) => setPlacedBeams(prev => [...prev, {
            id: Date.now() + Math.random(),
            name: `B${prev.length + 1}`,
            beamType: 'NORMAL',
            p1: e.detail.p1,
            p2: e.detail.p2,
            length: e.detail.length,
            width: e.detail.width,
            depth: e.detail.depth,
            justification: e.detail.justification,
            floorIndex: currentFloorIndex
        }]);

        // 🌟 ADD THIS NEW LISTENER FOR EDITED BEAMS
        const handleBeamUpdate = (e) => {
            setPlacedBeams(prev => prev.map(b =>
                b.id === e.detail.id ? { ...b, p1: e.detail.p1, p2: e.detail.p2, length: e.detail.length } : b
            ));
            setEditingBeamId(null);
        };
        const handleBeamEditStart = (e) => setEditingBeamId(e.detail.id);
        const handleBeamEditCancel = () => setEditingBeamId(null);
        const handleSlabEvent = (e) => setPlacedSlabs(prev => [...prev, { id: Date.now() + Math.random(), name: `Span ${prev.length + 1}`, type: activeTool, area: e.detail.area || 10, thickness: 0.15, floorIndex: currentFloorIndex }]);

        window.addEventListener('AREA_COMPLETED', handleArea);
        window.addEventListener('AREA_UPDATED', handleAreaEdit);
        window.addEventListener('COLUMN_PLACED', handleColumnEvent);
        window.addEventListener('BEAM_PLACED', handleBeamEvent);
        window.addEventListener('SLAB_PLACED', handleSlabEvent);
        window.addEventListener('BEAM_UPDATED', handleBeamUpdate);
        window.addEventListener('BEAM_EDIT_START', handleBeamEditStart);
        window.addEventListener('BEAM_EDIT_CANCEL', handleBeamEditCancel);

        return () => {
            window.removeEventListener('AREA_COMPLETED', handleArea);
            window.removeEventListener('AREA_UPDATED', handleAreaEdit);
            window.removeEventListener('COLUMN_PLACED', handleColumnEvent);
            window.removeEventListener('BEAM_PLACED', handleBeamEvent);
            window.removeEventListener('BEAM_UPDATED', handleBeamUpdate);
            window.removeEventListener('SLAB_PLACED', handleSlabEvent);
            window.removeEventListener('BEAM_EDIT_START', handleBeamEditStart); // 🌟 Cleanup
            window.removeEventListener('BEAM_EDIT_CANCEL', handleBeamEditCancel); // 🌟 Cleanup
        };
    }, [zoneType, scaleFactor, archFloors, currentFloorIndex, activeTool]);

    // 🌟 DELETE / UPDATE HANDLERS
    const handleDeleteArea = (id) => setDrawnAreas(prev => prev.filter(area => area.id !== id));
    const handleRenameArea = (id, newName) => setDrawnAreas(prev => prev.map(area => area.id === id ? { ...area, name: newName } : area));
    const handleEditAreaClick = (id) => { setBackupAreas(JSON.parse(JSON.stringify(drawnAreas))); setEditingAreaId(id); setActiveTool('AREA'); setAreaMode('EDIT'); };

    const handleDeleteColumn = (id) => setPlacedColumns(prev => prev.filter(c => c.id !== id));
    const handleUpdateColumnSize = (id, width, depth, radius) => setPlacedColumns(prev => prev.map(c => c.id === id ? { ...c, width, depth, radius } : c));

    // 🌟 BEAM HANDLERS
    const handleDeleteBeam = (id) => setPlacedBeams(prev => prev.filter(b => b.id !== id));
    const handleUpdateBeamType = (id, beamType) => setPlacedBeams(prev => prev.map(b => b.id === id ? { ...b, beamType } : b));
    const handleUpdateBeamSize = (id, width, depth) => setPlacedBeams(prev => prev.map(b => b.id === id ? { ...b, width, depth } : b));

    const handleDeleteSlab = (id) => setPlacedSlabs(prev => prev.filter(s => s.id !== id));
    const handleUpdateSlabThickness = (id, thickness) => setPlacedSlabs(prev => prev.map(s => s.id === id ? { ...s, thickness } : s));

    // 🌟 SAVE & PROGRESS LOGIC
    const triggerCloudSave = async () => {
        const currentData = await loadProjectData(urn);
        if (currentData) {
            // 🌟 ENSURE BEAMS ARE SAVED TO CLOUD
            await saveProjectData(urn, { ...currentData, drawnAreas, placedColumns, placedBeams, placedSlabs });
        }
    };

    const handleManualSave = async () => {
        setIsSaving(true);
        try { await triggerCloudSave(); } catch (e) { alert("⚠️ Could not save progress manually."); }
        setIsSaving(false);
    };

    const handleNextStep = async () => {
        setIsSaving(true);
        try { await triggerCloudSave(); } catch (e) { alert("⚠️ Could not save progress."); }
        setIsSaving(false);

        if (unlockedFromStructural) {
            setUnlockedFromStructural(false); setAppStage('STRUCTURAL'); setActiveTool('COLUMN'); return;
        }

        if (currentFloorIndex !== archFloors.length - 1) {
            setCurrentFloorIndex(prev => prev + 1);
            setAreaMode('DRAW'); setActiveTool('NONE');
            const switcher = document.getElementById('floor-switcher'); if (switcher) switcher.scrollLeft += 100;
        } else {
            setAppStage('STRUCTURAL'); setActiveTool('COLUMN'); setCurrentFloorIndex(0);
            const switcher = document.getElementById('floor-switcher'); if (switcher) switcher.scrollLeft = 0;
        }
    };

    // 🌟 RENDER 3D CANVAS
    useEffect(() => {
        if (viewerReady && viewerRef.current) {
            viewerRef.current.clearWalls?.();
            viewerRef.current.clearAreas?.();
            if (showWalls && archFloors[currentFloorIndex]) {
                (archFloors[currentFloorIndex].walls || []).forEach(w => viewerRef.current.drawSolidWall(w, null, true, true));
            }
            drawnAreas.filter(a => a.floorIndex === currentFloorIndex).forEach(a => viewerRef.current.drawSolidArea?.(a));
        }
    }, [archFloors, drawnAreas, viewerReady, scaleFactor, forceRedraw, showWalls, currentFloorIndex]);

    if (isProcessing) return <div className="flex h-screen bg-slate-900 items-center justify-center font-sans"><div className="text-center"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div><h2 className="text-white text-xl font-bold tracking-widest uppercase mb-2">Processing Structure</h2><p className="text-blue-400 text-sm font-mono animate-pulse">{loadingText}</p></div></div>;

    const activeFloorAreas = drawnAreas.filter(area => area.floorIndex === currentFloorIndex);
    const activeFloorColumns = placedColumns.filter(c => c.floorIndex === currentFloorIndex);
    const activeFloorBeams = placedBeams.filter(b => b.floorIndex === currentFloorIndex); // 🌟 BEAM FILTER
    const activeFloorSlabs = placedSlabs.filter(s => s.floorIndex === currentFloorIndex);

    return (
        <div className="flex h-screen bg-slate-900 font-sans overflow-hidden relative">

            <StructuralLeftSidebar
                urn={urn} archFloors={archFloors} currentFloorIndex={currentFloorIndex} setCurrentFloorIndex={setCurrentFloorIndex}
                appStage={appStage} setAppStage={setAppStage} activeTool={activeTool} setActiveTool={setActiveTool}
                unlockedFromStructural={unlockedFromStructural} setUnlockedFromStructural={setUnlockedFromStructural}
                areaMode={areaMode} setAreaMode={setAreaMode} setEditingAreaId={setEditingAreaId}
                drawnAreas={drawnAreas} setDrawnAreas={setDrawnAreas} backupAreas={backupAreas}
                orthoEnabled={orthoEnabled} setOrthoEnabled={setOrthoEnabled} osnapEnabled={osnapEnabled} setOsnapEnabled={setOsnapEnabled}
                zoneType={zoneType} setZoneType={setZoneType} isSaving={isSaving} handleNextStep={handleNextStep}
                showWalls={showWalls} setShowWalls={setShowWalls}
                structuralMode={structuralMode} setStructuralMode={setStructuralMode}
                beamJustification={beamJustification}
                setBeamJustification={setBeamJustification}
            />

            <div className="flex-1 relative bg-black">
                <div className="absolute top-5 left-6 z-[100] flex gap-3 animate-fade-in-down">
                    <HomeButton showWarning={false} />
                    <button onClick={handleManualSave} disabled={isSaving} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all border backdrop-blur-sm ${isSaving ? 'bg-slate-700/80 text-slate-400 border-slate-600 cursor-wait' : 'bg-slate-800/90 hover:bg-slate-700 text-blue-400 border-slate-600 hover:border-blue-400 hover:text-white'}`}>
                        {isSaving ? '⏳ Saving...' : '💾 Save Data'}
                    </button>
                </div>

                {(appStage === 'STRUCTURAL' || appStage === 'SLABS') && (
                    <StructuralToolbar
                        activeTool={activeTool}
                        setActiveTool={setActiveTool}
                        appStage={appStage}
                        structuralMode={structuralMode}
                        setStructuralMode={setStructuralMode}
                    />
                )}

                <StructuralApsViewer ref={viewerRef} urn={decodeURIComponent(urn)} scaleFactor={scaleFactor} isViewLocked={false} />
            </div>

            {/* 🌟 3. DYNAMIC RIGHT SIDEBAR */}
            {appStage === 'ARCHITECTURE' ? (
                <AreaDetailsSidebar savedAreas={activeFloorAreas} onDeleteArea={handleDeleteArea} onRenameArea={handleRenameArea} onEditArea={handleEditAreaClick} />
            ) : appStage === 'STRUCTURAL' ? (
                // 🌟 SHOW COLUMN SIDEBAR OR BEAM SIDEBAR BASED ON THE TOP TAB
                structuralMode === 'COLUMN' ? (
                    <ColumnDetailsSidebar columns={activeFloorColumns} onDeleteColumn={handleDeleteColumn} onUpdateColumnSize={handleUpdateColumnSize} />
                ) : (
                    <BeamDetailsSidebar
                        beams={activeFloorBeams}
                        onDeleteBeam={handleDeleteBeam}
                        onUpdateBeamType={handleUpdateBeamType}
                        onUpdateBeamSize={handleUpdateBeamSize}
                    />)
            ) : appStage === 'SLABS' ? (
                <SlabDetailsSidebar slabs={activeFloorSlabs} onDeleteSlab={handleDeleteSlab} onUpdateSlabThickness={handleUpdateSlabThickness} />
            ) : (
                <div className="w-[340px] bg-[#1e1e1e] border-l border-[#333] flex flex-col items-center justify-center">
                    <p className="text-slate-500 text-sm">Select a tool to view details</p>
                </div>
            )}

        </div>
    );
};

export default StructuralEditor;