// /* global Autodesk, THREE */

// export default class WallDrawingTool {
//     constructor(viewer, onWallCreated, onWallUpdated) {
//         this.viewer = viewer;
//         this.names = ['wall-drawing-tool'];
//         this.active = false;
//         this.snapper = null;

//         // State
//         this.points = [];
//         this.tempMesh = null;
//         this.mode = 'DRAW';
//         this.walls = [];

//         // Edit State
//         this.visualHandles = [];
//         this.selectedHandle = null;
//         this.hoveredHandle = null;

//         // Settings
//         this.thickness = 0.23;
//         this.justification = 'CENTER';
//         this.isOrtho = false;
//         this.isSnapping = true;
//         this.handlePlacement = 'CENTER';

//         this.onWallCreated = onWallCreated;
//         this.onWallUpdated = onWallUpdated;

//         // --- REUSABLE RESOURCES (Prevents Memory Leaks) ---
//         this.handleGeo = new THREE.SphereGeometry(0.15, 12, 12);
//         this.handleMatNormal = new THREE.MeshBasicMaterial({
//             color: 0x00FF00,
//             transparent: true,
//             opacity: 0.35,
//             depthTest: false
//         });
//         this.handleMatHover = new THREE.MeshBasicMaterial({
//             color: 0xFFFF00,
//             transparent: true,
//             opacity: 0.6,
//             depthTest: false
//         });
//         this.tempWallMat = new THREE.MeshBasicMaterial({
//             color: 0xFFA500,
//             opacity: 0.6,
//             transparent: true,
//             depthTest: false
//         });
//     }

//     getNames() { return this.names; }
//     getName() { return this.names[0]; }

//     setSettings(settings) {
//         if (settings.thickness !== undefined) this.thickness = settings.thickness;
//         if (settings.justification !== undefined) this.justification = settings.justification;
//         if (settings.isOrtho !== undefined) this.isOrtho = settings.isOrtho;

//         if (settings.isSnapping !== undefined && settings.isSnapping !== this.isSnapping) {
//             this.isSnapping = settings.isSnapping;
//             if (this.active) { this.deactivate(); this.activate(); }
//         }

//         if (settings.mode && settings.mode !== this.mode) {
//             this.mode = settings.mode;
//             this.points = [];
//             this.clearOverlay();
//             this.toggleEditHandles(this.mode === 'EDIT');
//             this.updateCursor();
//         }

//         if (settings.handlePlacement) {
//             this.handlePlacement = settings.handlePlacement;
//             if (this.mode === 'EDIT') this.refreshHandles();
//         }

//         if (settings.walls) {
//             this.walls = settings.walls;
//             if (this.mode === 'EDIT') this.refreshHandles();
//         }
//     }

//     activate() {
//         if (this.active) return;
//         this.active = true;
//         this.points = [];

//         if (this.isSnapping) {
//             this.snapper = new Autodesk.Viewing.Extensions.Snapping.Snapper(this.viewer, {
//                 renderSnappedGeometry: true,
//                 renderSnappedTopology: true,
//                 markupMode: false,
//                 snapFilter: 2 | 1 | 4 | 32
//             });
//             this.viewer.toolController.activateTool(this.snapper.getName());
//         }

//         if (!this.viewer.overlays.hasScene('custom-scene')) {
//             this.viewer.overlays.addScene('custom-scene');
//         }

//         this.updateCursor();
//         console.log(`🧱 Tool Active. Mode: ${this.mode}`);
//     }

//     deactivate() {
//         if (!this.active) return;
//         this.active = false;
//         this.points = [];
//         this.clearOverlay();
//         this.toggleEditHandles(false);

//         if (this.snapper) {
//             this.viewer.toolController.deactivateTool(this.snapper.getName());
//             this.snapper = null;
//         }
//         this.viewer.canvas.style.cursor = 'default';
//     }

//     updateCursor() {
//         if (!this.active) return;
//         const canvas = this.viewer.canvas;

//         if (this.mode === 'DRAW') {
//             canvas.style.cursor = 'crosshair';
//         } else if (this.mode === 'EDIT') {
//             if (this.selectedHandle) canvas.style.cursor = 'grabbing';
//             else if (this.hoveredHandle) canvas.style.cursor = 'pointer';
//             else canvas.style.cursor = 'default';
//         }
//     }

//     // --- MATH HELPER ---
//     _getOffset(p1, p2, offsetDist) {
//         const dx = p2.x - p1.x;
//         const dy = p2.y - p1.y;
//         const len = Math.sqrt(dx * dx + dy * dy) || 1;
//         // Perpendicular vector
//         return {
//             x: (-dy / len) * offsetDist,
//             y: (dx / len) * offsetDist
//         };
//     }

//     // --- MOUSE INPUT ---
//     handleButtonDown(event, button) {
//         if (button === 2) {
//             if (this.points.length > 0) {
//                 this.points = [];
//                 this.clearOverlay();
//                 return true;
//             }
//             return false;
//         }

//         if (button !== 0) return false;

//         if (this.mode === 'EDIT') {
//             const hit = this.hitTestHandlesScreenSpace(event.canvasX, event.canvasY);
//             if (hit) {
//                 this.selectedHandle = hit;
//                 this.updateCursor();
//                 return true;
//             }
//         }
//         return true;
//     }

//     handleButtonUp(event, button) {
//         if (button !== 0) return false;

//         if (this.mode === 'EDIT' && this.selectedHandle) {
//             const { wallId, pointType } = this.selectedHandle.userData;
//             this.onWallUpdated(wallId, pointType, this.selectedHandle.position);
//             this.selectedHandle = null;
//             this.updateCursor();
//             return true;
//         }

//         if (this.mode === 'DRAW') {
//             this.handleClickLogic(event);
//             return true;
//         }
//         return false;
//     }

//     handleClickLogic(event) {
//         const pt = this.getBestPoint(event);
//         if (!pt) return;

//         if (this.isOrtho && this.points.length > 0) {
//             const s = this.points[this.points.length - 1];
//             const dx = Math.abs(pt.x - s.x);
//             const dy = Math.abs(pt.y - s.y);
//             if (dx > dy) pt.y = s.y; else pt.x = s.x;
//             pt.z = s.z;
//         }

//         this.points.push(pt);

//         if (this.points.length === 2) {
//             this.onWallCreated(this.points[0], this.points[1], this.thickness, this.justification);
//             const last = this.points[1];
//             this.points = [last];
//             this.clearOverlay();
//         }
//     }

//     handleMouseMove(event) {
//         if (this.snapper) this.snapper.handleMouseMove(event);

//         if (this.mode === 'EDIT') {
//             if (this.selectedHandle) {
//                 const pt = this.getBestPoint(event);
//                 if (pt) {
//                     this.selectedHandle.position.copy(pt);
//                     this.viewer.impl.invalidate(true, true, true);
//                 }
//                 return true;
//             }

//             const hit = this.hitTestHandlesScreenSpace(event.canvasX, event.canvasY);
//             if (hit !== this.hoveredHandle) {
//                 // Swap materials for visual feedback
//                 if (this.hoveredHandle) this.hoveredHandle.material = this.handleMatNormal;
//                 if (hit) hit.material = this.handleMatHover;
                
//                 this.hoveredHandle = hit;
//                 this.updateCursor();
//                 this.viewer.impl.invalidate(false, false, true);
//             }
//             return false;
//         }

//         if (this.mode === 'DRAW' && this.points.length === 1) {
//             const pt = this.getBestPoint(event);
//             if (pt) {
//                 let endPt = { ...pt };
//                 if (this.isOrtho) {
//                     const s = this.points[0];
//                     const dx = Math.abs(endPt.x - s.x);
//                     const dy = Math.abs(endPt.y - s.y);
//                     if (dx > dy) endPt.y = s.y; else endPt.x = s.x;
//                     endPt.z = s.z;
//                 }
//                 this.updateTempMesh(this.points[0], endPt);
//             }
//             return true;
//         }
//         return false;
//     }

//     handleKeyDown(event, keyCode) {
//         if (keyCode === 27) { // Escape
//             this.points = [];
//             this.clearOverlay();
//             return true;
//         }
//         return false;
//     }

//     getBestPoint(event) {
//         if (this.snapper) {
//             const res = this.snapper.getSnapResult();
//             if (res.geomVertex) return res.geomVertex;
//             if (res.intersectPoint) return res.intersectPoint;
//         }
//         const hit = this.viewer.impl.hitTest(event.canvasX, event.canvasY, true);
//         if (hit) return hit.intersectPoint;
//         return this.viewer.impl.intersectGround(event.canvasX, event.canvasY);
//     }

//     hitTestHandlesScreenSpace(canvasX, canvasY) {
//         const threshold = 15;
//         for (let handle of this.visualHandles) {
//             const screenPoint = this.viewer.worldToClient(handle.position);
//             const dx = Math.abs(screenPoint.x - canvasX);
//             const dy = Math.abs(screenPoint.y - canvasY);
//             if (dx < threshold && dy < threshold) return handle;
//         }
//         return null;
//     }

//     refreshHandles() {
//         this.visualHandles.forEach(h => this.viewer.overlays.removeMesh(h, 'custom-scene'));
//         this.visualHandles = [];

//         if (!this.walls) return;

//         this.walls.forEach(w => {
//             ['p1', 'p2'].forEach(t => {
//                 let offsetDist = 0;
//                 if (this.handlePlacement === 'INNER') offsetDist = w.thickness / 2;
//                 if (this.handlePlacement === 'OUTER') offsetDist = -w.thickness / 2;

//                 const offset = this._getOffset(w.points.p1, w.points.p2, offsetDist);
//                 const basePos = w.points[t];

//                 const v = new THREE.Mesh(this.handleGeo, this.handleMatNormal);
//                 v.position.set(basePos.x + offset.x, basePos.y + offset.y, basePos.z + 1.0);

//                 v.userData = { wallId: w.id, pointType: t };
//                 this.viewer.overlays.addMesh(v, 'custom-scene');
//                 this.visualHandles.push(v);
//             });
//         });
//         this.viewer.impl.invalidate(true);
//     }

//     toggleEditHandles(s) {
//         if (!s) {
//             this.visualHandles.forEach(h => this.viewer.overlays.removeMesh(h, 'custom-scene'));
//             this.visualHandles = [];
//             this.hoveredHandle = null;
//         } else {
//             this.refreshHandles();
//         }
//         this.viewer.impl.invalidate(true);
//     }

//     updateTempMesh(p1, p2) {
//         this.clearOverlay();
//         const dx = p2.x - p1.x;
//         const dy = p2.y - p1.y;
//         const len = Math.sqrt(dx * dx + dy * dy);
//         if (len < 0.01) return;

//         const geometry = new THREE.BoxGeometry(len, this.thickness, 1);
//         this.tempMesh = new THREE.Mesh(geometry, this.tempWallMat);

//         const midX = (p1.x + p2.x) / 2;
//         const midY = (p1.y + p2.y) / 2;
//         this.tempMesh.position.set(midX, midY, p1.z + 1.0);
//         this.tempMesh.rotation.z = Math.atan2(dy, dx);

//         let offsetVal = 0;
//         if (this.justification === 'LEFT') offsetVal = this.thickness / 2;
//         if (this.justification === 'RIGHT') offsetVal = -this.thickness / 2;

//         if (offsetVal !== 0) {
//             const offset = this._getOffset(p1, p2, offsetVal);
//             this.tempMesh.position.x += offset.x;
//             this.tempMesh.position.y += offset.y;
//         }

//         this.viewer.overlays.addMesh(this.tempMesh, 'custom-scene');
//         this.viewer.impl.invalidate(true, true, true);
//     }

//     clearOverlay() {
//         if (this.tempMesh) {
//             this.viewer.overlays.removeMesh(this.tempMesh, 'custom-scene');
//             if (this.tempMesh.geometry) this.tempMesh.geometry.dispose();
//             this.tempMesh = null;
//             this.viewer.impl.invalidate(true, true, true);
//         }
//     }
// }