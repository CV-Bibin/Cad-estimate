/* global Autodesk, THREE */

export default class AreaDrawingTool {
    constructor(viewer, onAreaCompleted, onAreaUpdated) {
        this.viewer = viewer;
        this.onAreaCompleted = onAreaCompleted;
        this.onAreaUpdated = onAreaUpdated; // 🌟 NEW: Callback for saving edits
        this.names = ['area-drawing-tool'];
        this.active = false;
        
        // State
        this.mode = 'DRAW'; // 'DRAW' or 'EDIT'
        this.currentZoneType = 'INDOOR'; 
        this.orthoEnabled = false;
        this.osnapEnabled = true;

        // Draw Mode Data
        this.points = [];
        this.meshes = []; 

        // 🌟 Edit Mode Data
        this.savedAreas = []; 
        this.editHandles = []; // 3D spheres on the corners
        this.draggedNode = null; // Which corner is being dragged

        this.snapper = null;
        this.osnapMesh = null;

        this.onKeyDown = this.onKeyDown.bind(this);
    }

    getNames() { return this.names; }
    getName() { return this.names[0]; }

    setZoneType(type) { this.currentZoneType = type; }
    setToggles(ortho, osnap) { this.orthoEnabled = ortho; this.osnapEnabled = osnap; }
    setSnapPoints() {} // Ignored

    // 🌟 Switch between Drawing new rooms and Editing old ones
    setMode(newMode) {
        this.mode = newMode;
        this.points = [];
        this.draggedNode = null;
        this.clearVisuals();
        if (this.mode === 'EDIT') this.drawEditHandles();
    }

    // 🌟 Feed the saved rooms into the tool so we can edit them
    setSavedAreas(areas) {
        this.savedAreas = areas || [];
        if (this.active && this.mode === 'EDIT' && !this.draggedNode) {
            this.drawEditHandles();
        }
    }

    activate() {
        if (this.active) return;
        this.active = true;
        this.points = [];
        this.draggedNode = null;
        this.clearVisuals();
        
        if (this.viewer.canvas) this.viewer.canvas.style.cursor = this.mode === 'EDIT' ? 'pointer' : 'crosshair';

        if (this.osnapEnabled) {
            this.snapper = new Autodesk.Viewing.Extensions.Snapping.Snapper(this.viewer, {
                renderSnappedGeometry: true, renderSnappedTopology: true, markupMode: false, snapFilter: 2 | 1 | 4 | 32
            });
            this.viewer.toolController.activateTool(this.snapper.getName());
        }

        if (this.mode === 'EDIT') this.drawEditHandles();

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
        if (event.key === 'Escape') {
            this.points = []; 
            this.draggedNode = null;
            this.clearVisuals();
            if (this.mode === 'EDIT') this.drawEditHandles();
        }
    }

    clearVisuals() {
        if (!this.viewer.overlays.hasScene('area-tool-scene')) this.viewer.overlays.addScene('area-tool-scene');
        this.meshes.forEach(m => this.viewer.overlays.removeMesh(m, 'area-tool-scene'));
        this.meshes = [];
        this.editHandles.forEach(h => this.viewer.overlays.removeMesh(h, 'area-tool-scene'));
        this.editHandles = [];
        if (this.osnapMesh) {
            this.viewer.overlays.removeMesh(this.osnapMesh, 'area-tool-scene');
            this.osnapMesh = null;
        }
        this.viewer.impl.invalidate(true, true, true);
    }

    // --- MATH & SNAPPING (Unchanged) ---
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

        let finalPt = { x: pt.x, y: pt.y, z: 0 };

        // Ortho Logic
        if (this.orthoEnabled && this.points.length > 0 && !(this.snapper && this.snapper.isSnapped()) && !this.draggedNode) {
            const lastPt = this.points[this.points.length - 1];
            if (Math.abs(finalPt.x - lastPt.x) > Math.abs(finalPt.y - lastPt.y)) finalPt.y = lastPt.y; 
            else finalPt.x = lastPt.x; 
        }
        return finalPt;
    }

    drawOsnapIndicator(pos, snapType) {
        if (this.osnapMesh) {
            this.viewer.overlays.removeMesh(this.osnapMesh, 'area-tool-scene');
            this.osnapMesh = null;
        }
        if (!pos || snapType === 'none') return;
        const dist = this.viewer.impl.camera.position.distanceTo(pos);
        const size = dist * 0.005; 
        const color = snapType === 'midpoint' ? 0x00FFFF : 0x00FF00;
        let geom = snapType === 'midpoint' ? new THREE.CylinderGeometry(size, size, 0.01, 3) : new THREE.BoxGeometry(size * 1.5, size * 1.5, 0.01);
        if (snapType === 'midpoint') geom.rotateX(Math.PI / 2);
        this.osnapMesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.6 }));
        this.osnapMesh.position.set(pos.x, pos.y, 0.05); 
        this.viewer.overlays.addMesh(this.osnapMesh, 'area-tool-scene');
    }

    // 🌟 EDIT MODE: Draw yellow draggable spheres on corners
    drawEditHandles() {
        this.editHandles.forEach(h => this.viewer.overlays.removeMesh(h, 'area-tool-scene'));
        this.editHandles = [];

        this.savedAreas.forEach(area => {
            area.points.forEach((pt, index) => {
                const dist = this.viewer.impl.camera.position.distanceTo(pt);
                const size = dist * 0.006; 
                
                const geo = new THREE.SphereGeometry(size, 16, 16);
                const mat = new THREE.MeshPhongMaterial({ color: 0xFFD700, depthTest: false }); // Yellow
                const sphere = new THREE.Mesh(geo, mat);
                
                sphere.position.set(pt.x, pt.y, 0.1);
                // Attach data so we know exactly which point of which area to move!
                sphere.userData = { areaId: area.id, pointIndex: index }; 
                
                this.viewer.overlays.addMesh(sphere, 'area-tool-scene');
                this.editHandles.push(sphere);
            });
        });
        this.viewer.impl.invalidate(true, true, true);
    }

    // 🌟 MOUSE DOWN: Start dragging a point
    handleButtonDown(event, button) {
        if (button !== 0 || !this.active) return false;

        if (this.mode === 'EDIT') {
            // 3D Raycasting to find if we clicked a yellow sphere
            const rect = this.viewer.impl.getCanvasBoundingClientRect();
            const cx = event.clientX - rect.left;
            const cy = event.clientY - rect.top;
            const normX = (cx / rect.width) * 2 - 1;
            const normY = -(cy / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera({ x: normX, y: normY }, this.viewer.impl.camera);
            const intersects = raycaster.intersectObjects(this.editHandles);

            if (intersects.length > 0) {
                // We grabbed a handle!
                this.draggedNode = intersects[0].object.userData;
                this.viewer.canvas.style.cursor = 'grabbing';
                return true; // Consume click
            }
            return false;
        }
        return false;
    }

    // 🌟 MOUSE MOVE: Move the point
    handleMouseMove(event) {
        if (!this.active) return false;
        if (this.snapper) this.snapper.handleMouseMove(event);

        let snapType = 'none';
        if (this.snapper && this.snapper.isSnapped()) snapType = this.snapper.getSnapResult().geomType === 2 ? 'midpoint' : 'endpoint';

        const pt = this.getBestPoint(event);
        if (pt) this.drawOsnapIndicator(pt, snapType);

        if (this.mode === 'EDIT' && this.draggedNode && pt) {
            // Live update the rubber-band outline of the shape being edited
            this.meshes.forEach(m => this.viewer.overlays.removeMesh(m, 'area-tool-scene'));
            this.meshes = [];

            const area = this.savedAreas.find(a => a.id === this.draggedNode.areaId);
            if (area) {
                const tempPoints = [...area.points];
                tempPoints[this.draggedNode.pointIndex] = pt; // Apply mouse position

                const lineGeo = new THREE.Geometry();
                tempPoints.forEach(p => lineGeo.vertices.push(new THREE.Vector3(p.x, p.y, 0.06)));
                lineGeo.vertices.push(new THREE.Vector3(tempPoints[0].x, tempPoints[0].y, 0.06)); // Close loop
                
                const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xFF0000, linewidth: 3, depthTest: false }));
                this.viewer.overlays.addMesh(line, 'area-tool-scene');
                this.meshes.push(line);
                this.viewer.impl.invalidate(true, true, true);
            }
            return true;
        }

        if (this.mode === 'DRAW' && pt) this.drawDynamicVisuals(pt);
        return false; 
    }

    // 🌟 MOUSE UP: Save the edited point!
    handleButtonUp(event, button) {
        if (button !== 0 || !this.active) return false;

        if (this.mode === 'EDIT' && this.draggedNode) {
            const pt = this.getBestPoint(event);
            if (pt) {
                const area = this.savedAreas.find(a => a.id === this.draggedNode.areaId);
                if (area) {
                    const newPoints = [...area.points];
                    newPoints[this.draggedNode.pointIndex] = pt;
                    // Fire callback to React to recalculate math!
                    if (this.onAreaUpdated) this.onAreaUpdated(area.id, newPoints);
                }
            }
            this.draggedNode = null;
            this.viewer.canvas.style.cursor = 'pointer';
            this.clearVisuals();
            this.drawEditHandles(); // Redraw handles in new positions
            return true;
        }
        return false;
    }

    // 🌟 DRAW MODE: Normal drawing clicks
    handleSingleClick(event, button) {
        if (button !== 0 || !this.active || this.mode !== 'DRAW') return false;

        const pt = this.getBestPoint(event);
        if (!pt) return false;

        if (this.points.length >= 3) {
            const firstPt = this.points[0];
            const dist = Math.sqrt(Math.pow(pt.x - firstPt.x, 2) + Math.pow(pt.y - firstPt.y, 2));
            const camera = this.viewer.impl.camera;
            const closeRadius = camera.isOrthographicCamera ? (camera.top - camera.bottom) * 0.04 : 0.6;

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

    drawDynamicVisuals(currentMousePt) {
        if (this.mode !== 'DRAW') return;
        this.meshes.forEach(m => this.viewer.overlays.removeMesh(m, 'area-tool-scene'));
        this.meshes = [];

        const pts = [...this.points];
        if (currentMousePt) pts.push(currentMousePt);
        if (pts.length === 0) return;

        if (pts.length >= 3) {
            try {
                const shape = new THREE.Shape();
                shape.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
                shape.lineTo(pts[0].x, pts[0].y);
                const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0x00FF00, opacity: 0.15, transparent: true, depthTest: false, side: THREE.DoubleSide }));
                mesh.position.z = 0.01;
                this.viewer.overlays.addMesh(mesh, 'area-tool-scene');
                this.meshes.push(mesh);
            } catch (e) {}
        }

        if (pts.length >= 2) {
            const lineGeo = new THREE.Geometry();
            pts.forEach(p => lineGeo.vertices.push(new THREE.Vector3(p.x, p.y, 0.03)));
            const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x00FF00, linewidth: 2, depthTest: false }));
            this.viewer.overlays.addMesh(line, 'area-tool-scene');
            this.meshes.push(line);
        }

        if (this.points.length > 0) {
            const dist = this.viewer.impl.camera.position.distanceTo(this.points[0]);
            const dot = new THREE.Mesh(new THREE.CircleGeometry(dist * 0.005, 16), new THREE.MeshBasicMaterial({ color: pts.length > 2 ? 0x00FF00 : 0xFFD700, depthTest: false }));
            if (pts.length > 2) dot.scale.set(1.5, 1.5, 1.5);
            dot.position.set(this.points[0].x, this.points[0].y, 0.04);
            this.viewer.overlays.addMesh(dot, 'area-tool-scene');
            this.meshes.push(dot);
        }
        this.viewer.impl.invalidate(true, true, true);
    }
}