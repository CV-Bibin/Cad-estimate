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



        drawSolidWall: (wall) => {

            try {

                if (!viewerRef.current || !wall || !wall.points || !wall.points.p1 || !wall.points.p2) return;



                const { p1, p2 } = wall.points;

                const thickness = wall.thickness || 0.23;

                const justification = wall.justification || 'CENTER';

                const height = wall.height || 3.0;

                const openings = wall.openings || [];



                const dx = p2.x - p1.x;

                const dy = p2.y - p1.y;

                const totalLength = Math.sqrt(dx * dx + dy * dy);



                if (totalLength < 0.01 || isNaN(totalLength)) return;



                const angle = Math.atan2(dy, dx);



                // Ensure minimal valid scales

                const viewerThickness = Math.max(0.01, thickness / scaleFactor);

                const viewerHeight = Math.max(0.1, height / scaleFactor);



                const material = new THREE.MeshBasicMaterial({

                    color: 0x1D4ED8, opacity: 0.7, transparent: true, depthTest: false

                });



                let offset = 0;

                if (justification === 'LEFT') offset = viewerThickness / 2;

                if (justification === 'RIGHT') offset = -viewerThickness / 2;

                const perpX = -Math.sin(angle) * offset;

                const perpY = Math.cos(angle) * offset;



                if (!viewerRef.current.overlays.hasScene('custom-scene')) {

                    viewerRef.current.overlays.addScene('custom-scene');

                }



                const addWallBlock = (startDist, endDist, bottomZ, topZ) => {

                    // Force positive dimensions to prevent WebGL collapse

                    const blockLen = Math.max(0.01, Math.abs(endDist - startDist));

                    const blockHeight = Math.max(0.01, Math.abs(topZ - bottomZ));



                    if (isNaN(blockLen) || isNaN(blockHeight)) return;



                    const geom = new THREE.BoxGeometry(blockLen, viewerThickness, blockHeight);

                    const mesh = new THREE.Mesh(geom, material);



                    const midDist = (startDist + endDist) / 2;

                    const blockX = p1.x + Math.cos(angle) * midDist + perpX;

                    const blockY = p1.y + Math.sin(angle) * midDist + perpY;



                    // Force the Z axis base to avoid floating point anomalies below the floor

                    const safeZ = typeof p1.z !== 'undefined' ? p1.z : 0;

                    const blockZ = safeZ + bottomZ + (blockHeight / 2);



                    mesh.position.set(blockX, blockY, blockZ);

                    mesh.rotation.z = angle;

                    mesh.userData = { isWall: true, wallId: wall.id };



                    viewerRef.current.overlays.addMesh(mesh, 'custom-scene');

                };



                const sortedOpenings = [...openings].sort((a, b) => (a.centerDist || 0) - (b.centerDist || 0));



                let currentWallCursor = 0;



                sortedOpenings.forEach(op => {

                    const vCenter = (op.centerDist || 0) / scaleFactor;

                    const vWidth = (op.width || 0.9) / scaleFactor;

                    const vHeight = (op.height || 2.1) / scaleFactor;



                    const opStart = Math.max(currentWallCursor, vCenter - (vWidth / 2));

                    const opEnd = Math.min(totalLength, vCenter + (vWidth / 2));



                    if (opStart > currentWallCursor) {

                        addWallBlock(currentWallCursor, opStart, 0, viewerHeight);

                    }



                    const standardDoorTop = 2.1 / scaleFactor;



                    if (op.type === 'WINDOW') {

                        const sillHeight = standardDoorTop - vHeight;

                        if (sillHeight > 0) addWallBlock(opStart, opEnd, 0, sillHeight);

                        addWallBlock(opStart, opEnd, standardDoorTop, viewerHeight);

                    } else {

                        if (viewerHeight > vHeight) {

                            addWallBlock(opStart, opEnd, vHeight, viewerHeight);

                        }

                    }



                    currentWallCursor = Math.max(currentWallCursor, opEnd);

                });



                if (currentWallCursor < totalLength) {

                    addWallBlock(currentWallCursor, totalLength, 0, viewerHeight);

                }



                viewerRef.current.impl.invalidate(true, true, true);



            } catch (error) {

                console.error("❌ [ApsViewer] SHIELD CAUGHT FATAL ERROR:", error);

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