/* global Autodesk, THREE */
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import AreaDrawingTool from './tools/AreaDrawingTool/AreaDrawingTool';

const StructuralApsViewer = forwardRef(({ urn, scaleFactor = 1, isViewLocked = false }, ref) => {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const areaToolRef = useRef(null); // Holds our tool!

    useImperativeHandle(ref, () => ({
        viewer: viewerRef.current,

        updateSettings: (settings) => {
            if (!viewerRef.current || !viewerRef.current.toolController) return;

            if (settings.activeTool === 'AREA') {
                if (areaToolRef.current) {
                    // 1. Feed all the updated UI states into the tool
                    areaToolRef.current.setMode(settings.areaMode || 'DRAW');
                    areaToolRef.current.setSavedAreas(settings.drawnAreas);
                    areaToolRef.current.setZoneType(settings.zoneType);
                    areaToolRef.current.setToggles(settings.orthoEnabled, settings.osnapEnabled);
                    areaToolRef.current.setEditingAreaId(settings.editingAreaId);
                    areaToolRef.current.setSavedAreas(settings.drawnAreas);
                    
                    if (settings.snapPoints) areaToolRef.current.setSnapPoints(settings.snapPoints);
                    
                    // 2. Register tool if it's missing
                    const toolName = areaToolRef.current.getName();
                    if (!viewerRef.current.toolController.getTool(toolName)) {
                        viewerRef.current.toolController.registerTool(areaToolRef.current);
                    }
                    
                    // 3. Safely activate
                    viewerRef.current.toolController.activateTool(toolName);
                }
            } else {
                // Turn it off
                if (areaToolRef.current) {
                    viewerRef.current.toolController.deactivateTool(areaToolRef.current.getName());
                }
            }
        },

        clearWalls: () => {
            if (viewerRef.current && viewerRef.current.overlays) {
                if (viewerRef.current.overlays.hasScene('custom-scene')) {
                    viewerRef.current.overlays.removeScene('custom-scene');
                    viewerRef.current.overlays.addScene('custom-scene');
                }
                viewerRef.current.impl.invalidate(true);
            }
        },

        clearAreas: () => {
            if (viewerRef.current && viewerRef.current.overlays) {
                if (viewerRef.current.overlays.hasScene('area-scene')) {
                    viewerRef.current.overlays.removeScene('area-scene');
                    viewerRef.current.overlays.addScene('area-scene');
                }
                viewerRef.current.impl.invalidate(true);
            }
        },

        // 🌟 DRAW BLUEPRINT WALLS
        drawSolidWall: (wall, hoveredOpeningId, isActiveFloor = true, isBlueprint = true) => {
            try {
                if (!viewerRef.current || !viewerRef.current.model || !wall || !wall.points || !wall.points.p1 || !wall.points.p2) return;

                const { p1, p2 } = wall.points;
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                if (length < 0.01) return;

                const viewerThickness = wall.thickness / scaleFactor;
                const viewerHeight = (wall.height || 3.0) / scaleFactor;

                const wallColor = 0x91bd19; 
                const wallOpacity = 0.40;

                const wallGeo = new THREE.BoxGeometry(length, viewerThickness, viewerHeight);
                const wallMat = new THREE.MeshBasicMaterial({
                    color: wallColor, opacity: wallOpacity, transparent: true, depthTest: false
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

                if (!viewerRef.current.overlays.hasScene('custom-scene')) {
                    viewerRef.current.overlays.addScene('custom-scene');
                }
                viewerRef.current.overlays.addMesh(wallMesh, 'custom-scene');

                if (wall.openings && wall.openings.length > 0) {
                    wall.openings.forEach(op => {
                        const opWidth = op.width / scaleFactor;
                        const opHeight = op.height / scaleFactor;
                        const opCenter = op.centerDist / scaleFactor;
                        const opThickness = (op.thickness !== undefined ? op.thickness : wall.thickness) / scaleFactor + 0.02;
                        const lintelHeight = (op.sillHeight !== undefined ? op.sillHeight : 2.1) / scaleFactor;
                        const opZ = baseZ + lintelHeight - (opHeight / 2);

                        const opGeo = new THREE.BoxGeometry(opWidth, opThickness, opHeight);
                        const opMat = new THREE.MeshBasicMaterial({
                            color: 0x8a5c36, opacity: 0.40, transparent: true, depthTest: false
                        });

                        const opMesh = new THREE.Mesh(opGeo, opMat);
                        const opX = p1.x + Math.cos(angle) * opCenter + perpX;
                        const opY = p1.y + Math.sin(angle) * opCenter + perpY;

                        opMesh.position.set(opX, opY, opZ);
                        opMesh.rotation.z = angle;

                        viewerRef.current.overlays.addMesh(opMesh, 'custom-scene');
                    });
                }
                viewerRef.current.impl.invalidate(true, true, true);
            } catch (error) {
                console.error("❌ Error drawing blueprint wall:", error);
            }
        },

        // 🌟 DRAW COLORED POLYGONS ON THE FLOOR
        drawSolidArea: (area) => {
            try {
                if (!viewerRef.current || !area || !area.points || area.points.length < 3) return;
                
                const shape = new THREE.Shape();
                shape.moveTo(area.points[0].x, area.points[0].y);
                for(let i=1; i<area.points.length; i++) {
                    shape.lineTo(area.points[i].x, area.points[i].y);
                }
                shape.lineTo(area.points[0].x, area.points[0].y); 

                const geo = new THREE.ShapeGeometry(shape);
                
                let color = 0x3B82F6; // INDOOR (Blue)
                if (area.zoneType === 'PORCH') color = 0xA855F7; 
                if (area.zoneType === 'COURTYARD') color = 0xEAB308; 
                if (area.zoneType === 'VERANDAH') color = 0xF97316; 

                const mat = new THREE.MeshBasicMaterial({ 
                    color: color, opacity: 0.35, transparent: true, side: THREE.DoubleSide, depthTest: false 
                });
                
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.z = 0.05; 

                if (!viewerRef.current.overlays.hasScene('area-scene')) {
                    viewerRef.current.overlays.addScene('area-scene');
                }
                viewerRef.current.overlays.addMesh(mesh, 'area-scene');
                viewerRef.current.impl.invalidate(true, true, true);
            } catch (e) {
                console.error("Error drawing area:", e);
            }
        }
    }));

    // --- VIEWER INITIALIZATION ---
    useEffect(() => {
        if (!urn) return;
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

          areaToolRef.current = new AreaDrawingTool(
                viewer, 
                // Draw Callback
                (points, zoneType) => {
                    window.dispatchEvent(new CustomEvent('AREA_COMPLETED', {
                        detail: { points, zoneType, id: Date.now() + Math.random() }
                    }));
                },
                // 🌟 NEW Edit Callback
                (areaId, newPoints) => {
                    window.dispatchEvent(new CustomEvent('AREA_UPDATED', {
                        detail: { id: areaId, points: newPoints }
                    }));
                }
            );
            viewer.toolController.registerTool(areaToolRef.current);
            console.log("🛠️ ENGINE: Area Tool Registered Successfully!");

            // Now load the document normally
            Autodesk.Viewing.Document.load(`urn:${urn}`,
                (doc) => {
                    try {
                        if (!isActive || !viewerRef.current || !viewerRef.current.impl) return; 

                        const root = doc.getRoot();
                        let viewable = root.getDefaultGeometry();
                        
                        if (!viewable) {
                            const allGeometries = root.search({ 'type': 'geometry' });
                            if (allGeometries && allGeometries.length > 0) viewable = allGeometries[0];
                        }

                        if (!viewable) {
                            setTimeout(() => { if (isActive) loadModel(); }, 3000);
                            return;
                        }
                        
                        viewerRef.current.loadDocumentNode(doc, viewable).then(() => {
                            if (!isActive || !viewerRef.current || !viewerRef.current.impl) return; 
                            viewerRef.current.setLightPreset(2);
                            viewerRef.current.setEnvMapBackground(false);
                        }).catch(() => {});

                    } catch (e) {
                        console.warn("Ghost document gracefully ignored.");
                    }
                },
                (errorCode) => {
                    if (!isActive) return;
                    if (errorCode === 4 || errorCode === 13) {
                        setTimeout(() => { if (isActive) loadModel(); }, 3000);
                    }
                }
            );
        };

        if (!window.APS_INIT_PROMISE) {
            window.APS_INIT_PROMISE = new Promise((resolve) => {
                const options = {
                    env: 'AutodeskProduction2', api: 'streamingV2',
                    getAccessToken: async (cb) => {
                        try {
                            const r = await fetch('http://localhost:3001/api/token');
                            const d = await r.json();
                            cb(d.access_token, d.expires_in);
                        } catch (err) {}
                    }
                };
                Autodesk.Viewing.Initializer(options, () => resolve());
            });
        }

        window.APS_INIT_PROMISE.then(() => {
            if (!isActive) return;
            setTimeout(() => { if (isActive) loadModel(); }, 100);
        });

        return () => {
            isActive = false; 
            if (viewerRef.current) {
                viewerRef.current.finish();
                viewerRef.current = null;
            }
        };
    }, [urn]);

    return <div ref={containerRef} className="w-full h-full absolute top-0 left-0" />;
});

export default StructuralApsViewer;