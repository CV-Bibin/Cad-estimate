/* global THREE */

export class BeamToolVisuals {
    constructor(viewer) {
        this.viewer = viewer;
        this.ghostMesh = null;
        this.osnapMesh = null;
        
        // Ensure scene exists before adding to it
        if (!this.viewer.overlays.hasScene('beam-tool-scene')) {
            this.viewer.overlays.addScene('beam-tool-scene');
        }
        
        this.initGhostMesh();
    }

    initGhostMesh() {
        const geo = new THREE.BoxGeometry(1, 1, 1); 
        // 🌟 FIX: depthWrite: false ensures it always renders on top of the floor
        const mat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.7, depthTest: false, depthWrite: false });
        this.ghostMesh = new THREE.Mesh(geo, mat);
        this.ghostMesh.visible = false;
        
        // 🌟 FIX: Added to OVERLAYS, not sceneAfter!
        this.viewer.overlays.addMesh(this.ghostMesh, 'beam-tool-scene');
    }

    updateGhostMesh(geometryData) {
        if (!this.ghostMesh) return;
        this.ghostMesh.scale.set(geometryData.length, geometryData.scaledWidth, geometryData.scaledDepth);
        this.ghostMesh.rotation.z = geometryData.angle;
        this.ghostMesh.position.set(geometryData.midX, geometryData.midY, geometryData.ceilingZ);
        this.ghostMesh.visible = true;
    }

   drawOsnapIndicator(pos, snapType, scaleFactor) {
        if (!this.viewer.overlays.hasScene('beam-tool-scene')) this.viewer.overlays.addScene('beam-tool-scene');
        this.clearOsnap();

        if (!pos || snapType === 'none') return;

        const dist = this.viewer.impl.camera.position.distanceTo(pos);
        
        // 🌟 FIX: Add a Math.max clamp so the icon NEVER gets too small when zoomed in!
        const size = Math.max(0.15 / scaleFactor, dist * 0.005); 
        
        let color = 0x00FF00; let geom;

        if (snapType === 'midpoint') {
            color = 0x00FFFF; 
            geom = new THREE.CylinderGeometry(size, size, 0.01, 3);
            geom.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
        } else if (snapType === 'center') {
            color = 0xFF9900; // Orange Ring
            geom = new THREE.RingGeometry(size * 0.5, size * 1.5, 16);
        } else if (snapType === 'corner') {
            color = 0xFF00FF; // Magenta Square
            geom = new THREE.BoxGeometry(size * 1.5, size * 1.5, 0.01);
        } else if (snapType === 'face') {
            color = 0x00FFFF; // Cyan Diamond
            geom = new THREE.BoxGeometry(size * 1.2, size * 1.2, 0.01);
            geom.applyMatrix(new THREE.Matrix4().makeRotationZ(Math.PI / 4));
        } else {
            geom = new THREE.BoxGeometry(size * 1.5, size * 1.5, 0.01);
        }
        
        this.osnapMesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.8 }));
        this.osnapMesh.position.set(pos.x, pos.y, 0.05 / scaleFactor); 
        this.viewer.overlays.addMesh(this.osnapMesh, 'beam-tool-scene');
    }
    clearGhost() {
        if (this.ghostMesh) this.ghostMesh.visible = false;
    }

    clearOsnap() {
        if (this.osnapMesh) {
            this.viewer.overlays.removeMesh(this.osnapMesh, 'beam-tool-scene');
            this.osnapMesh = null;
        }
    }

    destroy() {
        this.clearOsnap();
        if (this.ghostMesh) {
            this.viewer.overlays.removeMesh(this.ghostMesh, 'beam-tool-scene');
            this.ghostMesh = null;
        }
    }
}