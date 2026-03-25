/* global Autodesk, THREE */
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import AreaDrawingTool from './tools/AreaDrawingTool/AreaDrawingTool';
import { ColumnDrawingTool } from './tools/ColumnDrawingTool';
import { BeamDrawingTool } from './tools/BeamDrawingTool'; // 🌟 BEAM IMPORT ADDED

const StructuralApsViewer = forwardRef(({ urn, scaleFactor = 1, isViewLocked = false }, ref) => {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const areaToolRef = useRef(null); 

    // 🌟 HELPER: Draw Columns (Box or Upright Cylinder)
    const drawSolidColumnsHelper = (columns) => {
        try {
            if (!viewerRef.current || !viewerRef.current.impl) return;
            const sceneName = 'column-scene';
            
            if (!viewerRef.current.overlays.hasScene(sceneName)) {
                viewerRef.current.overlays.addScene(sceneName);
            }

            // Clean old meshes from memory
            if (viewerRef.current.columnMeshes) {
                viewerRef.current.columnMeshes.forEach(mesh => viewerRef.current.overlays.removeMesh(mesh, sceneName));
            }
            viewerRef.current.columnMeshes = [];

            columns.forEach(col => {
                const height = 3.0 / scaleFactor; 
                const material = new THREE.MeshBasicMaterial({ color: 0xa855f7, depthTest: false }); 
                let mesh;

                if (col.shape === 'CIRCULAR') {
                    const radius = (col.radius || 0.1) / scaleFactor;
                    const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
                    const matrix = new THREE.Matrix4().makeRotationX(Math.PI / 2);
                    geometry.applyMatrix(matrix);

                    mesh = new THREE.Mesh(geometry, material);
                    mesh.position.set(col.x, col.y, height / 2); 
                } else {
                    const width = (col.width || 0.2) / scaleFactor;
                    const depth = (col.depth || 0.2) / scaleFactor;
                    const geometry = new THREE.BoxGeometry(width, depth, height);
                    
                    mesh = new THREE.Mesh(geometry, material);
                    mesh.position.set(col.x, col.y, height / 2); 
                    mesh.rotation.z = col.rotation || 0; 
                }
                
                // 🌟 CRITICAL FIX: Attach the ID and Color so the Highlighter can find it!
                mesh.userData = { id: col.id, originalColor: 0xa855f7, originalOpacity: 1.0 };
                
                viewerRef.current.overlays.addMesh(mesh, sceneName);
                viewerRef.current.columnMeshes.push(mesh);
            });
            viewerRef.current.impl.invalidate(true, true, true);
        } catch (e) {
            console.error("Error drawing columns:", e);
        }
    };

  // 🌟 HELPER: Draw Beams
    const drawSolidBeamsHelper = (beams, hiddenBeamId) => { // 🌟 BRING THIS BACK!
        try {
            if (!viewerRef.current || !viewerRef.current.impl) return;
            const sceneName = 'beam-scene';

            if (!viewerRef.current.overlays.hasScene(sceneName)) {
                viewerRef.current.overlays.addScene(sceneName);
            }

            // Clean old meshes from memory
            if (viewerRef.current.beamMeshes) {
                viewerRef.current.beamMeshes.forEach(mesh => {
                    viewerRef.current.overlays.removeMesh(mesh, sceneName);
                });
            }
            viewerRef.current.beamMeshes = [];

            beams.forEach(beam => {
                // 🌟 THE MISSING LINK: Stop React from redrawing the green beam while we drag it!
                if (hiddenBeamId && String(beam.id) === String(hiddenBeamId)) return;

                const dx = beam.p2.x - beam.p1.x;
                const dy = beam.p2.y - beam.p1.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const angle = Math.atan2(dy, dx);
                
                const width = (beam.width || 0.2) / scaleFactor;
                const depth = (beam.beamType === 'CONCEALED' ? 0.12 : (beam.depth || 0.3)) / scaleFactor;
                const ceilingZ = (3.0 - ((beam.beamType === 'CONCEALED' ? 0.12 : (beam.depth || 0.3)) / 2)) / scaleFactor;

                let offsetDist = 0;
                if (beam.justification === 'LEFT') offsetDist = width / 2;
                if (beam.justification === 'RIGHT') offsetDist = -width / 2;
                
                const perpX = -Math.sin(angle) * offsetDist;
                const perpY = Math.cos(angle) * offsetDist;

                const midX = ((beam.p1.x + beam.p2.x) / 2) + perpX;
                const midY = ((beam.p1.y + beam.p2.y) / 2) + perpY;

                const geometry = new THREE.BoxGeometry(dist, width, depth);
                const material = new THREE.MeshBasicMaterial({ 
                    color: 0x22c55e, 
                    transparent: beam.beamType === 'CONCEALED',
                    opacity: beam.beamType === 'CONCEALED' ? 0.4 : 1.0, 
                    depthTest: false 
                }); 
                const mesh = new THREE.Mesh(geometry, material);
                
                // Keep this! The tool still uses it for the instant-hide.
                mesh.userData = { 
                    id: beam.id, 
                    originalColor: 0x22c55e, 
                    originalOpacity: beam.beamType === 'CONCEALED' ? 0.4 : 1.0 
                };
                
                mesh.position.set(midX, midY, ceilingZ); 
                mesh.rotation.z = angle;
                
                viewerRef.current.overlays.addMesh(mesh, sceneName);
                viewerRef.current.beamMeshes.push(mesh);
            });
            viewerRef.current.impl.invalidate(true, true, true);
        } catch (e) { console.error("Error drawing beams:", e); }
    };

    
   useImperativeHandle(ref, () => ({
        viewer: viewerRef.current,

        // 🌟 ADD THIS BRAND NEW FUNCTION:
        highlightElement: (id) => {
            if (!viewerRef.current || !viewerRef.current.impl) return;
            const highlightColor = 0xeab308; // Bright Yellow

            const applyHighlight = (meshes) => {
                if (!meshes) return;
                meshes.forEach(mesh => {
                    if (mesh.userData && mesh.userData.id) {
                        if (id && String(mesh.userData.id) === String(id)) {
                            mesh.material.color.setHex(highlightColor);
                            mesh.material.opacity = 1.0; // Make solid yellow
                        } else {
                            mesh.material.color.setHex(mesh.userData.originalColor);
                            mesh.material.opacity = mesh.userData.originalOpacity;
                        }
                    }
                });
            };

            applyHighlight(viewerRef.current.columnMeshes);
            applyHighlight(viewerRef.current.beamMeshes);
            viewerRef.current.impl.invalidate(true, true, true);
        },

        updateSettings: (settings) => {
            if (!viewerRef.current || !viewerRef.current.toolController) return;

            // --- 1. AREA TOOL LOGIC ---
            if (settings.activeTool === 'AREA') {
                if (areaToolRef.current) {
                    areaToolRef.current.setMode(settings.areaMode || 'DRAW');
                    areaToolRef.current.setSavedAreas(settings.drawnAreas);
                    areaToolRef.current.setZoneType(settings.zoneType);
                    areaToolRef.current.setToggles(settings.orthoEnabled, settings.osnapEnabled);
                    areaToolRef.current.setEditingAreaId(settings.editingAreaId);
                    
                    const toolName = areaToolRef.current.getName();
                    if (!viewerRef.current.toolController.getTool(toolName)) {
                        viewerRef.current.toolController.registerTool(areaToolRef.current);
                    }
                    viewerRef.current.toolController.activateTool(toolName);
                }
            } else {
                if (areaToolRef.current) viewerRef.current.toolController.deactivateTool(areaToolRef.current.getName());
            }

            // --- 2. COLUMN TOOL LOGIC ---
            if (!viewerRef.current.toolController.getTool('column-drawing-tool')) {
                const colTool = new ColumnDrawingTool(viewerRef.current);
                viewerRef.current.toolController.registerTool(colTool);
            }

            const colTool = viewerRef.current.toolController.getTool('column-drawing-tool');
            if (colTool) {
                if (colTool.setToggles) colTool.setToggles(settings.orthoEnabled, settings.osnapEnabled);
                if (colTool.setScaleFactor) colTool.setScaleFactor(scaleFactor);
                if (colTool.updateSnapPoints) colTool.updateSnapPoints(settings.snapPoints || []);
            }

            if (settings.activeTool && settings.activeTool.startsWith('COLUMN')) {
                const mode = settings.activeTool.split('_')[1]; 
                if (colTool) colTool.setColumnMode(mode);
                viewerRef.current.toolController.activateTool('column-drawing-tool');
            } else {
                viewerRef.current.toolController.deactivateTool('column-drawing-tool');
            }

            // --- 3. BEAM TOOL LOGIC ---
            if (!viewerRef.current.toolController.getTool('beam-drawing-tool')) {
                const beamTool = new BeamDrawingTool(viewerRef.current);
                viewerRef.current.toolController.registerTool(beamTool);
            }
            const beamTool = viewerRef.current.toolController.getTool('beam-drawing-tool');
            if (beamTool) {
                if (beamTool.setScaleFactor) beamTool.setScaleFactor(scaleFactor);
                if (beamTool.updateSnapPoints) beamTool.updateSnapPoints(settings.snapPoints || []);
                if (beamTool.setToggles) beamTool.setToggles(settings.orthoEnabled, settings.osnapEnabled);
                beamTool.justification = settings.beamJustification || 'CENTER';

                // 🌟 PASS EDIT MODE AND BEAMS INTO THE TOOL
                if (beamTool.setPlacedBeams) beamTool.setPlacedBeams(settings.placedBeams || []);
                if (beamTool.setMode) beamTool.setMode(settings.activeTool === 'BEAM_EDIT' ? 'EDIT' : 'DRAW');
            }

            // 🌟 ACTIVATE FOR BOTH DRAW AND EDIT MODES
            if (settings.activeTool === 'BEAM_DRAW' || settings.activeTool === 'BEAM_EDIT') {
                viewerRef.current.toolController.activateTool('beam-drawing-tool');
            } else {
                viewerRef.current.toolController.deactivateTool('beam-drawing-tool');
            }

          // --- 4. DRAW PLACED ELEMENTS ---
         if (settings.placedColumns && viewerRef.current) {
             drawSolidColumnsHelper(settings.placedColumns);
         }
         if (settings.placedBeams && viewerRef.current) {
             // 🌟 ADD "settings.editingBeamId" HERE!
             drawSolidBeamsHelper(settings.placedBeams, settings.editingBeamId); 
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
                
                let color = 0x3B82F6; 
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
                (points, zoneType) => {
                    window.dispatchEvent(new CustomEvent('AREA_COMPLETED', {
                        detail: { points, zoneType, id: Date.now() + Math.random() }
                    }));
                },
                (areaId, newPoints) => {
                    window.dispatchEvent(new CustomEvent('AREA_UPDATED', {
                        detail: { id: areaId, points: newPoints }
                    }));
                }
            );
            viewer.toolController.registerTool(areaToolRef.current);

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

                    } catch (e) {}
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