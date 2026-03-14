/* global THREE */

export default class AreaDrawingTool {
    constructor(viewer, onAreaCompleted) {
        this.viewer = viewer;
        this.onAreaCompleted = onAreaCompleted;
        this.names = ['area-drawing-tool'];
        this.active = false;
        
        this.points = [];
        this.meshes = []; 
        
        this.currentZoneType = 'INDOOR'; 
        this.lastSnapPt = null; 
        this.lastEvent = null;
        
        this.orthoEnabled = false;
        this.osnapEnabled = true;

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
    }

    getNames() { return this.names; }
    getName() { return this.names[0]; }

    setZoneType(type) { this.currentZoneType = type; }
    setSnapPoints(points) { /* Ignored - We strictly use native CAD snapping now */ }
    setToggles(ortho, osnap) { 
        this.orthoEnabled = ortho; 
        this.osnapEnabled = osnap; 
    }

    getDom() {
        return this.viewer.clientContainer || this.viewer.container || this.viewer.canvas || document.body;
    }

    activate() {
        if (!this.active) {
            this.active = true;
            this.points = [];
            this.clearVisuals();
            
            const dom = this.getDom();
            if (dom) dom.style.cursor = 'crosshair';
            
            // 🌟 FORCE LOAD AND WAKE UP THE NATIVE CAD SNAPPER
            let snapExt = this.viewer.getExtension('Autodesk.Snapping');
            if (snapExt) {
                snapExt.activate();
            }

            window.addEventListener('keydown', this.onKeyDown);
            window.addEventListener('keyup', this.onKeyUp);
            console.log("🟢 AREA TOOL ACTIVATED - AutoCAD OSnap Engine Armed!");
        }
    }

    deactivate() {
        if (this.active) {
            this.active = false;
            this.clearVisuals();
            
            const dom = this.getDom();
            if (dom) dom.style.cursor = 'default';
            
            window.removeEventListener('keydown', this.onKeyDown);
            window.removeEventListener('keyup', this.onKeyUp);
            console.log("🔴 AREA TOOL DEACTIVATED");
        }
    }

    onKeyDown(e) { 
        if (e.key === 'Escape') {
            if (this.points.length > 0) {
                this.points = []; 
                this.drawDynamicVisuals(null); 
            }
        }
        if (e.key === 'Shift' && this.lastEvent) {
            this.handleMouseMove(this.lastEvent); 
        }
    }

    onKeyUp(e) { 
        if (e.key === 'Shift' && this.lastEvent) {
            this.handleMouseMove(this.lastEvent); 
        }
    }

    clearVisuals() {
        try {
            if (!this.viewer.overlays.hasScene('area-tool-scene')) this.viewer.overlays.addScene('area-tool-scene');
            this.meshes.forEach(m => this.viewer.overlays.removeMesh(m, 'area-tool-scene'));
            this.meshes = [];
            this.viewer.impl.invalidate(true);
        } catch(e) {}
    }

    getProcessedPoint(event) {
        try {
            const dom = this.getDom();
            const rect = dom.getBoundingClientRect();
            
            let cx = event.canvasX !== undefined ? event.canvasX : (event.clientX || event.pointers?.[0]?.clientX) - rect.left;
            let cy = event.canvasY !== undefined ? event.canvasY : (event.clientY || event.pointers?.[0]?.clientY) - rect.top;

            let finalPt = null;
            let isSnapped = false;
            this.lastSnapPt = null;

            // 🧲 1. NATIVE CAD OSNAP (Aggressive Polling)
            if (this.osnapEnabled) {
                const snapExt = this.viewer.getExtension('Autodesk.Snapping');
                if (snapExt && snapExt.snapper) {
                    // Feed the raw event directly into Autodesk's math engine
                    snapExt.snapper.onMouseMove(event); 
                    
                    if (snapExt.snapper.isSnapped()) {
                        const snapRes = snapExt.snapper.getSnapResult();
                        // intersectPoint contains the exact coordinates of the DWG corner/joint
                        if (snapRes && snapRes.intersectPoint) {
                            finalPt = { x: snapRes.intersectPoint.x, y: snapRes.intersectPoint.y, z: 0 };
                            isSnapped = true;
                            this.lastSnapPt = finalPt; // Trigger our Green AutoCAD Square
                        }
                    }
                }
            }

            // 🌐 2. STANDARD RAYCAST (If you click on empty background floor)
            if (!finalPt) {
                const hitTest = this.viewer.impl.hitTest(cx, cy, true);
                if (hitTest && hitTest.intersectPoint) {
                    finalPt = hitTest.intersectPoint;
                } else {
                    const ctw = this.viewer.clientToWorld(cx, cy, true);
                    if (ctw && ctw.x !== undefined) finalPt = ctw;
                    else if (ctw && ctw.point && ctw.point.x !== undefined) finalPt = ctw.point;
                }

                if (!finalPt) {
                    const camera = this.viewer.navigation.getCamera();
                    const normX = (cx / rect.width) * 2 - 1;
                    const normY = -(cy / rect.height) * 2 + 1;
                    const raycaster = new THREE.Raycaster();
                    raycaster.setFromCamera({ x: normX, y: normY }, camera);
                    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
                    finalPt = raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3());
                }
            }

            if (!finalPt || finalPt.x === undefined || finalPt.y === undefined) return null;
            finalPt = { x: finalPt.x, y: finalPt.y, z: 0 };

            // 📐 ORTHO LOGIC
            if (this.orthoEnabled && this.points.length > 0 && !isSnapped) {
                const lastPt = this.points[this.points.length - 1];
                const dx = Math.abs(finalPt.x - lastPt.x);
                const dy = Math.abs(finalPt.y - lastPt.y);
                if (dx > dy) finalPt.y = lastPt.y; 
                else finalPt.x = lastPt.x; 
            }

            return finalPt;
        } catch(e) { return null; }
    }

    handleSingleClick(event, button) {
        if (button !== 0 || !this.active) return false;

        const pt = this.getProcessedPoint(event);
        if (!pt) return false;

        // CLOSING THE SHAPE
        if (this.points.length >= 3) {
            const firstPt = this.points[0];
            const dist = Math.sqrt(Math.pow(pt.x - firstPt.x, 2) + Math.pow(pt.y - firstPt.y, 2));
            
            let closeRadius = 0.6;
            const camera = this.viewer.navigation.getCamera();
            if (camera && camera.isOrthographicCamera) {
                closeRadius = (camera.top - camera.bottom) * 0.04;
            }

            if (dist < closeRadius) { 
                this.onAreaCompleted([...this.points], this.currentZoneType);
                this.points = [];
                this.clearVisuals();
                return true;
            }
        }

        this.points.push(pt);
        this.drawDynamicVisuals(null); 
        return true;
    }

    handleMouseMove(event) {
        if (!this.active) return false;
        this.lastEvent = event;
        
        const pt = this.getProcessedPoint(event);
        if (pt) this.drawDynamicVisuals(pt);
        return false; 
    }

    drawDynamicVisuals(currentMousePt) {
        this.clearVisuals();

        // 🌟 1. AUTOCAD GREEN OSNAP SQUARE (Constant Screen Size)
        if (this.lastSnapPt) {
            const camera = this.viewer.navigation.getCamera();
            let s = 0.15; // Fallback size
            
            // 🌟 MAGIC: The square dynamically resizes itself to stay the exact same pixel size on your monitor!
            if (camera && camera.isOrthographicCamera) {
                s = (camera.top - camera.bottom) * 0.012; 
            }

            const boxGeo = new THREE.Geometry();
            boxGeo.vertices.push(
                new THREE.Vector3(-s, -s, 0),
                new THREE.Vector3(s, -s, 0),
                new THREE.Vector3(s, s, 0),
                new THREE.Vector3(-s, s, 0),
                new THREE.Vector3(-s, -s, 0)
            );
            
            // Bright Green AutoCAD color
            const boxMat = new THREE.LineBasicMaterial({ color: 0x00FF00, linewidth: 2, depthTest: false });
            const box = new THREE.Line(boxGeo, boxMat);
            box.position.set(this.lastSnapPt.x, this.lastSnapPt.y, 0.05);
            this.viewer.overlays.addMesh(box, 'area-tool-scene');
            this.meshes.push(box);
        }

        const pts = [...this.points];
        if (currentMousePt) pts.push(currentMousePt);
        if (pts.length === 0) return;

        // 2. Translucent Fill Polygon
        if (pts.length >= 3) {
            try {
                const shape = new THREE.Shape();
                shape.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
                shape.lineTo(pts[0].x, pts[0].y);

                const shapeGeo = new THREE.ShapeGeometry(shape);
                const shapeMat = new THREE.MeshBasicMaterial({ color: 0x00FF00, opacity: 0.15, transparent: true, depthTest: false, side: THREE.DoubleSide });
                const shapeMesh = new THREE.Mesh(shapeGeo, shapeMat);
                shapeMesh.position.z = 0.01;
                this.viewer.overlays.addMesh(shapeMesh, 'area-tool-scene');
                this.meshes.push(shapeMesh);
            } catch (e) {}
        }

        // 3. Crisp Outline / Rubber Band 
        if (pts.length >= 2) {
            const lineGeo = new THREE.Geometry();
            pts.forEach(p => lineGeo.vertices.push(new THREE.Vector3(p.x, p.y, 0.03)));
            
            const lineMat = new THREE.LineBasicMaterial({ color: 0x00FF00, linewidth: 2, depthTest: false });
            const line = new THREE.Line(lineGeo, lineMat);
            this.viewer.overlays.addMesh(line, 'area-tool-scene');
            this.meshes.push(line);
        }

        // 4. Flat 2D Corner Nodes (Yellow Start Dot)
        const dotGeo = new THREE.CircleGeometry(0.12, 16);
        const startMat = new THREE.MeshBasicMaterial({ color: 0xFFD700, depthTest: false });

        pts.forEach((pt, index) => {
            if (index === 0) { // Only draw the start dot to keep visuals clean
                const dot = new THREE.Mesh(dotGeo, startMat);
                if (pts.length > 2) {
                    dot.scale.set(1.5, 1.5, 1.5); // Make it pulse bigger when ready to close
                    dot.material = new THREE.MeshBasicMaterial({ color: 0x00FF00, depthTest: false });
                }
                dot.position.set(pt.x, pt.y, 0.04);
                this.viewer.overlays.addMesh(dot, 'area-tool-scene');
                this.meshes.push(dot);
            }
        });

        this.viewer.impl.invalidate(true);
    }
}