/* global THREE */
import { WallToolMath } from './WallToolMath';

export default class WallToolVisuals {
    constructor(viewer) {
        this.viewer = viewer;
        this.tempMesh = null;
        this.eraserMesh = null; // The Red Highlight
        this.listHighlightMesh = null; // NEW: The Blue List Highlight
        this.visualHandles = [];

        // Geometries/Materials
        this.handleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.01);
        this.handleMatNormal = new THREE.MeshBasicMaterial({ color: 0x00FF00, transparent: true, opacity: 0.8, depthTest: false });
        this.handleMatHover = new THREE.MeshBasicMaterial({ color: 0xFF1493, transparent: false, opacity: 1.0, depthTest: false });
        this.tempWallMat = new THREE.MeshBasicMaterial({ color: 0xFFA500, opacity: 0.6, transparent: true, depthTest: false });
        
        // Eraser Material (Red)
        this.eraserMat = new THREE.MeshBasicMaterial({ color: 0xFF0000, opacity: 0.5, transparent: true, depthTest: false });
        
        // NEW: List Highlight Material (Blue)
        this.listHighlightMat = new THREE.MeshBasicMaterial({ color: 0x00A8FF, opacity: 0.5, transparent: true, depthTest: false });

        if (!this.viewer.overlays.hasScene('custom-scene')) {
            this.viewer.overlays.addScene('custom-scene');
        }
    }

    // --- NEW: SIDEBAR LIST HOVER HIGHLIGHT (BLUE GLOW) ---
    showListHighlight(wall, scaledThickness) {
        this.clearListHighlight();

        if (!wall || !wall.points || !wall.points.p1 || !wall.points.p2) return;

        const baseThick = scaledThickness || wall.thickness;

        const { p1, p2 } = wall.points;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // 20% wider for a nice blue selection glow
        const highlightThickness = baseThick * 1.20; 

        const geom = new THREE.PlaneGeometry(length, highlightThickness);
        this.listHighlightMesh = new THREE.Mesh(geom, this.listHighlightMat);

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        let offsetX = 0;
        let offsetY = 0;
        
        if (wall.justification === 'LEFT') {
            offsetX = (baseThick / 2) * Math.sin(angle);
            offsetY = -(baseThick / 2) * Math.cos(angle);
        } else if (wall.justification === 'RIGHT') {
            offsetX = -(baseThick / 2) * Math.sin(angle);
            offsetY = (baseThick / 2) * Math.cos(angle);
        }

        this.listHighlightMesh.position.set(midX + offsetX, midY + offsetY, p1.z + 0.05); 
        this.listHighlightMesh.rotation.z = angle;
        this.listHighlightMesh.raycast = () => {};

        this.viewer.overlays.addMesh(this.listHighlightMesh, 'custom-scene');
        this.viewer.impl.invalidate(true, true, true);
    }

    clearListHighlight() {
        if (this.listHighlightMesh) {
            this.viewer.overlays.removeMesh(this.listHighlightMesh, 'custom-scene');
            this.listHighlightMesh = null;
            this.viewer.impl.invalidate(true, true, true);
        }
    }

    // --- ERASER HIGHLIGHT (RED GLOW) ---
    showEraserHighlight(wall, scaledThickness) {
        this.clearEraserHighlight();

        if (!wall || !wall.points || !wall.points.p1 || !wall.points.p2) return;

        // Fallback just in case scaledThickness is missing
        const baseThick = scaledThickness || wall.thickness;

        const { p1, p2 } = wall.points;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // PERFECT MATH: Exactly 15% wider than the SCALED thickness
        const highlightThickness = baseThick * 1.15; 

        const geom = new THREE.PlaneGeometry(length, highlightThickness);
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.4, // Soft red
            depthTest: false 
        });

        this.eraserMesh = new THREE.Mesh(geom, mat);

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        let offsetX = 0;
        let offsetY = 0;
        
        // PERFECT OFFSET: Uses the SCALED thickness to shift the box
        if (wall.justification === 'LEFT') {
            offsetX = (baseThick / 2) * Math.sin(angle);
            offsetY = -(baseThick / 2) * Math.cos(angle);
        } else if (wall.justification === 'RIGHT') {
            offsetX = -(baseThick / 2) * Math.sin(angle);
            offsetY = (baseThick / 2) * Math.cos(angle);
        }

        this.eraserMesh.position.set(midX + offsetX, midY + offsetY, p1.z + 0.05); 
        this.eraserMesh.rotation.z = angle;

        this.eraserMesh.raycast = () => {};

        this.viewer.overlays.addMesh(this.eraserMesh, 'custom-scene');
        this.viewer.impl.invalidate(true, true, true);
    }
    
    clearEraserHighlight() {
        if (this.eraserMesh) {
            this.viewer.overlays.removeMesh(this.eraserMesh, 'custom-scene');
            this.eraserMesh = null;
            this.viewer.impl.invalidate(true, true, true);
        }
    }

    // --- GHOST WALL ---
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

    // --- HANDLES ---
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
                // Lift Z + 1.0
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

    // --- HIT TEST ---
    hitTestHandlesScreenSpace(canvasX, canvasY) {
        const threshold = 15; // Pixels
        for (let handle of this.visualHandles) {
            const screenPoint = this.viewer.worldToClient(handle.position);
            const dx = Math.abs(screenPoint.x - canvasX);
            const dy = Math.abs(screenPoint.y - canvasY);
            if (dx < threshold && dy < threshold) return handle;
        }
        return null;
    }
}