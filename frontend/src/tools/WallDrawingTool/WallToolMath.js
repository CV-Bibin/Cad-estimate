export const WallToolMath = {
    // Exact logic from your _getOffset method
    getOffset: (p1, p2, offsetDist) => {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        
        return {
            x: (-dy / len) * offsetDist,
            y: (dx / len) * offsetDist
        };
    },

    // Logic extracted from handleClickLogic
    applyOrtho: (start, end) => {
        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);
        return {
            x: dx > dy ? end.x : start.x,
            y: dx > dy ? start.y : end.y,
            z: start.z
        };
    }
};