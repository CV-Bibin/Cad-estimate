export class BeamToolMath {
    // Calculates the exact position, angle, and size of the beam
    static calculateBeamGeometry(p1, p2, width, depth, justification, scaleFactor) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
        const angle = Math.atan2(dy, dx);
        
        // Convert to viewer scale
        const scaledWidth = width / scaleFactor; 
        const scaledDepth = depth / scaleFactor;
        
        // Justification Shift (Perpendicular offset)
        let offsetDist = 0;
        if (justification === 'LEFT') offsetDist = scaledWidth / 2;
        if (justification === 'RIGHT') offsetDist = -scaledWidth / 2;
        
        const perpX = -Math.sin(angle) * offsetDist;
        const perpY = Math.cos(angle) * offsetDist;

        // Final Center Coordinates
        const midX = ((p1.x + p2.x) / 2) + perpX;
        const midY = ((p1.y + p2.y) / 2) + perpY;
        
        // Push it up to the ceiling (assuming 3.0m height)
        const ceilingZ = (3.0 - (depth / 2)) / scaleFactor; 

        return { length, angle, scaledWidth, scaledDepth, midX, midY, ceilingZ };
    }

    // Finds the closest custom snap point (Corners, Centers, Faces)
    static getClosestSnapPoint(pt, snapPoints, scaleFactor) {
        let closestDist = Infinity;
        let closestSp = null;
        const magneticRadius = 0.4 / scaleFactor; // 40cm catch radius

        snapPoints.forEach(sp => {
            const dist = Math.sqrt(Math.pow(sp.x - pt.x, 2) + Math.pow(sp.y - pt.y, 2));
            if (dist < magneticRadius && dist < closestDist) {
                closestDist = dist;
                closestSp = sp;
            }
        });

        return closestSp;
    }
}