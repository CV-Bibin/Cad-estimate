import { BeamToolMath } from './BeamToolMath';

export class BeamDrawingHandler {
    constructor(tool) {
        this.tool = tool; // Reference back to the main tool
        this.step = 0;
        this.p1 = null;
    }

    reset() {
        this.step = 0;
        this.p1 = null;
        this.tool.visuals.clearGhost();
        this.tool.viewer.impl.invalidate(true);
    }

    handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.reset();
            return true;
        }

        // 🌟 SPACEBAR FLIP: Dispatch event to sync React UI buttons
        if (event.code === 'Space') {
            event.preventDefault();
            
            // This triggers the justification change in StructuralEditor.js
            window.dispatchEvent(new CustomEvent('FLIP_JUSTIFICATION'));
            
            // Force a refresh of the ghost mesh immediately using the updated state
            if (this.step === 1 && window.lastMouseX !== undefined) {
                this.handleMove({ canvasX: window.lastMouseX, canvasY: window.lastMouseY });
            }
            return true;
        }
        return false;
    }

    handleMove(event) {
        // Track mouse for Spacebar refresh
        window.lastMouseX = event.canvasX;
        window.lastMouseY = event.canvasY;

        const { point: pt, snapType } = this.tool.getBestPoint(event);
        this.tool.visuals.drawOsnapIndicator(pt, snapType, this.tool.scaleFactor);

        // Draw rubber-band ghost beam
        if (this.step === 1 && this.p1 && pt) {
            const geomData = BeamToolMath.calculateBeamGeometry(
                this.p1, pt,
                this.tool.defaultWidth, // Uses the auto-calculated breadth
                this.tool.defaultDepth,
                this.tool.justification,
                this.tool.scaleFactor
            );
            this.tool.visuals.updateGhostMesh(geomData);
        }

        // Force high-frequency redraw for smooth ghosting
        this.tool.viewer.impl.invalidate(true, true, true);
        return true;
    }

    handleSingleClick(event) {
        const { point: pt, colSize } = this.tool.getBestPoint(event);
        if (!pt) return false;

        if (this.step === 0) {
            // Click 1: Start Beam
            this.p1 = pt;
            
            // 🌟 SET BREADTH: Automatically match the snapped column size (or 23cm default)
            this.tool.defaultWidth = colSize; 
            
            this.step = 1;
            return true;
        } 
        else if (this.step === 1) {
            // Click 2: Finish Beam
            const dx = pt.x - this.p1.x;
            const dy = pt.y - this.p1.y;
            const length = Math.sqrt(dx * dx + dy * dy) * this.tool.scaleFactor;

            if (length >= 0.1) { 
                window.dispatchEvent(new CustomEvent('BEAM_PLACED', {
                    detail: { 
                        p1: this.p1, 
                        p2: pt, 
                        length: length,
                        width: this.tool.defaultWidth, // The breadh we set in Step 0
                        depth: this.tool.defaultDepth,
                        justification: this.tool.justification
                    }
                }));
            }
            this.reset();
            return true;
        }
        return false;
    }
}