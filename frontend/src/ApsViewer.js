/* global Autodesk, THREE */
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import WallDrawingTool from './tools/WallDrawingTool/WallDrawingTool';

const ApsViewer = forwardRef(({ urn, scaleFactor = 1, isViewLocked = false }, ref) => {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const toolRef = useRef(null);

    useImperativeHandle(ref, () => ({
        
        // --- 1. CRITICAL FIX: EXPOSE VIEWER INSTANCE ---
        viewer: viewerRef.current, 
        // -----------------------------------------------

        updateSettings: (settings) => {
            if (toolRef.current) {
                toolRef.current.setSettings(settings);
                // Ensure Active
                if (settings.isActive === true) {
                    if (!viewerRef.current.toolController.getTool(toolRef.current.getName())) {
                        viewerRef.current.toolController.registerTool(toolRef.current);
                    }
                    viewerRef.current.toolController.activateTool(toolRef.current.getName());
                } else if (settings.isActive === false) {
                    viewerRef.current.toolController.deactivateTool(toolRef.current.getName());
                }
            }
        },

        // --- NEW: Expose Highlight Function ---
        highlightWall: (id) => {
            if (toolRef.current && toolRef.current.highlightWallById) {
                toolRef.current.highlightWallById(id);
            }
        },
        // --------------------------------------

        clearWalls: () => {
            if (viewerRef.current) {
                // Clear the scene to redraw fresh walls from React state
                if (viewerRef.current.overlays.hasScene('custom-scene')) {
                    viewerRef.current.overlays.removeScene('custom-scene');
                    viewerRef.current.overlays.addScene('custom-scene');
                }
                viewerRef.current.impl.invalidate(true);
            }
        },

       drawSolidWall: (p1, p2, thickness, justification) => {
    if (!viewerRef.current) return;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // --- CRITICAL FIX: MUST BE DIVISION ( / ) ---
    // Real World Length = Viewer Units * Scale Factor
    // Therefore: Viewer Units = Real World Length / Scale Factor
    const viewerThickness = thickness / scaleFactor; 

    const geometry = new THREE.BoxGeometry(length, viewerThickness, 0.5);
    const material = new THREE.MeshBasicMaterial({
        color: 0x0000FF,
        opacity: 0.5,
        transparent: true,
        depthTest: false 
    });

    const mesh = new THREE.Mesh(geometry, material);
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const midZ = (p1.z + p2.z) / 2 + 0.5;

    let offset = 0;
    if (justification === 'LEFT') offset = viewerThickness / 2;
    if (justification === 'RIGHT') offset = -viewerThickness / 2;

    const perpX = -Math.sin(angle) * offset;
    const perpY = Math.cos(angle) * offset;

    mesh.position.set(midX + perpX, midY + perpY, midZ);
    mesh.rotation.z = angle;

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
        const length = Math.sqrt(dx * dx + dy * dy);
        window.dispatchEvent(new CustomEvent('SEMANTIC_WALL_CREATED', {
            detail: { p1, p2, length, thickness, justification }
        }));
    };

    const handleWallUpdated = (id, pointType, newPos) => {
        window.dispatchEvent(new CustomEvent('SEMANTIC_WALL_UPDATED', {
            detail: { id, pointType, newPos }
        }));
    };

    const handleWallDeleted = (id) => {
        window.dispatchEvent(new CustomEvent('SEMANTIC_WALL_DELETED', {
            detail: { id }
        }));
    };

    // --- NEW: VIEWPORT NAVIGATION LOCK ---
    useEffect(() => {
        if (viewerRef.current) {
            // Locks/unlocks zoom, pan, and orbit
            viewerRef.current.setNavigationLock(isViewLocked);
            
            // Visual feedback via cursor change
            if (isViewLocked) {
                viewerRef.current.canvas.style.cursor = 'not-allowed';
            } else {
                viewerRef.current.canvas.style.cursor = 'default';
            }
        }
    }, [isViewLocked]);

    // --- UPDATED: PREVENT DOUBLE INITIALIZATION BUG ---
    useEffect(() => {
        // Only run if URN exists
        if (!urn) return;

        // Helper function to build the viewer and load the document
        const loadModel = () => {
            if (!containerRef.current) return;

            // 1. CLEANUP PREVIOUS INSTANCE (Important for loading new files)
            if (viewerRef.current) {
                viewerRef.current.finish();
                viewerRef.current = null;
            }

            // 2. START NEW INSTANCE
            const viewer = new Autodesk.Viewing.GuiViewer3D(containerRef.current);
            viewer.start();
            viewerRef.current = viewer;

            // 3. LOAD TOOLS
            viewer.loadExtension('Autodesk.Snapping').then(() => {
                toolRef.current = new WallDrawingTool(
                    viewer, 
                    handleWallCreated, 
                    handleWallUpdated, 
                    handleWallDeleted 
                );
                viewer.toolController.registerTool(toolRef.current);
                
                if (!viewer.overlays.hasScene('custom-scene')) {
                    viewer.overlays.addScene('custom-scene');
                }
            });

            // 4. LOAD DOCUMENT WITH ERROR CATCHING
            Autodesk.Viewing.Document.load(`urn:${urn}`, 
                (doc) => {
                    const defaultModel = doc.getRoot().getDefaultGeometry();
                    viewer.loadDocumentNode(doc, defaultModel).then(() => {
                        viewer.setLightPreset(2);
                        viewer.setEnvMapBackground(false);
                    });
                },
                (errorCode, errorMsg) => {
                    console.error(`❌ Load Error [${errorCode}]: ${errorMsg}`);
                }
            );
        };

        // CHECK IF AUTODESK IS ALREADY INITIALIZED IN THIS BROWSER TAB
        if (window.APS_IS_INITIALIZED) {
            // If yes, just load the new model
            loadModel();
        } else {
            // If no, initialize Autodesk first, then load the model
            const options = {
                env: 'AutodeskProduction2',
                api: 'streamingV2',
                getAccessToken: async (cb) => {
                    try {
                        const r = await fetch('http://localhost:3001/api/token');
                        if (!r.ok) throw new Error("Token fetch failed");
                        const d = await r.json();
                        cb(d.access_token, d.expires_in);
                    } catch (err) {
                        console.error("❌ Token Error:", err);
                    }
                }
            };

            Autodesk.Viewing.Initializer(options, () => {
                window.APS_IS_INITIALIZED = true; // Set global flag so it never runs again
                loadModel();
            });
        }

        // 5. UNMOUNT CLEANUP
        return () => { 
            if (viewerRef.current) {
                viewerRef.current.finish();
                viewerRef.current = null;
            }
        };
    }, [urn]);

    return <div ref={containerRef} className="w-full h-full absolute top-0 left-0" />;
});

export default ApsViewer;