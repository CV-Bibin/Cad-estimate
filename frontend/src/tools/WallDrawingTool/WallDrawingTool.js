/* global Autodesk */
import WallToolVisuals from './WallToolVisuals';
import { WallToolMath } from './WallToolMath';

export default class WallDrawingTool {
    constructor(viewer, onWallCreated, onWallUpdated) {
        this.viewer = viewer;
        this.names = ['wall-drawing-tool'];
        this.active = false;
        
        // 1. Initialize Visuals
        this.visuals = new WallToolVisuals(viewer);
        this.snapper = null;

        // State
        this.mode = 'DRAW'; 
        this.points = []; 
        this.selectedHandle = null; 
        this.hoveredHandle = null;

        // Settings
        this.thickness = 0.23;
        this.justification = 'CENTER';
        this.handlePlacement = 'CENTER';
        this.isOrtho = false;
        this.isSnapping = true;
        this.walls = [];

        this.onWallCreated = onWallCreated;
        this.onWallUpdated = onWallUpdated; 
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
            this.points = [];
            
            // Visuals Sync
            this.visuals.clearGhostWall();
            if (this.mode === 'EDIT') {
                this.visuals.refreshHandles(this.walls, this.handlePlacement);
            } else {
                this.visuals.clearHandles();
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
        
        if (this.isSnapping) {
            this.snapper = new Autodesk.Viewing.Extensions.Snapping.Snapper(this.viewer, {
                renderSnappedGeometry: true,
                renderSnappedTopology: true,
                markupMode: false,
                snapFilter: 2 | 1 | 4 | 32
            });
            this.viewer.toolController.activateTool(this.snapper.getName());
        }
        
        // Ensure Scene exists (Visuals class handles this, but double check doesn't hurt)
        if (!this.viewer.overlays.hasScene('custom-scene')) {
            this.viewer.overlays.addScene('custom-scene');
        }
        
        this.updateCursor();
        console.log(`🧱 Tool Active. Mode: ${this.mode}`);
    }

    deactivate() {
        if (!this.active) return;
        this.active = false;
        this.points = [];
        
        this.visuals.clearGhostWall();
        this.visuals.clearHandles();
        
        if (this.snapper) {
            this.viewer.toolController.deactivateTool(this.snapper.getName());
            this.snapper = null;
        }
        this.viewer.canvas.style.cursor = 'default';
    }

    updateCursor() {
        if (!this.active) return;
        const canvas = this.viewer.canvas;
        
        if (this.mode === 'DRAW') {
            canvas.style.cursor = 'crosshair';
        } else if (this.mode === 'EDIT') {
            if (this.selectedHandle) canvas.style.cursor = 'grabbing';
            else if (this.hoveredHandle) canvas.style.cursor = 'pointer';
            else canvas.style.cursor = 'default';
        }
    }

    // --- MOUSE INPUT ---
    handleButtonDown(event, button) {
        if (button === 2) { // Right Click
             if (this.points.length > 0) {
                this.points = [];
                this.visuals.clearGhostWall();
                return true; 
             }
             return false;
        }

        if (button !== 0) return false;

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

        if (this.mode === 'EDIT') {
            if (this.selectedHandle) {
                const pt = this.getBestPoint(event);
                if (pt) {
                    this.selectedHandle.position.copy(pt);
                    this.viewer.impl.invalidate(true, true, true);
                }
                return true; 
            }
            
            // Hover Effect
            const hit = this.visuals.hitTestHandlesScreenSpace(event.canvasX, event.canvasY);
            if (hit !== this.hoveredHandle) {
                // Swap materials using Visuals properties
                if (this.hoveredHandle) this.hoveredHandle.material = this.visuals.handleMatNormal;
                if (hit) hit.material = this.visuals.handleMatHover;
                
                this.hoveredHandle = hit;
                this.updateCursor();
                this.viewer.impl.invalidate(false, false, true);
            }
            return false;
        }

        if (this.mode === 'DRAW' && this.points.length === 1) {
            const pt = this.getBestPoint(event);
            if (pt) {
                let endPt = this.isOrtho ? WallToolMath.applyOrtho(this.points[0], pt) : { ...pt };
                // NOTE: Z-index logic handled inside visuals
                if(this.isOrtho) endPt.z = this.points[0].z; 

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