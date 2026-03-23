/* global Autodesk, THREE */

export class ColumnDrawingTool {
    constructor(viewer) {
        this.viewer = viewer;
        this.names = ['column-drawing-tool'];
        this.active = false;
        
        // Settings
        this.orthoEnabled = false;
        this.osnapEnabled = true;
        this.scaleFactor = 1; 
        this.columnMode = 'FREE'; // 🌟 'FREE', 'ORTHO', or 'CIRCULAR'

        // Draw Mode Data
        this.points = [];
        this.redoPoints = [];
        this.meshes = []; 

        this.snapper = null;
        this.osnapMesh = null;

        this.onKeyDown = this.onKeyDown.bind(this);
    }

    getNames() { return this.names; }
    getName() { return this.names[0]; }
    setToggles(ortho, osnap) { this.orthoEnabled = ortho; this.osnapEnabled = osnap; }
    setScaleFactor(sf) { this.scaleFactor = sf || 1; }
    
    // 🌟 Set the active drawing mode
    setColumnMode(mode) { 
        this.columnMode = mode; 
        this.points = []; 
        this.clearVisuals(); 
    }

    activate() {
        if (this.active) return;
        this.active = true;
        this.points = [];
        this.redoPoints = [];
        this.clearVisuals();
        
        if (this.viewer.canvas) this.viewer.canvas.style.cursor = 'crosshair';

        if (this.osnapEnabled) {
            this.snapper = new Autodesk.Viewing.Extensions.Snapping.Snapper(this.viewer, {
                renderSnappedGeometry: true, renderSnappedTopology: true, markupMode: false, snapFilter: 2 | 1 | 4 | 32
            });
            this.viewer.toolController.activateTool(this.snapper.getName());
        }
        window.addEventListener('keydown', this.onKeyDown);
    }

    deactivate() {
        if (!this.active) return;
        this.active = false;
        this.clearVisuals();
        if (this.viewer.canvas) this.viewer.canvas.style.cursor = 'default';
        if (this.snapper) {
            this.viewer.toolController.deactivateTool(this.snapper.getName());
            this.snapper = null;
        }
        window.removeEventListener('keydown', this.onKeyDown);
    }

    onKeyDown(event) {
        const isCtrl = event.ctrlKey || event.metaKey; 
        if (event.key === 'Escape') { this.points = []; this.redoPoints = []; this.clearVisuals(); }
        if (isCtrl && event.key.toLowerCase() === 'z') {
            if (this.points.length > 0) {
                event.preventDefault();
                this.redoPoints.push(this.points.pop());     
                this.drawDynamicVisuals(null);       
            }
        }
        if (isCtrl && event.key.toLowerCase() === 'y') {
            if (this.redoPoints.length > 0) {
                event.preventDefault();
                this.points.push(this.redoPoints.pop());             
                this.drawDynamicVisuals(null);                
            }
        }
    }

    clearVisuals() {
        if (!this.viewer.overlays.hasScene('column-tool-scene')) this.viewer.overlays.addScene('column-tool-scene');
        this.meshes.forEach(m => this.viewer.overlays.removeMesh(m, 'column-tool-scene'));
        this.meshes = [];
        if (this.osnapMesh) {
            this.viewer.overlays.removeMesh(this.osnapMesh, 'column-tool-scene');
            this.osnapMesh = null;
        }
        this.viewer.impl.invalidate(true, true, true);
    }

    getBestPoint(event) {
        let pt = null;
        if (this.osnapEnabled && this.snapper && this.snapper.isSnapped()) {
            const res = this.snapper.getSnapResult();
            if (res.geomVertex) pt = res.geomVertex;
            else if (res.intersectPoint) pt = res.intersectPoint;
        }
        if (!pt) {
            const hit = this.viewer.impl.hitTest(event.canvasX, event.canvasY, true);
            if (hit) pt = hit.intersectPoint;
            else pt = this.viewer.impl.intersectGround(event.canvasX, event.canvasY);
        }
        if (!pt) return null;

        let finalPt = { x: pt.x, y: pt.y, z: pt.z || 0 };

        // Ortho override only applies in Free mode
        if (this.orthoEnabled && this.points.length > 0 && this.columnMode === 'FREE') {
            const lastPt = this.points[this.points.length - 1];
            if (Math.abs(finalPt.x - lastPt.x) > Math.abs(finalPt.y - lastPt.y)) {
                finalPt.y = lastPt.y; 
            } else {
                finalPt.x = lastPt.x; 
            }
        }
        return finalPt;
    }

    drawOsnapIndicator(pos, snapType) {
        if (this.osnapMesh) {
            this.viewer.overlays.removeMesh(this.osnapMesh, 'column-tool-scene');
            this.osnapMesh = null;
        }
        if (!pos || snapType === 'none') return;
        const dist = this.viewer.impl.camera.position.distanceTo(pos);
        const size = dist * 0.005; 
        const color = snapType === 'midpoint' ? 0x00FFFF : 0x00FF00;
        let geom = snapType === 'midpoint' ? new THREE.CylinderGeometry(size, size, 0.01, 3) : new THREE.BoxGeometry(size * 1.5, size * 1.5, 0.01);
        if (snapType === 'midpoint') geom.rotateX(Math.PI / 2);
        
        this.osnapMesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.6 }));
        this.osnapMesh.position.set(pos.x, pos.y, 0.05 / this.scaleFactor); 
        this.viewer.overlays.addMesh(this.osnapMesh, 'column-tool-scene');
    }

    handleMouseMove(event) {
        if (!this.active) return false;
        if (this.snapper) this.snapper.handleMouseMove(event);

        let snapType = 'none';
        if (this.snapper && this.snapper.isSnapped()) snapType = this.snapper.getSnapResult().geomType === 2 ? 'midpoint' : 'endpoint';

        const pt = this.getBestPoint(event);
        if (pt) this.drawOsnapIndicator(pt, snapType);

        if (pt) this.drawDynamicVisuals(pt);
        return false; 
    }

    // Math for 3-Point Free Column
    calculateOrientedColumn(p0, p1, p2) {
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const width = Math.max(0.01, Math.sqrt(dx * dx + dy * dy)); 
        const angle = Math.atan2(dy, dx);
        const nx = -Math.sin(angle);
        const ny = Math.cos(angle);
        const vx = p2.x - p0.x;
        const vy = p2.y - p0.y;
        const depthRaw = (vx * nx) + (vy * ny);
        const depth = Math.max(0.01, Math.abs(depthRaw));
        const midBaseX = (p0.x + p1.x) / 2;
        const midBaseY = (p0.y + p1.y) / 2;
        const shiftDir = depthRaw >= 0 ? 1 : -1; 
        const centerX = midBaseX + (nx * (depth / 2) * shiftDir);
        const centerY = midBaseY + (ny * (depth / 2) * shiftDir);
        return { centerX, centerY, width, depth, angle };
    }

    handleSingleClick(event, button) {
        if (button !== 0 || !this.active) return false;

        const pt = this.getBestPoint(event);
        if (!pt) return false;

        this.points.push(pt);

        // 🌟 ROUTING LOGIC based on tool mode
        if (this.columnMode === 'ORTHO') {
            if (this.points.length === 2) {
                const minX = Math.min(this.points[0].x, this.points[1].x);
                const maxX = Math.max(this.points[0].x, this.points[1].x);
                const minY = Math.min(this.points[0].y, this.points[1].y);
                const maxY = Math.max(this.points[0].y, this.points[1].y);

                const width = (maxX - minX) * this.scaleFactor;
                const depth = (maxY - minY) * this.scaleFactor;
                
                if (width >= 0.02 && depth >= 0.02) {
                    window.dispatchEvent(new CustomEvent('COLUMN_PLACED', {
                        detail: { x: (minX+maxX)/2, y: (minY+maxY)/2, width, depth, rotation: 0, shape: 'ORTHO' }
                    }));
                }
                this.points = []; this.clearVisuals(); return true;
            }
        } 
        else if (this.columnMode === 'CIRCULAR') {
            if (this.points.length === 2) {
                const rawRadius = Math.sqrt(Math.pow(this.points[1].x - this.points[0].x, 2) + Math.pow(this.points[1].y - this.points[0].y, 2));
                const radius = rawRadius * this.scaleFactor;
                
                if (radius >= 0.02) {
                    window.dispatchEvent(new CustomEvent('COLUMN_PLACED', {
                        detail: { x: this.points[0].x, y: this.points[0].y, radius, shape: 'CIRCULAR' }
                    }));
                }
                this.points = []; this.clearVisuals(); return true;
            }
        } 
        else { // FREE MODE
            if (this.points.length === 3) {
                const data = this.calculateOrientedColumn(this.points[0], this.points[1], this.points[2]);
                const realWidth = data.width * this.scaleFactor;
                const realDepth = data.depth * this.scaleFactor;

                if (realWidth >= 0.02 && realDepth >= 0.02) {
                    window.dispatchEvent(new CustomEvent('COLUMN_PLACED', {
                        detail: { x: data.centerX, y: data.centerY, width: realWidth, depth: realDepth, rotation: data.angle, shape: 'FREE' }
                    }));
                }
                this.points = []; this.clearVisuals(); return true;
            }
        }

        this.redoPoints = [];
        this.drawDynamicVisuals(null); 
        return true;
    }

    drawDynamicVisuals(currentMousePt) {
        if (!this.active) return;
        this.meshes.forEach(m => this.viewer.overlays.removeMesh(m, 'column-tool-scene'));
        this.meshes = [];

        const pts = [...this.points];
        if (currentMousePt) pts.push(currentMousePt);
        if (pts.length === 0) return;

        const zLayerLine = 0.04 / this.scaleFactor;

        // 🌟 DRAW PREVIEWS BASED ON MODE
        if (this.columnMode === 'ORTHO' && pts.length === 2) {
            const minX = Math.min(pts[0].x, pts[1].x);
            const maxX = Math.max(pts[0].x, pts[1].x);
            const minY = Math.min(pts[0].y, pts[1].y);
            const maxY = Math.max(pts[0].y, pts[1].y);
            
            const boxGeo = new THREE.BoxGeometry(maxX - minX, maxY - minY, 0.01);
            const boxMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, opacity: 0.35, transparent: true, depthTest: false });
            const boxMesh = new THREE.Mesh(boxGeo, boxMat);
            boxMesh.position.set((minX+maxX)/2, (minY+maxY)/2, zLayerLine);
            this.viewer.overlays.addMesh(boxMesh, 'column-tool-scene');
            this.meshes.push(boxMesh);
        }
        else if (this.columnMode === 'CIRCULAR' && pts.length === 2) {
            const radius = Math.sqrt(Math.pow(pts[1].x - pts[0].x, 2) + Math.pow(pts[1].y - pts[0].y, 2));
            const circleGeo = new THREE.CircleGeometry(radius, 32);
            const circleMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, opacity: 0.35, transparent: true, depthTest: false, side: THREE.DoubleSide });
            const circleMesh = new THREE.Mesh(circleGeo, circleMat);
            circleMesh.position.set(pts[0].x, pts[0].y, zLayerLine);
            this.viewer.overlays.addMesh(circleMesh, 'column-tool-scene');
            this.meshes.push(circleMesh);
        }
        else if (this.columnMode === 'FREE') {
            if (pts.length >= 3) {
                const data = this.calculateOrientedColumn(pts[0], pts[1], pts[2]);
                const boxGeo = new THREE.BoxGeometry(1, 1, 0.01);
                const boxMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, opacity: 0.35, transparent: true, depthTest: false });
                const boxMesh = new THREE.Mesh(boxGeo, boxMat);
                boxMesh.scale.set(data.width, data.depth, 1);
                boxMesh.rotation.z = data.angle;
                boxMesh.position.set(data.centerX, data.centerY, zLayerLine);
                this.viewer.overlays.addMesh(boxMesh, 'column-tool-scene');
                this.meshes.push(boxMesh);
            }
            if (pts.length >= 2 && pts.length < 4) {
                const lineGeo = new THREE.Geometry();
                lineGeo.vertices.push(new THREE.Vector3(pts[0].x, pts[0].y, zLayerLine));
                lineGeo.vertices.push(new THREE.Vector3(pts[1].x, pts[1].y, zLayerLine));
                const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xa855f7, linewidth: 3, depthTest: false }));
                this.viewer.overlays.addMesh(line, 'column-tool-scene');
                this.meshes.push(line);
            }
        }

        // Draw Start Dot
        if (this.points.length > 0) {
            const dist = this.viewer.impl.camera.position.distanceTo(this.points[0]);
            const dot = new THREE.Mesh(new THREE.CircleGeometry(dist * 0.005, 16), new THREE.MeshBasicMaterial({ color: 0xa855f7, depthTest: false }));
            dot.position.set(this.points[0].x, this.points[0].y, zLayerLine + 0.02);
            this.viewer.overlays.addMesh(dot, 'column-tool-scene');
            this.meshes.push(dot);
        }
        
        this.viewer.impl.invalidate(true, true, true);
    }
}