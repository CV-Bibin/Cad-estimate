import { WallToolMath } from './WallToolMath';

export class OpeningHandler {
    constructor(tool) { 
        this.tool = tool; 
    }

    // --- MATH HELPER: Snaps the mouse perfectly onto the wall's center line ---
    _getWallSnapInfo(pt, wall) {
        const p1 = wall.points.p1;
        const p2 = wall.points.p2;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const wallLenSq = dx * dx + dy * dy;

        if (wallLenSq === 0) return null;

        let t = ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / wallLenSq;
        t = Math.max(0, Math.min(1, t)); 

        const snapX = p1.x + t * dx;
        const snapY = p1.y + t * dy;
        const snapZ = p1.z; 

        const distFromP1 = Math.sqrt(Math.pow(snapX - p1.x, 2) + Math.pow(snapY - p1.y, 2));

        return {
            point: { x: snapX, y: snapY, z: snapZ },
            distance: distFromP1
        };
    }

    handleDown(event) {
        if (this.tool.mode !== 'OPENINGS') return false;

        const wall = this.tool.hitTestWall(event.canvasX, event.canvasY);

        // --- HOSTED OPENING (Click 2 points on a wall) ---
        if (wall) {
            const pt = this.tool.getBestPoint(event);
            if (!pt) return false;

            const snapInfo = this._getWallSnapInfo(pt, wall);
            if (snapInfo) {
                if (this.tool.points.length === 0) {
                    // CLICK 1: Start of the opening
                    this.tool.points.push(snapInfo);
                } else {
                    // CLICK 2: End of the opening
                    const startSnap = this.tool.points[0];
                    const endSnap = snapInfo;

                    // Calculate the exact width drawn on the CAD file
                    const rawWidth = Math.abs(endSnap.distance - startSnap.distance);
                    const centerDist = (startSnap.distance + endSnap.distance) / 2;

                    // Tell React to open the UI Modal to confirm exact dimensions
                    window.dispatchEvent(new CustomEvent('OPENING_REQUESTED', {
                        detail: {
                            wallId: wall.id,
                            measuredWidth: rawWidth, // Send the raw measured width
                            centerDist: centerDist,
                            type: this.tool.settings.openingMode || 'DOOR'
                        }
                    }));

                    this.tool.points = []; // Reset for the next opening
                    this.tool.visuals.clearGhostWall();
                }
            }
            return true; 
        }

        // --- STANDALONE OPENING (Click in empty space) ---
        const pt = this.tool.getBestPoint(event);
        if (pt) {
            this.tool.points = [pt];
            return true;
        }

        return false;
    }

    handleMove(event) {
        if (this.tool.mode !== 'OPENINGS') return false;

        const wall = this.tool.hitTestWall(event.canvasX, event.canvasY);

        if (wall) {
            const pt = this.tool.getBestPoint(event);
            if (pt) {
                const snapInfo = this._getWallSnapInfo(pt, wall);
                if (snapInfo) {
                    this.tool.drawOsnapIndicator(snapInfo.point, 'endpoint');
                    
                    // Draw a preview line from Click 1 to current mouse position
                    if (this.tool.points.length === 1) {
                        const currentScale = this.tool.settings.scaleFactor || 1;
                        const scaledThickness = this.tool.thickness / currentScale;
                        this.tool.visuals.updateGhostWall(this.tool.points[0].point, snapInfo.point, scaledThickness, 'CENTER');
                    }
                }
            }
            return true;
        } else {
            // Hovering empty space logic (Standalone)
            if (this.tool.points.length === 1 && !this.tool.points[0].distance) { // Ensure it's not a wall snap point
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
        }
        return false;
    }

    handleUp(event) {
        if (this.tool.mode !== 'OPENINGS') return false;
        const wall = this.tool.hitTestWall(event.canvasX, event.canvasY);
        
        // --- FINISH STANDALONE OPENING ---
        if (!wall && this.tool.points.length === 1 && !this.tool.points[0].distance) {
            const pt = this.tool.getBestPoint(event);
            if (!pt) return false;

            let finalPt = this.tool.isOrtho ? WallToolMath.applyOrtho(this.tool.points[0], pt) : { ...pt };
            if (this.tool.isOrtho) finalPt.z = this.tool.points[0].z;

            this.tool.points.push(finalPt);

            if (this.tool.points.length === 2) {
                // Calculate standalone width
                const dx = finalPt.x - this.tool.points[0].x;
                const dy = finalPt.y - this.tool.points[0].y;
                const rawWidth = Math.sqrt(dx*dx + dy*dy);

                // Open modal for standalone opening too
                window.dispatchEvent(new CustomEvent('OPENING_REQUESTED', {
                    detail: {
                        isStandalone: true,
                        p1: this.tool.points[0],
                        p2: this.tool.points[1],
                        measuredWidth: rawWidth,
                        type: this.tool.settings.openingMode || 'ARCH',
                        justification: this.tool.justification
                    }
                }));
                this.tool.points = [];
                this.tool.visuals.clearGhostWall();
            }
            return true;
        }
        return false;
    }
}