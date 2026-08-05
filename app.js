/**
 * KfW-40 Holzhaus mit Thermobodenplatte (Palmatin)
 * 3D Interactive Engine powered by Three.js & GSAP
 */

// Global App State
const state = {
    mode: 'standard', // 'standard' | 'gewerke' | 'thermal'
    explosion: 0,     // 0 to 1
    activeTab: 'sohle',
    cameraPreset: 'gesamt',
    isAnimating: false
};

// Colors Palette
const COLORS = {
    // Standard Material Colors
    wood: 0xD97706,        // KVH Wood / Studs / Rafters
    woodFiber: 0xC2A649,   // Holzfaser-Unterdeckplatte
    cellulose: 0x94A3B8,   // Zellulose-Dämmung
    concrete: 0x64748B,    // Stahlbetonsohle
    eps: 0xE2E8F0,         // EPS Dämmwanne (Light grey/white)
    gravel: 0x475569,      // Schotter
    pexPipe: 0xEF4444,     // Fußbodenheizungsrohr (Red)
    rebar: 0x334155,       // Stahlbewehrung
    vaporBarrier: 0x0284c7, // Dampfsperre (Blue film)
    hardiePlank: 0x334155, // HardiePlank Fassade (Dark grey/slate)
    roofTile: 0x1E293B,    // Dacheindeckung
    plasterboard: 0xCBD5E1,// Gipsfaser / Fermacell

    // Gewerke Color Tagging Mode
    palmatin: 0xEAB308,   // Gelb / Amber
    eigenleistung: 0x3B82F6, // Blau
    bodenplatte: 0x64748B,   // Grau/Graugrün

    // Thermal Heatmap Mode Colors
    thermalHot: 0xEF4444,     // +20°C (Rot)
    thermalWarm: 0xF59E0B,    // +15°C (Gelb)
    thermalMid: 0x10B981,     // +5°C (Grün)
    thermalCool: 0x06B6D4,    // 0°C (Cyan)
    thermalCold: 0x2563EB     // -5°C (Blau)
};

// DOM Elements
let container, canvas;
let scene, camera, renderer, controls;
let raycaster, mouse;

// Building Groups for Explosion & Material updates
const groups = {
    gravel: null,
    eps: null,
    concrete: null,
    pipes: null,
    wallSill: null,
    wallStuds: null,
    wallInsulation: null,
    wallOuterBoard: null,
    wallFacade: null,
    wallInner: null,
    roofRafters: null,
    roofInsulation: null,
    roofOuterBoard: null,
    roofCovering: null,
    roofInner: null,
    hotspots: []
};

// Object Material Registry for mode toggling
const materialRegistry = [];

// Hotspot Data Definitions
const HOTSPOTS_DATA = [
    {
        id: 'sohle-anschluss',
        position: new THREE.Vector3(1.2, 0.45, 0.8),
        title: 'Wand-Sohlen-Anschluss & Schwelle',
        badge: 'Thermobodenplatte',
        text: 'Das 220 mm KVH-Wandständerwerk sitzt direkt auf der gedämmten Kante der Thermobodenplatte auf. Eine Bitumen-Dampfsperre unter der Holzschwelle verhindert jegliche aufsteigende Feuchte. Der Holzsockel steht konstruktiv erhöht und gerät nie mit Wasser in Kontakt.',
        extra: '✓ 0 Wärmebrücke nach unten/außen<br>✓ Sockeldämmung lückenlos bis zur Wand'
    },
    {
        id: 'eps-wanne',
        position: new THREE.Vector3(-0.8, -0.25, 0.9),
        title: 'Passivhaus EPS-Wannenschalung',
        badge: 'Perimeterdämmung',
        text: 'Vollflächige Unter-Platten-Dämmung (200–300 mm EPS/XPS) und L-förmige Randschalelemente bilden eine geschlossene Thermowanne. Die Betonsohle wird komplett vom kalten Erdreich und Außenklima entkoppelt.',
        extra: '✓ Kapillarbrechende Schottertragschicht unter der Dämmung<br>✓ Hochdruckfeste Dämmelemente'
    },
    {
        id: 'heizung-beton',
        position: new THREE.Vector3(0.0, 0.15, -0.2),
        title: 'Integrierte Fußbodenheizung',
        badge: 'Thermobodenplatte',
        text: 'Die PEX-Heizrohre sind direkt auf der Bewehrung in der Betonsohle verlegt. Es wird kein separater Nassestrich benötigt – die massive Betonplatte dient als thermischer Energiespeicher für behagliche Strahlungswärme.',
        extra: '✓ Keine Estrichtrocknungszeit (Zeitgewinn im Bau)<br>✓ Ideale Kombination mit Wärmepumpen (niedrige Vorlauftemperatur)'
    },
    {
        id: 'wand-zellulose',
        position: new THREE.Vector3(1.4, 1.6, 0.7),
        title: '220 mm Ständerwerk & Zellulose',
        badge: 'Holzrahmenbau',
        text: 'Das 220 mm KVH-Ständerwerk wird lückenlos mit Zellulose ausgeblasen. Zusammen mit der 35 mm Holzfaser-Außendämmung wird ein U-Wert von ca. 0,13 W/m²K erreicht.',
        extra: '✓ Phasenverschiebung > 14 Stunden (Sommerlicher Hitzeschutz)<br>✓ Hohe Luftschalldämmung (R\'w ≈ 52 dB)'
    },
    {
        id: 'luftdicht-dach',
        position: new THREE.Vector3(1.2, 3.2, 0.4),
        title: 'Luftdichte Dampfbremse & Dachanschluss',
        badge: 'Gebäudehülle',
        text: 'Die feuchtevariable Dampfbremsbahn wird von der Wand nahtlos und luftdicht an die Bodenplatten-Abdichtung sowie an den Dachbereich verklebt. Das schützt die Konstruktion zuverlässig vor Feuchteeintrag.',
        extra: '✓ Feuchtevariabel für maximale Austrocknung nach innen<br>✓ 50 mm Installationsebene schützt die Ebene vor Kabeldurchdringungen'
    }
];

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
    initThreeScene();
    build3DModel();
    setupHotspots();
    setupUIControls();
    animate();
});

/**
 * Three.js Scene, Camera, Lighting & Controls Setup
 */
function initThreeScene() {
    container = document.getElementById('canvas-container');
    canvas = document.getElementById('three-canvas');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);

    // Subtle background fog
    scene.fog = new THREE.FogExp2(0x090d16, 0.04);

    // Camera
    camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(5.5, 3.5, 6.5);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Slightly below ground level
    controls.minDistance = 2;
    controls.maxDistance = 18;
    controls.target.set(0, 1.2, 0);

    // Raycaster for Hotspot clicks
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff5ea, 1.4);
    mainLight.position.set(8, 12, 6);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x90b0e0, 0.6);
    fillLight.position.set(-6, 6, -6);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    rimLight.position.set(0, -4, 5);
    scene.add(rimLight);

    // Architectural Ground Grid
    const gridHelper = new THREE.GridHelper(16, 32, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -0.76;
    scene.add(gridHelper);

    // Window Resize Handler
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('click', onCanvasClick);
}

/**
 * Handle Window Resize
 */
function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

/**
 * Helper to Register Materials for Mode Toggling
 */
function createManagedMaterial(params) {
    const mat = new THREE.MeshStandardMaterial(params.standard);
    materialRegistry.push({
        material: mat,
        standard: params.standard,
        gewerke: params.gewerke,
        thermal: params.thermal
    });
    return mat;
}

/**
 * Construct Procedural 3D Cutaway House Model
 */
function build3DModel() {
    // ----------------------------------------------------
    // 1. THERMOBODENPLATTE (SCHWEDENPLATTE)
    // ----------------------------------------------------

    // A) Schottertragschicht (Gravel base)
    groups.gravel = new THREE.Group();
    const gravelMat = createManagedMaterial({
        standard: { color: COLORS.gravel, roughness: 0.9, metalness: 0.1 },
        gewerke: { color: COLORS.bodenplatte, roughness: 0.9 },
        thermal: { color: COLORS.thermalCold, roughness: 0.9 }
    });
    const gravelGeo = new THREE.BoxGeometry(4.2, 0.3, 3.2);
    const gravelMesh = new THREE.Mesh(gravelGeo, gravelMat);
    gravelMesh.position.set(0, -0.6, 0);
    gravelMesh.receiveShadow = true;
    groups.gravel.add(gravelMesh);
    scene.add(groups.gravel);

    // B) Passivhaus EPS-Wannenschalung (Under-slab & L-edge insulation)
    groups.eps = new THREE.Group();
    const epsMat = createManagedMaterial({
        standard: { color: COLORS.eps, roughness: 0.6 },
        gewerke: { color: COLORS.bodenplatte, roughness: 0.6 },
        thermal: { color: COLORS.thermalMid, roughness: 0.6 } // Gradient transition
    });

    // Bottom EPS Slab
    const epsBottomGeo = new THREE.BoxGeometry(4.0, 0.25, 3.0);
    const epsBottomMesh = new THREE.Mesh(epsBottomGeo, epsMat);
    epsBottomMesh.position.set(0, -0.325, 0);
    epsBottomMesh.receiveShadow = true;
    groups.eps.add(epsBottomMesh);

    // L-Shaped Perimeter Edge Insulation (Randschalelemente)
    const epsEdgeGeo1 = new THREE.BoxGeometry(0.25, 0.45, 3.0);
    const epsEdgeMesh1 = new THREE.Mesh(epsEdgeGeo1, epsMat);
    epsEdgeMesh1.position.set(1.875, -0.225, 0);
    groups.eps.add(epsEdgeMesh1);

    const epsEdgeGeo2 = new THREE.BoxGeometry(4.0, 0.45, 0.25);
    const epsEdgeMesh2 = new THREE.Mesh(epsEdgeGeo2, epsMat);
    epsEdgeMesh2.position.set(0, -0.225, -1.375);
    groups.eps.add(epsEdgeMesh2);

    scene.add(groups.eps);

    // C) Stahlbetonsohle (Concrete Slab)
    groups.concrete = new THREE.Group();
    const concreteMat = createManagedMaterial({
        standard: { color: COLORS.concrete, roughness: 0.5, metalness: 0.1 },
        gewerke: { color: COLORS.bodenplatte, roughness: 0.5 },
        thermal: { color: COLORS.thermalWarm, roughness: 0.5 }
    });

    const concreteGeo = new THREE.BoxGeometry(3.5, 0.2, 2.5);
    const concreteMesh = new THREE.Mesh(concreteGeo, concreteMat);
    concreteMesh.position.set(-0.125, -0.1, 0.125);
    concreteMesh.castShadow = true;
    concreteMesh.receiveShadow = true;
    groups.concrete.add(concreteMesh);

    // Concrete Rebar Mesh (Gitterbewehrung)
    const rebarMat = createManagedMaterial({
        standard: { color: COLORS.rebar, metalness: 0.8, roughness: 0.3 },
        gewerke: { color: COLORS.bodenplatte, metalness: 0.5 },
        thermal: { color: COLORS.thermalWarm, roughness: 0.5 }
    });

    const rebarGroup = new THREE.Group();
    for (let x = -1.6; x <= 1.4; x += 0.4) {
        const barGeo = new THREE.CylinderGeometry(0.008, 0.008, 2.3, 8);
        const barMesh = new THREE.Mesh(barGeo, rebarMat);
        barMesh.rotation.x = Math.PI / 2;
        barMesh.position.set(x, -0.1, 0.125);
        rebarGroup.add(barMesh);
    }
    for (let z = -0.9; z <= 1.1; z += 0.4) {
        const barGeo = new THREE.CylinderGeometry(0.008, 0.008, 3.1, 8);
        const barMesh = new THREE.Mesh(barGeo, rebarMat);
        barMesh.rotation.z = Math.PI / 2;
        barMesh.position.set(-0.125, -0.09, z);
        rebarGroup.add(barMesh);
    }
    groups.concrete.add(rebarGroup);

    // D) Integrierte Fußbodenheizung (Red PEX Pipes curving in concrete)
    groups.pipes = new THREE.Group();
    const pipeMat = createManagedMaterial({
        standard: { color: COLORS.pexPipe, roughness: 0.2, metalness: 0.1 },
        gewerke: { color: COLORS.bodenplatte, roughness: 0.4 },
        thermal: { color: COLORS.thermalHot, roughness: 0.2 }
    });

    const pipeCurve = new THREE.CurvePath();
    const radius = 0.15;
    for (let z = -0.8; z <= 0.8; z += 0.4) {
        const p1 = new THREE.Vector3(-1.4, -0.05, z);
        const p2 = new THREE.Vector3(1.2, -0.05, z);
        const line = new THREE.LineCurve3(p1, p2);
        pipeCurve.add(line);
    }

    // Generate pipe geometry loops
    for (let z = -0.7; z <= 0.7; z += 0.35) {
        const pipeGeo = new THREE.CylinderGeometry(0.012, 0.012, 2.8, 12);
        const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
        pipeMesh.rotation.z = Math.PI / 2;
        pipeMesh.position.set(-0.1, -0.04, z);
        groups.pipes.add(pipeMesh);
    }
    groups.concrete.add(groups.pipes);

    scene.add(groups.concrete);

    // ----------------------------------------------------
    // 2. WANDAUFBAU (PALMATIN / DIY)
    // ----------------------------------------------------

    // A) Bitumen Sill Seal & Palmatin Wooden Bottom Sill (Schwelle)
    groups.wallSill = new THREE.Group();

    const bitMat = createManagedMaterial({
        standard: { color: 0x1E293B, roughness: 0.9 },
        gewerke: { color: COLORS.bodenplatte },
        thermal: { color: COLORS.thermalWarm }
    });
    const bitGeo = new THREE.BoxGeometry(0.22, 0.01, 2.5);
    const bitMesh = new THREE.Mesh(bitGeo, bitMat);
    bitMesh.position.set(1.64, 0.005, 0.125);
    groups.wallSill.add(bitMesh);

    // Wooden Sill (Palmatin)
    const sillWoodMat = createManagedMaterial({
        standard: { color: COLORS.wood, roughness: 0.6 },
        gewerke: { color: COLORS.palmatin },
        thermal: { color: COLORS.thermalWarm }
    });
    const sillWoodGeo = new THREE.BoxGeometry(0.22, 0.06, 2.5);
    const sillWoodMesh = new THREE.Mesh(sillWoodGeo, sillWoodMat);
    sillWoodMesh.position.set(1.64, 0.04, 0.125);
    sillWoodMesh.castShadow = true;
    groups.wallSill.add(sillWoodMesh);

    scene.add(groups.wallSill);

    // B) Wall Studs (220 mm Palmatin KVH Ständerwerk)
    groups.wallStuds = new THREE.Group();
    const studMat = sillWoodMat; // Same Palmatin wood

    const studGeo = new THREE.BoxGeometry(0.22, 2.4, 0.08);

    // Place studs along z-axis
    for (let z = -1.0; z <= 1.2; z += 0.6) {
        const studMesh = new THREE.Mesh(studGeo, studMat);
        studMesh.position.set(1.64, 1.27, z);
        studMesh.castShadow = true;
        groups.wallStuds.add(studMesh);
    }
    // Top Plate (Rähm)
    const topPlateGeo = new THREE.BoxGeometry(0.22, 0.08, 2.5);
    const topPlateMesh = new THREE.Mesh(topPlateGeo, studMat);
    topPlateMesh.position.set(1.64, 2.51, 0.125);
    topPlateMesh.castShadow = true;
    groups.wallStuds.add(topPlateMesh);

    scene.add(groups.wallStuds);

    // C) Zellulose-Einblasdämmung (Insulation blocks between studs - Eigenleistung)
    groups.wallInsulation = new THREE.Group();
    const cellMat = createManagedMaterial({
        standard: { color: COLORS.cellulose, roughness: 0.9 },
        gewerke: { color: COLORS.eigenleistung },
        thermal: { color: COLORS.thermalWarm }
    });

    for (let z = -0.7; z <= 0.8; z += 0.6) {
        const cellGeo = new THREE.BoxGeometry(0.22, 2.4, 0.52);
        const cellMesh = new THREE.Mesh(cellGeo, cellMat);
        cellMesh.position.set(1.64, 1.27, z);
        groups.wallInsulation.add(cellMesh);
    }
    scene.add(groups.wallInsulation);

    // D) Holzfaser-Unterdeckplatte (35 mm Palmatin)
    groups.wallOuterBoard = new THREE.Group();
    const woodFiberMat = createManagedMaterial({
        standard: { color: COLORS.woodFiber, roughness: 0.7 },
        gewerke: { color: COLORS.palmatin },
        thermal: { color: COLORS.thermalMid }
    });
    const wfGeo = new THREE.BoxGeometry(0.035, 2.55, 2.5);
    const wfMesh = new THREE.Mesh(wfGeo, woodFiberMat);
    wfMesh.position.set(1.7675, 1.275, 0.125);
    wfMesh.castShadow = true;
    groups.wallOuterBoard.add(wfMesh);
    scene.add(groups.wallOuterBoard);

    // E) Hinterlüftung (30 mm) & HardiePlank Fassadenverkleidung (Palmatin)
    groups.wallFacade = new THREE.Group();
    
    // Vertical Counter Battens (Lattung 30 mm)
    const battenMat = studMat;
    const battenGeo = new THREE.BoxGeometry(0.03, 2.55, 0.05);
    for (let z = -1.0; z <= 1.2; z += 0.6) {
        const battenMesh = new THREE.Mesh(battenGeo, battenMat);
        battenMesh.position.set(1.8, 1.275, z);
        groups.wallFacade.add(battenMesh);
    }

    // HardiePlank Cladding Panels
    const hardieMat = createManagedMaterial({
        standard: { color: COLORS.hardiePlank, roughness: 0.4 },
        gewerke: { color: COLORS.palmatin },
        thermal: { color: COLORS.thermalCold } // Exterior cold
    });

    const plankHeight = 0.18;
    for (let y = 0.05; y <= 2.5; y += 0.16) {
        const plankGeo = new THREE.BoxGeometry(0.01, plankHeight, 2.5);
        const plankMesh = new THREE.Mesh(plankGeo, hardieMat);
        plankMesh.position.set(1.82, y, 0.125);
        plankMesh.rotation.z = -0.03; // Overlapping plank angle
        plankMesh.castShadow = true;
        groups.wallFacade.add(plankMesh);
    }
    scene.add(groups.wallFacade);

    // F) Interior Side: Vapor Brake, 50 mm Installation Layer & 15 mm Plasterboard (Eigenleistung)
    groups.wallInner = new THREE.Group();

    // pro clima Dampfbremse (Vapor barrier film)
    const vbMat = createManagedMaterial({
        standard: { color: COLORS.vaporBarrier, roughness: 0.3, transparent: true, opacity: 0.7 },
        gewerke: { color: COLORS.eigenleistung },
        thermal: { color: COLORS.thermalHot }
    });
    const vbGeo = new THREE.BoxGeometry(0.005, 2.55, 2.5);
    const vbMesh = new THREE.Mesh(vbGeo, vbMat);
    vbMesh.position.set(1.5275, 1.275, 0.125);
    groups.wallInner.add(vbMesh);

    // Installation Layer Battens & Insulation (50 mm)
    const instMat = createManagedMaterial({
        standard: { color: 0xE2E8F0, roughness: 0.8 },
        gewerke: { color: COLORS.eigenleistung },
        thermal: { color: COLORS.thermalHot }
    });
    const instGeo = new THREE.BoxGeometry(0.05, 2.55, 2.5);
    const instMesh = new THREE.Mesh(instGeo, instMat);
    instMesh.position.set(1.5, 1.275, 0.125);
    groups.wallInner.add(instMesh);

    // Plasterboard / Fermacell (15 mm)
    const plasterMat = createManagedMaterial({
        standard: { color: COLORS.plasterboard, roughness: 0.5 },
        gewerke: { color: COLORS.eigenleistung },
        thermal: { color: COLORS.thermalHot }
    });
    const plasterGeo = new THREE.BoxGeometry(0.015, 2.55, 2.5);
    const plasterMesh = new THREE.Mesh(plasterGeo, plasterMat);
    plasterMesh.position.set(1.4675, 1.275, 0.125);
    groups.wallInner.add(plasterMesh);

    scene.add(groups.wallInner);

    // ----------------------------------------------------
    // 3. DACHAUFBAU (PALMATIN / DIY)
    // ----------------------------------------------------
    const roofAngle = 0.25; // Slope in radians (~14 deg)

    // A) Rafters (Sparren 240 mm - Palmatin)
    groups.roofRafters = new THREE.Group();
    const rafterMat = studMat;

    const rafterGeo = new THREE.BoxGeometry(2.4, 0.24, 0.08);

    for (let z = -1.0; z <= 1.2; z += 0.6) {
        const rafterMesh = new THREE.Mesh(rafterGeo, rafterMat);
        rafterMesh.position.set(0.6, 2.85, z);
        rafterMesh.rotation.z = roofAngle;
        rafterMesh.castShadow = true;
        groups.roofRafters.add(rafterMesh);
    }
    scene.add(groups.roofRafters);

    // B) Roof Cellulose Fill (240 mm - Eigenleistung)
    groups.roofInsulation = new THREE.Group();
    const roofCellMat = cellMat;

    for (let z = -0.7; z <= 0.8; z += 0.6) {
        const rCellGeo = new THREE.BoxGeometry(2.4, 0.24, 0.52);
        const rCellMesh = new THREE.Mesh(rCellGeo, roofCellMat);
        rCellMesh.position.set(0.6, 2.85, z);
        rCellMesh.rotation.z = roofAngle;
        groups.roofInsulation.add(rCellMesh);
    }
    scene.add(groups.roofInsulation);

    // C) Roof Outer Board (50 mm Holzfaser-Unterdeckplatte - Palmatin)
    groups.roofOuterBoard = new THREE.Group();
    const rWfMat = woodFiberMat;

    const rWfGeo = new THREE.BoxGeometry(2.4, 0.05, 2.5);
    const rWfMesh = new THREE.Mesh(rWfGeo, rWfMat);
    rWfMesh.position.set(0.6, 2.995, 0.125);
    rWfMesh.rotation.z = roofAngle;
    rWfMesh.castShadow = true;
    groups.roofOuterBoard.add(rWfMesh);
    scene.add(groups.roofOuterBoard);

    // D) Roof Covering & Counter Battens (70 mm - Palmatin)
    groups.roofCovering = new THREE.Group();
    const tileMat = createManagedMaterial({
        standard: { color: COLORS.roofTile, roughness: 0.3 },
        gewerke: { color: COLORS.palmatin },
        thermal: { color: COLORS.thermalCold }
    });

    const tileGeo = new THREE.BoxGeometry(2.4, 0.04, 2.5);
    const tileMesh = new THREE.Mesh(tileGeo, tileMat);
    tileMesh.position.set(0.6, 3.04, 0.125);
    tileMesh.rotation.z = roofAngle;
    tileMesh.castShadow = true;
    groups.roofCovering.add(tileMesh);
    scene.add(groups.roofCovering);

    // E) Roof Interior Finish (Vapor brake + 50 mm Untersparren + 15 mm Fermacell - Eigenleistung)
    groups.roofInner = new THREE.Group();

    const rInnerGeo = new THREE.BoxGeometry(2.4, 0.065, 2.5);
    const rInnerMesh = new THREE.Mesh(rInnerGeo, instMat);
    rInnerMesh.position.set(0.6, 2.70, 0.125);
    rInnerMesh.rotation.z = roofAngle;
    groups.roofInner.add(rInnerMesh);
    scene.add(groups.roofInner);
}

/**
 * Setup 3D Interactive Hotspot Markers
 */
function setupHotspots() {
    HOTSPOTS_DATA.forEach(data => {
        const hotspotGroup = new THREE.Group();
        hotspotGroup.position.copy(data.position);

        // Core Glowing Sphere
        const sphereGeo = new THREE.SphereGeometry(0.06, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({
            color: 0x0284c7,
            transparent: true,
            opacity: 0.9
        });
        const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
        hotspotGroup.add(sphereMesh);

        // Pulsing Ring
        const ringGeo = new THREE.RingGeometry(0.08, 0.11, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.lookAt(camera.position);
        hotspotGroup.add(ringMesh);

        hotspotGroup.userData = {
            id: data.id,
            title: data.title,
            badge: data.badge,
            text: data.text,
            extra: data.extra,
            targetPos: data.position,
            ring: ringMesh
        };

        scene.add(hotspotGroup);
        groups.hotspots.push(hotspotGroup);
    });
}

/**
 * Update Hotspot Ring Orientations towards Camera
 */
function updateHotspots() {
    groups.hotspots.forEach(h => {
        if (h.userData && h.userData.ring) {
            h.userData.ring.lookAt(camera.position);
        }
    });
}

/**
 * Handle Canvas Click (Raycasting for Hotspots)
 */
function onCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const hotspotObjects = groups.hotspots.map(h => h.children[0]); // Core spheres
    const intersects = raycaster.intersectObjects(hotspotObjects, true);

    if (intersects.length > 0) {
        const hitGroup = intersects[0].object.parent;
        if (hitGroup && hitGroup.userData) {
            openHotspotModal(hitGroup.userData);
        }
    }
}

/**
 * Open Hotspot Modal Dialog with Info
 */
function openHotspotModal(data) {
    const modal = document.getElementById('hotspot-modal');
    const title = document.getElementById('modal-title');
    const badge = document.getElementById('modal-badge');
    const text = document.getElementById('modal-text');
    const extra = document.getElementById('modal-extra');

    title.innerText = data.title;
    badge.innerText = data.badge;
    text.innerText = data.text;
    extra.innerHTML = data.extra;

    modal.classList.remove('hidden');

    // Smoothly focus camera on hotspot
    gsap.to(controls.target, {
        x: data.targetPos.x,
        y: data.targetPos.y,
        z: data.targetPos.z,
        duration: 1.2,
        ease: "power2.out"
    });
}

/**
 * Setup UI Event Listeners & Mode Switchers
 */
function setupUIControls() {
    // Modal Close handlers
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-ok-btn').addEventListener('click', closeModal);
    document.getElementById('hotspot-modal').addEventListener('click', (e) => {
        if (e.target.id === 'hotspot-modal') closeModal();
    });

    function closeModal() {
        document.getElementById('hotspot-modal').classList.add('hidden');
    }

    // Mode Switcher Buttons
    const btnStandard = document.getElementById('btn-mode-standard');
    const btnGewerke = document.getElementById('btn-mode-gewerke');
    const btnThermal = document.getElementById('btn-mode-thermal');
    const thermalLegend = document.getElementById('thermal-legend');

    btnStandard.addEventListener('click', () => setDisplayMode('standard'));
    btnGewerke.addEventListener('click', () => setDisplayMode('gewerke'));
    btnThermal.addEventListener('click', () => setDisplayMode('thermal'));

    function setDisplayMode(mode) {
        state.mode = mode;
        [btnStandard, btnGewerke, btnThermal].forEach(btn => btn.classList.remove('active'));

        if (mode === 'standard') {
            btnStandard.classList.add('active');
            thermalLegend.classList.add('hidden');
        } else if (mode === 'gewerke') {
            btnGewerke.classList.add('active');
            thermalLegend.classList.add('hidden');
        } else if (mode === 'thermal') {
            btnThermal.classList.add('active');
            thermalLegend.classList.remove('hidden');
        }

        // Apply mode to material registry
        materialRegistry.forEach(entry => {
            const modeConfig = entry[mode] || entry.standard;
            if (modeConfig.color !== undefined) entry.material.color.setHex(modeConfig.color);
            if (modeConfig.roughness !== undefined) entry.material.roughness = modeConfig.roughness;
            if (modeConfig.metalness !== undefined) entry.material.metalness = modeConfig.metalness;
        });
    }

    // Explosion Slider
    const slider = document.getElementById('explosion-slider');
    const sliderVal = document.getElementById('explosion-val');

    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        state.explosion = val;
        sliderVal.innerText = Math.round(val * 100) + '%';
        applyExplosion(val);
    });

    // Camera Preset Buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            const targetBtn = e.currentTarget;
            targetBtn.classList.add('active');

            const preset = targetBtn.getAttribute('data-preset');
            applyCameraPreset(preset);
        });
    });

    // Inspector Drawer Tabs
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

            const targetTab = e.currentTarget;
            targetTab.classList.add('active');

            const tabId = targetTab.getAttribute('data-tab');
            document.getElementById('tab-content-' + tabId).classList.remove('hidden');
        });
    });
}

/**
 * Apply Explosion Transformation to Layer Groups
 */
function applyExplosion(factor) {
    // 1. Gravel drops downwards
    groups.gravel.position.y = -0.5 * factor;

    // 2. EPS tub drops slightly
    groups.eps.position.y = -0.25 * factor;
    groups.eps.position.x = 0.2 * factor;

    // 3. Concrete slab stays centered

    // 4. Wall Sill & Wall assembly lift up and explode horizontally outwards
    groups.wallSill.position.y = 0.15 * factor;

    groups.wallStuds.position.x = 0.2 * factor;
    groups.wallStuds.position.y = 0.15 * factor;

    groups.wallInsulation.position.x = 0.1 * factor;
    groups.wallInsulation.position.y = 0.15 * factor;

    groups.wallOuterBoard.position.x = 0.45 * factor;
    groups.wallOuterBoard.position.y = 0.15 * factor;

    groups.wallFacade.position.x = 0.8 * factor;
    groups.wallFacade.position.y = 0.15 * factor;

    groups.wallInner.position.x = -0.3 * factor;
    groups.wallInner.position.y = 0.15 * factor;

    // 5. Roof lifts up along Y
    groups.roofRafters.position.y = 0.6 * factor;
    groups.roofInsulation.position.y = 0.6 * factor;
    groups.roofOuterBoard.position.y = 0.85 * factor;
    groups.roofCovering.position.y = 1.1 * factor;
    groups.roofInner.position.y = 0.35 * factor;
}

/**
 * Apply Camera Presets with GSAP Smooth Transition
 */
function applyCameraPreset(preset) {
    let camPos = { x: 5.5, y: 3.5, z: 6.5 };
    let targetPos = { x: 0, y: 1.2, z: 0 };

    switch (preset) {
        case 'sohle':
            camPos = { x: 3.2, y: 0.8, z: 2.8 };
            targetPos = { x: 1.2, y: 0.3, z: 0.6 };
            break;
        case 'thermo':
            camPos = { x: 1.8, y: 2.2, z: 3.5 };
            targetPos = { x: 0, y: -0.1, z: 0.2 };
            break;
        case 'dach':
            camPos = { x: 3.5, y: 4.8, z: 3.8 };
            targetPos = { x: 0.8, y: 2.8, z: 0.2 };
            break;
        case 'gesamt':
        default:
            camPos = { x: 5.5, y: 3.5, z: 6.5 };
            targetPos = { x: 0, y: 1.2, z: 0 };
            break;
    }

    gsap.to(camera.position, {
        x: camPos.x,
        y: camPos.y,
        z: camPos.z,
        duration: 1.4,
        ease: "power2.inOut"
    });

    gsap.to(controls.target, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: 1.4,
        ease: "power2.inOut"
    });
}

/**
 * Main Render Loop
 */
function animate() {
    requestAnimationFrame(animate);

    // Update orbit controls
    controls.update();

    // Keep hotspot rings oriented toward camera
    updateHotspots();

    // Render 3D Scene
    renderer.render(scene, camera);
}
