import { WallToolMath } from './WallToolMath';

export class DrawingHandler {
    constructor(tool) { 
        this.tool = tool; 
    }

    // --- HELPER: Safely extracts endpoints (Prevents null crashes) ---
    _getLineEndpoints(res) {
        let p1 = null; let p2 = null;
        if (res.geomEdge) {
            if (res.geomEdge.vertices && res.geomEdge.vertices.length >= 2) {
                p1 = res.geomEdge.vertices[0];
                p2 = res.geomEdge.vertices[res.geomEdge.vertices.length - 1];
            } else if (res.geomEdge.geometry && res.geomEdge.geometry.vertices && res.geomEdge.geometry.vertices.length >= 2) {
                p1 = res.geomEdge.geometry.vertices[0];
                p2 = res.geomEdge.geometry.vertices[res.geomEdge.geometry.vertices.length - 1];
            }
        }
        if ((!p1 || !p2) && res.geomVertex && res.intersectPoint) {
            p1 = res.geomVertex; p2 = res.intersectPoint;
        }
        return { p1, p2 };
    }

    handleDown(event) {
        // Just consume the event so the viewer doesn't try to pan the camera
        if (this.tool.mode === 'DRAW') return true; 
        return false;
    }

    // 🌟 THIS IS THE MISSING PIECE! 🌟
    handleSingleClick(event, button) {
        if (this.tool.mode !== 'DRAW' || button !== 0) return false;
        
        const { snapper, settings, visuals } = this.tool;

        // --- 1. PICK-A-LINE WORKFLOW ---
        if (settings.wallMode === 'PICK') {
            if (snapper && snapper.isSnapped()) {
                const res = snapper.getSnapResult();
                if (res.geomPolyline || res.geomEdge) {
                    const { p1, p2 } = this._getLineEndpoints(res);

                    if (!p1 || !p2) {
                        console.warn("⚠️ Snap missed endpoints. Please click closer to a corner or endpoint.");
                        return true; 
                    }

                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const rawLen = Math.sqrt(dx * dx + dy * dy);

                    window.dispatchEvent(new CustomEvent('PICK_LINE_REQUESTED', {
                        detail: { 
                            p1: p1, p2: p2, 
                            length: rawLen * (settings.scaleFactor || 1) 
                        }
                    }));

                    this.tool.points = [];
                    visuals.clearGhostWall();
                    return true; 
                }
            }
            return true; // Click consumed, prevent camera jump
        }

        // --- 2. MANUAL DRAW WORKFLOW ---
        if (settings.wallMode === 'MANUAL') {
            const pt = this.tool.getBestPoint(event);
            if (!pt) return false;

            if (this.tool.points.length === 0) {
                // Click 1
                this.tool.points.push(pt);
                return true;
            } else {
                // Click 2
                let finalPt = this.tool.isOrtho ? WallToolMath.applyOrtho(this.tool.points[0], pt) : { ...pt };
                if (this.tool.isOrtho) finalPt.z = this.tool.points[0].z;

                this.tool.points.push(finalPt);

                if (this.tool.onWallCreated) {
                    this.tool.onWallCreated(this.tool.points[0], this.tool.points[1], this.tool.thickness, this.tool.justification);
                }

                this.tool.points = [this.tool.points[1]]; // Chain drawing
                visuals.clearGhostWall();
                return true;
            }
        }
        return false;
    }

    handleMove(event) {
        if (this.tool.mode !== 'DRAW') return false;

        // MANUAL PREVIEW
        if (this.tool.settings.wallMode === 'MANUAL' && this.tool.points.length === 1) {
            const pt = this.tool.getBestPoint(event);
            if (pt) {
                let endPt = this.tool.isOrtho ? WallToolMath.applyOrtho(this.tool.points[0], pt) : pt;
                if (this.tool.isOrtho) endPt.z = this.tool.points[0].z; 

                const currentScale = this.tool.settings.scaleFactor || 1;
                const scaledThickness = this.tool.thickness / currentScale;

                this.tool.visuals.updateGhostWall(this.tool.points[0], endPt, scaledThickness, this.tool.justification);
            }
            return true;
        }

        // PICK PREVIEW
        if (this.tool.settings.wallMode === 'PICK') {
            const snapper = this.tool.snapper;
            if (snapper && snapper.isSnapped()) {
                const res = snapper.getSnapResult();
                if (res.geomPolyline || res.geomEdge) {
                    const { p1, p2 } = this._getLineEndpoints(res);
                    if (p1 && p2) {
                        const currentScale = this.tool.settings.scaleFactor || 1;
                        const scaledThickness = this.tool.thickness / currentScale;
                        
                        this.tool.visuals.updateGhostWall(p1, p2, scaledThickness, this.tool.justification);
                        return true;
                    }
                }
            }
            this.tool.visuals.clearGhostWall();
            return false; // Let the snapper handle the rest of the hover event
        }
        return false;
    }

    handleUp(event) {
        // Block the default up behavior so the camera doesn't jump
        if (this.tool.mode === 'DRAW') return true;
        return false;
    }
}