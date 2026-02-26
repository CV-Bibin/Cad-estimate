import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApsViewer from './ApsViewer';
import Toolbar from './components/Toolbar'; 
import Sidebar from './components/Sidebar';
// --- 1. IMPORT TOOLS & MODAL ---
import { CalibrationTool } from './tools/CalibrationTool';
import CalibrationModal from './components/CalibrationModal';

const Editor = () => {
  const { urn } = useParams();
  const navigate = useNavigate();
  const viewerRef = useRef();
  
  // STATE
  const [walls, setWalls] = useState([]);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [activeTool, setActiveTool] = useState('NONE'); 
  const [ortho, setOrtho] = useState(false);
  const [isSnapping, setIsSnapping] = useState(true); 
  const [justification, setJustification] = useState('CENTER');
  const [isViewLocked, setIsViewLocked] = useState(false);
  
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
      setFuture(prev => [walls, ...prev]); // Save current to future
      setHistory(prev => prev.slice(0, -1)); // Remove last from history
      setWalls(previousWalls); // Revert walls
  }, [history, walls]);

  const handleRedo = useCallback(() => {
      if (future.length === 0) return;
      const nextWalls = future[0];
      setHistory(prev => [...prev, walls]); // Save current to history
      setFuture(prev => prev.slice(1)); // Remove first from future
      setWalls(nextWalls); // Fast forward walls
  }, [future, walls]);

  // --- NEW: UNDO / REDO KEYBOARD SHORTCUTS ---
  useEffect(() => {
      const handleKeyDown = (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
              e.preventDefault();
              if (e.shiftKey) handleRedo(); // Ctrl+Shift+Z
              else handleUndo(); // Ctrl+Z
          } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
              e.preventDefault();
              handleRedo(); // Ctrl+Y
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);


  // --- UPDATED: HANDLE CALIBRATION FINISHED (Opens Modal) ---
  const handleCalibrationFinished = (measuredDistance) => {
      setTempMeasuredValue(measuredDistance); // Save the raw distance
      setIsModalOpen(true); // Open the popup
      setActiveTool('NONE'); // Reset tool
  };

  // --- UPDATED: CONFIRM CALIBRATION (Called by Modal) ---
  const handleConfirmCalibration = (realMeters) => {
      const newScale = realMeters / tempMeasuredValue;
      
      setScaleFactor(newScale);
      applyScaleToWalls(newScale); // Update walls
      
      setIsCalibrated(true); // Lock UI
      setIsModalOpen(false); // Close Modal
  };

  // --- UPDATED: UNLOCK SCALE (Called by Sidebar) ---
  const handleUnlockScale = () => {
      if (window.confirm("Unlock Scale? Walls will revert to uncalibrated size.")) {
          setScaleFactor(1);
          applyScaleToWalls(1);
          setIsCalibrated(false);
      }
  };

  // --- TOOL REGISTRATION ---
  useEffect(() => {
    // Safety Check
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
          setHistory(h => [...h, prevWalls]); // Save history
          setFuture([]); // Clear future
          return prevWalls.map(wall => {
              const dx = wall.points.p2.x - wall.points.p1.x;
              const dy = wall.points.p2.y - wall.points.p1.y;
              const rawDistance = Math.sqrt(dx * dx + dy * dy);
              return { ...wall, length: rawDistance * newScale };
          });
      });
  };
  
  // --- WALL CREATION WITH HISTORY SAVING ---
  useEffect(() => {
    const handleWall = (event) => {
      const { p1, p2, length, justification } = event.detail; 
      const newWall = {
        id: Date.now() + Math.random(),
        length: length * scaleFactor,
        thickness: thickness, 
        justification,
        height: defaultHeight, 
        points: { p1, p2 }
      };
      setWalls(prev => {
          setHistory(h => [...h, prev]); // Save history
          setFuture([]); // Clear future
          return [...prev, newWall];
      });
    };
    window.addEventListener('SEMANTIC_WALL_CREATED', handleWall);
    return () => window.removeEventListener('SEMANTIC_WALL_CREATED', handleWall);
  }, [scaleFactor, thickness, defaultHeight]);

  // --- WALL UPDATE & DELETE WITH HISTORY SAVING ---
  useEffect(() => {
    const handleUpdate = (event) => {
      const { id, pointType, newPos } = event.detail;
      setWalls(prev => {
          setHistory(h => [...h, prev]); // Save history
          setFuture([]); // Clear future
          return prev.map(w => {
              if (w.id === id) {
                 const updatedPoints = { ...w.points, [pointType]: newPos };
                 const dx = updatedPoints.p2.x - updatedPoints.p1.x;
                 const dy = updatedPoints.p2.y - updatedPoints.p1.y;
                 const newLen = Math.sqrt(dx*dx + dy*dy);
                 return { ...w, points: updatedPoints, length: newLen * scaleFactor };
              }
              return w;
          });
      });
    };
    const handleDelete = (event) => { deleteWall(event.detail.id); };

    
    window.addEventListener('SEMANTIC_WALL_UPDATED', handleUpdate);
    window.addEventListener('SEMANTIC_WALL_DELETED', handleDelete);
    return () => {
        window.removeEventListener('SEMANTIC_WALL_UPDATED', handleUpdate);
        window.removeEventListener('SEMANTIC_WALL_DELETED', handleDelete);
    };
  }, [scaleFactor]);

  useEffect(() => {
      if (viewerRef.current) {
          viewerRef.current.clearWalls(); 
          walls.forEach(wall => {
              viewerRef.current.drawSolidWall(wall.points.p1, wall.points.p2, wall.thickness, wall.justification);
          });
      }
  }, [walls]);

  useEffect(() => {
      if (viewerRef.current) {
          viewerRef.current.updateSettings({
              isActive: activeTool !== 'NONE',
              mode: activeTool === 'WALL' ? 'DRAW' : activeTool, 
              thickness, justification, isOrtho: ortho, isSnapping, walls,
              scaleFactor
          });
      }
  }, [activeTool, thickness, justification, ortho, isSnapping, walls, scaleFactor]);

  useEffect(() => {
      if (viewerRef.current && viewerRef.current.highlightWall) {
          viewerRef.current.highlightWall(hoveredWallId);
      }
  }, [hoveredWallId]);

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
      
      {/* 1. ADD MODAL COMPONENT */}
      <CalibrationModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onConfirm={handleConfirmCalibration}
          measuredValue={tempMeasuredValue}
      />

      {/* 2. TOOLBAR */}
     <div 
  className={`absolute left-4 top-20 bottom-20 w-16 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl z-30 flex flex-col items-center py-4 gap-4 transition-all duration-300 
    ${!isCalibrated ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100 pointer-events-auto'}`}
>
  <button onClick={() => setActiveTool(activeTool === 'WALL' ? 'NONE' : 'WALL')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === 'WALL' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'}`} title="Draw Wall">🧱</button>
  <button onClick={() => setActiveTool(activeTool === 'EDIT' ? 'NONE' : 'EDIT')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === 'EDIT' ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400'}`} title="Edit Wall">✏️</button>
  <button onClick={() => setActiveTool(activeTool === 'ERASER' ? 'NONE' : 'ERASER')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === 'ERASER' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'}`} title="Erase Wall">✕</button>
  <div className="w-8 h-px bg-slate-600 my-1"></div>
        
        {/* --- NEW: UNDO / REDO BUTTONS --- */}
        <button onClick={handleUndo} disabled={history.length === 0} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all text-xl ${history.length === 0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-700 text-white hover:bg-slate-600 active:scale-95'}`} title="Undo (Ctrl+Z)">↩️</button>
        <button onClick={handleRedo} disabled={future.length === 0} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all text-xl ${future.length === 0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-700 text-white hover:bg-slate-600 active:scale-95'}`} title="Redo (Ctrl+Y)">↪️</button>
        {/* -------------------------------- */}

        <div className="w-8 h-px bg-slate-600 my-1"></div>

        <button onClick={toggleJustification} className="w-10 h-10 rounded-xl flex flex-col items-center justify-center bg-slate-700 text-white border border-slate-600" title="Toggle Justification"><span className="text-xl">{justification === 'CENTER' ? '⌾' : justification === 'LEFT' ? '⇠' : '⇢'}</span></button>
        <button onClick={() => setOrtho(!ortho)} className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all ${ortho ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500'}`} title="Toggle Ortho"><span className="text-xl">📐</span><span className="text-[6px]">ORTHO</span></button>
        <button onClick={() => setIsSnapping(!isSnapping)} className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all ${isSnapping ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500'}`} title="Toggle Snap"><span className="text-xl">🧲</span><span className="text-[6px]">SNAP</span></button>
      </div>

      {/* 3. VIEWER */}
      <div className="flex-1 relative ml-20 bg-black rounded-l-3xl overflow-hidden border-l border-slate-700">
         <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-full border border-slate-700/50 shadow-2xl shadow-black/50">
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2 border ${
                    activeTool === 'CALIBRATION' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 
                    activeTool === 'WALL' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                    activeTool === 'EDIT' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    activeTool === 'ERASER' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                        activeTool === 'CALIBRATION' ? 'bg-purple-400 animate-pulse' : 
                        activeTool === 'WALL' ? 'bg-orange-400 animate-pulse' :
                        activeTool === 'EDIT' ? 'bg-green-400 animate-pulse' :
                        activeTool === 'ERASER' ? 'bg-red-400 animate-pulse' :
                        'bg-slate-500'
                    }`}></div>
                    {activeTool === 'CALIBRATION' ? 'PICKING POINTS...' : activeTool === 'WALL' ? 'DRAWING' : activeTool === 'EDIT' ? 'EDITING' : activeTool === 'ERASER' ? 'ERASING' : 'VIEWING'}
                </div>
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-colors ${isSnapping ? 'text-blue-300 bg-blue-500/10' : 'text-slate-600'}`}><span className="text-xs">🧲</span><span className={isSnapping ? 'opacity-100' : 'opacity-50'}>SNAP {isSnapping ? 'ON' : 'OFF'}</span></div>
                <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-colors ${ortho ? 'text-cyan-300 bg-cyan-500/10' : 'text-slate-600'}`}><span className="text-xs">📐</span><span className={ortho ? 'opacity-100' : 'opacity-50'}>ORTHO {ortho ? 'ON' : 'OFF'}</span></div>
            </div>
         </div>
         <ApsViewer ref={viewerRef} urn={decodeURIComponent(urn)} scaleFactor={scaleFactor} isViewLocked={isViewLocked} />
      </div>

      {/* 4. SIDEBAR - PASS LOCK STATES */}
      <Sidebar 
        walls={walls} 
        deleteWall={deleteWall} 
        updateHeight={updateHeight} 
        updateThickness={updateWallThickness}
        onHoverWall={setHoveredWallId} 
        globalThickness={thickness} setGlobalThickness={setThickness}
        globalHeight={defaultHeight} setGlobalHeight={setDefaultHeight}
        ortho={ortho} setOrtho={setOrtho} isSnapping={isSnapping} setIsSnapping={setIsSnapping}
        
        scaleFactor={scaleFactor} 
        setScaleFactor={setScaleFactor}
        
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