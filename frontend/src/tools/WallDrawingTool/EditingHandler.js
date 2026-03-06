import { WallToolMath } from './WallToolMath';

export class EditingHandler {
    constructor(tool) { 
        this.tool = tool; 
    }

    handleDown(event) {
        if (this.tool.mode === 'EDIT') {
            const hit = this.tool.visuals.hitTestHandlesScreenSpace(event.canvasX, event.canvasY);
            if (hit) {
                this.tool.selectedHandle = hit; 
                this.tool.updateCursor();
                return true; 
            }
        }
        return false;
    }

    handleMove(event) {
        if (this.tool.mode !== 'EDIT') return false;

        // DRAGGING LOGIC
        if (this.tool.selectedHandle) {
            const pt = this.tool.getBestPoint(event);
            if (pt) {
                let finalPt = pt;
                const { wallId, pointType } = this.tool.selectedHandle.userData;
                const wall = this.tool.walls.find(w => w.id === wallId);

                if (wall) {
                    const stationaryPt = pointType === 'p1' ? wall.points.p2 : wall.points.p1;

                    if (this.tool.isOrtho) {
                        finalPt = WallToolMath.applyOrtho(stationaryPt, pt);
                        finalPt.z = stationaryPt.z;
                    }

                    this.tool.selectedHandle.position.copy(finalPt);
                    const currentScale = this.tool.settings.scaleFactor || 1;
                    const scaledThickness = this.tool.thickness / currentScale;
                    
                    if (pointType === 'p1') {
                        this.tool.visuals.updateGhostWall(finalPt, stationaryPt, scaledThickness, this.tool.justification);
                    } else {
                        this.tool.visuals.updateGhostWall(stationaryPt, finalPt, scaledThickness, this.tool.justification);
                    }
                }
                this.tool.viewer.impl.invalidate(true, true, true);
            }
            return true; 
        }

        // HOVER LOGIC (Pop-up scale)
        const hit = this.tool.visuals.hitTestHandlesScreenSpace(event.canvasX, event.canvasY);
        if (hit !== this.tool.hoveredHandle) {
            if (this.tool.hoveredHandle) {
                this.tool.hoveredHandle.material = this.tool.visuals.handleMatNormal;
                // Return to original dynamic scale when mouse leaves
                const baseScale = this.tool.hoveredHandle.userData.baseScale || 1;
                this.tool.hoveredHandle.scale.set(baseScale, baseScale, baseScale); 
            }
            if (hit) {
                hit.material = this.tool.visuals.handleMatHover;
                // Pop out by 1.5x the dynamic scale when hovered
                const baseScale = hit.userData.baseScale || 1;
                hit.scale.set(baseScale * 1.5, baseScale * 1.5, baseScale * 1.5); 
            }
            this.tool.hoveredHandle = hit;
            this.tool.updateCursor();
            this.tool.viewer.impl.invalidate(false, false, true);
        }
        return false;
    }

    handleUp(event) {
        if (this.tool.mode === 'EDIT' && this.tool.selectedHandle) {
            const { wallId, pointType, baseScale } = this.tool.selectedHandle.userData;
            this.tool.onWallUpdated(wallId, pointType, this.tool.selectedHandle.position);
            this.tool.visuals.clearGhostWall();
            
            // Reset scale upon release
            const resetScale = baseScale || 1;
            this.tool.selectedHandle.scale.set(resetScale, resetScale, resetScale);
            this.tool.selectedHandle.material = this.tool.visuals.handleMatNormal;
            
            this.tool.selectedHandle = null;
            this.tool.updateCursor();
            return true;
        }
        return false;
    }
}