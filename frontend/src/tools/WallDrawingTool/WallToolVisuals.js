/* global THREE */
import { WallToolMath } from './WallToolMath';

export default class WallToolVisuals {
    constructor(viewer) {
        this.viewer = viewer;
        this.tempMesh = null;
        this.visualHandles = [];

        // --- REUSABLE RESOURCES (Copied exactly from your constructor) ---
        this.handleGeo = new THREE.SphereGeometry(0.15, 12, 12);
        
        this.handleMatNormal = new THREE.MeshBasicMaterial({ 
            color: 0x00FF00, transparent: true, opacity: 0.35, depthTest: false 
        });
        
        this.handleMatHover = new THREE.MeshBasicMaterial({ 
            color: 0xFFFF00, transparent: true, opacity: 0.6, depthTest: false 
        });
        
        this.tempWallMat = new THREE.MeshBasicMaterial({ 
            color: 0xFFA500, opacity: 0.6, transparent: true, depthTest: false 
        });

        // Ensure Overlay Scene Exists
        if (!this.viewer.overlays.hasScene('custom-scene')) {
            this.viewer.overlays.addScene('custom-scene');
        }
    }

    // --- GHOST WALL (Copied from updateTempMesh) ---
    updateGhostWall(p1, p2, thickness, justification) {
        this.clearGhostWall();
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.01) return;

        const geometry = new THREE.BoxGeometry(len, thickness, 1);
        this.tempMesh = new THREE.Mesh(geometry, this.tempWallMat);

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        this.tempMesh.position.set(midX, midY, p1.z + 1.0);
        this.tempMesh.rotation.z = Math.atan2(dy, dx);

        // Apply Justification Offset
        let offsetVal = 0;
        if (justification === 'LEFT') offsetVal = thickness / 2;
        if (justification === 'RIGHT') offsetVal = -thickness / 2;

        if (offsetVal !== 0) {
            const offset = WallToolMath.getOffset(p1, p2, offsetVal);
            this.tempMesh.position.x += offset.x;
            this.tempMesh.position.y += offset.y;
        }

        this.viewer.overlays.addMesh(this.tempMesh, 'custom-scene');
        this.viewer.impl.invalidate(true, true, true);
    }

    clearGhostWall() {
        if (this.tempMesh) {
            this.viewer.overlays.removeMesh(this.tempMesh, 'custom-scene');
            if (this.tempMesh.geometry) this.tempMesh.geometry.dispose();
            this.tempMesh = null;
            this.viewer.impl.invalidate(true, true, true);
        }
    }

    // --- HANDLES (Copied from refreshHandles) ---
    refreshHandles(walls, handlePlacement) {
        this.clearHandles();
        if (!walls) return;

        walls.forEach(w => {
            ['p1', 'p2'].forEach(t => {
                let offsetDist = 0;
                if (handlePlacement === 'INNER') offsetDist = w.thickness / 2;
                if (handlePlacement === 'OUTER') offsetDist = -w.thickness / 2;

                const offset = WallToolMath.getOffset(w.points.p1, w.points.p2, offsetDist);
                const basePos = w.points[t];

                const v = new THREE.Mesh(this.handleGeo, this.handleMatNormal);
                v.position.set(basePos.x + offset.x, basePos.y + offset.y, basePos.z + 1.0);
                v.userData = { wallId: w.id, pointType: t };

                this.viewer.overlays.addMesh(v, 'custom-scene');
                this.visualHandles.push(v);
            });
        });
        this.viewer.impl.invalidate(true);
    }

    clearHandles() {
        this.visualHandles.forEach(h => this.viewer.overlays.removeMesh(h, 'custom-scene'));
        this.visualHandles = [];
        this.viewer.impl.invalidate(true);
    }

    // --- HIT TEST (Copied from hitTestHandlesScreenSpace) ---
    hitTestHandlesScreenSpace(canvasX, canvasY) {
        const threshold = 15;
        for (let handle of this.visualHandles) {
            const screenPoint = this.viewer.worldToClient(handle.position);
            const dx = Math.abs(screenPoint.x - canvasX);
            const dy = Math.abs(screenPoint.y - canvasY);
            if (dx < threshold && dy < threshold) return handle;
        }
        return null;
    }
}