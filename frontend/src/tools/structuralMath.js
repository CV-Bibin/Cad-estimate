// 🌟 ALGORITHM: Point in Polygon (Ray Casting)
export const isPointInPolygon = (x, y, polygon) => {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
};

// 🌟 MATH HELPER
export const calculateAreaDetails = (points, zoneType, scaleFactor = 1, allWalls = []) => {
    if (!points || points.length < 3) return null;

    let rawArea = 0;
    for (let i = 0; i < points.length; i++) {
        let j = (i + 1) % points.length;
        rawArea += points[i].x * points[j].y;
        rawArea -= points[j].x * points[i].y;
    }
    rawArea = Math.abs(rawArea / 2);

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    });

    let shapeName = `${points.length}-Sided`;
    if (points.length === 3) shapeName = "Triangle";
    else if (points.length === 4) shapeName = "Rectangular";
    else if (points.length === 6) shapeName = "L-Shaped";
    else if (points.length === 8) shapeName = "T/U-Shaped";

    let touchedSides = new Set();
    let connectedOpenings = [];
    let insideWallsCount = 0; 

    const distToSegment = (px, py, x1, y1, x2, y2) => {
        const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;
        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }
        return Math.sqrt(Math.pow(px - xx, 2) + Math.pow(py - yy, 2));
    };

    allWalls.forEach(wall => {
        if (!wall.points) return;
        const midX = (wall.points.p1.x + wall.points.p2.x) / 2;
        const midY = (wall.points.p1.y + wall.points.p2.y) / 2;

        let touchesAnySide = false;

        for (let i = 0; i < points.length; i++) {
            let j = (i + 1) % points.length;
            const dist = distToSegment(midX, midY, points[i].x, points[i].y, points[j].x, points[j].y);
            if (dist < 0.4) {
                touchedSides.add(i); 
                touchesAnySide = true;
            }
        }

        let isInside = false;
        if (!touchesAnySide) {
            isInside = isPointInPolygon(midX, midY, points);
            if (isInside) insideWallsCount++; // 🌟 FIXED TYPO HERE
        }

        if (touchesAnySide || isInside) {
            if (wall.openings && wall.openings.length > 0) {
                wall.openings.forEach(op => {
                    const width = op.width ? (op.width * scaleFactor).toFixed(2) : "0.90";
                    const height = op.height ? (op.height * scaleFactor).toFixed(2) : "2.10";
                    connectedOpenings.push(`${width} x ${height}`);
                });
            }
        }
    });

    return {
        id: Date.now() + Math.random(),
        name: "New Room",
        zoneType: zoneType || 'INDOOR',
        shape: shapeName,
        areaM2: (rawArea * (scaleFactor * scaleFactor)).toFixed(2),
        areaSqFt: (rawArea * (scaleFactor * scaleFactor) * 10.7639).toFixed(2),
        length: ((maxX - minX) * scaleFactor).toFixed(2),
        breadth: ((maxY - minY) * scaleFactor).toFixed(2),
        points: points,
        wallsCount: touchedSides.size,
        insideWallsCount: insideWallsCount, 
        openings: connectedOpenings
    };
};