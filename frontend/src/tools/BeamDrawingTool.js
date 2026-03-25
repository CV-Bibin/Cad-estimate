/* global Autodesk */
import { BeamToolVisuals } from './BeamToolVisuals';
import { BeamToolMath } from './BeamToolMath';
import { BeamDrawingHandler } from './BeamDrawingHandler';
import { BeamEditingHandler } from './BeamEditingHandler'; 

export class BeamDrawingTool {
    constructor(viewer) {
        this.viewer = viewer;
        this.names = ['beam-drawing-tool'];
        this.active = false;
        
        this.osnapEnabled = true; 
        this.orthoEnabled = false;
        this.scaleFactor = 1; 
        
        this.justification = 'CENTER'; 
        this.defaultWidth = 0.2;
        this.defaultDepth = 0.3;
        
        this.snapPoints = []; 
        this.placedBeams = []; 
        this.snapper = null;
        this.mode = 'DRAW'; 

        this.visuals = new BeamToolVisuals(viewer);
        this.handlers = {
            'DRAW': new BeamDrawingHandler(this),
            'EDIT': new BeamEditingHandler(this) 
        };

        this.onKeyDown = this.onKeyDown.bind(this);
    }

    getNames() { return this.names; }
    getName() { return this.names[0]; }
    setScaleFactor(sf) { this.scaleFactor = sf || 1; }
    updateSnapPoints(pts) { this.snapPoints = pts || []; }
    setPlacedBeams(beams) { this.placedBeams = beams || []; }
    
 setMode(mode) { 
        const newMode = mode || 'DRAW';
        // 🌟 FIX: Only reset the tool if the mode ACTUALLY changes!
        // This prevents the line from resetting when you click the Alignment buttons.
        if (this.mode !== newMode) {
            if (this.handlers[this.mode] && this.handlers[this.mode].reset) {
                this.handlers[this.mode].reset();
            }
            this.mode = newMode; 
        }
    }

    // 🌟 FIX: Dynamically turn the Native Autodesk Snapper ON/OFF when sidebar button is clicked
    setToggles(ortho, osnap) { 
        this.orthoEnabled = ortho; 
        if (osnap !== this.osnapEnabled) {
            this.osnapEnabled = osnap;
            if (this.active && this.viewer.toolController) {
                if (osnap) {
                    if (!this.snapper) {
                        this.snapper = new Autodesk.Viewing.Extensions.Snapping.Snapper(this.viewer, {
                            renderSnappedGeometry: true, renderSnappedTopology: true, markupMode: false, snapFilter: 2 | 1 | 4 | 32
                        });
                    }
                    this.viewer.toolController.activateTool(this.snapper.getName());
                } else if (this.snapper) {
                    this.viewer.toolController.deactivateTool(this.snapper.getName());
                }
            }
        }
    }

    activate() {
        if (this.active) return;
        this.active = true;
        if (this.viewer.canvas) this.viewer.canvas.style.cursor = 'crosshair';

        if (this.osnapEnabled) {
            if (!this.snapper) {
                this.snapper = new Autodesk.Viewing.Extensions.Snapping.Snapper(this.viewer, {
                    renderSnappedGeometry: true, renderSnappedTopology: true, markupMode: false, snapFilter: 2 | 1 | 4 | 32
                });
            }
            this.viewer.toolController.activateTool(this.snapper.getName());
        }
        window.addEventListener('keydown', this.onKeyDown);
    }

    deactivate() {
        if (!this.active) return;
        this.active = false;
        
        if (this.handlers[this.mode]) this.handlers[this.mode].reset();
        if (this.viewer.canvas) this.viewer.canvas.style.cursor = 'default';
        if (this.snapper) {
            this.viewer.toolController.deactivateTool(this.snapper.getName());
        }
        
        this.visuals.clearOsnap();
        this.viewer.impl.invalidate(true);
        window.removeEventListener('keydown', this.onKeyDown);
    }

    onKeyDown(event) {
        if (this.handlers[this.mode] && this.handlers[this.mode].handleKeyDown) {
            this.handlers[this.mode].handleKeyDown(event);
        }
    }

    getBestPoint(event) {
        let pt = null;
        let snapType = 'none';
        let detectedSize = 0.23;

        let hit = this.viewer.impl.hitTest(event.canvasX, event.canvasY, true);
        let mouseWorld = hit ? hit.intersectPoint : this.viewer.impl.intersectGround(event.canvasX, event.canvasY);
        if (!mouseWorld) return { point: null, snapType: 'none', colSize: 0.23 };

        // 1. Check Custom Magnetic Points First (Columns are Highest Priority)
        if (this.snapPoints.length > 0) {
            const magneticRadius = 0.25 / this.scaleFactor; 
            let closestDist = Infinity;
            let closestSp = null;

            this.snapPoints.forEach(sp => {
                if (!this.osnapEnabled && sp.type === 'wall') return; // Skip CAD lines if Osnap is OFF
                const dist = Math.sqrt(Math.pow(sp.x - mouseWorld.x, 2) + Math.pow(sp.y - mouseWorld.y, 2));
                if (dist < magneticRadius && dist < closestDist) {
                    closestDist = dist;
                    closestSp = sp;
                }
            });

            if (closestSp) {
                pt = { x: closestSp.x, y: closestSp.y, z: 0 };
                detectedSize = closestSp.colSize || 0.23;
                if (closestSp.isCenter) snapType = 'center';
                else if (closestSp.isCorner) snapType = 'corner';
                else if (closestSp.isFace) snapType = 'face';
                else if (closestSp.type === 'wall') snapType = 'wall'; 
                else snapType = 'endpoint';
            }
        }

        // 🌟 2. FIX: Check Native CAD Snapper (Second Priority)
        if (!pt && this.osnapEnabled && this.snapper && this.snapper.isSnapped()) {
            const res = this.snapper.getSnapResult();
            if (res.geomVertex) pt = res.geomVertex;
            else if (res.intersectPoint) pt = res.intersectPoint;
            if (pt) snapType = 'wall'; // Show white dot for CAD joints
        }

        // 3. Fallback to free space
        if (!pt) pt = { x: mouseWorld.x, y: mouseWorld.y, z: 0 }; 
        let finalPt = { x: pt.x, y: pt.y, z: pt.z || 0 };

        // Ortho Lock
        if (this.orthoEnabled && this.handlers[this.mode].step === 1) {
            const originPt = this.handlers[this.mode].p1 || this.handlers[this.mode].activePt;
            if (originPt) {
                if (Math.abs(finalPt.x - originPt.x) > Math.abs(finalPt.y - originPt.y)) finalPt.y = originPt.y; 
                else finalPt.x = originPt.x; 
            }
        }

        return { point: finalPt, snapType, colSize: detectedSize }; 
    }

    handleMouseMove(event) {
        if (!this.active) return false;
        if (this.snapper) this.snapper.handleMouseMove(event);
        if (this.handlers[this.mode] && this.handlers[this.mode].handleMove) {
            return this.handlers[this.mode].handleMove(event);
        }
        return false;
    }

    handleSingleClick(event, button) {
        if (button !== 0 || !this.active) return false;
        if (this.handlers[this.mode] && this.handlers[this.mode].handleSingleClick) {
            return this.handlers[this.mode].handleSingleClick(event);
        }
        return false;
    }

    // 🌟 ADDED: Listen for Mouse Press (Starts the Drag)
    handleButtonDown(event, button) {
        if (button !== 0 || !this.active) return false;
        if (this.handlers[this.mode] && this.handlers[this.mode].handleButtonDown) {
            return this.handlers[this.mode].handleButtonDown(event);
        }
        return false;
    }

    // 🌟 ADDED: Listen for Mouse Release (Ends the Drag)
    handleButtonUp(event, button) {
        if (button !== 0 || !this.active) return false;
        if (this.handlers[this.mode] && this.handlers[this.mode].handleButtonUp) {
            return this.handlers[this.mode].handleButtonUp(event);
        }
        return false;
    }
}