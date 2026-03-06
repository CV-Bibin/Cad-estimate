/* global Autodesk, THREE */
import WallToolVisuals from './WallToolVisuals';
import { WallToolMath } from './WallToolMath';
import { DrawingHandler } from './DrawingHandler';
import { EditingHandler } from './EditingHandler';
import { EraserHandler } from './EraserHandler';
import { OpeningHandler } from './OpeningHandler';

export default class WallDrawingTool {
    constructor(viewer, onWallCreated, onWallUpdated, onWallDeleted) {
        this.viewer = viewer;
        this.names = ['wall-drawing-tool'];
        this.active = false;
        this.settings = { wallMode: 'MANUAL', scaleFactor: 1 };
        this.visuals = new WallToolVisuals(viewer);

        // Mode Handlers
        this.drawing = new DrawingHandler(this);
        this.editing = new EditingHandler(this);
        this.eraser = new EraserHandler(this);
        this.opening = new OpeningHandler(this);

        // State & Callbacks
        this.onWallCreated = onWallCreated;
        this.onWallUpdated = onWallUpdated;
        this.onWallDeleted = onWallDeleted;
        this.mode = 'DRAW';
        this.points = [];
        this.walls = [];
        this.thickness = 0.23;
        this.justification = 'CENTER';
        this.handlePlacement = 'CENTER';
        this.isOrtho = false;
        this.isSnapping = true;

        this.snapper = null;
        this.osnapMesh = null;
        this.selectedHandle = null;
        this.hoveredHandle = null;
        this.hoveredWallId = null;
    }

    getNames() { return this.names; }
    getName() { return this.names[0]; }

    setSettings(settings) {
        Object.assign(this.settings, settings);
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
            this.visuals.clearGhostWall();
            this.visuals.clearHandles();
            this.visuals.clearEraserHighlight();
            if (this.mode === 'EDIT') this.visuals.refreshHandles(this.walls, this.handlePlacement);
        }

        if (settings.walls) {
            this.walls = settings.walls;
            if (this.mode === 'EDIT') this.visuals.refreshHandles(this.walls, this.handlePlacement);
        }

        // --- SIDEBAR HOVER HIGHLIGHT LOGIC ---
        if (settings.hoveredListWallId !== undefined) {
            if (settings.hoveredListWallId === null) {
                this.visuals.clearListHighlight();
            } else {
                const wallToHighlight = this.walls.find(w => w.id === settings.hoveredListWallId);
                if (wallToHighlight) {
                    const currentScale = this.settings.scaleFactor || 1;
                    const scaledThickness = wallToHighlight.thickness / currentScale;
                    this.visuals.showListHighlight(wallToHighlight, scaledThickness);
                }
            }
        }

        this.updateCursor();
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

        if (!this.viewer.overlays.hasScene('custom-scene')) this.viewer.overlays.addScene('custom-scene');
        this.updateCursor();
    }

    deactivate() {
        if (!this.active) return;
        this.active = false;
        this.points = [];
        this.visuals.clearGhostWall();
        this.visuals.clearHandles();
        this.visuals.clearEraserHighlight();

        if (this.osnapMesh) {
            this.viewer.overlays.removeMesh(this.osnapMesh, 'custom-scene');
            this.osnapMesh = null;
        }

        if (this.snapper) {
            this.viewer.toolController.deactivateTool(this.snapper.getName());
            this.snapper = null;
        }
        
        // 🌟 FIX 1: Safety check added here!
        if (this.viewer && this.viewer.canvas) {
            this.viewer.canvas.style.cursor = 'default';
        }
    }

    updateCursor() {
        // 🌟 FIX 2: Safety check added here!
        if (!this.active || !this.viewer || !this.viewer.canvas) return; 

        const canvas = this.viewer.canvas;
        if (this.mode === 'DRAW') canvas.style.cursor = 'crosshair';
        else if (this.mode === 'ERASER') canvas.style.cursor = 'not-allowed';
        else if (this.mode === 'EDIT') {
            if (this.selectedHandle) canvas.style.cursor = 'grabbing';
            else if (this.hoveredHandle) canvas.style.cursor = 'pointer';
            else canvas.style.cursor = 'default';
        }
    }

    // --- SHARED HELPERS ---
    hitTestWall(canvasX, canvasY) {
        if (!this.walls || this.walls.length === 0) return null;
        const threshold = 15;
        for (let w of this.walls) {
            const s1 = this.viewer.worldToClient(w.points.p1);
            const s2 = this.viewer.worldToClient(w.points.p2);
            if (WallToolMath.pointToSegmentDistance(canvasX, canvasY, s1.x, s1.y, s2.x, s2.y) < threshold) return w;
        }
        return null;
    }

    getBestPoint(event) {
        if (this.snapper && this.snapper.isSnapped()) {
            const res = this.snapper.getSnapResult();
            if (res.geomVertex) return res.geomVertex;
            if (res.intersectPoint) return res.intersectPoint;
        }
        const hit = this.viewer.impl.hitTest(event.canvasX, event.canvasY, true);
        if (hit) return hit.intersectPoint;
        return this.viewer.impl.intersectGround(event.canvasX, event.canvasY);
    }

   drawOsnapIndicator(pos, snapType) {
        if (this.osnapMesh) {
            this.viewer.overlays.removeMesh(this.osnapMesh, 'custom-scene');
            this.osnapMesh = null;
        }
        if (!pos || snapType === 'none') return;

        // --- NEW: Calculate Dynamic Scale based on Zoom Level ---
        const camera = this.viewer.impl.camera;
        const distance = camera.position.distanceTo(pos);
        
        // This multiplier keeps the icon a consistent visual size. 
        // Tweak 0.005 up or down if you want it globally larger or smaller.
        const dynamicSize = distance * 0.005; 

        const color = snapType === 'midpoint' ? 0x00FFFF : 0x00FF00;
        
        // Apply the dynamic size to the geometries
        let geom = snapType === 'midpoint'
            ? new THREE.CylinderGeometry(dynamicSize, dynamicSize, 0.01, 3)
            : new THREE.BoxGeometry(dynamicSize * 1.5, dynamicSize * 1.5, 0.01);

        if (snapType === 'midpoint') geom.rotateX(Math.PI / 2);

        // Keep it slightly transparent so you can see the exact intersection
        const mat = new THREE.MeshBasicMaterial({ 
            color, 
            depthTest: false, 
            transparent: true, 
            opacity: 0.6 
        });

        this.osnapMesh = new THREE.Mesh(geom, mat);
        this.osnapMesh.position.copy(pos);
        this.osnapMesh.raycast = () => { };
        
        this.viewer.overlays.addMesh(this.osnapMesh, 'custom-scene');
        this.viewer.impl.invalidate(true, true, true);
    }

    // --- DELEGATION ---
    handleButtonDown(event, button) {
        if (button !== 0) return false;
        if (this.opening.handleDown(event)) return true;
        if (this.drawing.handleDown(event)) return true;
        if (this.editing.handleDown(event)) return true;
        if (this.eraser.handleDown(event)) return true;
        return false;
    }

    handleMouseMove(event) {
        if (this.snapper) this.snapper.handleMouseMove(event);

        let snapType = 'none';
        if (this.snapper && this.snapper.isSnapped()) {
            const res = this.snapper.getSnapResult();
            if (res) snapType = res.geomType === 2 ? 'midpoint' : 'endpoint';
        }
        this.drawOsnapIndicator(this.getBestPoint(event), snapType);

        if (this.opening.handleMove(event)) return true;
        if (this.drawing.handleMove(event)) return true;
        if (this.editing.handleMove(event)) return true;
        if (this.eraser.handleMove(event)) return true;
        return false;
    }

    handleButtonUp(event, button) {
        if (button !== 0) return false;
        if (this.opening.handleUp(event)) return true;
        if (this.drawing.handleUp(event)) return true;
        if (this.editing.handleUp(event)) return true;
        return false;
    }

  handleSingleClick(event, button) {
        if (button !== 0) return false; // Only respond to left clicks
        
        // 1. Pass the click to any handler that explicitly needs it
        if (this.opening.handleSingleClick && this.opening.handleSingleClick(event, button)) return true;
        if (this.drawing.handleSingleClick && this.drawing.handleSingleClick(event, button)) return true;
        if (this.editing.handleSingleClick && this.editing.handleSingleClick(event, button)) return true;
        if (this.eraser.handleSingleClick && this.eraser.handleSingleClick(event, button)) return true;
        
        // 2. THE SHIELD: If our tool is active in ANY mode, consume the click 
        // to block Autodesk's default "select and zoom" camera jump.
        if (this.mode !== 'NONE' && this.mode !== 'VIEW') {
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
}