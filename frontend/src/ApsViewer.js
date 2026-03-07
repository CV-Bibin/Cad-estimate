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



        drawSolidWall: (wall, hoveredOpeningId) => {
            try {
                if (!viewerRef.current || !wall || !wall.points || !wall.points.p1 || !wall.points.p2) return;

                const { p1, p2 } = wall.points;
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;

                // 🌟 FIX: Length is calculated in raw CAD coordinates so it draws full-length
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                if (length < 0.01) return;

                const viewerThickness = wall.thickness / scaleFactor;
                const viewerHeight = (wall.height || 3.0) / scaleFactor;

                // --- 1. DRAW THE SOLID BLUE WALL ---
                // We draw one continuous block from Point A to Point B
                const wallGeo = new THREE.BoxGeometry(length, viewerThickness, viewerHeight);
                const wallMat = new THREE.MeshBasicMaterial({
                    color: 0x3B82F6, opacity: 0.4, transparent: true, depthTest: false
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

                        let opZ = baseZ + (opHeight / 2);
                        let opColor;

                        // 🌟 THESE ARE THE TWO CRITICAL LINES THAT WERE MISSING 🌟
                        const isHovered = op.id === hoveredOpeningId;
                        const opOpacity = isHovered ? 1.0 : 0.8;

                        if (isHovered) {
                            opColor = 0xFFB700; // 🌟 HIGHLIGHT COLOR
                        } else {
                            // 🎨 ASSIGN DISTINCT COLORS BASED ON TYPE
                            switch (op.type) {
                                case 'WINDOW':
                                    opColor = 0x00FFFF; // Cyan
                                    const sillHeight = 0.9 / scaleFactor;
                                    opZ = baseZ + sillHeight + (opHeight / 2); // Windows sit higher
                                    break;
                                case 'DOOR':
                                    opColor = 0x8B4513; // SaddleBrown
                                    break;
                                case 'ARCH':
                                    opColor = 0x9370DB; // MediumPurple
                                    break;
                                case 'RECT_ARCH':
                                case 'RECT ARCH': 
                                    opColor = 0xFF69B4; // HotPink
                                    break;
                                case 'GRILL':
                                    opColor = 0xFFD700; // Gold/Yellow
                                    break;
                                default:
                                    opColor = 0x888888; // Gray fallback
                            }
                        }

                        const opGeo = new THREE.BoxGeometry(opWidth, opThickness, opHeight);
                        const opMat = new THREE.MeshBasicMaterial({
                            // 🌟 THIS NOW USES opOpacity INSTEAD OF HARDCODED 0.8
                            color: opColor, opacity: opOpacity, transparent: true, depthTest: false
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