// Builds the "performance bowl" surface from a boat's VPP data.
//
// Coordinate convention (Three.js y-up):
//   x =  TWS * sin(TWA)   (port/starboard offset)
//   z = -TWS * cos(TWA)   (fore/aft; TWA=0 is +z away from camera by default,
//                          but we negate so wind-from-bow points to -z = "north")
//   y =  SOG              (height; faster boat = taller surface)
//
// TWA convention: 0° = wind from ahead, 90° = beam reach, 180° = dead downwind.
// SOG is symmetric about TWA = 0° (port/starboard), so we fold input TWA into [0°, 180°]
// before interpolating, then sweep TWA in [0°, 360°) to build the full closed surface.
//
// Returns plain typed arrays so callers can build a BufferGeometry without this
// module touching three. Caller computes normals via geometry.computeVertexNormals().

const DEG = Math.PI / 180;

// Mesh density. Total verts = (SEGMENTS_U + 1) * (SEGMENTS_V + 1).
// At 96 × 24 = 2425 verts, far below Uint16 max (65535), and visually smooth.
const SEGMENTS_U = 96; // around TWA
const SEGMENTS_V = 24; // outward along TWS

// Width (in degrees) of the smoothstep taper at the no-go boundaries.
// SOG ramps from 0 at the wind axis to the sampled value over this band.
const TAPER_DEG = 8;

// 1D Catmull-Rom (uniform). p1..p2 is the segment; p0 and p3 are neighbours for tangent.
function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

// Find bracket [i, i+1] in a sorted array `xs` such that xs[i] <= x < xs[i+1].
// Returns { i, t } where t in [0, 1) is the fractional position. Clamps to ends.
function bracket(xs, x) {
    if (x <= xs[0]) return { i: 0, t: 0 };
    if (x >= xs[xs.length - 1]) return { i: xs.length - 2, t: 1 };
    for (let i = 0; i < xs.length - 1; i++) {
        if (x < xs[i + 1]) return { i, t: (x - xs[i]) / (xs[i + 1] - xs[i]) };
    }
    return { i: xs.length - 2, t: 1 };
}

// Catmull-Rom sample of an irregular tabulated function f(xs[i]) = ys[i] at query x.
// Falls back to linear at the ends (only one neighbour available).
function interp1D(xs, ys, x) {
    const { i, t } = bracket(xs, x);
    const p1 = ys[i];
    const p2 = ys[i + 1];
    const p0 = i > 0 ? ys[i - 1] : p1 + (p1 - p2);
    const p3 = i + 2 < ys.length ? ys[i + 2] : p2 + (p2 - p1);
    return catmullRom(p0, p1, p2, p3, t);
}

// Fold any TWA into [0°, 180°] via wind-axis symmetry.
function foldTWA(twaDeg) {
    let a = ((twaDeg % 360) + 360) % 360; // [0, 360)
    if (a > 180) a = 360 - a; // [0, 180]
    return a;
}

// Smoothstep on [edge0, edge1].
function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

// Sample SOG (knots) at any (TWA°, TWS) for one boat's VPP.
// Returns 0 inside the no-go zones, with a smooth taper at the boundaries.
export function sampleSOG(vpp, twaDegRaw, tws) {
    const angles = vpp.angles; // e.g. [52, 60, 75, 90, 110, 120, 135, 150]
    const speeds = vpp.speeds; // e.g. [6, 8, 10, 12, 14, 16, 20]
    const twa = foldTWA(twaDegRaw);

    // Outside the angular envelope: taper, don't clip hard.
    const beat = angles[0];
    const run = angles[angles.length - 1];
    let envelope = 1;
    if (twa < beat) {
        envelope = smoothstep(beat - TAPER_DEG, beat, twa);
    } else if (twa > run) {
        envelope = 1 - smoothstep(run, run + TAPER_DEG, twa);
    }
    if (envelope <= 0) return 0;

    // vpp is keyed by TWA: vpp[<twa>] = [SOG@speeds[0], SOG@speeds[1], ...].
    // For each tabulated TWS column j, gather SOG across TWAs and interpolate to the query TWA.
    const colByTWS = speeds.map((_s, j) => {
        const colAcrossTWA = angles.map((twaTab) => {
            const row = vpp[twaTab] ?? vpp[String(twaTab)]; // JSON keys come back as strings
            return row && row[j] !== undefined ? row[j] : 0;
        });
        return interp1D(angles, colAcrossTWA, twa);
    });

    // Linear ramp from 0 SOG at TWS=0 to the lowest tabulated speed.
    // (No wind ⇒ no movement is a safer extrapolation than Catmull-Rom blowback.)
    const minTWS = speeds[0];
    let sogAtTWS;
    if (tws <= 0) sogAtTWS = 0;
    else if (tws < minTWS) sogAtTWS = colByTWS[0] * (tws / minTWS);
    else sogAtTWS = interp1D(speeds, colByTWS, tws);

    return Math.max(0, sogAtTWS) * envelope;
}

// Build positions + indices for an indexed triangle mesh.
// Returns { positions, indices, uvs, maxTWS, maxSOG, segmentsU, segmentsV }.
export function buildPolarSurface(vpp) {
    const maxTWS = vpp.speeds[vpp.speeds.length - 1];

    const nU = SEGMENTS_U + 1;
    const nV = SEGMENTS_V + 1;
    const positions = new Float32Array(nU * nV * 3);
    const uvs = new Float32Array(nU * nV * 2);

    let maxSOG = 0;
    for (let iv = 0; iv < nV; iv++) {
        const v = iv / SEGMENTS_V;
        const tws = v * maxTWS;
        for (let iu = 0; iu < nU; iu++) {
            const u = iu / SEGMENTS_U;
            const twa = u * 360;
            const sog = sampleSOG(vpp, twa, tws);
            const rad = twa * DEG;
            const idx = (iv * nU + iu) * 3;
            positions[idx] = tws * Math.sin(rad);
            positions[idx + 1] = sog;
            positions[idx + 2] = -tws * Math.cos(rad);
            const uvIdx = (iv * nU + iu) * 2;
            uvs[uvIdx] = u;
            uvs[uvIdx + 1] = v;
            if (sog > maxSOG) maxSOG = sog;
        }
    }

    // Two triangles per quad, (nU - 1) * (nV - 1) quads.
    const indices = new Uint16Array((nU - 1) * (nV - 1) * 6);
    let k = 0;
    for (let iv = 0; iv < nV - 1; iv++) {
        for (let iu = 0; iu < nU - 1; iu++) {
            const a = iv * nU + iu;
            const b = iv * nU + iu + 1;
            const c = (iv + 1) * nU + iu;
            const d = (iv + 1) * nU + iu + 1;
            // CCW when viewed from above (y looking down).
            indices[k++] = a;
            indices[k++] = c;
            indices[k++] = b;
            indices[k++] = b;
            indices[k++] = c;
            indices[k++] = d;
        }
    }

    return { positions, indices, uvs, maxTWS, maxSOG, segmentsU: SEGMENTS_U, segmentsV: SEGMENTS_V };
}

// Generate a canvas with the polar floor (TWS rings + TWA spokes + labels).
// Returns an HTMLCanvasElement ready to wrap in a THREE.CanvasTexture.
export function buildPolarFloorCanvas(maxTWS, { size = 1024 } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2;
    const cy = size / 2;
    // Leave a small margin so labels at the outer ring aren't clipped.
    const rMax = size / 2 - 24;

    ctx.fillStyle = 'rgba(245, 247, 245, 0.85)';
    ctx.fillRect(0, 0, size, size);

    // TWS rings every 2 kn (rough match for the existing 2D plot).
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 1;
    ctx.font = '14px "IBM Plex Mono", monospace';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let tws = 2; tws <= maxTWS; tws += 2) {
        const r = (tws / maxTWS) * rMax;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText(`${tws}`, cx + r + 4, cy - 6);
    }

    // TWA spokes every 30°.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    for (let twaDeg = 0; twaDeg < 360; twaDeg += 30) {
        const a = twaDeg * DEG;
        const x = cx + rMax * Math.sin(a);
        const y = cy - rMax * Math.cos(a);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    // Cardinal labels (TWA reference). 0° = wind from bow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.font = 'bold 18px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TWA 0°', cx, cy - rMax - 8);
    ctx.fillText('180°', cx, cy + rMax + 18);
    ctx.textAlign = 'left';
    ctx.fillText('90°', cx + rMax + 4, cy + 4);
    ctx.textAlign = 'right';
    ctx.fillText('270°', cx - rMax - 4, cy + 4);

    return canvas;
}
