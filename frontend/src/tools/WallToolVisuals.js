// /* global THREE */

// export default class WallToolVisuals {
//     constructor(viewer) {
//         this.viewer = viewer;
//         this.tempMesh = null;
//         this.visualHandles = [];
//     }

//     // --- GHOST WALL (The Orange Line) ---
//     updateGhostWall(p1, p2, thickness, justification) {
//         this.clearGhostWall();
        
//         const dx = p2.x - p1.x;
//         const dy = p2.y - p1.y;
//         const len = Math.sqrt(dx*dx + dy*dy);
//         if (len < 0.01) return;

//         const geometry = new THREE.BoxGeometry(len, thickness, 1);
//         const material = new THREE.MeshBasicMaterial({ 
//             color: 0xFFA500, 
//             opacity: 0.6, 
//             transparent: true, 
//             depthTest: false 
//         });

//         this.tempMesh = new THREE.Mesh(geometry, material);
//         const midX = (p1.x + p2.x) / 2;
//         const midY = (p1.y + p2.y) / 2;
        
//         // Lift Z+1.0
//         this.tempMesh.position.set(midX, midY, p1.z + 1.0); 
//         this.tempMesh.rotation.z = Math.atan2(dy, dx);

//         // Justification
//         let offset = 0;
//         if (justification === 'LEFT') offset = thickness / 2;
//         if (justification === 'RIGHT') offset = -thickness / 2;
//         if (offset !== 0) {
//             const perpX = -Math.sin(this.tempMesh.rotation.z) * offset;
//             const perpY = Math.cos(this.tempMesh.rotation.z) * offset;
//             this.tempMesh.position.x += perpX;
//             this.tempMesh.position.y += perpY;
//         }

//         this.viewer.overlays.addMesh(this.tempMesh, 'custom-scene');
//         this.viewer.impl.invalidate(true, true, true);
//     }

//     clearGhostWall() {
//         if (this.tempMesh) {
//             this.viewer.overlays.removeMesh(this.tempMesh, 'custom-scene');
//             this.tempMesh = null;
//             this.viewer.impl.invalidate(true, true, true);
//         }
//     }

//     // --- HANDLES (The Green Dots) ---
//     refreshHandles(walls) {
//         this.clearHandles();

//         const geometry = new THREE.SphereGeometry(0.15, 12, 12);
//         const material = new THREE.MeshBasicMaterial({ 
//             color: 0x00FF00,
//             transparent: true,
//             opacity: 0.35,
//             depthTest: false
//         });

//         walls.forEach(w => {
//             ['p1', 'p2'].forEach(t => {
//                 const pos = w.points[t];
//                 const mesh = new THREE.Mesh(geometry, material);
//                 mesh.position.set(pos.x, pos.y, pos.z + 1.0);
//                 mesh.userData = { wallId: w.id, pointType: t };
                
//                 this.viewer.overlays.addMesh(mesh, 'custom-scene');
//                 this.visualHandles.push(mesh);
//             });
//         });
//         this.viewer.impl.invalidate(true);
//     }

//     clearHandles() {
//         this.visualHandles.forEach(h => this.viewer.overlays.removeMesh(h, 'custom-scene'));
//         this.visualHandles = [];
//         this.viewer.impl.invalidate(true);
//     }

//     // --- HIT TEST LOGIC (Screen Space) ---
//     hitTestHandles(canvasX, canvasY) {
//         const threshold = 15; // Pixel tolerance
        
//         for (let handle of this.visualHandles) {
//             const screenPoint = this.viewer.worldToClient(handle.position);
//             const dx = Math.abs(screenPoint.x - canvasX);
//             const dy = Math.abs(screenPoint.y - canvasY);

//             if (dx < threshold && dy < threshold) {
//                 return handle;
//             }
//         }
//         return null;
//     }
// }