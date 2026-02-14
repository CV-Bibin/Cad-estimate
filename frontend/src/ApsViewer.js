/* global Autodesk, THREE */
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import WallDrawingTool from './tools/WallDrawingTool'; 

const ApsViewer = forwardRef(({ urn, scaleFactor = 1 }, ref) => {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const toolRef = useRef(null);

  useImperativeHandle(ref, () => ({
    
    updateSettings: (settings) => {
        if (toolRef.current) {
            toolRef.current.setSettings(settings);
            // Ensure Active
            if(settings.isActive === true) {
                if (!viewerRef.current.toolController.getTool(toolRef.current.getName())) {
                     viewerRef.current.toolController.registerTool(toolRef.current);
                }
                viewerRef.current.toolController.activateTool(toolRef.current.getName());
            } else if (settings.isActive === false) {
                viewerRef.current.toolController.deactivateTool(toolRef.current.getName());
            }
        }
    },

    clearWalls: () => {
        if (viewerRef.current) {
            // Remove everything from the custom scene
            // Note: If you have other things in 'custom-scene', clear specifically.
            // For now, simple clear is safest.
            const scene = viewerRef.current.overlays.impl.sceneAfter.children; // Access internal scene array if needed
            // Or simpler API:
            // Viewer doesn't have a direct 'clearScene', we must remove meshes manually or use this trick:
            // Since we re-draw on update, we rely on the parent clearing via state, but here is a safe clear:
            viewerRef.current.overlays.removeScene('custom-scene');
            viewerRef.current.overlays.addScene('custom-scene');
            viewerRef.current.impl.invalidate(true);
        }
    },

    drawSolidWall: (p1, p2, thickness, justification) => {
        if (!viewerRef.current) return;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx*dx + dy*dy);
        
        // VISIBILITY FIX: depthTest: false + Lift Z
        const geometry = new THREE.BoxGeometry(length, thickness, 0.5);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x0000FF, 
            opacity: 0.5, 
            transparent: true, 
            depthTest: false 
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        // Lift Z by 0.5 to prevent Z-fighting
        mesh.position.set(midX, midY, (p1.z + p2.z)/2 + 0.5);
        
        const angle = Math.atan2(dy, dx);
        mesh.rotation.z = angle;

        let offset = 0;
        if (justification === 'LEFT') offset = thickness / 2;
        if (justification === 'RIGHT') offset = -thickness / 2;

        if (offset !== 0) {
            const perpX = -Math.sin(angle) * offset;
            const perpY = Math.cos(angle) * offset;
            mesh.position.x += perpX;
            mesh.position.y += perpY;
        }

        if (!viewerRef.current.overlays.hasScene('custom-scene')) {
             viewerRef.current.overlays.addScene('custom-scene');
        }
        viewerRef.current.overlays.addMesh(mesh, 'custom-scene');
        viewerRef.current.impl.invalidate(true, true, true);
    }
  }));

  const handleWallCreated = (p1, p2, thickness, justification) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx*dx + dy*dy);
      window.dispatchEvent(new CustomEvent('SEMANTIC_WALL_CREATED', { 
        detail: { p1, p2, length, thickness, justification } 
      }));
  };

  const handleWallUpdated = (id, pointType, newPos) => {
      window.dispatchEvent(new CustomEvent('SEMANTIC_WALL_UPDATED', { 
        detail: { id, pointType, newPos } 
      }));
  };

  useEffect(() => {
    if (viewerRef.current) return;

    const options = {
      env: 'AutodeskProduction2',
      api: 'streamingV2',
      getAccessToken: async (cb) => {
         const r = await fetch('http://localhost:3001/api/token');
         const d = await r.json();
         cb(d.access_token, d.expires_in);
      }
    };

    Autodesk.Viewing.Initializer(options, () => {
      if (!containerRef.current) return;
      
      const viewer = new Autodesk.Viewing.GuiViewer3D(containerRef.current);
      viewer.start();
      viewerRef.current = viewer;
      
      viewer.loadExtension('Autodesk.Snapping').then(() => {
          toolRef.current = new WallDrawingTool(viewer, handleWallCreated, handleWallUpdated);
          viewer.toolController.registerTool(toolRef.current);
          if (!viewer.overlays.hasScene('custom-scene')) {
              viewer.overlays.addScene('custom-scene');
          }
      });

      if (urn) {
        Autodesk.Viewing.Document.load(`urn:${urn}`, (doc) => {
          viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()).then(() => {
             viewer.setLightPreset(2);
             viewer.setEnvMapBackground(false);
          });
        });
      }
    });

    return () => { if(viewerRef.current) viewerRef.current.finish(); };
  }, [urn]);

  return <div ref={containerRef} className="w-full h-full absolute top-0 left-0" />;
});

export default ApsViewer;