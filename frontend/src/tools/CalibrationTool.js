/* global Autodesk, THREE */

export class CalibrationTool {
    constructor(viewer, onFinished) {
        this.viewer = viewer;
        this.names = ['calibration-tool'];
        this.active = false;
        this.onFinished = onFinished;
        
        this.points = [];
        this.currentHitPoint = null;
        this.indicator = null; 
        this.tempLine = null;
        this.snapper = null;
    }

    getNames() { return this.names; }
    getName() { return this.names[0]; }

    activate() {
        if (this.active) return;
        this.active = true;
        this.points = [];
        this.currentHitPoint = null;
        this.viewer.canvas.style.cursor = 'crosshair';

        // 1. Initialize Snapper for precision picking
        const snapOptions = {
            renderSnappedGeometry: true, 
            renderSnappedTopology: true, 
            snapFilter: 2 | 4 | 16 | 32 
        };
        
        if (Autodesk.Viewing.Extensions.Snapping) {
            this.snapper = new Autodesk.Viewing.Extensions.Snapping.Snapper(this.viewer, snapOptions);
            this.snapper.activate();
        }

        if (!this.viewer.overlays.hasScene('calibration-scene')) {
            this.viewer.overlays.addScene('calibration-scene');
        }
        console.log("🟢 CALIBRATION TOOL: Active. Pick First Point.");
    }

    deactivate() {
        if (!this.active) return;
        this.active = false;
        this.points = [];
        this.currentHitPoint = null;
        this.clearOverlays();
        
        if (this.snapper) {
            this.snapper.deactivate();
            this.snapper = null;
        }
        if (this.viewer && this.viewer.canvas) {
            this.viewer.canvas.style.cursor = 'default';
        }
    }

    // --- MOUSE MOVE: SNAP & PREVIEW ---
    handleMouseMove(event) {
        if (!this.active) return false;

        if (this.snapper) {
            this.snapper.handleMouseMove(event); 
        }

        let rawPoint = null;
        let snapType = 'none';

        // Priority 1: Snap to CAD Geometry
        if (this.snapper && this.snapper.isSnapped()) {
            const result = this.snapper.getSnapResult();
            if (result && result.geomVertex) {
                rawPoint = result.geomVertex;
                snapType = result.geomType === 2 ? 'midpoint' : 'endpoint';
            }
        }

        // Priority 2: Hit Test on Objects
        if (!rawPoint) {
            const hit = this.viewer.impl.hitTest(event.canvasX, event.canvasY, true);
            if (hit) rawPoint = hit.intersectPoint;
        }

        // Priority 3: Intersect Ground (Useful for empty plans)
        if (!rawPoint && this.points.length === 1) {
            rawPoint = this.viewer.impl.intersectGround(event.canvasX, event.canvasY);
        }

        // Ortho Lock for the second point
        if (rawPoint && this.points.length === 1) {
            rawPoint = this.applyOrtho(this.points[0], rawPoint);
        }

        this.currentHitPoint = rawPoint;

        if (this.currentHitPoint) {
            this.drawIndicator(this.currentHitPoint, snapType); 
            if (this.points.length === 1) {
                this.drawTempLine(this.points[0], this.currentHitPoint);
            }
        } else {
            this.clearOverlays();
        }

        return false; 
    }

    // --- CLICK HANDLING ---
    handleButtonDown(event, button) {
        if (!this.active) return false;
        
        // Right click to cancel
        if (button === 2) { 
            this.deactivate(); 
            return true; 
        }

        // Left click to pick point
        if (button === 0) {
            if (!this.currentHitPoint) {
                console.warn("⚠️ No valid point detected.");
                return true; 
            }

            // Capture a deep copy of the coordinates
            const p = new THREE.Vector3(
                this.currentHitPoint.x, 
                this.currentHitPoint.y, 
                this.currentHitPoint.z
            );
            
            this.points.push(p);

            if (this.points.length === 1) {
                console.log("📍 Point 1 Picked. Pick Point 2.");
            }

            if (this.points.length === 2) {
                const dx = this.points[1].x - this.points[0].x;
                const dy = this.points[1].y - this.points[0].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                console.log("📏 Calibration Finished. Units:", dist);
                this.onFinished(dist); // Send to Editor.js Modal
                this.deactivate();
            }
            return true;
        }
        return false;
    }

    applyOrtho(p1, p2) {
        const dx = Math.abs(p2.x - p1.x);
        const dy = Math.abs(p2.y - p1.y);
        const p = p2.clone();
        if (dx > dy) p.y = p1.y; else p.x = p1.x;
        p.z = p1.z; 
        return p;
    }

    drawIndicator(pos, snapType) {
        if (this.indicator) this.viewer.overlays.removeMesh(this.indicator, 'calibration-scene');
        
        let geom;
        let color = 0xFF00FF; // Default Magenta

        if (snapType === 'midpoint') {
            geom = new THREE.CylinderGeometry(0.04, 0.04, 0.01, 3);
            geom.rotateX(Math.PI / 2);
            color = 0x00FFFF;
        } else if (snapType === 'endpoint') {
            geom = new THREE.BoxGeometry(0.06, 0.06, 0.01);
            color = 0x00FF00;
        } else {
            geom = new THREE.SphereGeometry(0.02, 8, 8);
        }
        
        const mat = new THREE.MeshBasicMaterial({ color: color, depthTest: false });
        this.indicator = new THREE.Mesh(geom, mat);
        this.indicator.position.copy(pos);
        this.indicator.raycast = () => {}; 

        this.viewer.overlays.addMesh(this.indicator, 'calibration-scene');
        this.viewer.impl.invalidate(true, true, true);
    }

    drawTempLine(p1, p2) {
        if (this.tempLine) this.viewer.overlays.removeMesh(this.tempLine, 'calibration-scene');
        
        const geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3(p1.x, p1.y, p1.z));
        geometry.vertices.push(new THREE.Vector3(p2.x, p2.y, p2.z));
        
        const material = new THREE.LineBasicMaterial({ color: 0xFF00FF, linewidth: 2, depthTest: false });
        this.tempLine = new THREE.Line(geometry, material);
        this.tempLine.raycast = () => {}; 

        this.viewer.overlays.addMesh(this.tempLine, 'calibration-scene');
        this.viewer.impl.invalidate(true, true, true);
    }

    clearOverlays() {
        if (this.indicator) {
            this.viewer.overlays.removeMesh(this.indicator, 'calibration-scene');
            this.indicator = null;
        }
        if (this.tempLine) {
            this.viewer.overlays.removeMesh(this.tempLine, 'calibration-scene');
            this.tempLine = null;
        }
        this.viewer.impl.invalidate(true, true, true);
    }
}