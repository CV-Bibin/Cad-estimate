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

           if (viewerRef.current && viewerRef.current.overlays) {

                // Clear the scene to redraw fresh walls from React state

                if (viewerRef.current.overlays.hasScene('custom-scene')) {

                    viewerRef.current.overlays.removeScene('custom-scene');

                    viewerRef.current.overlays.addScene('custom-scene');

                }

                viewerRef.current.impl.invalidate(true);

            }

        },



        drawSolidWall: (wall, hoveredOpeningId, isActiveFloor = true) => {
            try {
               if (!viewerRef.current || !viewerRef.current.model || !wall || !wall.points || !wall.points.p1 || !wall.points.p2) return; // 🌟 STOPS DRAWING CRASHES

                const { p1, p2 } = wall.points;
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;

                // 🌟 FIX: Length is calculated in raw CAD coordinates so it draws full-length
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                if (length < 0.01) return;

                const viewerThickness = wall.thickness / scaleFactor;
                const viewerHeight = (wall.height || 3.0) / scaleFactor;

                // 🌟 NEW: DYNAMIC COLOR LOGIC FOR FLOORS
                let wallColor = 0x3B82F6; // Default Active Blue
                let wallOpacity = 0.4;
                let depthConfig = false;

                if (!isActiveFloor) {
                    wallColor = 0x555555; // Faded Dark Grey for inactive floors
                    wallOpacity = 0.15;   // Very transparent (Tracing paper effect)
                    depthConfig = true;   // Pushes it slightly back visually
                }

                // --- 1. DRAW THE SOLID WALL ---
                const wallGeo = new THREE.BoxGeometry(length, viewerThickness, viewerHeight);
                const wallMat = new THREE.MeshBasicMaterial({
                    color: wallColor, opacity: wallOpacity, transparent: true, depthTest: depthConfig
                });

                const wallMesh = new THREE.Mesh(wallGeo, wallMat);

                let offset = 0;
                if (wall.justification === 'LEFT') offset = viewerThickness / 2;
                if (wall.justification === 'RIGHT') offset = -viewerThickness / 2;

                const perpX = -Math.sin(angle) * offset;
                const perpY = Math.cos(angle) * offset;

                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                const baseZ = typeof p1.z !== 'undefined' ? p1.z : 0;
                const midZ = baseZ + (viewerHeight / 2);

                wallMesh.position.set(midX + perpX, midY + perpY, midZ);
                wallMesh.rotation.z = angle;
                wallMesh.userData = { isWall: true, wallId: wall.id };

                if (!viewerRef.current.overlays.hasScene('custom-scene')) {
                    viewerRef.current.overlays.addScene('custom-scene');
                }
                viewerRef.current.overlays.addMesh(wallMesh, 'custom-scene');

                // --- 2. "PAINT" THE OPENINGS OVER THE WALL ---
                if (wall.openings && wall.openings.length > 0) {
                    wall.openings.forEach(op => {
                        const opWidth = op.width / scaleFactor;
                        const opHeight = op.height / scaleFactor;
                        const opCenter = op.centerDist / scaleFactor;

                        // 1. Get the custom thickness from the opening (fallback to wall thickness if missing)
                        const logicalOpThickness = (op.thickness !== undefined ? op.thickness : wall.thickness) / scaleFactor;

                        // 2. Add a tiny 0.02m bump visually so it doesn't flicker against the blue wall
                        const opThickness = logicalOpThickness + 0.02;

                        // 🌟 RESTORED SILL/LINTEL MATH: Perfectly floats windows off the floor!
                        const lintelHeight = (op.sillHeight !== undefined ? op.sillHeight : 2.1) / scaleFactor;
                        const opZ = baseZ + lintelHeight - (opHeight / 2);

                        let opColor;
                        const isHovered = op.id === hoveredOpeningId;
                        let opOpacity = isHovered ? 1.0 : 0.8;

                        // 🌟 NEW: FADE OUT OPENINGS ON INACTIVE FLOORS
                        if (!isActiveFloor) {
                            opColor = 0x666666; // Faded Gray to match inactive wall
                            opOpacity = 0.15;
                        } else if (isHovered) {
                            opColor = 0xFFB700; // 🌟 HIGHLIGHT COLOR
                        } else {
                            // 🎨 ASSIGN DISTINCT COLORS BASED ON TYPE
                            switch (op.type) {
                                case 'WINDOW': opColor = 0x00FFFF; break;
                                case 'DOOR': opColor = 0x8B4513; break;
                                case 'ARCH': opColor = 0x9370DB; break;
                                case 'RECT_ARCH':
                                case 'RECT ARCH': opColor = 0xFF69B4; break;
                                case 'GRILL': opColor = 0xFFD700; break;
                                default: opColor = 0x888888;
                            }
                        }

                        const opGeo = new THREE.BoxGeometry(opWidth, opThickness, opHeight);
                        const opMat = new THREE.MeshBasicMaterial({
                            color: opColor, opacity: opOpacity, transparent: true, depthTest: depthConfig
                        });

                        const opMesh = new THREE.Mesh(opGeo, opMat);

                        // Calculate the exact X/Y position sliding along the wall angle
                        const opX = p1.x + Math.cos(angle) * opCenter + perpX;
                        const opY = p1.y + Math.sin(angle) * opCenter + perpY;

                        opMesh.position.set(opX, opY, opZ);
                        opMesh.rotation.z = angle;

                        viewerRef.current.overlays.addMesh(opMesh, 'custom-scene');
                    });
                }

                viewerRef.current.impl.invalidate(true, true, true);

            } catch (error) {
                console.error("❌ [ApsViewer] Error drawing wall:", error);
            }
        },

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
        if (!urn) return;

        // 🌟 MAGIC CHANGE 1: Create the kill-switch flag
        let isActive = true;

        const loadModel = () => {
            if (!containerRef.current) return;

            if (viewerRef.current) {
                viewerRef.current.finish();
                viewerRef.current = null;
            }

            const viewer = new Autodesk.Viewing.GuiViewer3D(containerRef.current);
            viewer.start();
            viewerRef.current = viewer;

            // 3. LOAD TOOLS (Wrapped to silence React popups)
            viewer.loadExtension('Autodesk.Snapping').then(() => {
                try {
                    // 🌟 MAGIC CHANGE 2: Abort if user left or viewer is gone
                    if (!isActive || !viewerRef.current || !viewerRef.current.toolController) return;

                    toolRef.current = new WallDrawingTool(
                        viewer, handleWallCreated, handleWallUpdated, handleWallDeleted
                    );
                    
                    // 🌟 MAGIC CHANGE 3: Optional Chaining (?.) stops 'null' crashes instantly
                    viewerRef.current.toolController?.registerTool?.(toolRef.current);

                    if (!viewerRef.current.overlays?.hasScene('custom-scene')) {
                        viewerRef.current.overlays?.addScene('custom-scene');
                    }
                } catch (e) {
                    console.warn("⚠️ Ghost tool gracefully ignored.");
                }
            }).catch(() => {});

           // 4. LOAD DOCUMENT (With Auto-Retry for New Uploads)
            Autodesk.Viewing.Document.load(`urn:${urn}`,
                (doc) => {
                    try {
                        if (!isActive || !viewerRef.current || !viewerRef.current.impl) return; 

                        const root = doc.getRoot();
                        let viewable = root.getDefaultGeometry();
                        
                        if (!viewable) {
                            const allGeometries = root.search({ 'type': 'geometry' });
                            if (allGeometries && allGeometries.length > 0) {
                                viewable = allGeometries[0];
                            }
                        }

                        // 🌟 THE FIX: AUTO-RETRY LOOP
                        // If Autodesk is still converting the file, wait 3 seconds and ask again!
                        if (!viewable) {
                            console.warn("⏳ Autodesk is still converting the file. Retrying in 3 seconds...");
                            setTimeout(() => {
                                if (isActive) loadModel(); // Silently restart the load process
                            }, 3000);
                            return;
                        }
                        
                        viewerRef.current.loadDocumentNode(doc, viewable).then(() => {
                            if (!isActive || !viewerRef.current || !viewerRef.current.impl) return; 
                            
                            viewerRef.current.setLightPreset(2);
                            viewerRef.current.setEnvMapBackground(false);
                        }).catch(() => {});

                    } catch (e) {
                        console.warn("⚠️ Ghost document gracefully ignored. Details:", e);
                    }
                },
                (errorCode, errorMsg) => {
                    if (!isActive) return;
                    console.error(`❌ Load Error [${errorCode}]: ${errorMsg}`);
                    
                    // 🌟 SECOND RETRY LOOP: Error Code 4 literally means "Still Translating"
                    if (errorCode === 4 || errorCode === 13) {
                        console.warn("⏳ Translation in progress in the cloud. Retrying in 3 seconds...");
                        setTimeout(() => {
                            if (isActive) loadModel();
                        }, 3000);
                    }
                }
            );
        };
// 🌟 ULTIMATE STRICT-MODE FIX: The Promise Waiting Room
        // This ensures Autodesk's engine is only ever booted up ONCE.
        if (!window.APS_INIT_PROMISE) {
            window.APS_INIT_PROMISE = new Promise((resolve) => {
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
                    resolve(); // Unlock the door! The engine is fully awake.
                });
            });
        }

        // Wait for the engine to be awake, THEN load the CAD file
        window.APS_INIT_PROMISE.then(() => {
            if (!isActive) return;
            // 🌟 100ms delay gives the browser time to physically draw the container div
            setTimeout(() => {
                if (isActive) loadModel();
            }, 100);
        });
        
        // 5. UNMOUNT CLEANUP
        return () => {
            // 🌟 MAGIC CHANGE 5: Flip the kill-switch when you click Dashboard
            isActive = false; 
            
            if (viewerRef.current) {
                viewerRef.current.finish();
                viewerRef.current = null;
            }
        };
    }, [urn]);


    return <div ref={containerRef} className="w-full h-full absolute top-0 left-0" />;

});



export default ApsViewer;