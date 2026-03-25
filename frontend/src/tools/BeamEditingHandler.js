import { BeamToolMath } from './BeamToolMath';

export class BeamEditingHandler {
    constructor(tool) {
        this.tool = tool;
        this.step = 0; 
        this.activeBeam = null;
        this.movingPoint = null; 
        this.activePt = null; 
    }

    reset() {
        this.step = 0;
        this.activeBeam = null;
        this.movingPoint = null;
        this.activePt = null;
        this.tool.visuals.clearGhost();
        
        // 🌟 INSTANT SHOW: If we cancelled, turn all the original beams back on immediately!
        if (this.tool.viewer.beamMeshes) {
            this.tool.viewer.beamMeshes.forEach(mesh => {
                mesh.visible = true; 
            });
        }
        
        this.tool.viewer.impl.invalidate(true, true, true);
        if (this.tool.viewer.canvas) this.tool.viewer.canvas.style.cursor = 'crosshair';
        
        window.dispatchEvent(new CustomEvent('BEAM_EDIT_CANCEL'));
    }

    handleKeyDown(event) {
        if (event.key === 'Escape') { this.reset(); return true; }
        return false;
    }

    getHoveredJoint(mousePt) {
        if (!this.tool.placedBeams || this.tool.placedBeams.length === 0) return null;
        
        const threshold = 0.5 / this.tool.scaleFactor; 
        let closest = null;
        let minDist = threshold;

        for (let beam of this.tool.placedBeams) {
            const d1 = Math.sqrt(Math.pow(beam.p1.x - mousePt.x, 2) + Math.pow(beam.p1.y - mousePt.y, 2));
            if (d1 < minDist) { minDist = d1; closest = { beam, pointStr: 'p1', stationaryPt: beam.p2 }; }

            const d2 = Math.sqrt(Math.pow(beam.p2.x - mousePt.x, 2) + Math.pow(beam.p2.y - mousePt.y, 2));
            if (d2 < minDist) { minDist = d2; closest = { beam, pointStr: 'p2', stationaryPt: beam.p1 }; }
        }
        return closest;
    }

    handleButtonDown(event) {
        const { point: pt } = this.tool.getBestPoint(event);
        if (!pt) return false;

        if (this.step === 0) {
            const joint = this.getHoveredJoint(pt);
            if (joint) {
                this.activeBeam = joint.beam;
                this.movingPoint = joint.pointStr;
                this.activePt = joint.stationaryPt; 
                this.step = 1;
                
                // 🌟 INSTANT HIDE: Find the exact 3D mesh in the graphics card and turn it off!
                if (this.tool.viewer.beamMeshes) {
                    this.tool.viewer.beamMeshes.forEach(mesh => {
                        if (mesh.userData && String(mesh.userData.id) === String(this.activeBeam.id)) {
                            mesh.visible = false;
                        }
                    });
                }
                this.tool.viewer.impl.invalidate(true, true, true);
                
                window.dispatchEvent(new CustomEvent('BEAM_EDIT_START', { detail: { id: this.activeBeam.id } }));
                return true; 
            }
        }
        return false;
    }

    handleMove(event) {
        window.lastMouseX = event.canvasX; window.lastMouseY = event.canvasY;
        const { point: pt, snapType } = this.tool.getBestPoint(event);

        if (this.step === 0) {
            const joint = this.getHoveredJoint(pt);
            if (joint) {
                this.tool.viewer.canvas.style.cursor = 'grab'; 
                this.tool.visuals.drawOsnapIndicator(joint.beam[joint.pointStr], 'midpoint', this.tool.scaleFactor); 
            } else {
                this.tool.viewer.canvas.style.cursor = 'crosshair';
                this.tool.visuals.drawOsnapIndicator(pt, snapType, this.tool.scaleFactor); 
            }
        } 
        else if (this.step === 1 && this.activeBeam && pt) {
            this.tool.viewer.canvas.style.cursor = 'grabbing'; 
            this.tool.visuals.drawOsnapIndicator(pt, snapType, this.tool.scaleFactor);

            const p1 = this.movingPoint === 'p1' ? pt : this.activeBeam.p1;
            const p2 = this.movingPoint === 'p2' ? pt : this.activeBeam.p2;

            const geomData = BeamToolMath.calculateBeamGeometry(
                p1, p2, 
                this.activeBeam.width, this.activeBeam.depth, 
                this.activeBeam.justification, this.tool.scaleFactor
            );
            this.tool.visuals.updateGhostMesh(geomData);
        }

        this.tool.viewer.impl.invalidate(true, true, true);
        return this.step === 1; 
    }

    handleButtonUp(event) {
        if (this.step === 1 && this.activeBeam) {
            const { point: pt } = this.tool.getBestPoint(event);
            const dropPt = pt || this.activeBeam[this.movingPoint]; 

            const p1 = this.movingPoint === 'p1' ? dropPt : this.activeBeam.p1;
            const p2 = this.movingPoint === 'p2' ? dropPt : this.activeBeam.p2;
            
            const dx = p2.x - p1.x; const dy = p2.y - p1.y;
            const length = Math.sqrt(dx * dx + dy * dy) * this.tool.scaleFactor;

            if (length >= 0.1) {
                window.dispatchEvent(new CustomEvent('BEAM_UPDATED', {
                    detail: { id: this.activeBeam.id, p1, p2, length }
                }));
            } else {
                window.dispatchEvent(new CustomEvent('BEAM_EDIT_CANCEL'));
            }
            this.reset();
            return true;
        }
        return false;
    }

    handleSingleClick() {
        return false;
    }
}