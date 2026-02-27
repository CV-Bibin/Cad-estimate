import { WallToolMath } from './WallToolMath';

export class DrawingHandler {
    constructor(tool) { 
        this.tool = tool; 
    }

    // --- HELPER: Safely extracts endpoints (Prevents null crashes) ---
    _getLineEndpoints(res) {
        let p1 = null;
        let p2 = null;

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
            p1 = res.geomVertex;
            p2 = res.intersectPoint;
        }

        return { p1, p2 };
    }

    handleDown(event) {
        const { snapper, settings, visuals } = this.tool;

        // --- 1. PICK-A-LINE CONFIRMATION WORKFLOW ---
        if (this.tool.mode === 'DRAW' && settings.wallMode === 'PICK') {
            if (snapper && snapper.isSnapped()) {
                const res = snapper.getSnapResult();
                
                if (res.geomPolyline || res.geomEdge) {
                    const { p1, p2 } = this._getLineEndpoints(res);

                    // SAFETY NET: If no points are found, ignore the click instead of crashing
                    if (!p1 || !p2) {
                        console.warn("⚠️ Snap missed endpoints. Please click closer to a corner or endpoint.");
                        return true; 
                    }

                    // Calculate the true length of the selected line
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const rawLen = Math.sqrt(dx * dx + dy * dy);

                    window.dispatchEvent(new CustomEvent('PICK_LINE_REQUESTED', {
                        detail: { 
                            p1: p1, 
                            p2: p2, 
                            length: rawLen * (settings.scaleFactor || 1) 
                        }
                    }));

                    this.tool.points = [];
                    visuals.clearGhostWall();
                    return true; 
                }
            }
            return false; 
        }

        // --- 2. MANUAL DRAW CLICK ---
        if (this.tool.mode === 'DRAW') return true; 
        return false;
    }

    handleMove(event) {
        // --- MANUAL MODE PREVIEW ---
        if (this.tool.mode === 'DRAW' && this.tool.settings.wallMode === 'MANUAL' && this.tool.points.length === 1) {
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

        // --- NEW FEATURE: PICK MODE HOVER PREVIEW ---
        if (this.tool.mode === 'DRAW' && this.tool.settings.wallMode === 'PICK') {
            const snapper = this.tool.snapper;
            if (snapper && snapper.isSnapped()) {
                const res = snapper.getSnapResult();
                
                // Only show preview for actual lines/edges
                if (res.geomPolyline || res.geomEdge) {
                    const { p1, p2 } = this._getLineEndpoints(res);

                    if (p1 && p2) {
                        const currentScale = this.tool.settings.scaleFactor || 1;
                        const scaledThickness = this.tool.thickness / currentScale;
                        
                        // Dynamically draws the shadow based on current Center/Inner/Outer justification
                        this.tool.visuals.updateGhostWall(p1, p2, scaledThickness, this.tool.justification);
                        return true;
                    }
                }
            }
            
            // Hide the shadow if not hovering over a valid line
            this.tool.visuals.clearGhostWall();
            return false;
        }

        return false;
    }

    handleUp(event) {
        if (this.tool.mode === 'DRAW' && this.tool.settings.wallMode === 'PICK') return true;

        if (this.tool.mode === 'DRAW' && this.tool.settings.wallMode === 'MANUAL') {
            const pt = this.tool.getBestPoint(event);
            if (!pt) return false;

            let finalPt = this.tool.isOrtho && this.tool.points.length > 0
                ? WallToolMath.applyOrtho(this.tool.points[0], pt)
                : { ...pt };

            if (this.tool.isOrtho && this.tool.points.length > 0) finalPt.z = this.tool.points[0].z;

            this.tool.points.push(finalPt);

            if (this.tool.points.length === 2) {
                this.tool.onWallCreated(this.tool.points[0], this.tool.points[1], this.tool.thickness, this.tool.justification);
                this.tool.points = [this.tool.points[1]]; // Chain drawing
                this.tool.visuals.clearGhostWall();
            }
            return true;
        }
        return false;
    }
}