/* global Autodesk */
import WallToolVisuals from './WallToolVisuals';
import { WallToolMath } from './WallToolMath';

export default class WallDrawingTool {
    // NOTE: Added onWallDeleted callback
    constructor(viewer, onWallCreated, onWallUpdated, onWallDeleted) {
        this.viewer = viewer;
        this.names = ['wall-drawing-tool'];
        this.active = false;
        
        this.visuals = new WallToolVisuals(viewer);
        this.snapper = null;

        // State
        this.mode = 'DRAW'; 
        this.points = []; 
        this.selectedHandle = null; 
        this.hoveredHandle = null;
        this.hoveredWallId = null; // For eraser

        // Settings
        this.thickness = 0.23;
        this.justification = 'CENTER';
        this.handlePlacement = 'CENTER';
        this.isOrtho = false;
        this.isSnapping = true;
        this.walls = [];

        this.onWallCreated = onWallCreated;
        this.onWallUpdated = onWallUpdated; 
        this.onWallDeleted = onWallDeleted; // NEW
    }

    getNames() { return this.names; }
    getName() { return this.names[0]; }

    setSettings(settings) {
        if (settings.thickness !== undefined) this.thickness = settings.thickness;
        if (settings.justification !== undefined) this.justification = settings.justification;
        if (settings.isOrtho !== undefined) this.isOrtho = settings.isOrtho;
        if (settings.handlePlacement !== undefined) this.handlePlacement = settings.handlePlacement;

        if (settings.isSnapping !== undefined && settings.isSnapping !== this.isSnapping) {
            this.isSnapping = settings.isSnapping;
            if (this.active) { this.deactivate(); this.activate(); }
        }

        if (settings.mode && settings.mode !== this.mode) {
            this.mode = settings.mode;
            
            // Clean up old state
            this.points = [];
            this.visuals.clearGhostWall();
            this.visuals.clearHandles();
            this.visuals.clearEraserHighlight(); // Clean eraser
            
            // Set up new state
            if (this.mode === 'EDIT') {
                this.visuals.refreshHandles(this.walls, this.handlePlacement);
            }
            this.updateCursor();
        }

        if (settings.walls) {
            this.walls = settings.walls;
            if (this.mode === 'EDIT') this.visuals.refreshHandles(this.walls, this.handlePlacement);
        }
    }

    activate() {
        if (this.active) return;
        this.active = true;
        this.points = [];
        
        // Snapper is useful for DRAW and EDIT, but maybe not strictly needed for ERASE
        // But we keep it active for simplicity
        if (this.isSnapping) {
            this.snapper = new Autodesk.Viewing.Extensions.Snapping.Snapper(this.viewer, {
                renderSnappedGeometry: true,
                renderSnappedTopology: true,
                markupMode: false,
                snapFilter: 2 | 1 | 4 | 32
            });
            this.viewer.toolController.activateTool(this.snapper.getName());
        }
        
        if (!this.viewer.overlays.hasScene('custom-scene')) {
            this.viewer.overlays.addScene('custom-scene');
        }
        
        this.updateCursor();
    }

    deactivate() {
        if (!this.active) return;
        this.active = false;
        this.points = [];
        
        this.visuals.clearGhostWall();
        this.visuals.clearHandles();
        this.visuals.clearEraserHighlight();
        
        if (this.snapper) {
            this.viewer.toolController.deactivateTool(this.snapper.getName());
            this.snapper = null;
        }
        this.viewer.canvas.style.cursor = 'default';
    }

    updateCursor() {
        if (!this.active) return;
        const canvas = this.viewer.canvas;
        
        if (this.mode === 'DRAW') canvas.style.cursor = 'crosshair';
        else if (this.mode === 'ERASER') canvas.style.cursor = 'not-allowed'; // Eraser Icon
        else if (this.mode === 'EDIT') {
            if (this.selectedHandle) canvas.style.cursor = 'grabbing';
            else if (this.hoveredHandle) canvas.style.cursor = 'pointer';
            else canvas.style.cursor = 'default';
        }
    }

    // --- HELPER: Find wall under mouse ---
    hitTestWall(canvasX, canvasY) {
        if (!this.walls || this.walls.length === 0) return null;

        const threshold = 15; // Pixel distance to trigger eraser

        for (let w of this.walls) {
            // Convert 3D points to Screen 2D
            const s1 = this.viewer.worldToClient(w.points.p1);
            const s2 = this.viewer.worldToClient(w.points.p2);

            // Calculate distance from Mouse to Line Segment
            const dist = WallToolMath.pointToSegmentDistance(canvasX, canvasY, s1.x, s1.y, s2.x, s2.y);
            
            if (dist < threshold) {
                return w; // Return the wall object
            }
        }
        return null;
    }

    // --- HANDLERS ---

    handleButtonDown(event, button) {
        
        
        if (button === 2) { 
             this.points = [];
             this.visuals.clearGhostWall();
             return true;
        }
        if (button !== 0) return false;

        // 1. ERASER CLICK
        if (this.mode === 'ERASER') {
            const wall = this.hitTestWall(event.canvasX, event.canvasY);
            if (wall && this.onWallDeleted) {
                this.onWallDeleted(wall.id); // Trigger Delete
                this.visuals.clearEraserHighlight();
                this.hoveredWallId = null;
                return true;
            }
        }

        // 2. EDIT CLICK
        if (this.mode === 'EDIT') {
            const hit = this.visuals.hitTestHandlesScreenSpace(event.canvasX, event.canvasY);
            if (hit) {
                this.selectedHandle = hit; 
                this.updateCursor();
                return true; 
            }
        }
        return true; 
    }

    handleMouseMove(event) {
        if (this.snapper) this.snapper.handleMouseMove(event);

        // 1. ERASER HOVER
        if (this.mode === 'ERASER') {
            const wall = this.hitTestWall(event.canvasX, event.canvasY);
            
            if (wall && wall.id !== this.hoveredWallId) {
                this.hoveredWallId = wall.id;
                this.visuals.showEraserHighlight(wall); // Show Red Box
            } else if (!wall && this.hoveredWallId) {
                this.hoveredWallId = null;
                this.visuals.clearEraserHighlight();
            }
            return false;
        }

        // 2. EDIT DRAG/HOVER
        if (this.mode === 'EDIT') {
            if (this.selectedHandle) {
                const pt = this.getBestPoint(event);
                if (pt) {
                    this.selectedHandle.position.copy(pt);
                    this.viewer.impl.invalidate(true, true, true);
                }
                return true; 
            }
            const hit = this.visuals.hitTestHandlesScreenSpace(event.canvasX, event.canvasY);
            if (hit !== this.hoveredHandle) {
                if (this.hoveredHandle) this.hoveredHandle.material = this.visuals.handleMatNormal;
                if (hit) hit.material = this.visuals.handleMatHover;
                this.hoveredHandle = hit;
                this.updateCursor();
                this.viewer.impl.invalidate(false, false, true);
            }
            return false;
        }

        // 3. DRAW PREVIEW
        if (this.mode === 'DRAW' && this.points.length === 1) {
            const pt = this.getBestPoint(event);
            if (pt) {
                let endPt = this.isOrtho ? WallToolMath.applyOrtho(this.points[0], pt) : pt;
                if(this.isOrtho) endPt.z = this.points[0].z; // Lock Z
                this.visuals.updateGhostWall(this.points[0], endPt, this.thickness, this.justification);
            }
            return true; 
        }
        return false;
    }

    handleButtonUp(event, button) {
        if (button !== 0) return false;

        if (this.mode === 'EDIT' && this.selectedHandle) {
            const { wallId, pointType } = this.selectedHandle.userData;
            this.onWallUpdated(wallId, pointType, this.selectedHandle.position);
            this.selectedHandle = null;
            this.updateCursor();
            return true;
        }

        if (this.mode === 'DRAW') {
            const pt = this.getBestPoint(event);
            if (!pt) return;
            
            let finalPt = this.isOrtho && this.points.length > 0 
                ? WallToolMath.applyOrtho(this.points[0], pt) 
                : { ...pt };
            
            if(this.isOrtho && this.points.length > 0) finalPt.z = this.points[0].z;

            this.points.push(finalPt);

            if (this.points.length === 2) {
                this.onWallCreated(this.points[0], this.points[1], this.thickness, this.justification);
                this.points = [this.points[1]]; // Chain
                this.visuals.clearGhostWall();
            }
            return true;
        }
        return false;
    }

    // ... (Keep getBestPoint and handleKeyDown exactly as before)
    handleKeyDown(event, keyCode) {
        if (keyCode === 27) { // Escape
            this.points = [];
            this.visuals.clearGhostWall();
            return true;
        }
        return false;
    }

    getBestPoint(event) {
        if (this.snapper) {
            const res = this.snapper.getSnapResult();
            if (res.geomVertex) return res.geomVertex;
            if (res.intersectPoint) return res.intersectPoint;
        }
        const hit = this.viewer.impl.hitTest(event.canvasX, event.canvasY, true);
        if (hit) return hit.intersectPoint;
        return this.viewer.impl.intersectGround(event.canvasX, event.canvasY);
    }
}