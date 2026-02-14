import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApsViewer from './ApsViewer';
import Toolbar from './components/Toolbar';
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
  const [snapMode, setSnapMode] = useState('STANDARD'); // 'STANDARD', 'STRICT', 'OFF'
  const [justification, setJustification] = useState('CENTER');
  const [thickness, setThickness] = useState(0.23);

  // --- 1. HANDLE WALL CREATION ---
  useEffect(() => {
    const handleWall = (event) => {
      const { p1, p2, length, thickness, justification } = event.detail;
      const newWall = {
        id: Date.now() + Math.random(),
        length: length * scaleFactor,
        thickness,
        justification,
        height: 3.0,
        points: { p1, p2 }
      };
      setWalls(prev => [...prev, newWall]);
    };
    window.addEventListener('SEMANTIC_WALL_CREATED', handleWall);
    return () => window.removeEventListener('SEMANTIC_WALL_CREATED', handleWall);
  }, [scaleFactor]);

  // --- 2. HANDLE WALL UPDATES (EDIT MODE) ---
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
    window.addEventListener('SEMANTIC_WALL_UPDATED', handleUpdate);
    return () => window.removeEventListener('SEMANTIC_WALL_UPDATED', handleUpdate);
  }, [scaleFactor]);

  // --- 3. REDRAW WALLS (Sync State to Viewer) ---
  useEffect(() => {
      if (viewerRef.current) {
          viewerRef.current.clearWalls(); // Clear old
          walls.forEach(wall => {
              viewerRef.current.drawSolidWall(wall.points.p1, wall.points.p2, wall.thickness, wall.justification);
          });
      }
  }, [walls]);

  // --- 4. UPDATE TOOL SETTINGS ---
  useEffect(() => {
      if (viewerRef.current) {
          viewerRef.current.updateSettings({
              isActive: activeTool !== 'NONE',
              mode: activeTool === 'WALL' ? 'DRAW' : 'EDIT',
              thickness,
              justification,
              isOrtho: ortho,
              snapMode: snapMode,
              walls // Pass walls for handles
          });
      }
  }, [activeTool, thickness, justification, ortho, snapMode, walls]);


  // --- UI HANDLERS ---
  const toggleJustification = () => {
      if (justification === 'CENTER') setJustification('LEFT');
      else if (justification === 'LEFT') setJustification('RIGHT');
      else setJustification('CENTER');
  };

  const updateHeight = (id, val) => {
      setWalls(prev => prev.map(w => w.id === id ? { ...w, height: parseFloat(val) || 0 } : w));
  };
  
  const deleteWall = (id) => {
      setWalls(prev => prev.filter(w => w.id !== id));
  };

  return (
    <div className="flex h-screen bg-slate-900 font-sans overflow-hidden">
      
      {/* 1. TOOLBAR */}
      <Toolbar 
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        justification={justification}
        toggleJustification={toggleJustification}
        ortho={ortho}
        setOrtho={setOrtho}
        snapMode={snapMode}
        setSnapMode={setSnapMode}
      />

      {/* 2. VIEWER */}
      <div className="flex-1 relative ml-20 bg-black rounded-l-3xl overflow-hidden border-l border-slate-700">
         {/* TOP INFO BAR */}
         <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="bg-slate-800/90 backdrop-blur-md px-6 py-2.5 rounded-full border border-slate-600 shadow-xl text-white text-xs font-bold flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 uppercase text-[10px]">Mode</span>
                    <span className={`px-2 py-0.5 rounded ${activeTool === 'WALL' ? 'bg-orange-500' : activeTool === 'EDIT' ? 'bg-green-500' : 'bg-slate-700 text-slate-300'}`}>
                        {activeTool === 'WALL' ? 'DRAW' : activeTool === 'EDIT' ? 'EDIT' : 'VIEW'}
                    </span>
                </div>
                <div className="w-px h-4 bg-slate-600"></div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 uppercase text-[10px]">Align</span>
                    <span className="text-blue-400">{justification}</span>
                </div>
                <div className="w-px h-4 bg-slate-600"></div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 uppercase text-[10px]">Snap</span>
                    <span className={snapMode==='STRICT'?'text-red-400':snapMode==='STANDARD'?'text-blue-400':'text-slate-500'}>{snapMode}</span>
                </div>
            </div>
         </div>
         <ApsViewer ref={viewerRef} urn={decodeURIComponent(urn)} scaleFactor={scaleFactor} />
      </div>

      {/* 3. SIDEBAR */}
      <Sidebar walls={walls} deleteWall={deleteWall} updateHeight={updateHeight} />

    </div>
  );
};

export default Editor;