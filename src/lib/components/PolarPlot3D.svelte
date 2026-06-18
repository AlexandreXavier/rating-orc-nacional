<svelte:options accessors />

<script>
import { onDestroy, onMount } from 'svelte';

import { vmg2sog } from '../util.js';
import { buildPolarFloorCanvas, buildPolarSurface } from '../vpp-mesh.js';

export let boats = [];

// Render mode. 'surface' (default, PRD 0001) draws the continuous performance
// bowl from vpp-mesh; 'lines' draws one polyline per tabulated TWS. Boat/Compare
// use the surface; Regata passes 'lines' (it overlays up to six boats and needs
// the per-TWS curves, PRD 0002).
export let mode = 'surface';

// Optional «Regata» extensions (PRD 0002). Defaults reproduce the original
// Boat/Compare behaviour exactly: colour = TWS, every tabulated TWS drawn,
// no race-angle highlight.
export let colorMode = 'tws'; // 'tws' | 'boat'
export let boatColors = null; // hex string per boat slot, used when colorMode === 'boat'
export let twsFilter = null; // array of TWS to draw; null = all tabulated
export let raceType = null; // 'wl' | 'costeira' — draws the race-angle highlight; null = none

// Same shape as PolarPlot.svelte's `hover` — { tws, sog, cog } | undefined.
let highlight;
export const hover = (newHighlight) => {
    highlight = newHighlight;
};

let container;
let canvas;
let tooltip = { visible: false, x: 0, y: 0, twa: 0, tws: 0, sog: 0, name: '' };
let loading = true;
let webglOK = true;

// Half-cylinder layout (PRD 0001): TWA is the azimuth around the vertical axis
// (0° = direction the wind comes from, pointing to −z), TWS is the ground
// radius, SOG is the height. The polar is port/starboard symmetric, so only
// the starboard half (x ≥ 0) is drawn — mirroring it doubles every line for
// no information gain. Scales chosen so radius (~20 kn TWS) and height
// (~12 kn SOG × 1.2) end up at similar visual magnitude.
const DEG = Math.PI / 180;
const R_PER_KNOT_TWS = 1.0;
const Y_PER_KNOT = 1.2;
const TWA_TICKS = [60, 75, 90, 110, 120, 135, 150];
const SOG_TICK_STEP = 2;
const CIRCLE_SEGMENTS = 72;

// All Three.js state held outside Svelte reactivity.
let THREE = null;
let OrbitControls = null;
let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let raycaster = null;
const ndcMouse = { x: 0, y: 0 };
let hoverMarker = null;
let gridLines = null;
let gridLabels = []; // [{ sprite, texture, material }]
let highlightObj = null; // race-angle highlight (LineSegments), «Regata» only
let resizeObserver = null;
let curves = []; // [{ line, geometry, material, twsIndex, boatIndex }]
let vmgMarkers = null; // InstancedMesh of small spheres
let surfaces = []; // surface mode: [{ mesh, geometry, material, wire, wireGeo, wireMat, boatIndex }]
let floor = null; // surface mode: { mesh, geometry, material, texture }
let activeBoat = null; // The boat whose vpp drives axes / hover lookup.

function radiusOfTWS(tws) {
    return tws * R_PER_KNOT_TWS;
}
function yOfSOG(sog) {
    return sog * Y_PER_KNOT;
}
function positionAt(twa, tws, sog) {
    const r = radiusOfTWS(tws);
    const a = twa * DEG;
    return new THREE.Vector3(r * Math.sin(a), yOfSOG(sog), -r * Math.cos(a));
}

// Same per-TWS palette as the 2D plot (.tws-* in site/polarplot.css), so the
// LineLegend and PolarTable headers read identically in both views.
const TWS_COLORS = {
    4: 0x8c564b,
    6: 0x1f77b4,
    8: 0xff7f0e,
    10: 0x2ca02c,
    12: 0xd62728,
    14: 0x9467bd,
    16: 0x17becf,
    20: 0xe377c2,
    24: 0x777777,
};

// Per-boat solid colours for the surface (PRD 0001). Boat keeps its colour
// across single-boat and compare views.
const SURFACE_COLORS = ['#2d7dd2', '#f4a261', '#2a9d8f'];

function colorForTWS(tws, i, total) {
    if (tws in TWS_COLORS) return new THREE.Color(TWS_COLORS[tws]);
    if (total <= 1) return new THREE.Color(0x2d7dd2);
    const t = i / (total - 1);
    // Cool (blue) for low TWS → warm (red) for high TWS.
    const hue = ((1 - t) * 220) / 360;
    return new THREE.Color().setHSL(hue, 0.7, 0.5);
}

// In «Regata» (colorMode === 'boat') colour identifies the boat, not the TWS
// (ADR 0001) — the ground radius already encodes TWS, so the hue is free.
function curveColor(boatIdx, tws, i, total) {
    if (colorMode === 'boat' && boatColors && boatColors[boatIdx]) {
        return new THREE.Color(boatColors[boatIdx]);
    }
    return colorForTWS(tws, i, total);
}

function includeTWS(tws) {
    return !twsFilter || twsFilter.includes(tws);
}

// Render-on-demand: coalesce multiple change triggers into one rAF.
let renderQueued = false;
function requestRender() {
    if (!renderer || renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
        renderQueued = false;
        if (renderer && scene && camera) renderer.render(scene, camera);
    });
}

onMount(async () => {
    try {
        THREE = await import('three');
        ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
    } catch (e) {
        console.error('Falha a carregar Three.js', e);
        webglOK = false;
        loading = false;
        return;
    }
    try {
        initScene();
    } catch (e) {
        console.error('WebGL não disponível', e);
        webglOK = false;
        loading = false;
        return;
    }
    loading = false;
    rebuildAll();

    resizeObserver = new ResizeObserver(() => {
        if (!renderer || !container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        requestRender();
    });
    resizeObserver.observe(container);
});

onDestroy(() => {
    if (resizeObserver) resizeObserver.disconnect();
    dispose();
});

function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfbfefb);

    const w = container?.clientWidth || 600;
    const h = container?.clientHeight || 600;

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ambient + three asymmetric directional lights (PRD 0001) shape the matte
    // surface. Line mode's materials are unlit, so this only affects the bowl,
    // the VMG markers and the hover marker.
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const lightSpecs = [
        [0.4, [30, 40, 20]],
        [0.3, [-25, 30, -15]],
        [0.2, [0, 20, -40]],
    ];
    for (const [intensity, pos] of lightSpecs) {
        const dl = new THREE.DirectionalLight(0xffffff, intensity);
        dl.position.set(...pos);
        scene.add(dl);
    }

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.minDistance = 5;
    controls.maxDistance = 200;
    // Never let the camera dip below the floor disc (PRD 0001, story 12).
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.target.set(0, 0, 0);
    controls.addEventListener('change', requestRender);

    raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.35;

    const markerGeom = new THREE.SphereGeometry(0.4, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xff3322 });
    hoverMarker = new THREE.Mesh(markerGeom, markerMat);
    hoverMarker.visible = false;
    scene.add(hoverMarker);
}

function rebuildAll() {
    if (!scene) return;
    if (mode === 'surface') {
        disposeCurves();
        disposeGrid();
        disposeHighlight();
        rebuildSurfaces();
        rebuildFloor();
    } else {
        disposeSurfaces();
        disposeFloor();
        rebuildCurves();
        rebuildGrid();
        rebuildHighlight();
    }
    fitCamera();
    updateHoverMarker();
    requestRender();
}

function disposeCurves() {
    for (const c of curves) {
        scene.remove(c.line);
        c.geometry.dispose();
        c.material.dispose();
    }
    curves = [];
    if (vmgMarkers) {
        scene.remove(vmgMarkers);
        vmgMarkers.geometry.dispose();
        vmgMarkers.material.dispose();
        vmgMarkers = null;
    }
}

function disposeSurfaces() {
    for (const s of surfaces) {
        scene.remove(s.mesh);
        scene.remove(s.wire);
        s.geometry.dispose();
        s.material.dispose();
        s.wireGeo.dispose();
        s.wireMat.dispose();
    }
    surfaces = [];
}

function disposeFloor() {
    if (floor) {
        scene.remove(floor.mesh);
        floor.geometry.dispose();
        floor.material.dispose();
        floor.texture.dispose();
        floor = null;
    }
}

// Continuous performance bowl per boat (PRD 0001). vpp-mesh produces y = SOG in
// knots; we scale the mesh's y by Y_PER_KNOT so the surface shares the exact
// coordinate space of the line mode — letting the hover marker, camera fit and
// tooltip mapping be reused unchanged.
function rebuildSurfaces() {
    disposeSurfaces();
    const valid = boats.map((b) => (b && b.vpp ? b : null));
    activeBoat = valid.find(Boolean) ?? null;
    if (!activeBoat) return;

    const count = valid.filter(Boolean).length;
    const opacity = count > 1 ? 0.55 : 0.85;

    valid.forEach((boat, boatIdx) => {
        if (!boat) return;
        const surf = buildPolarSurface(boat.vpp);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(surf.positions, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(surf.uvs, 2));
        geometry.setIndex(new THREE.BufferAttribute(surf.indices, 1));
        geometry.computeVertexNormals();

        const color = new THREE.Color(SURFACE_COLORS[boatIdx % SURFACE_COLORS.length]);
        const material = new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity,
            roughness: 0.55,
            metalness: 0.05,
            side: THREE.DoubleSide,
            depthWrite: count === 1, // avoid translucency artefacts when overlapping
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.y = Y_PER_KNOT;
        scene.add(mesh);

        const wireGeo = new THREE.WireframeGeometry(geometry);
        const wireMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 });
        const wire = new THREE.LineSegments(wireGeo, wireMat);
        wire.scale.y = Y_PER_KNOT;
        scene.add(wire);

        surfaces.push({ mesh, geometry, material, wire, wireGeo, wireMat, boatIndex: boatIdx });
    });
}

function rebuildFloor() {
    disposeFloor();
    if (!activeBoat) return;
    const allVpps = boats.filter((b) => b && b.vpp).map((b) => b.vpp);
    const maxTWS = Math.max(...allVpps.map((v) => v.speeds[v.speeds.length - 1]));

    const texture = new THREE.CanvasTexture(buildPolarFloorCanvas(maxTWS));
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.CircleGeometry(radiusOfTWS(maxTWS), 96);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    // CircleGeometry lies in XY; rotate flat so TWA 0° (canvas top) lands on −z,
    // matching the surface's wind axis. Slight drop avoids z-fighting at SOG 0.
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.02;
    scene.add(mesh);
    floor = { mesh, geometry, material, texture };
}

function buildPolylinePoints(vpp, i) {
    const beatAngle = vpp.beat_angle?.[i];
    const runAngle = vpp.run_angle?.[i];
    if (beatAngle == null || runAngle == null) return [];
    const beatSOG = vmg2sog(beatAngle, vpp.beat_vmg[i]);
    const runSOG = vmg2sog(runAngle, -vpp.run_vmg[i]);
    const tws = vpp.speeds[i];

    const points = [];
    points.push(positionAt(beatAngle, tws, beatSOG));
    for (const twa of vpp.angles) {
        if (twa <= beatAngle || twa >= runAngle) continue;
        const row = vpp[twa] ?? vpp[String(twa)]; // JSON keys come back as strings
        if (!row) continue;
        const sog = row[i];
        if (!(sog > 0)) continue;
        points.push(positionAt(twa, tws, sog));
    }
    points.push(positionAt(runAngle, tws, runSOG));
    return points;
}

function rebuildCurves() {
    disposeCurves();
    const valid = boats.map((b) => (b && b.vpp ? b : null));
    activeBoat = valid.find(Boolean) ?? null;
    if (!activeBoat) return;

    const markerPositions = [];
    // Iterate with the original slot index so boat B stays dashed (matching
    // the 2D series-1 style and the legend) even while boat A is unset.
    valid.forEach((boat, boatIdx) => {
        if (!boat) return;
        const total = boat.vpp.speeds.length;
        for (let i = 0; i < total; i++) {
            if (!includeTWS(boat.vpp.speeds[i])) continue;
            const points = buildPolylinePoints(boat.vpp, i);
            if (points.length < 2) continue;

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const color = curveColor(boatIdx, boat.vpp.speeds[i], i, total);
            // In boat-colour mode every boat is a solid line (colour separates
            // them); in TWS mode boat B stays dashed to match the 2D series.
            const dashed = colorMode !== 'boat' && boatIdx !== 0;
            const material = dashed
                ? new THREE.LineDashedMaterial({ color, dashSize: 0.5, gapSize: 0.3 })
                : new THREE.LineBasicMaterial({ color });
            const line = new THREE.Line(geometry, material);
            if (dashed) line.computeLineDistances();
            scene.add(line);
            curves.push({ line, geometry, material, twsIndex: i, boatIndex: boatIdx });

            markerPositions.push(points[0]);
            markerPositions.push(points[points.length - 1]);
        }
    });

    if (markerPositions.length > 0) {
        const markerGeo = new THREE.SphereGeometry(0.22, 12, 12);
        const markerMat = new THREE.MeshBasicMaterial({ color: 0x222244 });
        vmgMarkers = new THREE.InstancedMesh(markerGeo, markerMat, markerPositions.length);
        const dummy = new THREE.Object3D();
        for (let j = 0; j < markerPositions.length; j++) {
            dummy.position.copy(markerPositions[j]);
            dummy.updateMatrix();
            vmgMarkers.setMatrixAt(j, dummy.matrix);
        }
        vmgMarkers.instanceMatrix.needsUpdate = true;
        scene.add(vmgMarkers);
    }
}

function disposeGrid() {
    if (gridLines) {
        scene.remove(gridLines);
        gridLines.geometry.dispose();
        gridLines.material.dispose();
        gridLines = null;
    }
    for (const l of gridLabels) {
        scene.remove(l.sprite);
        l.texture.dispose();
        l.material.dispose();
    }
    gridLabels = [];
}

function makeLabel(text, color = 'rgba(40,40,40,0.85)') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = 'bold 36px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3.2, 0.8, 1);
    return { sprite, texture, material };
}

// Starboard half-arc, TWA 0° → 180° (x ≥ 0).
function pushHalfCircle(positions, r, y) {
    const segments = CIRCLE_SEGMENTS / 2;
    for (let s = 0; s < segments; s++) {
        const a0 = (s / segments) * Math.PI;
        const a1 = ((s + 1) / segments) * Math.PI;
        positions.push(r * Math.sin(a0), y, -r * Math.cos(a0));
        positions.push(r * Math.sin(a1), y, -r * Math.cos(a1));
    }
}

function rebuildGrid() {
    disposeGrid();
    if (!activeBoat) return;

    // Rings and labels follow activeBoat's TWS table; the cage extent covers
    // every boat so the faster/windier one is never clipped.
    const vpp = activeBoat.vpp;
    const total = vpp.speeds.length;
    const allVpps = boats.filter((b) => b && b.vpp).map((b) => b.vpp);
    const rOuter = Math.max(...allVpps.map((v) => radiusOfTWS(v.speeds[v.speeds.length - 1])));
    const maxSOG = Math.max(...allVpps.map(computeMaxSOG));
    const maxY = Math.ceil(maxSOG / SOG_TICK_STEP) * SOG_TICK_STEP * Y_PER_KNOT;

    const positions = [];

    // Floor: one concentric half-ring per tabulated TWS.
    for (let i = 0; i < total; i++) {
        pushHalfCircle(positions, radiusOfTWS(vpp.speeds[i]), 0);
    }

    // Floor spokes: the wind axis (0°/180°, the flat edge of the half-disk)
    // plus the TWA ticks.
    positions.push(0, 0, -rOuter, 0, 0, rOuter);
    for (const twa of TWA_TICKS) {
        const a = twa * DEG;
        positions.push(0, 0, 0, rOuter * Math.sin(a), 0, -rOuter * Math.cos(a));
    }

    // Half-cylinder wall: an arc at the outer radius per SOG tick, plus
    // vertical SOG axes at both ends of the flat face (TWA 0° and 180°).
    for (let sog = SOG_TICK_STEP; sog * Y_PER_KNOT <= maxY + 1e-3; sog += SOG_TICK_STEP) {
        pushHalfCircle(positions, rOuter, yOfSOG(sog));
    }
    positions.push(0, 0, -rOuter, 0, maxY, -rOuter);
    positions.push(0, 0, rOuter, 0, maxY, rOuter);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    const material = new THREE.LineBasicMaterial({
        color: 0x444444,
        transparent: true,
        opacity: 0.35,
    });
    gridLines = new THREE.LineSegments(geometry, material);
    scene.add(gridLines);

    // Labels — TWA around the rim, SOG up the wind-axis vertical,
    // TWS on each floor ring at the downwind side (+z).
    for (const twa of TWA_TICKS) {
        const a = twa * DEG;
        const rLabel = rOuter + 1.4;
        const l = makeLabel(`${twa}°`);
        l.sprite.position.set(rLabel * Math.sin(a), -0.6, -rLabel * Math.cos(a));
        scene.add(l.sprite);
        gridLabels.push(l);
    }
    for (let sog = SOG_TICK_STEP; sog * Y_PER_KNOT <= maxY + 1e-3; sog += SOG_TICK_STEP) {
        const l = makeLabel(`${sog} kn`);
        l.sprite.position.set(0, yOfSOG(sog), -(rOuter + 1.6));
        scene.add(l.sprite);
        gridLabels.push(l);
    }
    for (let i = 0; i < total; i++) {
        const l = makeLabel(`TWS ${vpp.speeds[i]}`);
        l.sprite.position.set(0, 0.4, radiusOfTWS(vpp.speeds[i]));
        scene.add(l.sprite);
        gridLabels.push(l);
    }
}

function computeMaxSOG(vpp) {
    let max = 0;
    for (const twa of vpp.angles) {
        const row = vpp[twa] ?? vpp[String(twa)];
        if (!row) continue;
        for (const v of row) if (v > max) max = v;
    }
    return max || 10;
}

function disposeHighlight() {
    if (highlightObj) {
        scene.remove(highlightObj);
        highlightObj.geometry.dispose();
        highlightObj.material.dispose();
        highlightObj = null;
    }
}

// «Regata» race-angle highlight on the outermost drawn TWS ring of the active
// boat: the beat/run spokes for a windward/leeward race, the full beat→run
// floor arc for a coastal race. Drawn once (not per boat) as an orientation aid.
function rebuildHighlight() {
    disposeHighlight();
    if (!raceType || !activeBoat) return;
    const vpp = activeBoat.vpp;

    let idx = -1;
    for (let i = 0; i < vpp.speeds.length; i++) {
        if (includeTWS(vpp.speeds[i])) idx = i;
    }
    if (idx < 0) return;

    const r = radiusOfTWS(vpp.speeds[idx]);
    const beat = vpp.beat_angle?.[idx];
    const run = vpp.run_angle?.[idx];
    if (beat == null || run == null) return;

    const positions = [];
    if (raceType === 'wl') {
        for (const twa of [beat, run]) {
            const a = twa * DEG;
            positions.push(0, 0, 0, r * Math.sin(a), 0, -r * Math.cos(a));
        }
    } else {
        const seg = 48;
        for (let s = 0; s < seg; s++) {
            const t0 = (beat + ((run - beat) * s) / seg) * DEG;
            const t1 = (beat + ((run - beat) * (s + 1)) / seg) * DEG;
            positions.push(r * Math.sin(t0), 0, -r * Math.cos(t0));
            positions.push(r * Math.sin(t1), 0, -r * Math.cos(t1));
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    const material = new THREE.LineBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.85 });
    highlightObj = new THREE.LineSegments(geometry, material);
    scene.add(highlightObj);
}

function fitCamera() {
    if (!camera || !controls) return;
    const objects = mode === 'surface' ? surfaces.map((s) => s.mesh) : curves.map((c) => c.line);
    if (!objects.length) return;
    const box = new THREE.Box3();
    for (const o of objects) box.expandByObject(o);
    if (floor) box.expandByObject(floor.mesh);
    if (gridLines) box.expandByObject(gridLines);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const distance = maxDim * 1.6;
    camera.position.set(center.x + distance * 0.5, center.y + distance * 0.5, center.z + distance);
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
}

function twsIndexFromValue(tws) {
    if (!activeBoat) return -1;
    const speeds = activeBoat.vpp.speeds;
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < speeds.length; i++) {
        const d = Math.abs(speeds[i] - tws);
        if (d < bestDist) {
            bestDist = d;
            best = i;
        }
    }
    return best;
}

function updateHoverMarker() {
    if (!hoverMarker) return;
    if (!highlight || !activeBoat) {
        hoverMarker.visible = false;
        return;
    }
    const { tws, sog, cog } = highlight;
    const i = twsIndexFromValue(tws);
    if (i < 0) {
        hoverMarker.visible = false;
        return;
    }
    hoverMarker.position.copy(positionAt(cog, activeBoat.vpp.speeds[i], sog));
    hoverMarker.visible = true;
}

function onPointerMove(event) {
    if (!raycaster || !renderer || !activeBoat) return;
    const targets = mode === 'surface' ? surfaces.map((s) => s.mesh) : curves.map((c) => c.line);
    if (!targets.length) return;
    const rect = renderer.domElement.getBoundingClientRect();
    ndcMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    ndcMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndcMouse, camera);

    const hits = raycaster.intersectObjects(targets, false);
    if (!hits.length) {
        if (tooltip.visible) tooltip = { ...tooltip, visible: false };
        return;
    }
    const hit = hits[0];
    const multi = boats.filter((b) => b && b.vpp).length > 1;

    let hitBoat;
    let twsValue;
    if (mode === 'surface') {
        const surf = surfaces.find((s) => s.mesh === hit.object);
        hitBoat = surf ? boats[surf.boatIndex] : null;
        // On the continuous surface the ground radius *is* the TWS.
        twsValue = Math.hypot(hit.point.x, hit.point.z) / R_PER_KNOT_TWS;
    } else {
        const curve = curves.find((c) => c.line === hit.object);
        hitBoat = curve ? boats[curve.boatIndex] : null;
        twsValue = hitBoat ? hitBoat.vpp.speeds[curve.twsIndex] : 0;
    }

    // Azimuth back to TWA, folded into [0,180] (the polar is symmetric).
    let twaDeg = Math.abs((Math.atan2(hit.point.x, -hit.point.z) / DEG) % 360);
    if (twaDeg > 180) twaDeg = 360 - twaDeg;
    const sogVal = hit.point.y / Y_PER_KNOT;
    tooltip = {
        visible: true,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        twa: twaDeg,
        tws: twsValue,
        sog: sogVal,
        name: (multi || colorMode === 'boat') && hitBoat ? hitBoat.name || hitBoat.sailnumber : '',
    };
}

function onPointerLeave() {
    if (tooltip.visible) tooltip = { ...tooltip, visible: false };
}

function dispose() {
    if (controls) {
        controls.removeEventListener('change', requestRender);
        controls.dispose();
    }
    disposeCurves();
    disposeGrid();
    disposeHighlight();
    disposeSurfaces();
    disposeFloor();
    if (hoverMarker) {
        hoverMarker.geometry.dispose();
        hoverMarker.material.dispose();
    }
    if (renderer) renderer.dispose();
    scene = camera = renderer = controls = raycaster = null;
    hoverMarker = null;
    activeBoat = null;
    THREE = null;
    OrbitControls = null;
}

// Rebuild when any input that shapes the scene changes (after scene is up).
$: if (scene) {
    // Reference every dependency so Svelte re-runs this block on any change.
    void [boats, mode, colorMode, boatColors, twsFilter, raceType];
    rebuildAll();
}

// Marker follows externally-driven highlight (PolarTable sync).
$: if (scene && highlight !== undefined) {
    updateHoverMarker();
    requestRender();
}
</script>

<div class="polar3d" bind:this={container}>
    <canvas bind:this={canvas} on:pointermove={onPointerMove} on:pointerleave={onPointerLeave}></canvas>
    {#if loading}
        <div class="status">A carregar 3D…</div>
    {:else if !webglOK}
        <div class="status">Visualização 3D indisponível (WebGL falhou)</div>
    {/if}
    {#if tooltip.visible}
        <div class="tooltip" style="left: {tooltip.x + 14}px; top: {tooltip.y + 14}px;">
            {#if tooltip.name}{tooltip.name} ·
            {/if}TWA {tooltip.twa.toFixed(0)}° · TWS {tooltip.tws.toFixed(1)} kn · SOG {tooltip.sog.toFixed(2)}
            kn
        </div>
    {/if}
</div>

<style>
.polar3d {
    position: relative;
    width: 100%;
    height: 420px;
    background: var(--panel);
    border-radius: var(--r);
    overflow: hidden;
}
canvas {
    width: 100%;
    height: 100%;
    display: block;
}
.status {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #555;
    font-family: monospace;
    pointer-events: none;
}
.tooltip {
    position: absolute;
    background: rgba(40, 40, 40, 0.88);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    pointer-events: none;
    white-space: nowrap;
    z-index: 10;
}
</style>
