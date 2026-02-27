export class EraserHandler {
    constructor(tool) { 
        this.tool = tool; 
    }

    handleDown(event) {
        if (this.tool.mode === 'ERASER') {
            const wall = this.tool.hitTestWall(event.canvasX, event.canvasY);
            if (wall && this.tool.onWallDeleted) {
                this.tool.onWallDeleted(wall.id);
                this.tool.visuals.clearEraserHighlight();
                this.tool.hoveredWallId = null;
                return true;
            }
        }
        return false;
    }

    handleMove(event) {
        if (this.tool.mode === 'ERASER') {
            const wall = this.tool.hitTestWall(event.canvasX, event.canvasY);
            if (wall && wall.id !== this.tool.hoveredWallId) {
                this.tool.hoveredWallId = wall.id;
                
                // CRITICAL FIX: Convert real-world thickness to Viewer Units
                const currentScale = this.tool.settings.scaleFactor || 1;
                const scaledThickness = wall.thickness / currentScale;
                
                // Pass the SCALED thickness to the visuals
                this.tool.visuals.showEraserHighlight(wall, scaledThickness); 

            } else if (!wall && this.tool.hoveredWallId) {
                this.tool.hoveredWallId = null;
                this.tool.visuals.clearEraserHighlight();
            }
            return false;
        }
        return false;
    }
}