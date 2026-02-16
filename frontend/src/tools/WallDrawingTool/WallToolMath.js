export const WallToolMath = {
    getOffset: (p1, p2, offsetDist) => {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return { x: (-dy / len) * offsetDist, y: (dx / len) * offsetDist };
    },

    applyOrtho: (start, end) => {
        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);
        return {
            x: dx > dy ? end.x : start.x,
            y: dx > dy ? start.y : end.y,
            z: start.z
        };
    },

    // --- NEW: Check if point (px,py) is near segment (p1-p2) ---
    pointToSegmentDistance: (px, py, p1x, p1y, p2x, p2y) => {
        const A = px - p1x;
        const B = py - p1y;
        const C = p2x - p1x;
        const D = p2y - p1y;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;

        let xx, yy;

        if (param < 0) {
            xx = p1x; yy = p1y;
        } else if (param > 1) {
            xx = p2x; yy = p2y;
        } else {
            xx = p1x + param * C;
            yy = p1y + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
};