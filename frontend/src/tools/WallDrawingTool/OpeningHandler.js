import { WallToolMath } from './WallToolMath';

export class OpeningHandler {
    constructor(tool) { 
        this.tool = tool; 
    }

    // 🌟 NEW MATH FIX: Accurately detects if you click ANYWHERE on a thick wall
    _findTargetWall(pt) {
        let closestWall = null;
        let minDistance = Infinity;

        if (!this.tool.walls) return null;

        for (const wall of this.tool.walls) {
            const { p1, p2 } = wall.points;
            
            // Calculate exact distance from mouse point to the wall's center line segment
            const A = pt.x - p1.x;
            const B = pt.y - p1.y;
            const C = p2.x - p1.x;
            const D = p2.y - p1.y;

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;

            if (lenSq !== 0) param = dot / lenSq;

            let xx, yy;
            if (param < 0) {
                xx = p1.x; yy = p1.y;
            } else if (param > 1) {
                xx = p2.x; yy = p2.y;
            } else {
                xx = p1.x + param * C;
                yy = p1.y + param * D;
            }

            const dx = pt.x - xx;
            const dy = pt.y - yy;
            const distToCenterLine = Math.sqrt(dx * dx + dy * dy);

            // 🌟 THE FIX: If distance is within HALF the wall's thickness (+ 5cm tolerance), it counts as a hit!
            const wallThickness = wall.thickness || 0.23;
            const tolerance = (wallThickness / 2) + 0.05;

            if (distToCenterLine <= tolerance) {
                if (distToCenterLine < minDistance) {
                    minDistance = distToCenterLine;
                    closestWall = wall;
                }
            }
        }
        return closestWall;
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
        const snapZ = p1.z || 0; 

        const distFromP1 = Math.sqrt(Math.pow(snapX - p1.x, 2) + Math.pow(snapY - p1.y, 2));

        return {
            point: { x: snapX, y: snapY, z: snapZ },
            distance: distFromP1
        };
    }

    handleDown(event) {
        if (this.tool.mode !== 'OPENINGS') return false;

        const pt = this.tool.getBestPoint(event);
        if (!pt) return true; 

        // 🌟 WE USE OUR NEW SMART MATH INSTEAD OF THE OLD HIT TESTER
        const wall = this._findTargetWall(pt);

        // --- CLICK 1: START THE OPENING ---
        if (this.tool.points.length === 0) {
            if (wall) {
                // Starting on a wall
                const snapInfo = this._getWallSnapInfo(pt, wall);
                if (snapInfo) {
                    this.tool.points.push({ 
                        point: snapInfo.point, 
                        distance: snapInfo.distance, 
                        type: 'HOSTED', 
                        wallId: wall.id 
                    });
                }
            } else {
                // Starting in empty space
                this.tool.points.push({ 
                    point: pt, 
                    type: 'STANDALONE' 
                });
            }
            return true;
        } 
        
        // --- CLICK 2: FINISH THE OPENING ---
        else {
            const startData = this.tool.points[0];

            if (startData.type === 'HOSTED') {
                // Safety check: Make sure they clicked near the SAME wall
                if (!wall || wall.id !== startData.wallId) {
                    console.warn("Second click must be on the SAME wall.");
                    return true;
                }
                const snapInfo = this._getWallSnapInfo(pt, wall);
                if (snapInfo) {
                    const rawWidth = Math.abs(snapInfo.distance - startData.distance);
                    const centerDist = (startData.distance + snapInfo.distance) / 2;

                    window.dispatchEvent(new CustomEvent('OPENING_REQUESTED', {
                        detail: {
                            isStandalone: false,
                            wallId: wall.id,
                            measuredWidth: rawWidth,
                            centerDist: centerDist,
                            type: this.tool.settings.openingMode || 'DOOR'
                        }
                    }));
                }
            } 
            else if (startData.type === 'STANDALONE') {
                let finalPt = this.tool.isOrtho ? WallToolMath.applyOrtho(startData.point, pt) : pt;
                if (this.tool.isOrtho) finalPt.z = startData.point.z || 0;

                const dx = finalPt.x - startData.point.x;
                const dy = finalPt.y - startData.point.y;
                const rawWidth = Math.sqrt(dx*dx + dy*dy);

                window.dispatchEvent(new CustomEvent('OPENING_REQUESTED', {
                    detail: {
                        isStandalone: true,
                        p1: startData.point,
                        p2: finalPt,
                        measuredWidth: rawWidth,
                        type: this.tool.settings.openingMode || 'ARCH',
                        justification: this.tool.justification || 'CENTER'
                    }
                }));
            }

            // Reset for the next drawing
            this.tool.points = [];
            if (this.tool.visuals && this.tool.visuals.clearGhostWall) {
                this.tool.visuals.clearGhostWall();
            }
            return true;
        }
    }

    handleMove(event) {
        if (this.tool.mode !== 'OPENINGS') return false;

        const pt = this.tool.getBestPoint(event);
        if (!pt) return false;

        // Draw the preview shadow between Click 1 and Click 2
        if (this.tool.points.length === 1) {
            const startData = this.tool.points[0];
            const currentScale = this.tool.settings.scaleFactor || 1;
            const thickness = this.tool.thickness || 0.23;
            const scaledThickness = thickness / currentScale;

            if (startData.type === 'HOSTED') {
                const wall = this.tool.walls.find(w => w.id === startData.wallId);
                if (wall) {
                    const snapInfo = this._getWallSnapInfo(pt, wall);
                    if (snapInfo && this.tool.visuals && this.tool.visuals.updateGhostWall) {
                        this.tool.visuals.updateGhostWall(startData.point, snapInfo.point, scaledThickness, 'CENTER');
                    }
                }
            } else if (startData.type === 'STANDALONE') {
                let endPt = this.tool.isOrtho ? WallToolMath.applyOrtho(startData.point, pt) : pt;
                if (this.tool.isOrtho) endPt.z = startData.point.z || 0;
                if (this.tool.visuals && this.tool.visuals.updateGhostWall) {
                    this.tool.visuals.updateGhostWall(startData.point, endPt, scaledThickness, this.tool.justification || 'CENTER');
                }
            }
            return true;
        }
        return false;
    }

    handleUp(event) {
        if (this.tool.mode === 'OPENINGS') return true; 
        return false;
    }
}