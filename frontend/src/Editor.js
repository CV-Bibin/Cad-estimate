import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApsViewer from './ApsViewer';
import Toolbar from './components/Toolbar'; // Keep this if you have it, otherwise ignore
import Sidebar from './components/Sidebar';

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
  
  // --- NEW: Global Defaults ---
  const [thickness, setThickness] = useState(0.23); // Default Thickness (23cm)
  const [defaultHeight, setDefaultHeight] = useState(3.0); // Default Height (3m)
  
  const [hoveredWallId, setHoveredWallId] = useState(null);

  // --- 1. HANDLE WALL CREATION ---
  useEffect(() => {
    const handleWall = (event) => {
      // We ignore the tool's thickness/height and use our React State defaults
      const { p1, p2, length, justification } = event.detail; 
      
      const newWall = {
        id: Date.now() + Math.random(),
        length: length * scaleFactor,
        thickness: thickness, // Use Global State
        justification,
        height: defaultHeight, // Use Global State
        points: { p1, p2 }
      };
      setWalls(prev => [...prev, newWall]);
    };
    window.addEventListener('SEMANTIC_WALL_CREATED', handleWall);
    return () => window.removeEventListener('SEMANTIC_WALL_CREATED', handleWall);
  }, [scaleFactor, thickness, defaultHeight]); // Add dependencies

  // --- 2. HANDLE WALL UPDATES & DELETES ---
  useEffect(() => {
    const handleUpdate = (event) => {
      const { id, pointType, newPos } = event.detail;
      setWalls(prev => prev.map(w => {
          if (w.id === id) {
             const updatedPoints = { ...w.points, [pointType]: newPos };
             const dx = updatedPoints.p2.x - updatedPoints.p1.x;
             const dy = updatedPoints.p2.y - updatedPoints.p1.y;
             const newLen = Math.sqrt(dx*dx + dy*dy);
             return { ...w, points: updatedPoints, length: newLen * scaleFactor };
          }
          return w;
      }));
    };

    const handleDelete = (event) => {
        deleteWall(event.detail.id);
    };

    window.addEventListener('SEMANTIC_WALL_UPDATED', handleUpdate);
    window.addEventListener('SEMANTIC_WALL_DELETED', handleDelete);
    
    return () => {
        window.removeEventListener('SEMANTIC_WALL_UPDATED', handleUpdate);
        window.removeEventListener('SEMANTIC_WALL_DELETED', handleDelete);
    };
  }, [scaleFactor]);

  // --- 3. REDRAW (Sync Visuals) ---
  useEffect(() => {
      if (viewerRef.current) {
          viewerRef.current.clearWalls(); 
          walls.forEach(wall => {
              // Pass individual wall thickness here
              viewerRef.current.drawSolidWall(wall.points.p1, wall.points.p2, wall.thickness, wall.justification);
          });
      }
  }, [walls]);

  // --- 4. UPDATE TOOL SETTINGS ---
  useEffect(() => {
      if (viewerRef.current) {
          viewerRef.current.updateSettings({
              isActive: activeTool !== 'NONE',
              mode: activeTool === 'WALL' ? 'DRAW' : activeTool, 
              thickness, // Updates the Ghost Wall thickness
              justification,
              isOrtho: ortho,
              isSnapping, 
              walls 
          });
      }
  }, [activeTool, thickness, justification, ortho, isSnapping, walls]);

  // --- SYNC HOVER ---
  useEffect(() => {
      if (viewerRef.current && viewerRef.current.highlightWall) {
          viewerRef.current.highlightWall(hoveredWallId);
      }
  }, [hoveredWallId]);

  // --- UI ACTIONS ---
  const toggleJustification = () => {
      if (justification === 'CENTER') setJustification('LEFT');
      else if (justification === 'LEFT') setJustification('RIGHT');
      else setJustification('CENTER');
  };
  
  // Update Helpers
  const updateHeight = (id, val) => setWalls(prev => prev.map(w => w.id === id ? { ...w, height: parseFloat(val) || 0 } : w));
  const updateWallThickness = (id, val) => setWalls(prev => prev.map(w => w.id === id ? { ...w, thickness: parseFloat(val) || 0 } : w));
  const deleteWall = (id) => setWalls(prev => prev.filter(w => w.id !== id));

  return (
    <div className="flex h-screen bg-slate-900 font-sans overflow-hidden">
      
      {/* 1. TOOLBAR */}
      <div className="absolute left-4 top-20 bottom-20 w-16 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl z-30 flex flex-col items-center py-4 gap-4">
        
        <button onClick={() => setActiveTool(activeTool === 'WALL' ? 'NONE' : 'WALL')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === 'WALL' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'}`}>🧱</button>
        <button onClick={() => setActiveTool(activeTool === 'EDIT' ? 'NONE' : 'EDIT')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === 'EDIT' ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400'}`}>✏️</button>
        <button onClick={() => setActiveTool(activeTool === 'ERASER' ? 'NONE' : 'ERASER')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === 'ERASER' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'}`}>✕</button>

        <div className="w-8 h-px bg-slate-600 my-1"></div>

        <button onClick={toggleJustification} className="w-10 h-10 rounded-xl flex flex-col items-center justify-center bg-slate-700 text-white border border-slate-600">
             <span className="text-xl">{justification === 'CENTER' ? '⌾' : justification === 'LEFT' ? '⇠' : '⇢'}</span>
        </button>

        <button onClick={() => setOrtho(!ortho)} className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all ${ortho ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500'}`}>
             <span className="text-xl">📐</span><span className="text-[6px]">ORTHO</span>
        </button>

        <button onClick={() => setIsSnapping(!isSnapping)} className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all ${isSnapping ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500'}`}>
             <span className="text-xl">🧲</span><span className="text-[6px]">SNAP</span>
        </button>

      </div>

      {/* 2. VIEWER */}
      <div className="flex-1 relative ml-20 bg-black rounded-l-3xl overflow-hidden border-l border-slate-700">
         <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="bg-slate-800/90 backdrop-blur-md px-6 py-2.5 rounded-full border border-slate-600 shadow-xl text-white text-xs font-bold flex items-center gap-4">
                <span>{activeTool === 'WALL' ? 'DRAW MODE' : activeTool === 'EDIT' ? 'EDIT MODE' : activeTool === 'ERASER' ? 'ERASER MODE' : 'VIEW MODE'}</span>
                <span className="text-slate-400">|</span>
                <span>{isSnapping ? 'SNAP ON' : 'SNAP OFF'}</span>
            </div>
         </div>
         <ApsViewer ref={viewerRef} urn={decodeURIComponent(urn)} scaleFactor={scaleFactor} />
      </div>

      {/* 3. SIDEBAR (Updated Props) */}
      <Sidebar 
        walls={walls} 
        deleteWall={deleteWall} 
        updateHeight={updateHeight} 
        updateThickness={updateWallThickness} // New Function
        onHoverWall={setHoveredWallId} 
        
        // Global Defaults for the Input Header
        globalThickness={thickness}
        setGlobalThickness={setThickness}
        globalHeight={defaultHeight}
        setGlobalHeight={setDefaultHeight}
      />
    </div>
  );
};

export default Editor;