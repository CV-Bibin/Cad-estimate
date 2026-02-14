/* global Autodesk, THREE */

export default class WallDrawingTool {
    constructor(viewer, onWallCreated, onWallUpdated) {
        this.viewer = viewer;
        this.names = ['wall-drawing-tool'];
        this.active = false;
        this.snapper = null;
        
        // Draw State
        this.points = []; 
        this.tempMesh = null;
        this.mode = 'DRAW'; 
        
        // Edit State
        this.walls = []; 
        this.handles = []; 
        this.selectedHandle = null; 

        // Settings
        this.thickness = 0.23;
        this.justification = 'CENTER';
        this.isOrtho = false;
        this.snapMode = 'STANDARD'; 

        this.onWallCreated = onWallCreated;
        this.onWallUpdated = onWallUpdated; 
    }

    getNames() { return this.names; }
    getName() { return this.names[0]; }

    setSettings(settings) {
        if (settings.thickness !== undefined) this.thickness = settings.thickness;
        if (settings.justification !== undefined) this.justification = settings.justification;
        if (settings.isOrtho !== undefined) this.isOrtho = settings.isOrtho;
        
        // Snap Mode Switch
        if (settings.snapMode && settings.snapMode !== this.snapMode) {
            this.snapMode = settings.snapMode;
            if (this.active) { this.deactivate(); this.activate(); }
        }

        // Mode Switch (Draw/Edit)
        if (settings.mode && settings.mode !== this.mode) {
            this.mode = settings.mode;
            this.points = [];
            this.clearOverlay();
            this.toggleEditHandles(this.mode === 'EDIT');
        }

        // Update Walls for Edit Mode
        if (settings.walls) {
            this.walls = settings.walls;
            if (this.mode === 'EDIT') this.refreshHandles();
        }
    }

    activate() {
        if (this.active) return;
        this.active = true;
        this.points = [];
        
        // --- SNAP CONFIG ---
        // 2=Vertex, 1=Edge, 4=Midpoint, 32=Intersection
        let filter = 2 | 1 | 4 | 32; 
        if (this.snapMode === 'STRICT') filter = 2 | 32; // Corners Only

        this.snapper = new Autodesk.Viewing.Extensions.Snapping.Snapper(this.viewer, {
            renderSnappedGeometry: true,
            renderSnappedTopology: true,
            markupMode: false,
            snapFilter: filter
        });

        if (this.snapMode === 'STRICT') {
            this.snapper.setSnapToPixel(false);
            if(this.snapper.setIndicatorColor) this.snapper.setIndicatorColor(0xFF0000); // Red Snap Dot
        }
        
        this.viewer.toolController.activateTool(this.snapper.getName());
        console.log(`🧱 Tool Active. Mode: ${this.mode}, Snap: ${this.snapMode}`);
    }

    deactivate() {
        if (!this.active) return;
        this.active = false;
        this.points = [];
        this.clearOverlay();
        this.toggleEditHandles(false);
        if (this.snapper) {
            this.viewer.toolController.deactivateTool(this.snapper.getName());
            this.snapper = null;
        }
        this.viewer.toolController.enableMouseButtons();
    }

    // --- MOUSE INPUT HANDLING ---

    // 1. MOUSE DOWN: Returns TRUE to block Camera Pan
    handleButtonDown(event, button) {
        
        // Right Click (Button 2) -> Stop Chain
        if (button === 2) {
             if (this.points.length > 0) {
                this.points = [];
                this.clearOverlay();
                console.log("❌ Chain Stopped (Right Click)");
                return true; 
             }
             return false;
        }

        if (button !== 0) return false;
        
        // Edit Mode: Check for Handle Click
        if (this.mode === 'EDIT') {
            const hit = this.hitTestHandles(event);
            if (hit) {
                this.selectedHandle = hit;
                this.viewer.toolController.disableMouseButtons(); // Lock Camera
                return true; 
            }
        }
        
        // Draw Mode: Always block Pan if we are active
        return true; 
    }

    // 2. MOUSE UP: Execute Logic
    handleButtonUp(event, button) {
        if (button !== 0) return false;

        // Edit Mode: Release Handle
        if (this.mode === 'EDIT' && this.selectedHandle) {
            const { wallId, pointType } = this.selectedHandle.userData;
            this.onWallUpdated(wallId, pointType, this.selectedHandle.position);
            this.selectedHandle = null;
            this.viewer.toolController.enableMouseButtons();
            return true;
        }

        // Draw Mode: Click Logic
        if (this.mode === 'DRAW') {
            this.handleClickLogic(event);
            return true;
        }
        return false;
    }

    // 3. DRAW LOGIC (Continuous Chaining)
    handleClickLogic(event) {
        const hit = this.snapper.getSnapResult();
        let pt = hit.geomVertex || hit.intersectPoint;
        
        if (!pt) {
            const res = this.viewer.impl.hitTest(event.canvasX, event.canvasY, true);
            if (res) pt = res.intersectPoint;
        }

        if (!pt) return;

        // Apply ORTHO (Only for End Point)
        if (this.isOrtho && this.points.length > 0) {
             const s = this.points[this.points.length - 1]; // Use last point as base
             const dx = Math.abs(pt.x - s.x);
             const dy = Math.abs(pt.y - s.y);
             if (dx > dy) pt = { ...pt, y: s.y, z: s.z };
             else pt = { ...pt, x: s.x, z: s.z };
        }

        this.points.push(pt);

        // A. START POINT
        if (this.points.length === 1) {
            console.log("📍 Start Point Set");
        }

        // B. END POINT (FINISH WALL)
        if (this.points.length === 2) {
            console.log("✅ Wall Created");
            this.onWallCreated(this.points[0], this.points[1], this.thickness, this.justification);
            
            // CHAINING: Make End Point the new Start Point
            const lastPoint = this.points[1];
            this.points = [lastPoint]; 
            this.clearOverlay();
        }
    }

    // 4. MOUSE MOVE (Ghost Wall / Drag Handle)
    handleMouseMove(event) {
        if (!this.snapper) return false;
        this.snapper.handleMouseMove(event);

        // Edit Mode: Drag Handle
        if (this.mode === 'EDIT' && this.selectedHandle) {
            const hit = this.snapper.getSnapResult();
            const pt = hit.geomVertex || hit.intersectPoint || this.viewer.impl.hitTest(event.canvasX, event.canvasY, true)?.intersectPoint;
            if (pt) {
                this.selectedHandle.position.copy(pt);
                this.viewer.impl.invalidate(true, true, true);
            }
            return true;
        }

        // Draw Mode: Ghost Wall
        if (this.mode === 'DRAW' && this.points.length === 1) {
            const hit = this.snapper.getSnapResult();
            let pt = hit.geomVertex || hit.intersectPoint || this.viewer.impl.hitTest(event.canvasX, event.canvasY, true)?.intersectPoint;
            
            if (pt) {
                if (this.isOrtho) {
                    const s = this.points[0];
                    const dx = Math.abs(pt.x - s.x);
                    const dy = Math.abs(pt.y - s.y);
                    if (dx > dy) pt = { ...pt, y: s.y, z: s.z };
                    else pt = { ...pt, x: s.x, z: s.z };
                }
                this.updateTempMesh(this.points[0], pt);
            }
            return true; // Block camera while drawing
        }
        return false;
    }

    // 5. KEYBOARD (Stop Chain)
    handleKeyDown(event, keyCode) {
        if (keyCode === 27) { // Escape
            this.points = [];
            this.clearOverlay();
            console.log("❌ Chain Stopped (ESC)");
            return true;
        }
        return false;
    }

    // --- VISUALIZATION HELPERS ---

    hitTestHandles(event) {
        const vp = this.viewer.navigation.getScreenViewport();
        const p = new THREE.Vector3((event.canvasX/vp.width)*2-1, -(event.canvasY/vp.height)*2+1, 0.5);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(p, this.viewer.navigation.getCamera());
        const hits = ray.intersectObjects(this.handles);
        return hits.length > 0 ? hits[0].object : null;
    }

    refreshHandles() {
        this.handles.forEach(h => this.viewer.overlays.removeMesh(h, 'custom-scene'));
        this.handles = [];
        const geo = new THREE.SphereGeometry(0.4, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00FF00, depthTest: false }); // Always visible

        this.walls.forEach(w => {
            ['p1', 'p2'].forEach(t => {
                const h = new THREE.Mesh(geo, mat);
                h.position.set(w.points[t].x, w.points[t].y, w.points[t].z);
                h.userData = { wallId: w.id, pointType: t };
                this.viewer.overlays.addMesh(h, 'custom-scene');
                this.handles.push(h);
            });
        });
        this.viewer.impl.invalidate(true);
    }

    toggleEditHandles(s) {
        this.handles.forEach(h => this.viewer.overlays.removeMesh(h, 'custom-scene'));
        this.handles = [];
        if (s) this.refreshHandles();
        this.viewer.impl.invalidate(true);
    }
    
    updateTempMesh(p1, p2) {
        this.clearOverlay();
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        if (len < 0.01) return;

        // FIXED: depthTest: false + High Z-Index for Visibility
        const geometry = new THREE.BoxGeometry(len, this.thickness, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xFFA500, 
            opacity: 0.6, 
            transparent: true, 
            depthTest: false 
        });

        this.tempMesh = new THREE.Mesh(geometry, material);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        // Lift Z by 1.0 to ensure it floats above CAD floor
        this.tempMesh.position.set(midX, midY, p1.z + 1.0); 
        this.tempMesh.rotation.z = Math.atan2(dy, dx);

        // Justification
        let offset = 0;
        if (this.justification === 'LEFT') offset = this.thickness / 2;
        if (this.justification === 'RIGHT') offset = -this.thickness / 2;
        if (offset !== 0) {
            const perpX = -Math.sin(this.tempMesh.rotation.z) * offset;
            const perpY = Math.cos(this.tempMesh.rotation.z) * offset;
            this.tempMesh.position.x += perpX;
            this.tempMesh.position.y += perpY;
        }

        this.viewer.overlays.addMesh(this.tempMesh, 'custom-scene');
        this.viewer.impl.invalidate(true, true, true);
    }
    
    clearOverlay() {
        if (this.tempMesh) {
            this.viewer.overlays.removeMesh(this.tempMesh, 'custom-scene');
            this.tempMesh = null;
            this.viewer.impl.invalidate(true, true, true);
        }
    }
}