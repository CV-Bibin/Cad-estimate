/* global Autodesk, THREE */

export class CalibrationTool {
    constructor(viewer, onFinished) {
        this.viewer = viewer;
        this.names = ['calibration-tool'];
        this.active = false;
        this.onFinished = onFinished;
        
        this.points = [];
        this.currentHitPoint = null; // Store the point while hovering
        this.indicator = null; 
        this.tempLine = null;
        this.snapper = null;
    }

    getNames() { return this.names; }
    getName() { return this.names[0]; }

    activate() {
        this.active = true;
        this.points = [];
        this.currentHitPoint = null;
        this.viewer.canvas.style.cursor = 'crosshair';

        // 1. Initialize Snapper (for Green Squares/Triangles)
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
        console.log("🟢 CALIBRATION TOOL: Active");
    }

    deactivate() {
        this.active = false;
        this.points = [];
        this.currentHitPoint = null;
        this.clearOverlays();
        
        if (this.snapper) {
            this.snapper.deactivate();
            this.snapper = null;
        }
        this.viewer.canvas.style.cursor = 'default';
    }

    // --- 1. MOUSE MOVE: FIND & CACHE POINT ---
    handleMouseMove(event) {
        if (!this.active) return false;

        // A. Update Snapper
        if (this.snapper) {
            this.snapper.handleMouseMove(event); 
        }

        // B. Calculate the Best Point
        let rawPoint = null;

        // Priority 1: Snapped Point (Green Symbol)
        if (this.snapper && this.snapper.isSnapped()) {
            const result = this.snapper.getSnapResult();
            if (result && result.geomVertex) {
                rawPoint = result.geomVertex;
            }
        }

        // Priority 2: Raw Hit (Wall/Floor) - Ignore Transparent (ignore our red dot)
        if (!rawPoint) {
            const hit = this.viewer.impl.hitTest(event.canvasX, event.canvasY, true);
            if (hit) rawPoint = hit.intersectPoint;
        }

        // Priority 3: Ground Plane (Only for 2nd point)
        if (!rawPoint && this.points.length === 1) {
            rawPoint = this.viewer.impl.intersectGround(event.canvasX, event.canvasY);
        }

        // C. Apply Ortho (If 2nd point)
        if (rawPoint && this.points.length === 1) {
            rawPoint = this.applyOrtho(this.points[0], rawPoint);
        }

        // D. CACHE THE POINT (Important!)
        this.currentHitPoint = rawPoint;

        // E. Draw Visuals
        if (this.currentHitPoint) {
            this.drawIndicator(this.currentHitPoint);
            if (this.points.length === 1) {
                this.drawTempLine(this.points[0], this.currentHitPoint);
            }
        } else {
            this.clearOverlays();
        }

        return false; 
    }

    // --- 2. CLICK: USE THE CACHED POINT ---
    // We register both SingleClick and ButtonDown to be safe
    handleSingleClick(event, button) { return this.handleClick(button); }
    handleButtonDown(event, button) { return this.handleClick(button); }

    handleClick(button) {
        // Right click = Cancel
        if (button === 2) { this.deactivate(); return true; }

        console.log("🖱️ CLICK! Cached Point:", this.currentHitPoint);

        // If mouse is floating in void, ignore click
        if (!this.currentHitPoint) {
            console.warn("⚠️ No valid point under cursor.");
            return true; 
        }

        // 1. Add the Cached Point
        // We clone it to be safe
        const p = { x: this.currentHitPoint.x, y: this.currentHitPoint.y, z: this.currentHitPoint.z };
        this.points.push(p);

        // 2. Check Completion
        if (this.points.length === 2) {
            const dx = this.points[1].x - this.points[0].x;
            const dy = this.points[1].y - this.points[0].y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            this.clearOverlays();
            this.onFinished(dist); // Send Distance to Editor
            this.deactivate();
        }
        
        return true; // Consume event
    }

    // --- HELPERS ---
    applyOrtho(p1, p2) {
        const dx = Math.abs(p2.x - p1.x);
        const dy = Math.abs(p2.y - p1.y);
        const p = { ...p2 }; 
        if (dx > dy) p.y = p1.y; else p.x = p1.x; // Snap Ortho
        p.z = p1.z; // Keep Flat
        return p;
    }

    drawIndicator(pos) {
        if (this.indicator) this.viewer.overlays.removeMesh(this.indicator, 'calibration-scene');
        
        const geom = new THREE.SphereGeometry(0.15, 8, 8); 
        const mat = new THREE.MeshBasicMaterial({ color: 0xFF0000, opacity: 0.8, transparent: true, depthTest: false });
        this.indicator = new THREE.Mesh(geom, mat);
        this.indicator.position.copy(pos);
        
        // *** CRITICAL FIX: Make Red Dot Invisible to Clicks ***
        this.indicator.raycast = () => {}; 

        this.viewer.overlays.addMesh(this.indicator, 'calibration-scene');
        this.viewer.impl.invalidate(true, true, true);
    }

    drawTempLine(p1, p2) {
        if (this.tempLine) this.viewer.overlays.removeMesh(this.tempLine, 'calibration-scene');
        
        const geom = new THREE.Geometry();
        geom.vertices.push(new THREE.Vector3(p1.x, p1.y, p1.z));
        geom.vertices.push(new THREE.Vector3(p2.x, p2.y, p2.z));
        const mat = new THREE.LineBasicMaterial({ color: 0xFF00FF, linewidth: 2, depthTest: false });
        this.tempLine = new THREE.Line(geom, mat);
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