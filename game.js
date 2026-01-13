import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class SnowglobeTrainGame {
    constructor() {
        // Game state
        this.score = 0;
        this.gameOver = false;
        this.placementMode = true; // Start in placement mode
        this.drivingMode = false;
        this.trackPlacementMode = false; // Track placement mode
        this.trackPlacementStart = null; // Starting point for track placement
        this.trackPlacementPreview = null; // Preview line for track being placed
        this.cursorMode = true; // Cursor mode - no placement, just navigation
        this.currentTool = 'cursor'; // 'cursor', 'snowglobe', 'track'
        
        // Tunnel properties
        this.tunnelRadius = 25;
        this.tunnelWidth = 8;
        this.tunnelHeight = 6;
        
        // Train properties
        this.trainSpeed = 0;
        this.maxSpeed = 30;
        this.acceleration = 0.5;
        this.turnSpeed = 60;
        const trainScale = 0.4;
        this.trainPosition = new THREE.Vector3(this.tunnelRadius, 0.5 * trainScale, 0); // Y is up in Three.js, on ground
        this.trainHeading = 0;
        
        // Input state
        this.keys = {};
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.train = null;
        this.snowglobes = [];
        this.tunnelWalls = [];
        this.placedSnowglobes = []; // User-placed snowglobes
        this.selectedSnowglobeType = 0; // Index of current snowglobe type
        this.placementRotation = 0; // Rotation angle for placing snowglobes (in degrees)
        this.placementPreview = null; // Preview ghost of snowglobe being placed
        this.gridSize = 2.0; // Grid cell size for snapping
        this.gridEnabled = true; // Enable grid snapping
        this.connectionPreview = null; // Preview lines showing connections
        
        // Snowglobe types - will be loaded dynamically from USDA files
        this.snowglobeTypes = [];
        this.usdaFiles = []; // List of detected USDA files
        
        // Track system
        this.tracks = []; // Array of track segments
        this.trackMeshes = []; // Visual track meshes
        this.trainTrackPosition = null; // Current position along track (track index, t parameter)
        this.trainTrackDirection = 1; // Direction along track (1 forward, -1 backward)
        this.trackCrossings = []; // Track crossing points
        this.trackWidth = 0.5; // Standard track width (uniform)
        this.railHeight = 0.05; // Standard rail height
        this.railWidth = 0.1; // Standard rail width
        this.tieSpacing = 0.5; // Standard tie spacing
        this.trackPlacementCurved = false; // Whether to place curved tracks
        
        // Circuit system
        this.trackNodes = []; // Track nodes (junctions, switches, gates)
        this.trackSwitches = []; // Track switches that can be toggled
        this.trackSignals = []; // Traffic signals on tracks
        this.trackGates = []; // Logic gates (AND, OR, NOT, etc.)
        this.circuitMode = false; // Whether circuit editing mode is active
        
        // Height map system
        this.heightMap = null; // Height map image data
        this.heightMapData = null; // Parsed height data
        this.heightMapSize = 0; // Size of height map
        this.useHeightMap = false; // Whether to use height map
        
        // Terrain editing system
        this.terrainEditMode = false; // Whether terrain editing is active
        this.terrainBrushSize = 5.0; // Size of terrain brush
        this.terrainBrushStrength = 0.5; // How much to raise/lower
        this.terrainEditType = 'raise'; // 'raise', 'lower', 'smooth', 'paint'
        this.terrainTexturePaint = false; // Whether painting textures
        this.isTerrainEditing = false; // Whether currently editing terrain
        
        // Seasonal system
        this.currentSeason = 'winter'; // 'spring', 'summer', 'fall', 'winter'
        this.seasonColors = {
            spring: { 
                grass: 0x7cb342,      // Vibrant spring green
                tree: 0x4caf50,        // Fresh green foliage
                sky: 0x81d4fa,        // Bright spring sky blue
                fog: 0xe1f5fe          // Light blue fog
            },
            summer: { 
                grass: 0x66bb6a,      // Rich summer green
                tree: 0x2e7d32,        // Deep green foliage
                sky: 0x4fc3f7,        // Clear summer sky
                fog: 0xb3e5fc          // Bright blue fog
            },
            fall: { 
                grass: 0xb8860b,      // Golden brown grass
                tree: 0xff6f00,        // Orange/red foliage
                sky: 0xffb74d,        // Warm orange sky
                fog: 0xffcc80          // Warm orange fog
            },
            winter: { 
                grass: 0x90a4ae,      // Gray-blue grass
                tree: 0x546e7a,        // Dark gray-blue trees
                sky: 0x90caf9,        // Cool winter sky
                fog: 0xe3f2fd          // Light blue-white fog
            }
        };
        
        // Camera controls for placement mode
        this.controls = null;
        this.cameraSmoothing = 0.1; // Camera smoothing factor
        
        // Menu state
        this.selectedSeason = 'winter';
        this.gameStarted = false;
        
        // Particle systems
        this.particles = {
            steam: [],
            snow: [],
            sparkles: []
        };
        this.particleSystems = [];
        
        // Undo/redo system
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoHistory = 20;
        
        // Performance
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.fps = 60;
        
        // Mini-map
        this.miniMapEnabled = true;
        this.miniMapCamera = null;
        this.miniMapRenderer = null;
        
        // Initialize renderer only (needed for menu)
        this.init();
        this.setupMenu();
        
        // Don't start game until menu is closed
    }
    
    startGame(season) {
        this.selectedSeason = season;
        this.gameStarted = true;
        
        // Hide menu, show game
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        
        // Setup game components
        this.setupInput();
        this.setupEnvironment();
        this.setupTrain();
        this.setupTerrain();
        this.setupLighting();
        this.setupCamera();
        
        // Load USDA files first, then setup UI
        this.loadUSDAFiles().then(() => {
            this.setupUI();
            this.setupPlacementMode();
            this.setupMiniMap();
        });
        
        // Change season
        this.changeSeason(season);
        
        // Hide loading
        document.getElementById('loading').style.display = 'none';
        
        // Start game loop
        this.lastTime = performance.now();
        this.animate();
    }
    
    setupMenu() {
        // Setup epilepsy warning acknowledgment
        const warningDiv = document.getElementById('epilepsy-warning');
        const acknowledgeButton = document.getElementById('acknowledge-warning');
        
        if (acknowledgeButton) {
            acknowledgeButton.addEventListener('click', () => {
                // Hide warning, show main menu
                if (warningDiv) {
                    warningDiv.style.display = 'none';
                }
                const mainMenu = document.getElementById('main-menu');
                if (mainMenu) {
                    mainMenu.style.display = 'flex';
                }
            });
        }
        
        // Setup season buttons
        const seasonButtons = document.querySelectorAll('.season-btn');
        seasonButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                seasonButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.selectedSeason = btn.getAttribute('data-season');
            });
        });
        
        // Set default season
        const defaultSeasonBtn = document.querySelector('.season-btn[data-season="winter"]');
        if (defaultSeasonBtn) {
            defaultSeasonBtn.classList.add('selected');
        }
        
        // Setup menu buttons
        const customBtn = document.getElementById('start-custom-btn');
        const randomBtn = document.getElementById('start-random-btn');
        
        if (customBtn) {
            customBtn.addEventListener('click', () => {
                this.startGame(this.selectedSeason);
            });
        }
        
        if (randomBtn) {
            randomBtn.addEventListener('click', () => {
                this.startGame(this.selectedSeason);
                // Generate random map after a short delay
                setTimeout(() => {
                    this.generateRandomMap();
                }, 500);
            });
        }
    }
    
    generateRandomMap() {
        // Clear existing snowglobes and tracks
        this.placedSnowglobes.forEach(sg => this.scene.remove(sg.mesh));
        this.placedSnowglobes = [];
        this.trackMeshes.forEach(track => this.scene.remove(track));
        this.trackMeshes = [];
        this.tracks = [];
        this.trackCrossings.forEach(crossing => this.scene.remove(crossing.mesh));
        this.trackCrossings = [];
        
        if (this.snowglobeTypes.length === 0) {
            console.warn('No snowglobe types available for random map');
            return;
        }
        
        // Generate random snowglobe positions in a connected network
        const numSnowglobes = 8 + Math.floor(Math.random() * 7); // 8-14 snowglobes
        const centerRadius = 30;
        const positions = [];
        
        // Create a network pattern (like a web or circuit)
        for (let i = 0; i < numSnowglobes; i++) {
            let attempts = 0;
            let position;
            let valid = false;
            
            while (!valid && attempts < 50) {
                if (i === 0) {
                    // First snowglobe at center
                    position = new THREE.Vector3(0, 0, 0);
                } else if (i === 1) {
                    // Second snowglobe at a distance
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 8 + Math.random() * 8;
                    position = new THREE.Vector3(
                        Math.cos(angle) * radius,
                        0,
                        Math.sin(angle) * radius
                    );
                } else {
                    // Connect to existing snowglobe
                    const connectTo = positions[Math.floor(Math.random() * positions.length)];
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 6 + Math.random() * 6;
                    position = new THREE.Vector3(
                        connectTo.x + Math.cos(angle) * distance,
                        0,
                        connectTo.z + Math.sin(angle) * distance
                    );
                }
                
                // Check if position is valid (not too close to others)
                valid = true;
                for (const existing of positions) {
                    if (position.distanceTo(existing) < 4) {
                        valid = false;
                        break;
                    }
                }
                
                // Check if within bounds
                if (Math.abs(position.x) > centerRadius || Math.abs(position.z) > centerRadius) {
                    valid = false;
                }
                
                attempts++;
            }
            
            if (valid) {
                positions.push(position);
                
                // Place snowglobe
                const typeIndex = Math.floor(Math.random() * this.snowglobeTypes.length);
                this.selectedSnowglobeType = typeIndex;
                this.placementRotation = Math.random() * 360;
                
                const terrainHeight = this.getTerrainHeight(position.x, position.z);
                const type = this.snowglobeTypes[typeIndex];
                const snowglobe = this.createSnowglobe(type);
                const scale = 3.0;
                snowglobe.scale.set(scale, scale, scale);
                snowglobe.position.set(position.x, terrainHeight + 1.2, position.z);
                snowglobe.rotation.y = this.placementRotation * (Math.PI / 180);
                
                const holeRadius = type.holeSize * scale;
                const holePosition = new THREE.Vector3(position.x, terrainHeight + 0.5, position.z);
                
                this.scene.add(snowglobe);
                const snowglobeData = {
                    mesh: snowglobe,
                    position: position.clone(),
                    holePosition: holePosition,
                    rotation: this.placementRotation,
                    spin: 0,
                    holeRadius: holeRadius,
                    snowglobeRadius: 0.8 * scale,
                    type: typeIndex
                };
                this.placedSnowglobes.push(snowglobeData);
            }
        }
        
        // Generate realistic tracks connecting snowglobes
        this.updateTracks();
        
        // Add more curved tracks for variety - prefer curves over straight tracks
        const numCurvedTracks = 5 + Math.floor(Math.random() * 5); // 5-9 curved tracks
        const usedPairs = new Set();
        
        for (let i = 0; i < numCurvedTracks; i++) {
            if (this.placedSnowglobes.length >= 2) {
                let sg1, sg2;
                let pairKey;
                let attempts = 0;
                
                // Find a unique pair
                do {
                    sg1 = this.placedSnowglobes[Math.floor(Math.random() * this.placedSnowglobes.length)];
                    sg2 = this.placedSnowglobes[Math.floor(Math.random() * this.placedSnowglobes.length)];
                    pairKey = `${Math.min(sg1.position.x, sg2.position.x)}_${Math.min(sg1.position.z, sg2.position.z)}`;
                    attempts++;
                } while ((sg1 === sg2 || usedPairs.has(pairKey)) && attempts < 20);
                
                if (sg1 !== sg2 && !usedPairs.has(pairKey)) {
                    usedPairs.add(pairKey);
                    const dist = sg1.holePosition.distanceTo(sg2.holePosition);
                    
                    // Create curved tracks for various distances
                    if (dist > 6 && dist < 20) {
                        const start = sg1.holePosition.clone();
                        const end = sg2.holePosition.clone();
                        
                        // Create curved control point with more variation
                        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                        const dir = new THREE.Vector3().subVectors(end, start).normalize();
                        const perp = new THREE.Vector3(-dir.z, 0, dir.x);
                        
                        // Vary curve amount and direction for more interesting paths
                        const curveAmount = dist * (0.15 + Math.random() * 0.25); // 15-40% of distance
                        const curveDirection = Math.random() > 0.5 ? 1 : -1; // Random left or right curve
                        const controlPoint = midPoint.clone().add(perp.multiplyScalar(curveAmount * curveDirection));
                        controlPoint.y = this.getTerrainHeight(controlPoint.x, controlPoint.z) + 0.1;
                        
                        // Add some vertical variation for more realistic curves
                        const heightVariation = (Math.random() - 0.5) * 0.5;
                        controlPoint.y += heightVariation;
                        
                        const trackMesh = this.createTrackSegment(start, end, this.trackWidth, true, controlPoint);
                        this.tracks.push({
                            start: start,
                            end: end,
                            radius: this.trackWidth,
                            segment: trackMesh,
                            fromIndex: -1,
                            toIndex: -1,
                            fromSnowglobe: null,
                            toSnowglobe: null,
                            curved: true,
                            controlPoint: controlPoint
                        });
                    }
                }
            }
        }
        
        // Update all connections
        this.updateAllConnections();
        
        this.updatePlacementUI();
        this.showBanner('🎲 Random Map Generated!');
        setTimeout(() => this.hideBanner(), 3000);
    }
    
    init() {
        // Create renderer with enhanced settings
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // Realistic tone mapping
        this.renderer.toneMappingExposure = 1.2; // Slightly brighter
        this.renderer.outputColorSpace = THREE.SRGBColorSpace; // Proper color space
        
        // Append to game container (which may be hidden initially)
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(this.renderer.domElement);
        }
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === 'Escape') {
                if (this.placementMode) {
                    this.quitGame();
                } else {
                    // Return to placement mode
                    this.placementMode = true;
                    this.drivingMode = false;
                    this.setupPlacementMode();
                }
            } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (e.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
            }
            // Switch snowglobe type with number keys (1-9)
            if (this.placementMode && e.key >= '1' && e.key <= '9') {
                const index = parseInt(e.key) - 1;
                if (index < this.snowglobeTypes.length) {
                    this.selectSnowglobeType(index);
                }
            }
            // Rotate snowglobe placement with Q/E keys
            if (this.placementMode) {
                if (e.key.toLowerCase() === 'q') {
                    this.placementRotation -= 15;
                    this.updatePlacementPreview();
                } else if (e.key.toLowerCase() === 'e') {
                    this.placementRotation += 15;
                    this.updatePlacementPreview();
                } else if (e.key.toLowerCase() === 'g') {
                    // Toggle grid
                    this.gridEnabled = !this.gridEnabled;
                    const grid = this.scene.getObjectByName('placementGrid');
                    if (grid) {
                        grid.visible = this.gridEnabled;
                    }
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse events for placement
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
        this.renderer.domElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.onRightClick(e);
        });
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.renderer.domElement.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.renderer.domElement.addEventListener('wheel', (e) => this.onMouseWheel(e));
    }
    
    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        if (this.terrainEditMode && this.isTerrainEditing) {
            this.editTerrainAtMouse();
        } else if (this.placementMode) {
            this.updatePlacementPreview();
        }
    }
    
    onMouseDown(event) {
        if (this.terrainEditMode && event.button === 0) { // Left mouse button
            this.isTerrainEditing = true;
            this.editTerrainAtMouse();
        }
    }
    
    onMouseUp(event) {
        if (this.terrainEditMode && event.button === 0) {
            this.isTerrainEditing = false;
        }
    }
    
    onMouseClick(event) {
        if (!this.placementMode) return;
        
        // Cursor mode - no placement, just navigation
        if (this.cursorMode || this.currentTool === 'cursor') {
            return;
        }
        
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Intersect with ground plane
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(groundPlane, intersectPoint);
        
        if (intersectPoint) {
            // Snap to grid if enabled
            const snappedPosition = this.snapToGrid(intersectPoint);
            
            if (this.trackPlacementMode || this.currentTool === 'track') {
                this.placeTrack(snappedPosition);
            } else if (this.currentTool === 'snowglobe') {
                this.placeSnowglobe(snappedPosition);
            }
        }
    }
    
    snapToGrid(position) {
        if (!this.gridEnabled) return position;
        
        const snapped = new THREE.Vector3(
            Math.round(position.x / this.gridSize) * this.gridSize,
            position.y,
            Math.round(position.z / this.gridSize) * this.gridSize
        );
        return snapped;
    }
    
    onRightClick(event) {
        if (!this.placementMode) return;
        
        // Cancel track placement if in progress
        if (this.trackPlacementMode && this.trackPlacementStart) {
            this.trackPlacementStart = null;
            if (this.trackPlacementPreview) {
                this.scene.remove(this.trackPlacementPreview);
                this.trackPlacementPreview = null;
            }
            return;
        }
        
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Find closest snowglobe or track
        const intersects = this.raycaster.intersectObjects(this.placedSnowglobes.map(sg => sg.mesh));
        
        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            this.removeSnowglobe(clickedMesh);
        } else {
            // Try to remove manually placed tracks
            const trackIntersects = this.raycaster.intersectObjects(this.trackMeshes);
            if (trackIntersects.length > 0) {
                const clickedTrack = trackIntersects[0].object;
                this.removeTrack(clickedTrack);
            }
        }
    }
    
    removeTrack(trackMesh) {
        // Find the track in the tracks array
        const trackIndex = this.tracks.findIndex(t => t.segment === trackMesh || 
            (trackMesh.parent && t.segment === trackMesh.parent));
        
        if (trackIndex !== -1) {
            const track = this.tracks[trackIndex];
            // Remove visual mesh
            if (track.segment) {
                this.scene.remove(track.segment);
            }
            // Remove from array
            this.tracks.splice(trackIndex, 1);
            // Remove from trackMeshes
            const meshIndex = this.trackMeshes.indexOf(track.segment);
            if (meshIndex !== -1) {
                this.trackMeshes.splice(meshIndex, 1);
            }
            console.log('Track removed');
        }
    }
    
    onMouseWheel(event) {
        if (!this.placementMode) return;
        
        // Rotate placement with mouse wheel
        event.preventDefault();
        const delta = event.deltaY > 0 ? -15 : 15;
        this.placementRotation += delta;
        this.updatePlacementPreview();
    }
    
    updatePlacementPreview() {
        // Update UI to show current rotation
        const rotationDisplay = document.getElementById('placement-rotation');
        if (rotationDisplay) {
            rotationDisplay.textContent = `Rotation: ${this.placementRotation}°`;
        }
        
        if (!this.placementMode) return;
        
        // Cursor mode - no preview
        if (this.cursorMode || this.currentTool === 'cursor') {
            // Remove all previews in cursor mode
            if (this.placementPreview) {
                this.scene.remove(this.placementPreview);
                this.placementPreview = null;
            }
            if (this.trackPlacementPreview) {
                this.scene.remove(this.trackPlacementPreview);
                this.trackPlacementPreview = null;
            }
            return;
        }
        
        // Handle track placement preview
        if (this.trackPlacementMode || this.currentTool === 'track') {
            this.updateTrackPlacementPreview();
            return;
        }
        
        // Check if snowglobe types are loaded
        if (!this.snowglobeTypes || this.snowglobeTypes.length === 0) {
            return; // Types not loaded yet
        }
        
        // Check if selected type is valid
        if (this.selectedSnowglobeType < 0 || this.selectedSnowglobeType >= this.snowglobeTypes.length) {
            this.selectedSnowglobeType = 0; // Reset to first type
        }
        
        // Get mouse position on ground
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(groundPlane, intersectPoint);
        
        if (intersectPoint) {
            // Snap to grid
            const snappedPosition = this.snapToGrid(intersectPoint);
            // Adjust height to terrain
            const terrainHeight = this.getTerrainHeight(snappedPosition.x, snappedPosition.z);
            snappedPosition.y = terrainHeight;
            
            // Get the type - ensure it exists and has required properties
            const type = this.snowglobeTypes[this.selectedSnowglobeType];
            if (!type || !type.holeSize || !type.color) {
                return; // Type not ready
            }
            
            // Create or update preview ghost
            if (!this.placementPreview) {
                this.placementPreview = this.createSnowglobe(type);
                const scale = 3.0;
                this.placementPreview.scale.set(scale, scale, scale);
                
                // Make it semi-transparent
                this.placementPreview.traverse((child) => {
                    if (child.isMesh) {
                        child.material = child.material.clone();
                        child.material.transparent = true;
                        child.material.opacity = 0.5;
                    }
                });
                
                this.scene.add(this.placementPreview);
            }
            
            // Update preview position and rotation
            this.placementPreview.position.x = snappedPosition.x;
            this.placementPreview.position.y = terrainHeight + 1.2; // Base sits on terrain
            this.placementPreview.position.z = snappedPosition.z;
            this.placementPreview.rotation.y = this.placementRotation * (Math.PI / 180);
            
            // Check if placement is valid (not overlapping)
            const isValid = this.isValidPlacement(snappedPosition);
            
            // Update preview color based on validity
            this.placementPreview.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (isValid) {
                        child.material.color.setHex(0xffffff);
                    } else {
                        child.material.color.setHex(0xff0000); // Red for invalid
                    }
                }
            });
            
            // Show connection preview lines
            this.updateConnectionPreview(snappedPosition);
        }
    }
    
    getTerrainHeight(x, z) {
        if (!this.terrain) {
            // Fallback if terrain not created yet
            return 0;
        }
        
        // Simple height calculation matching terrain generation
        let height = 0;
        height += Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2;
        height += Math.sin(x * 0.1) * Math.cos(z * 0.1) * 1;
        height += Math.sin(x * 0.2) * Math.cos(z * 0.2) * 0.5;
        
        const distFromCenter = Math.sqrt(x * x + z * z);
        if (distFromCenter > 30) {
            height += Math.sin(distFromCenter * 0.1) * 1.5;
        }
        
        return height;
    }
    
    isValidPlacement(position) {
        // Check if position overlaps with existing snowglobes
        const minDistance = 4.0; // Minimum distance between snowglobes
        
        for (const sg of this.placedSnowglobes) {
            const distance = position.distanceTo(sg.position);
            if (distance < minDistance) {
                return false;
            }
        }
        return true;
    }
    
    updateConnectionPreview(position) {
        // Remove old connection preview
        if (this.connectionPreview) {
            this.scene.remove(this.connectionPreview);
            this.connectionPreview = null;
        }
        
        // Check which snowglobes would connect
        const connectionDistance = 5.5;
        const connections = [];
        
        for (const sg of this.placedSnowglobes) {
            const distance = position.distanceTo(sg.position);
            if (distance <= connectionDistance) {
                connections.push(sg);
            }
        }
        
        if (connections.length > 0) {
            // Create preview lines
            const lineGroup = new THREE.Group();
            const lineMaterial = new THREE.LineBasicMaterial({ 
                color: 0x00ff00, 
                transparent: true,
                opacity: 0.6,
                linewidth: 2
            });
            
            connections.forEach(sg => {
                const points = [
                    new THREE.Vector3(position.x, 0.5, position.z),
                    new THREE.Vector3(sg.holePosition.x, 0.5, sg.holePosition.z)
                ];
                // Create geometry properly to avoid WebGL errors
                const geometry = new THREE.BufferGeometry();
                const positions = new Float32Array(points.length * 3);
                points.forEach((point, i) => {
                    positions[i * 3] = point.x;
                    positions[i * 3 + 1] = point.y;
                    positions[i * 3 + 2] = point.z;
                });
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                const line = new THREE.Line(geometry, lineMaterial);
                lineGroup.add(line);
            });
            
            this.connectionPreview = lineGroup;
            this.scene.add(lineGroup);
        }
    }
    
    placeSnowglobe(position) {
        // Save state before placing
        this.saveState();
        
        // Check if snowglobe types are loaded
        if (!this.snowglobeTypes || this.snowglobeTypes.length === 0) {
            console.warn('Cannot place snowglobe: types not loaded');
            return;
        }
        
        // Check if selected type is valid
        if (this.selectedSnowglobeType < 0 || this.selectedSnowglobeType >= this.snowglobeTypes.length) {
            this.selectedSnowglobeType = 0; // Reset to first type
        }
        
        // Check if placement is valid
        if (!this.isValidPlacement(position)) {
            console.log('Invalid placement - too close to existing snowglobe');
            this.showBanner('⚠️ Too close to existing snowglobe', 'error');
            return;
        }
        
        // Get terrain height at this position
        const terrainHeight = this.getTerrainHeight(position.x, position.z);
        
        const type = this.snowglobeTypes[this.selectedSnowglobeType];
        if (!type || !type.holeSize) {
            console.warn('Invalid snowglobe type selected');
            return;
        }
        
        const snowglobe = this.createSnowglobe(type);
        // Make snowglobes larger to create visible holes for train to pass through
        const scale = 3.0;
        snowglobe.scale.set(scale, scale, scale);
        snowglobe.position.x = position.x;
        snowglobe.position.z = position.z;
        // Place snowglobe so base sits on terrain
        // Base is at y=-0.4 in local space, scaled to -1.2, so center should be at terrainHeight + 1.2
        snowglobe.position.y = terrainHeight + 1.2;
        
        // Apply rotation (no automatic rotation)
        snowglobe.rotation.y = this.placementRotation * (Math.PI / 180);
        
        // Calculate actual hole radius after scaling
        const holeRadius = type.holeSize * scale;
        
        // Hole position is at the center of the snowglobe (where train passes through)
        const holePosition = new THREE.Vector3(position.x, terrainHeight + 0.5, position.z);
        
        this.scene.add(snowglobe);
        const snowglobeData = {
            mesh: snowglobe,
            position: position.clone(),
            holePosition: holePosition,
            rotation: this.placementRotation, // Store rotation
            spin: 0, // No automatic spinning
            holeRadius: holeRadius, // Size of hole the train can pass through
            snowglobeRadius: 0.8 * scale, // Outer radius of snowglobe
            type: this.selectedSnowglobeType
        };
        this.placedSnowglobes.push(snowglobeData);
        
        // Update all connections (snowglobes and tracks)
        this.updateAllConnections();
        
        // Update preview
        this.updatePlacementPreview();
        
        this.showBanner('❄️ Snowglobe Placed - Connected to nearby tracks');
        setTimeout(() => this.hideBanner(), 2000);
        this.updatePlacementUI();
    }
    
    showBanner(message, type = 'info') {
        const banner = document.getElementById('placement-banner');
        const content = document.getElementById('banner-content');
        banner.style.display = 'block';
        
        // Set color based on type
        if (type === 'error') {
            banner.style.borderColor = '#ff4444';
        } else if (type === 'success') {
            banner.style.borderColor = '#4CAF50';
        } else {
            banner.style.borderColor = '#4CAF50';
        }
        
        content.textContent = message;
    }
    
    hideBanner() {
        const banner = document.getElementById('placement-banner');
        banner.style.display = 'none';
    }
    
    removeSnowglobe(mesh) {
        const index = this.placedSnowglobes.findIndex(sg => sg.mesh === mesh);
        if (index !== -1) {
            this.scene.remove(mesh);
            this.placedSnowglobes.splice(index, 1);
            // Update tracks after removal
            this.updateTracks();
            this.updatePlacementUI();
        }
    }
    
    placeTrack(position) {
        // Save state before placing
        this.saveState();
        if (!this.trackPlacementStart) {
            // First click - set start point, try to snap to nearby snowglobe or track
            const snappedPos = this.snapToNearestConnection(position, true);
            this.trackPlacementStart = snappedPos.clone();
            const terrainHeight = this.getTerrainHeight(snappedPos.x, snappedPos.z);
            this.trackPlacementStart.y = terrainHeight + 0.1;
            
            this.showBanner('🚂 Track Start Point Set - Click to place end point');
            console.log('Track placement started at', this.trackPlacementStart);
        } else {
            // Second click - create track segment, try to snap to nearby snowglobe or track
            const snappedEndPos = this.snapToNearestConnection(position, false);
            const terrainHeight = this.getTerrainHeight(snappedEndPos.x, snappedEndPos.z);
            snappedEndPos.y = terrainHeight + 0.1;
            
            let controlPoint = null;
            if (this.trackPlacementCurved) {
                // Calculate control point for curved track (perpendicular to midpoint)
                const midPoint = new THREE.Vector3().addVectors(this.trackPlacementStart, snappedEndPos).multiplyScalar(0.5);
                const dir = new THREE.Vector3().subVectors(snappedEndPos, this.trackPlacementStart).normalize();
                const perp = new THREE.Vector3(-dir.z, 0, dir.x); // Perpendicular vector
                const curveAmount = this.trackPlacementStart.distanceTo(snappedEndPos) * 0.3; // Curve amount
                controlPoint = midPoint.clone().add(perp.multiplyScalar(curveAmount));
                controlPoint.y = this.getTerrainHeight(controlPoint.x, controlPoint.z) + 0.1;
            }
            
            // Create track segment with uniform dimensions
            const trackMesh = this.createTrackSegment(
                this.trackPlacementStart, 
                snappedEndPos, 
                this.trackWidth, 
                this.trackPlacementCurved, 
                controlPoint
            );
            
            // Add to tracks array
            this.tracks.push({
                start: this.trackPlacementStart.clone(),
                end: snappedEndPos.clone(),
                radius: this.trackWidth,
                segment: trackMesh,
                fromIndex: -1, // Manual track, not connected to snowglobe
                toIndex: -1,
                fromSnowglobe: null,
                toSnowglobe: null,
                curved: this.trackPlacementCurved,
                controlPoint: controlPoint
            });
            
            console.log('Track placed from', this.trackPlacementStart, 'to', snappedEndPos, this.trackPlacementCurved ? '(curved)' : '(straight)');
            
            // Update all connections (snowglobes and tracks)
            this.updateAllConnections();
            
            // Reset for next track
            this.trackPlacementStart = null;
            if (this.trackPlacementPreview) {
                this.scene.remove(this.trackPlacementPreview);
                this.trackPlacementPreview = null;
            }
            
            this.showBanner('🚂 Track Placed - Connected to nearby paths');
            setTimeout(() => this.hideBanner(), 2000);
            this.updatePlacementUI();
        }
    }
    
    snapToNearestConnection(position, isStart) {
        const snapDistance = 3.0; // Distance to snap to connections
        let nearestPos = position.clone();
        let nearestDist = Infinity;
        
        // Check snowglobe connections
        for (const sg of this.placedSnowglobes) {
            const dist = position.distanceTo(sg.holePosition);
            if (dist < snapDistance && dist < nearestDist) {
                nearestDist = dist;
                nearestPos = sg.holePosition.clone();
            }
        }
        
        // Check track connections (endpoints)
        for (const track of this.tracks) {
            const distToStart = position.distanceTo(track.start);
            const distToEnd = position.distanceTo(track.end);
            
            if (distToStart < snapDistance && distToStart < nearestDist) {
                nearestDist = distToStart;
                nearestPos = track.start.clone();
            }
            if (distToEnd < snapDistance && distToEnd < nearestDist) {
                nearestDist = distToEnd;
                nearestPos = track.end.clone();
            }
        }
        
        return nearestPos;
    }
    
    updateAllConnections() {
        // Update snowglobe connections
        this.updateTracks();
        
        // Connect tracks to nearby snowglobes
        this.connectTracksToSnowglobes();
        
        // Connect tracks to other tracks
        this.connectTracksToTracks();
        
        // Find and create track crossings
        this.findTrackIntersections();
    }
    
    connectTracksToSnowglobes() {
        // Connect manual tracks to nearby snowglobes
        for (const track of this.tracks) {
            if (track.fromIndex === -1) { // Manual track
                const connectionDistance = 3.0;
                
                // Check start point
                for (let i = 0; i < this.placedSnowglobes.length; i++) {
                    const sg = this.placedSnowglobes[i];
                    const dist = track.start.distanceTo(sg.holePosition);
                    if (dist < connectionDistance) {
                        track.start.copy(sg.holePosition);
                        track.fromIndex = i;
                        track.fromSnowglobe = sg;
                    }
                }
                
                // Check end point
                for (let i = 0; i < this.placedSnowglobes.length; i++) {
                    const sg = this.placedSnowglobes[i];
                    const dist = track.end.distanceTo(sg.holePosition);
                    if (dist < connectionDistance) {
                        track.end.copy(sg.holePosition);
                        track.toIndex = i;
                        track.toSnowglobe = sg;
                    }
                }
            }
        }
    }
    
    connectTracksToTracks() {
        // Connect track endpoints that are close together
        const connectionDistance = 2.0;
        
        for (let i = 0; i < this.tracks.length; i++) {
            for (let j = i + 1; j < this.tracks.length; j++) {
                const track1 = this.tracks[i];
                const track2 = this.tracks[j];
                
                // Check all endpoint combinations
                if (track1.end.distanceTo(track2.start) < connectionDistance) {
                    track1.end.copy(track2.start);
                }
                if (track1.end.distanceTo(track2.end) < connectionDistance) {
                    track1.end.copy(track2.end);
                }
                if (track1.start.distanceTo(track2.start) < connectionDistance) {
                    track1.start.copy(track2.start);
                }
                if (track1.start.distanceTo(track2.end) < connectionDistance) {
                    track1.start.copy(track2.end);
                }
            }
        }
    }
    
    updateTrackPlacementPreview() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Intersect with ground plane
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(groundPlane, intersectPoint);
        
        if (intersectPoint) {
            const gridSnapped = this.snapToGrid(intersectPoint);
            const snappedPosition = this.snapToNearestConnection(gridSnapped, !this.trackPlacementStart);
            const terrainHeight = this.getTerrainHeight(snappedPosition.x, snappedPosition.z);
            snappedPosition.y = terrainHeight + 0.1;
            
            // Check if snapped to a connection
            const isSnapped = snappedPosition.distanceTo(gridSnapped) > 0.1;
            
            if (this.trackPlacementStart) {
                // Show preview line from start to current position
                if (!this.trackPlacementPreview) {
                    const geometry = new THREE.BufferGeometry();
                    const material = new THREE.LineBasicMaterial({ 
                        color: 0x00ff00, 
                        linewidth: 3 
                    });
                    this.trackPlacementPreview = new THREE.Line(geometry, material);
                    this.scene.add(this.trackPlacementPreview);
                }
                
                // Change color if snapping to connection
                if (isSnapped) {
                    this.trackPlacementPreview.material.color.setHex(0x00ffff); // Cyan when snapping
                } else {
                    this.trackPlacementPreview.material.color.setHex(0x00ff00); // Green normally
                }
                
                // Update preview line (curved or straight)
                let points = [];
                if (this.trackPlacementCurved) {
                    // Generate curved preview points
                    const midPoint = new THREE.Vector3().addVectors(this.trackPlacementStart, snappedPosition).multiplyScalar(0.5);
                    const dir = new THREE.Vector3().subVectors(snappedPosition, this.trackPlacementStart).normalize();
                    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
                    const curveAmount = this.trackPlacementStart.distanceTo(snappedPosition) * 0.3;
                    const controlPoint = midPoint.clone().add(perp.multiplyScalar(curveAmount));
                    controlPoint.y = this.getTerrainHeight(controlPoint.x, controlPoint.z) + 0.1;
                    
                    // Generate bezier curve points
                    for (let i = 0; i <= 20; i++) {
                        const t = i / 20;
                        const point = new THREE.Vector3();
                        point.x = (1 - t) * (1 - t) * this.trackPlacementStart.x + 2 * (1 - t) * t * controlPoint.x + t * t * snappedPosition.x;
                        point.z = (1 - t) * (1 - t) * this.trackPlacementStart.z + 2 * (1 - t) * t * controlPoint.z + t * t * snappedPosition.z;
                        point.y = this.getTerrainHeight(point.x, point.z) + 0.1;
                        points.push(point);
                    }
                } else {
                    // Straight line
                    points = [this.trackPlacementStart, snappedPosition];
                }
                
                // Fix WebGL error by properly updating geometry
                const oldGeometry = this.trackPlacementPreview.geometry;
                const positions = new Float32Array(points.length * 3);
                points.forEach((point, i) => {
                    positions[i * 3] = point.x;
                    positions[i * 3 + 1] = point.y;
                    positions[i * 3 + 2] = point.z;
                });
                
                // Update or create position attribute
                if (oldGeometry.attributes.position) {
                    oldGeometry.attributes.position.array = positions;
                    oldGeometry.attributes.position.needsUpdate = true;
                    oldGeometry.setDrawRange(0, points.length);
                } else {
                    oldGeometry.dispose();
                    this.trackPlacementPreview.geometry = new THREE.BufferGeometry();
                    this.trackPlacementPreview.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                }
            } else {
                // Show preview marker at current position
                if (!this.trackPlacementPreview) {
                    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
                    const material = new THREE.MeshBasicMaterial({ 
                        color: 0x00ff00,
                        transparent: true,
                        opacity: 0.7
                    });
                    this.trackPlacementPreview = new THREE.Mesh(geometry, material);
                    this.scene.add(this.trackPlacementPreview);
                }
                
                // Change color if snapping to connection
                if (isSnapped) {
                    this.trackPlacementPreview.material.color.setHex(0x00ffff); // Cyan when snapping
                } else {
                    this.trackPlacementPreview.material.color.setHex(0x00ff00); // Green normally
                }
                
                this.trackPlacementPreview.position.copy(snappedPosition);
            }
        }
    }
    
    updateTracks() {
        // Remove existing track meshes
        this.trackMeshes.forEach(track => this.scene.remove(track));
        this.trackMeshes = [];
        
        // Remove existing crossings
        this.trackCrossings.forEach(crossing => {
            this.scene.remove(crossing.mesh);
        });
        this.trackCrossings = [];
        
        this.tracks = [];
        
        if (this.placedSnowglobes.length < 2) return;
        
        // Connection threshold - increased for easier connections
        // Snowglobes and tracks can connect from further away
        const connectionDistance = 8.0; // Increased from 5.5 for easier connections
        
        // Find all pairs of snowglobes that are touching/close enough
        const connections = [];
        
        for (let i = 0; i < this.placedSnowglobes.length; i++) {
            const current = this.placedSnowglobes[i];
            
            for (let j = i + 1; j < this.placedSnowglobes.length; j++) {
                const other = this.placedSnowglobes[j];
                
                // Calculate distance between snowglobe centers
                const distance = current.position.distanceTo(other.position);
                
                // Check if they're touching (within connection distance)
                if (distance <= connectionDistance) {
                    connections.push({ from: i, to: j, distance: distance });
                }
            }
        }
        
        // Create tracks for all connections - prefer curves for more realistic tracks
        connections.forEach(conn => {
            const from = this.placedSnowglobes[conn.from];
            const to = this.placedSnowglobes[conn.to];
            
            // Ensure tracks connect at hole positions (centers of snowglobes)
            const startPos = from.holePosition.clone();
            const endPos = to.holePosition.clone();
            const distance = startPos.distanceTo(endPos);
            
            // Use curves for longer distances or randomly for shorter ones
            const useCurve = distance > 6 || (distance > 4 && Math.random() > 0.4);
            
            let track;
            let curved = false;
            let controlPoint = null;
            
            if (useCurve) {
                // Create curved track
                const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
                const dir = new THREE.Vector3().subVectors(endPos, startPos).normalize();
                const perp = new THREE.Vector3(-dir.z, 0, dir.x);
                
                // Vary curve amount based on distance
                const curveAmount = distance * (0.1 + Math.random() * 0.15); // 10-25% of distance
                const curveDirection = Math.random() > 0.5 ? 1 : -1;
                controlPoint = midPoint.clone().add(perp.multiplyScalar(curveAmount * curveDirection));
                controlPoint.y = this.getTerrainHeight(controlPoint.x, controlPoint.z) + 0.1;
                
                track = this.createTrackSegment(startPos, endPos, this.trackWidth, true, controlPoint);
                curved = true;
            } else {
                // Straight track for short distances
                track = this.createTrackSegment(startPos, endPos, this.trackWidth, false, null);
            }
            
            this.tracks.push({
                start: startPos,
                end: endPos,
                radius: Math.min(from.holeRadius, to.holeRadius),
                segment: track,
                fromIndex: conn.from,
                toIndex: conn.to,
                fromSnowglobe: from,
                toSnowglobe: to,
                curved: curved,
                controlPoint: controlPoint
            });
        });
        
        console.log(`Created ${this.tracks.length} track connections`);
        
        // Connect tracks to nearby snowglobes and other tracks
        this.connectTracksToSnowglobes();
        this.connectTracksToTracks();
        
        // Find and create track crossings
        this.findTrackIntersections();
    }
    
    createTrackSegment(start, end, trackWidth = null, curved = false, controlPoint = null) {
        const trackGroup = new THREE.Group();
        
        // Use standard track width if not specified
        if (trackWidth === null) {
            trackWidth = this.trackWidth;
        }
        
        // Calculate track direction and length
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        direction.normalize();
        
        // Generate track path points
        let points = [];
        const segments = Math.max(10, Math.floor(length / 2));
        
        if (curved && controlPoint) {
            // Create curved track using quadratic bezier curve
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                // Quadratic bezier: (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
                const point = new THREE.Vector3();
                point.x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * controlPoint.x + t * t * end.x;
                point.z = (1 - t) * (1 - t) * start.z + 2 * (1 - t) * t * controlPoint.z + t * t * end.z;
                point.y = this.getTerrainHeight(point.x, point.z) + 0.1;
                points.push(point);
            }
        } else {
            // Straight track
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const x = start.x + (end.x - start.x) * t;
                const z = start.z + (end.z - start.z) * t;
                const y = this.getTerrainHeight(x, z) + 0.1;
                points.push(new THREE.Vector3(x, y, z));
            }
        }
        
        // Create ballast (gravel base) for the track
        const ballastWidth = trackWidth + 0.8;
        const ballastHeight = 0.15;
        for (let i = 0; i < segments; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const segmentLength = p1.distanceTo(p2);
            const segmentDir = new THREE.Vector3().subVectors(p2, p1).normalize();
            const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
            
            // Ballast (gravel base)
            const ballastGeometry = new THREE.BoxGeometry(ballastWidth, ballastHeight, segmentLength);
            const ballastMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x5a5a5a, // Dark gray gravel
                roughness: 0.95,
                metalness: 0.0
            });
            const ballast = new THREE.Mesh(ballastGeometry, ballastMaterial);
            ballast.position.copy(midPoint);
            ballast.position.y = this.getTerrainHeight(midPoint.x, midPoint.z) + ballastHeight / 2;
            ballast.lookAt(p2);
            ballast.rotateY(Math.PI / 2);
            ballast.receiveShadow = true;
            trackGroup.add(ballast);
        }
        
        // Create uniform track following the path
        for (let i = 0; i < segments; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const segmentLength = p1.distanceTo(p2);
            const segmentDir = new THREE.Vector3().subVectors(p2, p1).normalize();
            
            // Create more realistic rails with better materials
            const railGeometry = new THREE.BoxGeometry(this.railWidth, this.railHeight, segmentLength);
            const railMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x1a1a1a, // Darker, more realistic rail color
                roughness: 0.15, // More reflective
                metalness: 0.95, // Highly metallic
                envMapIntensity: 1.0
            });
            
            // Left rail - uniform positioning
            const leftRail = new THREE.Mesh(railGeometry, railMaterial);
            const leftOffset = new THREE.Vector3().crossVectors(segmentDir, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(-trackWidth / 2);
            leftRail.position.copy(p1).add(leftOffset).add(new THREE.Vector3(0, ballastHeight + this.railHeight / 2, 0));
            leftRail.lookAt(p2.clone().add(leftOffset));
            leftRail.rotateY(Math.PI / 2);
            leftRail.castShadow = true;
            leftRail.receiveShadow = true;
            trackGroup.add(leftRail);
            
            // Right rail - uniform positioning
            const rightRail = new THREE.Mesh(railGeometry, railMaterial);
            const rightOffset = new THREE.Vector3().crossVectors(segmentDir, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(trackWidth / 2);
            rightRail.position.copy(p1).add(rightOffset).add(new THREE.Vector3(0, ballastHeight + this.railHeight / 2, 0));
            rightRail.lookAt(p2.clone().add(rightOffset));
            rightRail.rotateY(Math.PI / 2);
            rightRail.castShadow = true;
            rightRail.receiveShadow = true;
            trackGroup.add(rightRail);
            
            // Create realistic ties (sleepers) with weathered wood appearance
            const tieCount = Math.floor(segmentLength / this.tieSpacing);
            const tieGeometry = new THREE.BoxGeometry(trackWidth + 0.3, 0.08, 0.15);
            const tieMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x4a3728, // Weathered brown wood
                roughness: 0.9,
                metalness: 0.0
            });
            
            for (let j = 0; j <= tieCount; j++) {
                const tieT = j / tieCount;
                const tiePos = new THREE.Vector3().lerpVectors(p1, p2, tieT);
                tiePos.y = this.getTerrainHeight(tiePos.x, tiePos.z) + ballastHeight + 0.04;
                const tie = new THREE.Mesh(tieGeometry, tieMaterial);
                tie.position.copy(tiePos);
                tie.lookAt(p2);
                tie.rotateY(Math.PI / 2);
                tie.castShadow = true;
                tie.receiveShadow = true;
                trackGroup.add(tie);
            }
        }
        
        this.scene.add(trackGroup);
        this.trackMeshes.push(trackGroup);
        
        return trackGroup;
    }
    
    createTrackCrossing(track1, track2, intersectionPoint) {
        // Create a track crossing at the intersection point
        const crossingGroup = new THREE.Group();
        
        // Create crossing base (wooden planks)
        const baseSize = this.trackWidth * 2.5;
        const baseGeometry = new THREE.BoxGeometry(baseSize, 0.05, baseSize);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B7355,
            roughness: 0.9,
            metalness: 0.0
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.copy(intersectionPoint);
        base.position.y = this.getTerrainHeight(intersectionPoint.x, intersectionPoint.z) + 0.025;
        base.rotation.y = Math.PI / 4; // Rotate 45 degrees for crossing pattern
        base.castShadow = true;
        base.receiveShadow = true;
        crossingGroup.add(base);
        
        // Add crossing rails (perpendicular rails)
        const railLength = baseSize * 0.8;
        const railGeometry = new THREE.BoxGeometry(this.railWidth, this.railHeight, railLength);
        const railMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.2,
            metalness: 0.9
        });
        
        // Horizontal crossing rail
        const railH = new THREE.Mesh(railGeometry, railMaterial);
        railH.position.copy(intersectionPoint);
        railH.position.y += this.railHeight / 2;
        railH.rotation.y = Math.PI / 2;
        railH.castShadow = true;
        crossingGroup.add(railH);
        
        // Vertical crossing rail
        const railV = new THREE.Mesh(railGeometry, railMaterial);
        railV.position.copy(intersectionPoint);
        railV.position.y += this.railHeight / 2;
        railV.rotation.y = 0;
        railV.castShadow = true;
        crossingGroup.add(railV);
        
        this.scene.add(crossingGroup);
        this.trackCrossings.push({
            position: intersectionPoint.clone(),
            mesh: crossingGroup,
            track1: track1,
            track2: track2
        });
        
        return crossingGroup;
    }
    
    findTrackIntersections() {
        // Find all track intersections and create crossings
        const intersections = [];
        const existingCrossings = new Set(); // Track existing crossings to avoid duplicates
        
        for (let i = 0; i < this.tracks.length; i++) {
            for (let j = i + 1; j < this.tracks.length; j++) {
                const track1 = this.tracks[i];
                const track2 = this.tracks[j];
                
                // Check if tracks intersect (2D line intersection)
                const intersection = this.lineIntersection2D(
                    track1.start, track1.end,
                    track2.start, track2.end
                );
                
                if (intersection) {
                    // Check if intersection is within both segments
                    const dist1 = intersection.distanceTo(track1.start) + intersection.distanceTo(track1.end);
                    const dist2 = intersection.distanceTo(track2.start) + intersection.distanceTo(track2.end);
                    
                    if (dist1 <= track1.start.distanceTo(track1.end) * 1.01 &&
                        dist2 <= track2.start.distanceTo(track2.end) * 1.01) {
                        
                        // Check if crossing already exists at this location (within tolerance)
                        const key = `${Math.round(intersection.x * 10)}_${Math.round(intersection.z * 10)}`;
                        if (!existingCrossings.has(key)) {
                            existingCrossings.add(key);
                            intersections.push({
                                point: intersection,
                                track1: track1,
                                track2: track2
                            });
                        }
                    }
                }
            }
        }
        
        // Create crossings for all intersections
        intersections.forEach(intersection => {
            const terrainHeight = this.getTerrainHeight(intersection.point.x, intersection.point.z);
            intersection.point.y = terrainHeight + 0.1;
            this.createTrackCrossing(intersection.track1, intersection.track2, intersection.point);
        });
    }
    
    lineIntersection2D(p1, p2, p3, p4) {
        // Calculate 2D line intersection
        const x1 = p1.x, y1 = p1.z;
        const x2 = p2.x, y2 = p2.z;
        const x3 = p3.x, y3 = p3.z;
        const x4 = p4.x, y4 = p4.z;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return null; // Lines are parallel
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return new THREE.Vector3(
                x1 + t * (x2 - x1),
                0,
                y1 + t * (y2 - y1)
            );
        }
        
        return null;
    }
    
    selectSnowglobeType(index) {
        if (index >= 0 && index < this.snowglobeTypes.length) {
            this.selectedSnowglobeType = index;
            
            // Update UI buttons
            const buttons = document.querySelectorAll('.snowglobe-type-button');
            buttons.forEach((btn, i) => {
                if (i === index) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            });
        }
    }
    
    
    setupPlacementMode() {
        // Enable camera controls for placement
        if (!this.controls) {
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 10;
            this.controls.maxDistance = 100;
        }
        this.controls.enabled = true;
        
        // Show placement UI
        document.getElementById('placement-ui').style.display = 'block';
        document.getElementById('ui').style.display = 'none';
        
        // Reset rotation
        this.placementRotation = 0;
        
        // Create grid overlay
        this.createGrid();
        
        // Hide train
        if (this.train) {
            this.train.visible = false;
        }
    }
    
    createGrid() {
        // Remove existing grid if any
        const existingGrid = this.scene.getObjectByName('placementGrid');
        if (existingGrid) {
            this.scene.remove(existingGrid);
        }
        
        // Create grid overlay
        const gridHelper = new THREE.GridHelper(100, 50, 0x888888, 0x444444);
        gridHelper.name = 'placementGrid';
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }
    
    startDrivingMode() {
        // No minimum requirement - can start with any number of snowglobes or tracks
        this.placementMode = false;
        this.drivingMode = true;
        
        // Remove placement preview and connection preview
        if (this.placementPreview) {
            this.scene.remove(this.placementPreview);
            this.placementPreview = null;
        }
        if (this.connectionPreview) {
            this.scene.remove(this.connectionPreview);
            this.connectionPreview = null;
        }
        
        // Remove grid
        const grid = this.scene.getObjectByName('placementGrid');
        if (grid) {
            this.scene.remove(grid);
        }
        
        // Disable camera controls
        if (this.controls) {
            this.controls.enabled = false;
        }
        
        // Hide placement UI, show driving UI
        document.getElementById('placement-ui').style.display = 'none';
        document.getElementById('ui').style.display = 'block';
        
        // Use placed snowglobes as tunnel
        this.snowglobes = this.placedSnowglobes;
        this.tunnelWalls = this.placedSnowglobes.map(sg => [
            sg.position.x,
            sg.position.y,
            sg.position.z
        ]);
        
        // Calculate tunnel bounds from placed snowglobes (if any)
        if (this.placedSnowglobes.length > 0) {
            this.calculateTunnelBounds();
        }
        
        // Position train at first track or snowglobe, or center if none exist
        if (this.tracks.length > 0) {
            const firstTrack = this.tracks[0];
            const scale = 0.4; // Train scale
            const terrainHeight = this.getTerrainHeight(firstTrack.start.x, firstTrack.start.z);
            this.train.position.set(
                firstTrack.start.x,
                terrainHeight + 0.5 * scale, // On ground/track
                firstTrack.start.z
            );
            // Initialize track position
            this.trainTrackPosition = { trackIndex: 0, t: 0 };
        } else if (this.placedSnowglobes.length > 0) {
            // Position at first snowglobe
            const firstSG = this.placedSnowglobes[0];
            const scale = 0.4;
            const terrainHeight = this.getTerrainHeight(firstSG.position.x, firstSG.position.z);
            this.train.position.set(
                firstSG.position.x,
                terrainHeight + 0.5 * scale,
                firstSG.position.z
            );
            this.trainTrackPosition = { trackIndex: -1, t: 0 };
        } else {
            // No snowglobes or tracks - position at center
            const scale = 0.4;
            const terrainHeight = this.getTerrainHeight(0, 0);
            this.train.position.set(0, terrainHeight + 0.5 * scale, 0);
            this.trainTrackPosition = { trackIndex: -1, t: 0 };
        }
        
        // Show train
        if (this.train) {
            this.train.visible = true;
        }
        
        // Reset camera to follow train
        this.setupCamera();
    }
    
    calculateTunnelBounds() {
        if (this.placedSnowglobes.length === 0) return;
        
        // Calculate average position and radius
        let sumX = 0, sumZ = 0;
        this.placedSnowglobes.forEach(sg => {
            sumX += sg.position.x;
            sumZ += sg.position.z;
        });
        
        const centerX = sumX / this.placedSnowglobes.length;
        const centerZ = sumZ / this.placedSnowglobes.length;
        
        // Find max distance from center
        let maxDist = 0;
        this.placedSnowglobes.forEach(sg => {
            const dist = Math.sqrt(
                Math.pow(sg.position.x - centerX, 2) + 
                Math.pow(sg.position.z - centerZ, 2)
            );
            if (dist > maxDist) maxDist = dist;
        });
        
        this.tunnelRadius = maxDist;
        this.tunnelWidth = maxDist * 0.3; // Approximate width
    }
    
    updatePlacementUI() {
        const count = this.placedSnowglobes.length;
        document.getElementById('snowglobe-count').textContent = `Snowglobes placed: ${count}`;
        
        const startButton = document.getElementById('start-button');
        startButton.disabled = false; // No minimum requirement
        startButton.textContent = 'Start Driving';
    }
    
    setupEnvironment() {
        // Set background color (realistic winter sky gradient)
        // Create gradient background
        const skyColor = new THREE.Color(0x87ceeb); // Sky blue
        this.scene.background = skyColor;
        
        // Add atmospheric fog for depth
        this.scene.fog = new THREE.FogExp2(0xe6f2ff, 0.0003);
        
        // Add sky gradient effect using a large sphere
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x87ceeb) },
                bottomColor: { value: new THREE.Color(0xffffff) },
                offset: { value: 0.2 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h + offset, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        sky.name = 'sky';
        this.scene.add(sky);
    }
    
    setupTrain() {
        const trainGroup = new THREE.Group();
        
        // Make train smaller to fit through holes - scale down significantly
        const scale = 0.4; // Train is now 40% of original size
        
        // Train body (main car) - more detailed, realistic materials
        const bodyGeometry = new THREE.BoxGeometry(1.5 * scale, 1 * scale, 2 * scale);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2a2a3a,
            roughness: 0.7,
            metalness: 0.3,
            envMapIntensity: 0.5
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        trainGroup.add(body);
        
        // Add detail panels to body
        const panelGeometry = new THREE.BoxGeometry(1.4 * scale, 0.1 * scale, 0.05 * scale);
        const panelMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a2a,
            roughness: 0.5,
            metalness: 0.5
        });
        for (let i = 0; i < 3; i++) {
            const panel = new THREE.Mesh(panelGeometry, panelMaterial);
            panel.position.set(0, 0.3 * scale, -0.5 * scale + i * 0.5 * scale);
            trainGroup.add(panel);
        }
        
        // Train engine (front) - more detailed
        const engineGeometry = new THREE.BoxGeometry(1.2 * scale, 0.8 * scale, 1 * scale);
        const engineMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3d1a1a,
            roughness: 0.6,
            metalness: 0.4
        });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.set(0, 0, 1.5 * scale);
        engine.castShadow = true;
        engine.receiveShadow = true;
        trainGroup.add(engine);
        
        // Engine front detail
        const frontGeometry = new THREE.BoxGeometry(1.0 * scale, 0.6 * scale, 0.1 * scale);
        const frontMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a0a0a,
            roughness: 0.4,
            metalness: 0.6
        });
        const front = new THREE.Mesh(frontGeometry, frontMaterial);
        front.position.set(0, 0, 2.05 * scale);
        trainGroup.add(front);
        
        // Wheels - more realistic (cylinders instead of spheres)
        const wheelGeometry = new THREE.CylinderGeometry(0.3 * scale, 0.3 * scale, 0.15 * scale, 16);
        const wheelMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0a0a0a,
            roughness: 0.3,
            metalness: 0.8
        });
        const wheelPositions = [-1.5, -0.5, 0.5, 1.5].map(z => z * scale);
        wheelPositions.forEach(z => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(0, -0.7 * scale, z);
            wheel.castShadow = true;
            trainGroup.add(wheel);
            
            // Add wheel rim detail
            const rimGeometry = new THREE.TorusGeometry(0.25 * scale, 0.03 * scale, 8, 16);
            const rimMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x444444,
                roughness: 0.2,
                metalness: 0.9
            });
            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.rotation.x = Math.PI / 2;
            rim.position.set(0, -0.7 * scale, z);
            trainGroup.add(rim);
        });
        
        // Smoke stack - more detailed
        const stackGeometry = new THREE.CylinderGeometry(0.2 * scale, 0.22 * scale, 0.8 * scale, 16);
        const stackMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            roughness: 0.4,
            metalness: 0.6
        });
        const stack = new THREE.Mesh(stackGeometry, stackMaterial);
        stack.position.set(0, 1.0 * scale, 1.2 * scale);
        stack.castShadow = true;
        trainGroup.add(stack);
        
        // Stack top cap
        const capGeometry = new THREE.CylinderGeometry(0.22 * scale, 0.22 * scale, 0.05 * scale, 16);
        const cap = new THREE.Mesh(capGeometry, stackMaterial);
        cap.position.set(0, 1.4 * scale, 1.2 * scale);
        trainGroup.add(cap);
        
        // Add coupling details
        const couplingGeometry = new THREE.BoxGeometry(0.1 * scale, 0.1 * scale, 0.2 * scale);
        const couplingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.5,
            metalness: 0.7
        });
        const coupling1 = new THREE.Mesh(couplingGeometry, couplingMaterial);
        coupling1.position.set(0, -0.5 * scale, -1.0 * scale);
        trainGroup.add(coupling1);
        const coupling2 = new THREE.Mesh(couplingGeometry, couplingMaterial);
        coupling2.position.set(0, -0.5 * scale, 1.0 * scale);
        trainGroup.add(coupling2);
        
        // Store train size for collision detection
        this.trainSize = {
            width: 2 * scale,
            height: 1.5 * scale,
            length: 2.5 * scale
        };
        
        trainGroup.position.copy(this.trainPosition);
        trainGroup.visible = false; // Hidden in placement mode
        this.scene.add(trainGroup);
        this.train = trainGroup;
    }
    
    
    createSnowglobe(type = null) {
        const snowglobeGroup = new THREE.Group();
        
        // Use provided type or default to first type
        if (!type) {
            if (!this.snowglobeTypes || this.snowglobeTypes.length === 0) {
                console.warn('No snowglobe types available');
                return snowglobeGroup; // Return empty group
            }
            type = this.snowglobeTypes[0];
        }
        
        // Validate type has required properties
        if (!type || !type.holeSize || !type.color) {
            console.warn('Invalid snowglobe type:', type);
            return snowglobeGroup; // Return empty group
        }
        
        // Create a sphere with a hole using CSG-like approach
        // We'll create a torus shape to represent the hole
        const sphereRadius = 0.8;
        const holeRadius = type.holeSize; // Size of hole for train to pass through
        
        // Glass sphere (outer) - realistic glass material
        const glassMaterial = new THREE.MeshStandardMaterial({
            color: type.color,
            transparent: true,
            opacity: 0.15,
            roughness: 0.05,
            metalness: 0.0,
            side: THREE.DoubleSide,
            envMapIntensity: 1.0
        });
        
        // Create glass sphere with higher detail
        const glassGeometry = new THREE.SphereGeometry(sphereRadius, 32, 32);
        const glass = new THREE.Mesh(glassGeometry, glassMaterial);
        glass.castShadow = true;
        glass.receiveShadow = true;
        snowglobeGroup.add(glass);
        
        // Add glass reflection highlights
        const highlightGeometry = new THREE.SphereGeometry(sphereRadius * 0.98, 32, 32);
        const highlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1,
            roughness: 0.0,
            metalness: 0.0,
            side: THREE.BackSide
        });
        const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        snowglobeGroup.add(highlight);
        
        // Create the actual hole (empty space) - represented by a cylinder that we'll subtract visually
        // We'll use a darker material to show the hole opening
        const holeGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, sphereRadius * 2.5, 16);
        const holeMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.5
        });
        const hole = new THREE.Mesh(holeGeometry, holeMaterial);
        hole.rotation.z = Math.PI / 2;
        snowglobeGroup.add(hole);
        
        // Base (cylinder) - more realistic wood/brass material
        const baseGeometry = new THREE.CylinderGeometry(0.3, 0.35, 0.2, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b6f47,
            roughness: 0.8,
            metalness: 0.2
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = -0.4;
        base.castShadow = true;
        base.receiveShadow = true;
        snowglobeGroup.add(base);
        
        // Base rim detail
        const rimGeometry = new THREE.TorusGeometry(0.3, 0.02, 8, 16);
        const rimMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x6b5f37,
            roughness: 0.6,
            metalness: 0.4
        });
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = -0.3;
        snowglobeGroup.add(rim);
        
        // Inner scene (small box) - more detailed
        const sceneGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.3);
        const sceneMaterial = new THREE.MeshStandardMaterial({ 
            color: type.innerColor,
            roughness: 0.7,
            metalness: 0.1
        });
        const scene = new THREE.Mesh(sceneGeometry, sceneMaterial);
        scene.position.y = 0.1;
        scene.castShadow = true;
        snowglobeGroup.add(scene);
        
        // Add sparkle effect (small spheres) - more realistic with glow
        const sparkleCount = type.name === 'Holeyhole' ? 8 : (type.name === 'Eye' ? 6 : 5);
        for (let i = 0; i < sparkleCount; i++) {
            const sparkleGeometry = new THREE.SphereGeometry(0.05, 12, 12);
            const sparkleMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 0.5,
                roughness: 0.0,
                metalness: 0.0
            });
            const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
            const sparkleAngle = (i / sparkleCount) * Math.PI * 2;
            const radius = type.name === 'Holeyhole' ? 0.4 : 0.3;
            sparkle.position.set(
                Math.cos(sparkleAngle) * radius,
                Math.sin(sparkleAngle) * radius,
                (Math.random() - 0.5) * 0.4
            );
            sparkle.castShadow = true;
            snowglobeGroup.add(sparkle);
        }
        
        // Add type-specific visual elements
        if (type.name === 'Eye') {
            // Add an eye-like shape
            const eyeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
            const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
            const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            eye.position.set(0, 0.2, 0);
            snowglobeGroup.add(eye);
        } else if (type.name === 'Ear') {
            // Add ear-like shape (oval)
            const earGeometry = new THREE.SphereGeometry(0.12, 16, 16);
            earGeometry.scale(1, 1.5, 1);
            const earMaterial = new THREE.MeshStandardMaterial({ color: 0xffaaaa });
            const ear = new THREE.Mesh(earGeometry, earMaterial);
            ear.position.set(0, 0.2, 0);
            snowglobeGroup.add(ear);
        } else if (type.name === 'Holeyhole') {
            // Add multiple smaller holes
            for (let i = 0; i < 3; i++) {
                const smallHoleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8);
                const smallHoleMaterial = new THREE.MeshStandardMaterial({
                    color: 0x000000,
                    transparent: true,
                    opacity: 0.4
                });
                const smallHole = new THREE.Mesh(smallHoleGeometry, smallHoleMaterial);
                smallHole.rotation.z = Math.PI / 2;
                smallHole.position.set(
                    Math.cos(i * Math.PI * 2 / 3) * 0.3,
                    Math.sin(i * Math.PI * 2 / 3) * 0.3,
                    0
                );
                snowglobeGroup.add(smallHole);
            }
        }
        
        return snowglobeGroup;
    }
    
    setupTerrain() {
        // Create realistic terrain with height variation
        this.createRealisticTerrain();
        
        // Add rocks and boulders
        this.addRocks();
        
        // Add grass patches
        this.addGrass();
        
        // Add more trees for atmosphere
        for (let i = 0; i < 50; i++) {
            const tree = this.createTree();
            const angle = Math.random() * Math.PI * 2;
            const radius = 20 + Math.random() * 60;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = this.getTerrainHeight(x, z);
            tree.position.set(x, y, z);
            tree.rotation.y = Math.random() * Math.PI * 2;
            // Vary tree size
            const scale = 0.8 + Math.random() * 0.4;
            tree.scale.set(scale, scale, scale);
            this.scene.add(tree);
        }
        
        // Add snow patches
        this.addSnowPatches();
        
        // Add streams/rivers in valleys
        this.addStreams();
        
        // Add more detail objects
        this.addDetailObjects();
    }
    
    addStreams() {
        // Add streams/rivers in valleys (lower areas)
        for (let i = 0; i < 3; i++) {
            const stream = this.createStream();
            // Create a winding path through valleys
            const startAngle = Math.random() * Math.PI * 2;
            const startRadius = 30 + Math.random() * 40;
            const startX = Math.cos(startAngle) * startRadius;
            const startZ = Math.sin(startAngle) * startRadius;
            
            // Create stream path
            const points = [];
            let currentX = startX;
            let currentZ = startZ;
            
            for (let j = 0; j < 20; j++) {
                const height = this.getTerrainHeight(currentX, currentZ);
                if (height < 2) { // Only in valleys
                    points.push(new THREE.Vector3(currentX, height - 0.2, currentZ));
                    // Move along valley
                    const angle = Math.random() * Math.PI * 2;
                    currentX += Math.cos(angle) * 3;
                    currentZ += Math.sin(angle) * 3;
                } else {
                    break;
                }
            }
            
            if (points.length > 1) {
                // Create stream geometry
                for (let j = 0; j < points.length - 1; j++) {
                    const p1 = points[j];
                    const p2 = points[j + 1];
                    const streamSegment = this.createStreamSegment(p1, p2);
                    this.scene.add(streamSegment);
                }
            }
        }
    }
    
    createStream() {
        // Stream is created as segments in addStreams
        return null;
    }
    
    createStreamSegment(start, end) {
        const length = start.distanceTo(end);
        const streamGeometry = new THREE.PlaneGeometry(1.5, length, 1, Math.max(2, Math.floor(length / 2)));
        const streamMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a90e2, // Water blue
            transparent: true,
            opacity: 0.7,
            roughness: 0.0,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const stream = new THREE.Mesh(streamGeometry, streamMaterial);
        stream.position.copy(start.clone().add(end).multiplyScalar(0.5));
        stream.lookAt(end);
        stream.rotateX(-Math.PI / 2);
        stream.receiveShadow = true;
        stream.castShadow = false;
        stream.name = 'stream';
        return stream;
    }
    
    addDetailObjects() {
        // Add small detail objects like bushes, fallen logs, etc.
        for (let i = 0; i < 40; i++) {
            const detail = this.createDetailObject();
            const angle = Math.random() * Math.PI * 2;
            const radius = 25 + Math.random() * 60;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const height = this.getTerrainHeight(x, z);
            
            if (height < 3) { // In lower areas
                detail.position.set(x, height, z);
                detail.rotation.y = Math.random() * Math.PI * 2;
                const scale = 0.5 + Math.random() * 0.8;
                detail.scale.set(scale, scale, scale);
                this.scene.add(detail);
            }
        }
    }
    
    createDetailObject() {
        const detailGroup = new THREE.Group();
        detailGroup.name = 'detail';
        
        // Randomly create either a bush or a log
        if (Math.random() > 0.5) {
            // Bush
            const bushGeometry = new THREE.SphereGeometry(0.4, 8, 8);
            const seasonColor = this.seasonColors[this.currentSeason];
            const bushMaterial = new THREE.MeshStandardMaterial({
                color: seasonColor.tree,
                roughness: 0.9
            });
            const bush = new THREE.Mesh(bushGeometry, bushMaterial);
            bush.scale.set(1, 0.6, 1);
            detailGroup.add(bush);
        } else {
            // Fallen log
            const logGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
            const logMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a3728,
                roughness: 0.9
            });
            const log = new THREE.Mesh(logGeometry, logMaterial);
            log.rotation.z = Math.PI / 2;
            detailGroup.add(log);
        }
        
        return detailGroup;
    }
    
    // Improved noise function for realistic terrain
    noise(x, z) {
        // Simple 2D noise using multiple sine waves
        const n1 = Math.sin(x * 0.1) * Math.cos(z * 0.1);
        const n2 = Math.sin(x * 0.2) * Math.cos(z * 0.2) * 0.5;
        const n3 = Math.sin(x * 0.4) * Math.cos(z * 0.4) * 0.25;
        return (n1 + n2 + n3) / 1.75;
    }
    
    // Fractal noise with multiple octaves
    fractalNoise(x, z, octaves = 4) {
        let value = 0;
        let amplitude = 1;
        let frequency = 0.02;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            value += this.noise(x * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }
        
        return value / maxValue;
    }
    
    createRealisticTerrain() {
        const size = 200;
        const segments = 128; // Higher resolution for more detail
        
        // Create terrain geometry
        const terrainGeometry = new THREE.PlaneGeometry(size, size, segments, segments);
        
        // Generate height map using improved noise or height map image
        const vertices = terrainGeometry.attributes.position;
        const vertexCount = vertices.count;
        
        // Store height data for texture mapping
        const heightData = new Float32Array(vertexCount);
        
        for (let i = 0; i < vertexCount; i++) {
            const x = vertices.getX(i);
            const z = vertices.getZ(i);
            
            let height;
            
            // Use height map if available
            if (this.useHeightMap) {
                const mapHeight = this.getHeightFromMap(x, z);
                if (mapHeight !== null) {
                    height = mapHeight;
                } else {
                    // Fallback to procedural if height map lookup fails
                    height = this.generateProceduralHeight(x, z);
                }
            } else {
                // Use procedural generation
                height = this.generateProceduralHeight(x, z);
            }
            
            heightData[i] = height;
            vertices.setY(i, height);
        }
        
        // Recalculate normals for proper lighting
        terrainGeometry.computeVertexNormals();
        
        // Create realistic terrain material with height-based coloring
        const terrainMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0f8ff, // Base snow color
            roughness: 0.95,
            metalness: 0.0,
            flatShading: false,
            vertexColors: true
        });
        
        // Add vertex colors based on height for more realism
        const colors = [];
        const color = new THREE.Color();
        for (let i = 0; i < vertexCount; i++) {
            const height = heightData[i];
            
            // Color based on height: lower = darker (dirt/rock), higher = lighter (snow)
            if (height < -2) {
                color.setRGB(0.4, 0.35, 0.3); // Dark brown/dirt
            } else if (height < 0) {
                color.setRGB(0.6, 0.55, 0.5); // Brown
            } else if (height < 2) {
                color.setRGB(0.85, 0.82, 0.78); // Light brown/gravel
            } else if (height < 5) {
                color.setRGB(0.95, 0.95, 0.98); // Light snow
            } else {
                color.setRGB(1.0, 1.0, 1.0); // Pure white snow
            }
            
            colors.push(color.r, color.g, color.b);
        }
        
        terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        terrainMaterial.vertexColors = true;
        
        const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        terrain.castShadow = false;
        terrain.name = 'terrain';
        this.scene.add(terrain);
        
        this.terrain = terrain;
        this.terrainHeightData = heightData; // Store for quick lookup
    }
    
    generateProceduralHeight(x, z) {
        // Use the same noise function as terrain generation for consistency
        let height = this.fractalNoise(x, z, 5) * 8;
        
        // Add large-scale features
        height += this.fractalNoise(x * 0.3, z * 0.3, 3) * 4;
        
        // Add medium-scale features
        height += this.fractalNoise(x * 0.8, z * 0.8, 2) * 2;
        
        // Add small-scale detail
        height += this.fractalNoise(x * 2, z * 2, 2) * 0.5;
        
        // Create valleys
        const valleyNoise = this.fractalNoise(x * 0.15, z * 0.15, 2);
        if (valleyNoise < -0.3) {
            height -= Math.abs(valleyNoise) * 3;
        }
        
        // Add mountain peaks
        const distFromCenter = Math.sqrt(x * x + z * z);
        if (distFromCenter > 40 && distFromCenter < 80) {
            const peakNoise = this.fractalNoise(x * 0.1, z * 0.1, 1);
            if (peakNoise > 0.5) {
                height += peakNoise * 6;
            }
        }
        
        // Smooth edges
        const edgeDist = Math.max(Math.abs(x), Math.abs(z));
        if (edgeDist > 80) {
            const edgeFactor = (edgeDist - 80) / 20;
            height -= edgeFactor * 3;
        }
        
        return height;
    }
    
    getTerrainHeight(x, z) {
        // Use height map if available
        if (this.useHeightMap) {
            const mapHeight = this.getHeightFromMap(x, z);
            if (mapHeight !== null) {
                return mapHeight;
            }
        }
        
        // Fallback to procedural generation
        return this.generateProceduralHeight(x, z);
    }
    
    addRocks() {
        // Add rocks and boulders scattered around, more in valleys and on slopes
        for (let i = 0; i < 60; i++) {
            const rock = this.createRock();
            const angle = Math.random() * Math.PI * 2;
            const radius = 25 + Math.random() * 70;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = this.getTerrainHeight(x, z);
            
            // Prefer placing rocks in lower areas (valleys)
            const height = this.getTerrainHeight(x, z);
            if (height < 1 && Math.random() > 0.3) {
                rock.position.set(x, y, z);
                rock.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                const scale = 0.3 + Math.random() * 0.8;
                rock.scale.set(scale, scale, scale);
                this.scene.add(rock);
            }
        }
    }
    
    createRock() {
        const rockGroup = new THREE.Group();
        rockGroup.name = 'rock';
        
        // Create irregular rock shape using multiple dodecahedrons
        const rockColors = [0x5a5a5a, 0x4a4a4a, 0x6a6a6a, 0x555555];
        for (let i = 0; i < 3; i++) {
            const rockGeometry = new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.3, 0);
            const rockMaterial = new THREE.MeshStandardMaterial({
                color: rockColors[Math.floor(Math.random() * rockColors.length)],
                roughness: 0.9,
                metalness: 0.05
            });
            const rockPiece = new THREE.Mesh(rockGeometry, rockMaterial);
            rockPiece.position.set(
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 0.8
            );
            rockPiece.castShadow = true;
            rockPiece.receiveShadow = true;
            rockGroup.add(rockPiece);
        }
        
        return rockGroup;
    }
    
    addGrass() {
        // Add grass patches, more in lower areas and less on snow
        for (let i = 0; i < 150; i++) {
            const grass = this.createGrassPatch();
            const angle = Math.random() * Math.PI * 2;
            const radius = 20 + Math.random() * 70;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const height = this.getTerrainHeight(x, z);
            
            // Prefer grass in lower areas (not on high snow)
            if (height < 3) {
                grass.position.set(x, height, z);
                grass.rotation.y = Math.random() * Math.PI * 2;
                const scale = 0.2 + Math.random() * 0.5;
                grass.scale.set(scale, scale, scale);
                this.scene.add(grass);
            }
        }
    }
    
    createGrassPatch() {
        const grassGroup = new THREE.Group();
        grassGroup.name = 'grass';
        
        // Use current season color for grass
        const seasonColor = this.seasonColors[this.currentSeason];
        const baseGrassColor = seasonColor.grass;
        
        // Create seasonal grass color variations - more vibrant
        let grassColors;
        if (this.currentSeason === 'spring') {
            grassColors = [0x7cb342, 0x8bc34a, 0x9ccc65, 0xaed581]; // Bright spring greens
        } else if (this.currentSeason === 'summer') {
            grassColors = [0x66bb6a, 0x4caf50, 0x66bb6a, 0x81c784]; // Rich summer greens
        } else if (this.currentSeason === 'fall') {
            grassColors = [0xb8860b, 0xd4af37, 0xdaa520, 0xf4a460]; // Golden autumn colors
        } else { // winter
            grassColors = [0x90a4ae, 0xa0b4c0, 0xb0c4d0, 0xc0d4e0]; // Cool winter grays
        }
        
        for (let i = 0; i < 5; i++) {
            const grassGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
            const grassMaterial = new THREE.MeshStandardMaterial({
                color: grassColors[Math.floor(Math.random() * grassColors.length)],
                roughness: 0.95,
                metalness: 0.0
            });
            const blade = new THREE.Mesh(grassGeometry, grassMaterial);
            blade.name = 'grassBlade';
            blade.position.set(
                (Math.random() - 0.5) * 0.2,
                0.15,
                (Math.random() - 0.5) * 0.2
            );
            blade.rotation.z = (Math.random() - 0.5) * 0.3;
            blade.castShadow = true;
            blade.receiveShadow = true;
            grassGroup.add(blade);
        }
        
        return grassGroup;
    }
    
    addSnowPatches() {
        // Add snow patches, more on higher elevations
        for (let i = 0; i < 40; i++) {
            const snowPatch = this.createSnowPatch();
            const angle = Math.random() * Math.PI * 2;
            const radius = 25 + Math.random() * 70;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const height = this.getTerrainHeight(x, z);
            
            // Prefer snow on higher elevations
            if (height > 2) {
                snowPatch.position.set(x, height + 0.05, z);
                snowPatch.rotation.x = -Math.PI / 2;
                const scale = 1.5 + Math.random() * 4;
                snowPatch.scale.set(scale, scale, 1);
                this.scene.add(snowPatch);
            }
        }
    }
    
    createSnowPatch() {
        const patchGeometry = new THREE.CircleGeometry(1, 16);
        const patchMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.95,
            metalness: 0.0,
            transparent: true,
            opacity: 0.9
        });
        const patch = new THREE.Mesh(patchGeometry, patchMaterial);
        patch.name = 'snowPatch';
        patch.receiveShadow = true;
        patch.castShadow = false;
        return patch;
    }
    
    createTree() {
        const treeGroup = new THREE.Group();
        treeGroup.name = 'tree';
        
        // Trunk - more realistic with slight taper
        const trunkGeometry = new THREE.CylinderGeometry(0.25, 0.3, 2.5, 12);
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a2a18,
            roughness: 0.95,
            metalness: 0.0
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        treeGroup.add(trunk);
        
        // Foliage - multiple layers for more realism with better materials
        // Use current season color for foliage
        const seasonColor = this.seasonColors[this.currentSeason];
        const baseTreeColor = seasonColor.tree;
        
        // Create seasonal foliage colors based on season - more vibrant
        let foliageColors;
        if (this.currentSeason === 'spring') {
            foliageColors = [0x4caf50, 0x66bb6a, 0x81c784, 0x7cb342]; // Fresh spring greens
        } else if (this.currentSeason === 'summer') {
            foliageColors = [0x2e7d32, 0x388e3c, 0x43a047, 0x4caf50]; // Deep summer greens
        } else if (this.currentSeason === 'fall') {
            foliageColors = [0xff6f00, 0xff8f00, 0xffa726, 0xffb74d]; // Vibrant autumn oranges
        } else { // winter
            foliageColors = [0x546e7a, 0x607d8b, 0x78909c, 0x90a4ae]; // Cool winter grays
        }
        
        for (let i = 0; i < 3; i++) {
            const foliageGeometry = new THREE.ConeGeometry(
                1.2 - i * 0.2,
                1.5 - i * 0.3,
                12
            );
            const foliageMaterial = new THREE.MeshStandardMaterial({ 
                color: foliageColors[i % foliageColors.length],
                roughness: 0.95,
                metalness: 0.0
            });
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.name = 'foliage';
            foliage.position.y = 2.0 + i * 0.8;
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            treeGroup.add(foliage);
        }
        
        return treeGroup;
    }
    
    setupLighting() {
        // Ambient light - very subtle
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
        this.scene.add(ambientLight);
        
        // Main directional light (sun) - warm, realistic angle
        const sunColor = 0xfff4e6; // Warm sunlight
        const directionalLight = new THREE.DirectionalLight(sunColor, 1.2);
        directionalLight.position.set(15, 25, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 4096; // Higher resolution shadows
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        directionalLight.shadow.bias = -0.0001;
        directionalLight.shadow.normalBias = 0.02; // Reduce shadow acne
        directionalLight.shadow.radius = 8; // Soft shadow edges
        this.scene.add(directionalLight);
        this.sunLight = directionalLight;
        
        // Secondary fill light (cooler, from opposite side)
        const fillColor = 0x8bb3ff; // Cool blue fill
        const fillLight = new THREE.DirectionalLight(fillColor, 0.4);
        fillLight.position.set(-15, 12, -10);
        fillLight.castShadow = false;
        this.scene.add(fillLight);
        
        // Hemisphere light for natural sky/ground lighting
        const skyColor = 0x87ceeb; // Sky blue
        const groundColor = 0x8b7355; // Ground brown
        const hemisphereLight = new THREE.HemisphereLight(skyColor, groundColor, 0.5);
        hemisphereLight.position.set(0, 30, 0);
        this.scene.add(hemisphereLight);
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        if (this.placementMode) {
            // Good position for placing snowglobes
            this.camera.position.set(0, 20, 30);
            this.camera.lookAt(0, 0, 0);
        } else {
            this.camera.position.set(0, 8, -15);
            if (this.train) {
                this.camera.lookAt(this.train.position);
            }
        }
    }
    
    async loadUSDAFiles() {
        console.log('Scanning for USDA files in usda/ folder...');
        
        let fileList = [];
        
        // Method 1: Try to get directory listing (works with Python http.server and similar)
        try {
            const response = await fetch('usda/');
            if (response.ok) {
                const html = await response.text();
                // Parse HTML directory listing for .usda files
                // Python http.server creates links like <a href="filename.usda">filename.usda</a>
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Try multiple selectors for different server formats
                let links = doc.querySelectorAll('a[href$=".usda"]');
                if (links.length === 0) {
                    // Try alternative format
                    links = doc.querySelectorAll('a');
                    links = Array.from(links).filter(link => {
                        const href = link.getAttribute('href') || '';
                        return href.endsWith('.usda') && !href.includes('..');
                    });
                }
                
                fileList = Array.from(links).map(link => {
                    let href = link.getAttribute('href') || link.textContent.trim();
                    // Remove directory prefix if present
                    href = href.replace(/^usda\//, '').replace(/^\//, '');
                    return href;
                }).filter(file => file && file.endsWith('.usda'));
                
                // Remove duplicates
                fileList = [...new Set(fileList)];
                
                if (fileList.length > 0) {
                    console.log('Found files from directory listing:', fileList);
                }
            }
        } catch (e) {
            console.log('Directory listing not available:', e.message);
        }
        
        // Method 2: If directory listing didn't work, try known files
        if (fileList.length === 0) {
            console.log('Trying to detect known USDA files...');
            const knownFiles = [
                'ear_snowglobe.usda',
                'eye_snowglobe.usda', 
                'holeyhole_snowglobe.usda'
            ];
            
            const fileChecks = knownFiles.map(async (file) => {
                try {
                    const response = await fetch(`usda/${file}`, { method: 'HEAD' });
                    if (response.ok) {
                        return file;
                    }
                } catch (e) {
                    // File doesn't exist
                }
                return null;
            });
            
            const results = await Promise.all(fileChecks);
            fileList = results.filter(file => file !== null);
        }
        
        this.usdaFiles = fileList;
        console.log(`Detected ${this.usdaFiles.length} USDA file(s):`, this.usdaFiles);
        
        if (this.usdaFiles.length === 0) {
            console.warn('No USDA files found in usda/ folder.');
            console.warn('Make sure you are running a web server (e.g., python -m http.server)');
            console.warn('and that .usda files are in the usda/ folder.');
        }
        
        // Generate snowglobe types from detected files
        this.generateSnowglobeTypes();
    }
    
    generateSnowglobeTypes() {
        // Color palette for different types
        const colorPalettes = [
            { color: 0xe6f2ff, innerColor: 0x4d7fb3 }, // Blue
            { color: 0xffe6f2, innerColor: 0xff4d7f }, // Pink
            { color: 0xf2ffe6, innerColor: 0x7fff4d }, // Green
            { color: 0xfff2e6, innerColor: 0xff994d }, // Orange
            { color: 0xe6f2ff, innerColor: 0x4d99ff }, // Light Blue
            { color: 0xf2e6ff, innerColor: 0x994dff }, // Purple
            { color: 0xfff2e6, innerColor: 0xffcc4d }, // Yellow
            { color: 0xe6fff2, innerColor: 0x4dff99 }  // Mint
        ];
        
        // Hole sizes (vary by type)
        const holeSizes = [0.3, 0.35, 0.4, 0.32, 0.38, 0.33, 0.36, 0.34];
        
        this.snowglobeTypes = this.usdaFiles.map((file, index) => {
            // Extract name from filename (remove _snowglobe.usda or .usda)
            let name = file.replace('_snowglobe.usda', '').replace('.usda', '');
            // Capitalize first letter
            name = name.charAt(0).toUpperCase() + name.slice(1);
            
            const palette = colorPalettes[index % colorPalettes.length];
            const holeSize = holeSizes[index % holeSizes.length];
            
            return {
                name: name,
                file: `usda/${file}`,
                color: palette.color,
                innerColor: palette.innerColor,
                holeSize: holeSize
            };
        });
        
        console.log(`Loaded ${this.snowglobeTypes.length} snowglobe types:`, this.snowglobeTypes.map(t => t.name));
    }
    
    setupUI() {
        // UI is already in HTML, just need to update it
        const startButton = document.getElementById('start-button');
        startButton.addEventListener('click', () => this.startDrivingMode());
        
        // Dynamically create snowglobe type selector buttons (async)
        this.createSnowglobeTypeButtons().catch(err => {
            console.error('Error creating snowglobe type buttons:', err);
        });
        
        // Setup height map input
        const heightMapInput = document.getElementById('heightmap-file');
        const heightMapButton = document.getElementById('heightmap-button');
        
        heightMapButton.addEventListener('click', () => {
            heightMapInput.click();
        });
        
        heightMapInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadHeightMap(file);
            }
        });
        
        // Setup track map save/load
        const saveTrackMapButton = document.getElementById('save-trackmap-button');
        const loadTrackMapButton = document.getElementById('load-trackmap-button');
        const trackMapFileInput = document.getElementById('trackmap-file');
        
        saveTrackMapButton.addEventListener('click', () => {
            this.saveTrackMap();
        });
        
        loadTrackMapButton.addEventListener('click', () => {
            trackMapFileInput.click();
        });
        
        trackMapFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadTrackMap(file);
            }
        });
        
        // Setup circuit mode
        const circuitModeButton = document.getElementById('circuit-mode-button');
        circuitModeButton.addEventListener('click', () => {
            this.circuitMode = !this.circuitMode;
            circuitModeButton.textContent = `Circuit Mode: ${this.circuitMode ? 'On' : 'Off'}`;
            document.getElementById('circuit-tools').style.display = this.circuitMode ? 'block' : 'none';
        });
        
        document.getElementById('add-switch-button').addEventListener('click', () => {
            this.addTrackSwitch();
        });
        document.getElementById('add-signal-button').addEventListener('click', () => {
            this.addTrackSignal();
        });
        document.getElementById('add-gate-button').addEventListener('click', () => {
            this.addLogicGate();
        });
        
        // Setup terrain editing
        const terrainEditButton = document.getElementById('terrain-edit-button');
        terrainEditButton.addEventListener('click', () => {
            this.terrainEditMode = !this.terrainEditMode;
            terrainEditButton.textContent = `Terrain Edit: ${this.terrainEditMode ? 'On' : 'Off'}`;
            document.getElementById('terrain-tools').style.display = this.terrainEditMode ? 'block' : 'none';
        });
        
        document.getElementById('terrain-tool-select').addEventListener('change', (e) => {
            this.terrainEditType = e.target.value;
        });
        document.getElementById('brush-size').addEventListener('input', (e) => {
            this.terrainBrushSize = parseFloat(e.target.value);
        });
        document.getElementById('brush-strength').addEventListener('input', (e) => {
            this.terrainBrushStrength = parseFloat(e.target.value);
        });
        
        // Setup season selector
        document.getElementById('season-select').addEventListener('change', (e) => {
            this.changeSeason(e.target.value);
        });
        
        // Setup tab switching
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                
                // Remove active class from all tabs and buttons
                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab
                button.classList.add('active');
                document.getElementById(`tab-content-${tabName}`).classList.add('active');
            });
        });
        
        // Setup track type buttons (will be set up after DOM is ready)
        setTimeout(() => {
            const trackTypeButtons = document.querySelectorAll('.track-type-button');
            trackTypeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const trackType = button.getAttribute('data-track-type');
                    
                    // Remove selected class from all buttons
                    trackTypeButtons.forEach(btn => btn.classList.remove('selected'));
                    
                    // Add selected class to clicked button
                    button.classList.add('selected');
                    
                    // Update track placement mode
                    this.trackPlacementCurved = (trackType === 'curved');
                    const curvedToggle = document.getElementById('curved-track-toggle');
                    if (curvedToggle) {
                        curvedToggle.checked = this.trackPlacementCurved;
                    }
                    
                    // Update banner to show track type
                    if (trackType === 'curved') {
                        this.showBanner('🔄 Curved Track Selected');
                    } else {
                        this.showBanner('📏 Straight Track Selected');
                    }
                    setTimeout(() => this.hideBanner(), 1500);
                });
            });
            
            // Set default track type
            if (trackTypeButtons.length > 0) {
                trackTypeButtons[0].classList.add('selected');
            }
        }, 100);
        
        // Setup placement mode selector
        const cursorModeButton = document.getElementById('cursor-mode-button');
        const snowglobeModeButton = document.getElementById('snowglobe-mode-button');
        const trackModeButton = document.getElementById('track-mode-button');
        
        cursorModeButton.addEventListener('click', () => {
            this.currentTool = 'cursor';
            this.cursorMode = true;
            this.trackPlacementMode = false;
            cursorModeButton.classList.add('active');
            snowglobeModeButton.classList.remove('active');
            trackModeButton.classList.remove('active');
            // Remove all previews
            if (this.trackPlacementPreview) {
                this.scene.remove(this.trackPlacementPreview);
                this.trackPlacementPreview = null;
            }
            if (this.placementPreview) {
                this.scene.remove(this.placementPreview);
                this.placementPreview = null;
            }
            this.trackPlacementStart = null;
        });
        
        snowglobeModeButton.addEventListener('click', () => {
            this.currentTool = 'snowglobe';
            this.cursorMode = false;
            this.trackPlacementMode = false;
            snowglobeModeButton.classList.add('active');
            cursorModeButton.classList.remove('active');
            trackModeButton.classList.remove('active');
            // Switch to snowglobes tab
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.querySelector('.tab-button[data-tab="snowglobes"]').classList.add('active');
            document.getElementById('tab-content-snowglobes').classList.add('active');
            // Remove track preview if exists
            if (this.trackPlacementPreview) {
                this.scene.remove(this.trackPlacementPreview);
                this.trackPlacementPreview = null;
            }
            this.trackPlacementStart = null;
        });
        
        trackModeButton.addEventListener('click', () => {
            this.currentTool = 'track';
            this.cursorMode = false;
            this.trackPlacementMode = true;
            trackModeButton.classList.add('active');
            cursorModeButton.classList.remove('active');
            snowglobeModeButton.classList.remove('active');
            // Show track options
            document.getElementById('track-options').style.display = 'block';
            // Switch to tracks tab
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.querySelector('.tab-button[data-tab="tracks"]').classList.add('active');
            document.getElementById('tab-content-tracks').classList.add('active');
            // Remove snowglobe preview if exists
            if (this.placementPreview) {
                this.scene.remove(this.placementPreview);
                this.placementPreview = null;
            }
        });
        
        // Setup curved track toggle
        document.getElementById('curved-track-toggle').addEventListener('change', (e) => {
            this.trackPlacementCurved = e.target.checked;
        });
        
        // Hide track options when not in track mode
        cursorModeButton.addEventListener('click', () => {
            document.getElementById('track-options').style.display = 'none';
        });
        snowglobeModeButton.addEventListener('click', () => {
            document.getElementById('track-options').style.display = 'none';
        });
        
        this.updatePlacementUI();
    }
    
    async loadHeightMap(file) {
        const statusDiv = document.getElementById('heightmap-status');
        statusDiv.textContent = 'Loading height map...';
        
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Create canvas to read pixel data
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    // Get image data
                    const imageData = ctx.getImageData(0, 0, img.width, img.height);
                    this.heightMapData = imageData.data;
                    this.heightMapSize = img.width; // Assume square
                    this.useHeightMap = true;
                    
                    statusDiv.textContent = `Height map loaded: ${img.width}x${img.height}`;
                    statusDiv.style.color = '#4CAF50';
                    
                    // Regenerate terrain with height map
                    this.regenerateTerrain();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } catch (error) {
            statusDiv.textContent = 'Error loading height map';
            statusDiv.style.color = '#ff0000';
            console.error('Error loading height map:', error);
        }
    }
    
    regenerateTerrain() {
        // Remove old terrain
        if (this.terrain) {
            this.scene.remove(this.terrain);
            this.terrain.geometry.dispose();
            this.terrain.material.dispose();
        }
        
        // Remove old objects
        const objectsToRemove = [];
        this.scene.traverse((child) => {
            if (child.name === 'tree' || child.name === 'rock' || child.name === 'grass' || 
                child.name === 'snowPatch' || child.name === 'stream' || child.name === 'detail') {
                objectsToRemove.push(child);
            }
        });
        objectsToRemove.forEach(obj => this.scene.remove(obj));
        
        // Regenerate terrain
        this.createRealisticTerrain();
        
        // Regenerate objects
        this.addRocks();
        this.addGrass();
        this.addSnowPatches();
        this.addStreams();
        this.addDetailObjects();
        
        // Regenerate trees
        for (let i = 0; i < 50; i++) {
            const tree = this.createTree();
            const angle = Math.random() * Math.PI * 2;
            const radius = 20 + Math.random() * 60;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = this.getTerrainHeight(x, z);
            tree.position.set(x, y, z);
            tree.rotation.y = Math.random() * Math.PI * 2;
            const scale = 0.8 + Math.random() * 0.4;
            tree.scale.set(scale, scale, scale);
            tree.name = 'tree';
            this.scene.add(tree);
        }
    }
    
    saveTrackMap() {
        const statusDiv = document.getElementById('trackmap-status');
        
        try {
            // Serialize snowglobes (without THREE.js objects)
            const snowglobesData = this.placedSnowglobes.map(sg => ({
                position: {
                    x: sg.position.x,
                    y: sg.position.y,
                    z: sg.position.z
                },
                holePosition: {
                    x: sg.holePosition.x,
                    y: sg.holePosition.y,
                    z: sg.holePosition.z
                },
                rotation: sg.rotation,
                holeRadius: sg.holeRadius,
                snowglobeRadius: sg.snowglobeRadius,
                type: sg.type
            }));
            
            // Serialize tracks (without THREE.js objects)
            const tracksData = this.tracks.map(track => ({
                start: {
                    x: track.start.x,
                    y: track.start.y,
                    z: track.start.z
                },
                end: {
                    x: track.end.x,
                    y: track.end.y,
                    z: track.end.z
                },
                radius: track.radius,
                fromIndex: track.fromIndex,
                toIndex: track.toIndex
            }));
            
            // Create save data object
            const saveData = {
                version: '1.0',
                snowglobes: snowglobesData,
                tracks: tracksData,
                timestamp: new Date().toISOString()
            };
            
            // Convert to JSON
            const json = JSON.stringify(saveData, null, 2);
            
            // Create download link
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `trackmap_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            statusDiv.textContent = `Saved ${snowglobesData.length} snowglobes and ${tracksData.length} tracks`;
            statusDiv.style.color = '#4CAF50';
            
            // Clear status after 3 seconds
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 3000);
        } catch (error) {
            statusDiv.textContent = 'Error saving track map';
            statusDiv.style.color = '#ff0000';
            console.error('Error saving track map:', error);
        }
    }
    
    async loadTrackMap(file) {
        const statusDiv = document.getElementById('trackmap-status');
        statusDiv.textContent = 'Loading track map...';
        statusDiv.style.color = '#aaa';
        
        try {
            const text = await file.text();
            const saveData = JSON.parse(text);
            
            // Validate data structure
            if (!saveData.snowglobes || !Array.isArray(saveData.snowglobes)) {
                throw new Error('Invalid track map format: missing snowglobes array');
            }
            
            // Clear existing snowglobes and tracks
            this.placedSnowglobes.forEach(sg => {
                this.scene.remove(sg.mesh);
            });
            this.placedSnowglobes = [];
            this.trackMeshes.forEach(track => this.scene.remove(track));
            this.trackMeshes = [];
            this.tracks = [];
            
            // Recreate snowglobes
            for (const sgData of saveData.snowglobes) {
                // Validate type index
                if (sgData.type < 0 || sgData.type >= this.snowglobeTypes.length) {
                    console.warn(`Invalid snowglobe type ${sgData.type}, using type 0`);
                    sgData.type = 0;
                }
                
                const type = this.snowglobeTypes[sgData.type];
                const snowglobe = this.createSnowglobe(type);
                
                // Calculate scale from saved snowglobeRadius
                const scale = sgData.snowglobeRadius / 0.8;
                snowglobe.scale.set(scale, scale, scale);
                
                // Restore position
                snowglobe.position.set(sgData.position.x, sgData.position.y, sgData.position.z);
                
                // Restore rotation
                snowglobe.rotation.y = sgData.rotation * (Math.PI / 180);
                
                this.scene.add(snowglobe);
                
                // Recreate snowglobe data
                const snowglobeData = {
                    mesh: snowglobe,
                    position: new THREE.Vector3(sgData.position.x, sgData.position.y, sgData.position.z),
                    holePosition: new THREE.Vector3(sgData.holePosition.x, sgData.holePosition.y, sgData.holePosition.z),
                    rotation: sgData.rotation,
                    spin: 0,
                    holeRadius: sgData.holeRadius,
                    snowglobeRadius: sgData.snowglobeRadius,
                    type: sgData.type
                };
                this.placedSnowglobes.push(snowglobeData);
            }
            
            // Recreate tracks
            this.updateTracks();
            
            // Update UI
            this.updatePlacementUI();
            this.updatePlacementPreview();
            
            statusDiv.textContent = `Loaded ${saveData.snowglobes.length} snowglobes and ${saveData.tracks?.length || 0} tracks`;
            statusDiv.style.color = '#4CAF50';
            
            // Clear status after 3 seconds
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 3000);
        } catch (error) {
            statusDiv.textContent = 'Error loading track map: ' + error.message;
            statusDiv.style.color = '#ff0000';
            console.error('Error loading track map:', error);
        }
    }
    
    getHeightFromMap(x, z) {
        if (!this.useHeightMap || !this.heightMapData) {
            return null;
        }
        
        // Normalize coordinates to 0-1 range (assuming terrain is -100 to 100)
        const normalizedX = (x + 100) / 200;
        const normalizedZ = (z + 100) / 200;
        
        // Clamp to valid range
        const mapX = Math.floor(Math.max(0, Math.min(this.heightMapSize - 1, normalizedX * this.heightMapSize)));
        const mapZ = Math.floor(Math.max(0, Math.min(this.heightMapSize - 1, normalizedZ * this.heightMapSize)));
        
        // Get pixel index (RGBA format)
        const index = (mapZ * this.heightMapSize + mapX) * 4;
        
        // Get grayscale value (use red channel, or average of RGB)
        const r = this.heightMapData[index];
        const g = this.heightMapData[index + 1];
        const b = this.heightMapData[index + 2];
        const gray = (r + g + b) / 3;
        
        // Convert 0-255 to height range (-10 to 15 for example)
        const minHeight = -5;
        const maxHeight = 15;
        const height = minHeight + (gray / 255) * (maxHeight - minHeight);
        
        return height;
    }
    
    async createSnowglobeTypeButtons() {
        const selector = document.getElementById('snowglobe-selector');
        const title = document.getElementById('snowglobe-selector-title');
        
        // Clear existing buttons (except title)
        const existingButtons = selector.querySelectorAll('.snowglobe-type-button');
        existingButtons.forEach(btn => btn.remove());
        
        // Create buttons with preview thumbnails for each type
        for (let index = 0; index < this.snowglobeTypes.length; index++) {
            const type = this.snowglobeTypes[index];
            const button = document.createElement('button');
            button.className = 'snowglobe-type-button';
            if (index === 0) {
                button.classList.add('selected');
            }
            button.setAttribute('data-type', index);
            
            // Create preview thumbnail
            const preview = await this.createSnowglobePreview(type);
            if (preview) {
                button.appendChild(preview);
            }
            
            // Add text label
            const label = document.createElement('span');
            label.textContent = type.name;
            label.style.marginLeft = '8px';
            button.appendChild(label);
            
            button.addEventListener('click', () => this.selectSnowglobeType(index));
            selector.appendChild(button);
        }
        
        // Update title
        title.textContent = `Select Snowglobe Type (${this.snowglobeTypes.length} available):`;
    }
    
    async createSnowglobePreview(type) {
        // Create a simple visual preview using canvas
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            // Draw snowglobe shape
            const centerX = 32;
            const centerY = 32;
            const radius = 28;
            
            // Draw outer glass sphere (semi-transparent)
            const gradient = ctx.createRadialGradient(centerX - 10, centerY - 10, 0, centerX, centerY, radius);
            gradient.addColorStop(0, `rgba(${(type.color >> 16) & 0xff}, ${(type.color >> 8) & 0xff}, ${type.color & 0xff}, 0.8)`);
            gradient.addColorStop(1, `rgba(${(type.color >> 16) & 0xff}, ${(type.color >> 8) & 0xff}, ${type.color & 0xff}, 0.3)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw inner scene
            const innerColor = type.innerColor || type.color;
            ctx.fillStyle = `rgb(${(innerColor >> 16) & 0xff}, ${(innerColor >> 8) & 0xff}, ${innerColor & 0xff})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY - 5, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw base
            ctx.fillStyle = '#8b6f47';
            ctx.beginPath();
            ctx.ellipse(centerX, centerY + 25, 20, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw hole (dark circle in center)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            const holeRadius = (type.holeSize || 0.3) * 15;
            ctx.beginPath();
            ctx.arc(centerX, centerY, holeRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Add highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(centerX - 8, centerY - 8, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Create image element
            const img = document.createElement('img');
            img.src = canvas.toDataURL();
            img.style.width = '48px';
            img.style.height = '48px';
            img.style.display = 'inline-block';
            img.style.verticalAlign = 'middle';
            img.style.borderRadius = '4px';
            img.style.border = '2px solid rgba(255, 255, 255, 0.3)';
            
            return img;
        } catch (error) {
            console.warn('Failed to create preview for', type.name, error);
            // Fallback: create a colored circle
            const div = document.createElement('div');
            div.style.width = '48px';
            div.style.height = '48px';
            div.style.display = 'inline-block';
            div.style.verticalAlign = 'middle';
            div.style.backgroundColor = `#${type.color.toString(16).padStart(6, '0')}`;
            div.style.borderRadius = '50%';
            div.style.border = '2px solid white';
            div.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.3)';
            return div;
        }
    }
    
    updateUI() {
        const trainPos = this.train.position;
        const distance = Math.sqrt(trainPos.x * trainPos.x + trainPos.z * trainPos.z);
        document.getElementById('status').textContent = 
            `Speed: ${Math.abs(this.trainSpeed).toFixed(1)} | Distance: ${distance.toFixed(1)}`;
    }
    
    updateTrainMovement(deltaTime) {
        // Allow free movement if no tracks exist
        if (this.tracks.length === 0) {
            // Free movement on terrain
            const moveSpeed = 5.0;
            const moveDirection = new THREE.Vector3();
            
            if (this.keys['w']) {
                moveDirection.z -= 1;
            }
            if (this.keys['s']) {
                moveDirection.z += 1;
            }
            if (this.keys['a']) {
                moveDirection.x -= 1;
            }
            if (this.keys['d']) {
                moveDirection.x += 1;
            }
            
            if (moveDirection.length() > 0) {
                moveDirection.normalize();
                const newX = this.train.position.x + moveDirection.x * moveSpeed * deltaTime;
                const newZ = this.train.position.z + moveDirection.z * moveSpeed * deltaTime;
                const terrainHeight = this.getTerrainHeight(newX, newZ);
                this.train.position.set(newX, terrainHeight + 0.2, newZ);
                
                // Rotate train to face movement direction
                if (moveDirection.length() > 0) {
                    this.train.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
                }
            }
            return;
        }
        
        // Initialize track position if not set
        if (this.trainTrackPosition === null) {
            this.initializeTrainOnTrack();
        }
        
        // Handle acceleration/deceleration - allow full speed backward
        if (this.keys['w']) {
            // Accelerate forward
            if (this.trainSpeed < 0) {
                // If going backward, decelerate first, then accelerate forward
                this.trainSpeed = Math.min(0, this.trainSpeed + this.acceleration * 2);
            } else {
                this.trainSpeed = Math.min(this.trainSpeed + this.acceleration, this.maxSpeed);
            }
            this.trainTrackDirection = 1; // Forward
        } else if (this.keys['s']) {
            // Accelerate backward - allow full speed backward
            if (this.trainSpeed > 0) {
                // If going forward, decelerate first, then accelerate backward
                this.trainSpeed = Math.max(0, this.trainSpeed - this.acceleration * 2);
            } else {
                this.trainSpeed = Math.max(this.trainSpeed - this.acceleration, -this.maxSpeed);
            }
            this.trainTrackDirection = -1; // Backward
        } else {
            // Natural deceleration
            if (this.trainSpeed > 0) {
                this.trainSpeed = Math.max(0, this.trainSpeed - this.acceleration * 0.5);
            } else if (this.trainSpeed < 0) {
                this.trainSpeed = Math.min(0, this.trainSpeed + this.acceleration * 0.5);
            }
        }
        
        // Handle turning at track junctions (A/D keys switch to different tracks)
        if (this.keys['a'] && Math.abs(this.trainSpeed) > 0.1) {
            // Try to switch to left track at junction
            this.switchTrackAtJunction(-1);
        }
        if (this.keys['d'] && Math.abs(this.trainSpeed) > 0.1) {
            // Try to switch to right track at junction
            this.switchTrackAtJunction(1);
        }
        
        // Move train along track
        if (Math.abs(this.trainSpeed) > 0.1 && this.trainTrackPosition !== null) {
            this.moveTrainAlongTrack(deltaTime);
        }
    }
    
    initializeTrainOnTrack() {
        // Find the closest track and position train on it
        if (this.tracks.length === 0) return;
        
        const trainPos = this.train.position;
        let closestTrack = null;
        let closestT = 0;
        let minDist = Infinity;
        
        this.tracks.forEach((track, index) => {
            const point = this.getClosestPointOnTrack(trainPos.x, trainPos.z, track);
            const dist = trainPos.distanceTo(new THREE.Vector3(point.x, trainPos.y, point.z));
            if (dist < minDist) {
                minDist = dist;
                closestTrack = index;
                // Calculate t parameter
                const start = track.start;
                const end = track.end;
                const A = trainPos.x - start.x;
                const B = trainPos.z - start.z;
                const C = end.x - start.x;
                const D = end.z - start.z;
                const dot = A * C + B * D;
                const lenSq = C * C + D * D;
                closestT = lenSq !== 0 ? Math.max(0, Math.min(1, dot / lenSq)) : 0;
            }
        });
        
        if (closestTrack !== null) {
            this.trainTrackPosition = { trackIndex: closestTrack, t: closestT };
        } else {
            // Default to first track
            this.trainTrackPosition = { trackIndex: 0, t: 0 };
        }
    }
    
    moveTrainAlongTrack(deltaTime) {
        if (!this.trainTrackPosition) return;
        
        const track = this.tracks[this.trainTrackPosition.trackIndex];
        if (!track) return;
        
        const scale = 0.4;
        const distance = this.trainSpeed * deltaTime * this.trainTrackDirection;
        const trackLength = track.start.distanceTo(track.end);
        const tDelta = distance / trackLength;
        
        let newT = this.trainTrackPosition.t + tDelta;
        
        // Check if we've reached the end of the track
        if (newT >= 1.0) {
            // Move to next connected track
            const nextTrack = this.findNextTrack(this.trainTrackPosition.trackIndex, track.end);
            if (nextTrack !== null) {
                this.trainTrackPosition.trackIndex = nextTrack;
                newT = (newT - 1.0) * (trackLength / this.tracks[nextTrack].start.distanceTo(this.tracks[nextTrack].end));
            } else {
                newT = 1.0; // Stop at end
                this.trainSpeed = 0;
            }
        } else if (newT <= 0.0) {
            // Move to previous connected track (going backward)
            const prevTrack = this.findNextTrack(this.trainTrackPosition.trackIndex, track.start);
            if (prevTrack !== null) {
                this.trainTrackPosition.trackIndex = prevTrack;
                const prevTrackLength = this.tracks[prevTrack].start.distanceTo(this.tracks[prevTrack].end);
                // Calculate new position on previous track going backward
                newT = 1.0 + (newT * trackLength / prevTrackLength);
                // Ensure we don't go past the start
                if (newT < 0) {
                    newT = 0;
                    this.trainSpeed = 0;
                }
            } else {
                newT = 0.0; // Stop at start
                this.trainSpeed = 0;
            }
        }
        
        this.trainTrackPosition.t = Math.max(0, Math.min(1, newT));
        
        // Update train position based on track position
        const currentTrack = this.tracks[this.trainTrackPosition.trackIndex];
        const position = this.getPointOnTrack(currentTrack, this.trainTrackPosition.t);
        
        this.train.position.x = position.x;
        this.train.position.z = position.z;
        this.train.position.y = position.y;
        
        // Update train rotation to face track direction (forward or backward)
        // Use direction offset based on movement direction
        const directionOffset = 0.01 * this.trainTrackDirection;
        const nextT = Math.max(0, Math.min(1, this.trainTrackPosition.t + directionOffset));
        const nextPos = this.getPointOnTrack(currentTrack, nextT);
        const direction = new THREE.Vector3().subVectors(nextPos, position).normalize();
        this.train.rotation.y = Math.atan2(direction.x, direction.z);
        
        // If going backward, rotate 180 degrees to face backward
        if (this.trainTrackDirection < 0) {
            this.train.rotation.y += Math.PI;
        }
    }
    
    getPointOnTrack(track, t) {
        const start = track.start;
        const end = track.end;
        const x = start.x + (end.x - start.x) * t;
        const z = start.z + (end.z - start.z) * t;
        const y = this.getTerrainHeight(x, z) + 0.5 * 0.4; // Train height on terrain
        return new THREE.Vector3(x, y, z);
    }
    
    findNextTrack(currentIndex, fromPoint) {
        // Find tracks that connect to the given point
        const currentTrack = this.tracks[currentIndex];
        const threshold = 0.5; // Connection threshold
        
        for (let i = 0; i < this.tracks.length; i++) {
            if (i === currentIndex) continue;
            
            const track = this.tracks[i];
            const distToStart = fromPoint.distanceTo(track.start);
            const distToEnd = fromPoint.distanceTo(track.end);
            
            if (distToStart < threshold) {
                return i; // Connect to start of this track
            }
            if (distToEnd < threshold) {
                return i; // Connect to end of this track
            }
        }
        
        return null;
    }
    
    switchTrackAtJunction(direction) {
        // At junctions, allow switching tracks
        // This is a simplified version - in a full implementation, you'd check if at a junction
        const currentTrack = this.tracks[this.trainTrackPosition.trackIndex];
        const currentPos = this.getPointOnTrack(currentTrack, this.trainTrackPosition.t);
        
        // Find nearby tracks
        for (let i = 0; i < this.tracks.length; i++) {
            if (i === this.trainTrackPosition.trackIndex) continue;
            
            const track = this.tracks[i];
            const distToStart = currentPos.distanceTo(track.start);
            const distToEnd = currentPos.distanceTo(track.end);
            
            if (distToStart < 1.0 || distToEnd < 1.0) {
                // Switch to this track
                this.trainTrackPosition.trackIndex = i;
                this.trainTrackPosition.t = distToStart < distToEnd ? 0 : 1;
                break;
            }
        }
    }
    
    constrainToTunnel(x, z) {
        // This function is no longer used for train movement
        // Train now moves strictly along tracks
        // But keep it for compatibility
        if (this.tracks.length === 0) {
            return { x, z };
        }
        
        // Find the closest point on any track
        let closestPoint = null;
        let minDistance = Infinity;
        
        this.tracks.forEach((track) => {
            const point = this.getClosestPointOnTrack(x, z, track);
            const dist = Math.sqrt(
                Math.pow(x - point.x, 2) + 
                Math.pow(z - point.z, 2)
            );
            
            if (dist < minDistance) {
                minDistance = dist;
                closestPoint = point;
            }
        });
        
        if (closestPoint) {
            // Always snap to track - train must stay on tracks
            return {
                x: closestPoint.x,
                z: closestPoint.z
            };
        }
        
        return { x, z };
    }
    
    getClosestPointOnTrack(x, z, track) {
        // Find closest point on line segment from track.start to track.end
        const start = track.start;
        const end = track.end;
        
        const A = x - start.x;
        const B = z - start.z;
        const C = end.x - start.x;
        const D = end.z - start.z;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }
        
        // Clamp to segment
        param = Math.max(0, Math.min(1, param));
        
        return {
            x: start.x + param * C,
            z: start.z + param * D
        };
    }
    
    updateCamera(deltaTime) {
        const trainPos = this.train.position;
        const radHeading = this.trainHeading * (Math.PI / 180);
        const cameraDistance = 12;
        const cameraHeight = 5;
        
        // Position camera behind train
        const cameraOffsetX = -Math.sin(radHeading) * cameraDistance;
        const cameraOffsetY = -Math.cos(radHeading) * cameraDistance;
        
        const targetPos = new THREE.Vector3(
            trainPos.x + cameraOffsetX,
            trainPos.y + cameraHeight,
            trainPos.z + cameraOffsetY
        );
        
        // Smooth camera movement
        this.camera.position.lerp(targetPos, deltaTime * 3);
        
        // Look ahead of train
        const lookAhead = new THREE.Vector3(
            trainPos.x + Math.sin(radHeading) * 5,
            trainPos.y + 2,
            trainPos.z + Math.cos(radHeading) * 5
        );
        this.camera.lookAt(lookAhead);
    }
    
    updateSnowglobes(deltaTime) {
        // Update placed snowglobes
        this.placedSnowglobes.forEach(sg => {
            // Keep rotation fixed (no automatic spinning)
            sg.mesh.rotation.y = sg.rotation * (Math.PI / 180);
            
            // Gentle floating animation
            const floatOffset = Math.sin(Date.now() * 0.002 + sg.mesh.position.x) * 0.1;
            sg.mesh.position.y = sg.position.y + floatOffset;
            
            // Add sparkles to snowglobes occasionally
            if (Math.random() < 0.01) {
                this.createSparkle(sg.mesh.position);
            }
        });
    }
    
    createSparkle(position) {
        const sparkle = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 2.0,
                transparent: true,
                opacity: 1.0
            })
        );
        sparkle.position.copy(position);
        sparkle.position.y += 1.5;
        sparkle.userData = {
            life: 1.0,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.05 + 0.05,
                (Math.random() - 0.5) * 0.1
            )
        };
        this.scene.add(sparkle);
        this.particles.sparkles.push(sparkle);
    }
    
    createSteamParticle(trainPosition) {
        const steam = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                transparent: true,
                opacity: 0.6,
                emissive: 0xaaaaaa,
                emissiveIntensity: 0.5
            })
        );
        steam.position.copy(trainPosition);
        steam.position.y += 1.5;
        steam.userData = {
            life: 1.0,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.1 + 0.15,
                (Math.random() - 0.5) * 0.2
            ),
            scale: 0.5 + Math.random() * 0.5
        };
        steam.scale.setScalar(steam.userData.scale);
        this.scene.add(steam);
        this.particles.steam.push(steam);
    }
    
    updateParticles(deltaTime) {
        // Update steam particles
        this.particles.steam = this.particles.steam.filter(particle => {
            particle.userData.life -= deltaTime * 0.5;
            if (particle.userData.life <= 0) {
                this.scene.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
                return false;
            }
            particle.position.add(particle.userData.velocity.clone().multiplyScalar(deltaTime));
            particle.material.opacity = particle.userData.life * 0.6;
            particle.scale.setScalar(particle.userData.scale * (1 + (1 - particle.userData.life) * 2));
            return true;
        });
        
        // Update sparkles
        this.particles.sparkles = this.particles.sparkles.filter(particle => {
            particle.userData.life -= deltaTime * 2;
            if (particle.userData.life <= 0) {
                this.scene.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
                return false;
            }
            particle.position.add(particle.userData.velocity.clone().multiplyScalar(deltaTime));
            particle.material.opacity = particle.userData.life;
            return true;
        });
        
        // Create steam from train when moving
        if (this.drivingMode && this.train && Math.abs(this.trainSpeed) > 0.1) {
            if (Math.random() < 0.3) {
                const stackPos = this.train.position.clone();
                stackPos.y += 1.5;
                this.createSteamParticle(stackPos);
            }
        }
    }
    
    saveState() {
        // Save current state for undo/redo
        const state = {
            snowglobes: this.placedSnowglobes.map(sg => ({
                position: sg.position.clone(),
                rotation: sg.rotation,
                type: sg.type,
                holePosition: sg.holePosition.clone(),
                holeRadius: sg.holeRadius
            })),
            tracks: this.tracks.map(t => ({
                start: t.start.clone(),
                end: t.end.clone(),
                curved: t.curved,
                controlPoint: t.controlPoint ? t.controlPoint.clone() : null
            }))
        };
        
        this.undoStack.push(state);
        if (this.undoStack.length > this.maxUndoHistory) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo when new action is performed
    }
    
    undo() {
        if (this.undoStack.length === 0) return;
        
        // Save current state to redo
        const currentState = {
            snowglobes: this.placedSnowglobes.map(sg => ({
                position: sg.position.clone(),
                rotation: sg.rotation,
                type: sg.type,
                holePosition: sg.holePosition.clone(),
                holeRadius: sg.holeRadius
            })),
            tracks: this.tracks.map(t => ({
                start: t.start.clone(),
                end: t.end.clone(),
                curved: t.curved,
                controlPoint: t.controlPoint ? t.controlPoint.clone() : null
            }))
        };
        this.redoStack.push(currentState);
        
        // Restore previous state
        const previousState = this.undoStack.pop();
        this.restoreState(previousState);
        this.showBanner('↶ Undone');
    }
    
    redo() {
        if (this.redoStack.length === 0) return;
        
        // Save current state to undo
        const currentState = {
            snowglobes: this.placedSnowglobes.map(sg => ({
                position: sg.position.clone(),
                rotation: sg.rotation,
                type: sg.type,
                holePosition: sg.holePosition.clone(),
                holeRadius: sg.holeRadius
            })),
            tracks: this.tracks.map(t => ({
                start: t.start.clone(),
                end: t.end.clone(),
                curved: t.curved,
                controlPoint: t.controlPoint ? t.controlPoint.clone() : null
            }))
        };
        this.undoStack.push(currentState);
        
        // Restore redo state
        const redoState = this.redoStack.pop();
        this.restoreState(redoState);
        this.showBanner('↷ Redone');
    }
    
    restoreState(state) {
        // Clear existing
        this.placedSnowglobes.forEach(sg => this.scene.remove(sg.mesh));
        this.placedSnowglobes = [];
        this.trackMeshes.forEach(track => this.scene.remove(track));
        this.trackMeshes = [];
        this.tracks = [];
        
        // Restore snowglobes
        state.snowglobes.forEach(sgData => {
            const type = this.snowglobeTypes[sgData.type];
            if (!type) return;
            
            const snowglobe = this.createSnowglobe(type);
            const scale = 3.0;
            snowglobe.scale.set(scale, scale, scale);
            const terrainHeight = this.getTerrainHeight(sgData.position.x, sgData.position.z);
            snowglobe.position.set(sgData.position.x, terrainHeight + 1.2, sgData.position.z);
            snowglobe.rotation.y = sgData.rotation * (Math.PI / 180);
            
            this.scene.add(snowglobe);
            this.placedSnowglobes.push({
                mesh: snowglobe,
                position: sgData.position.clone(),
                holePosition: sgData.holePosition.clone(),
                rotation: sgData.rotation,
                spin: 0,
                holeRadius: sgData.holeRadius,
                snowglobeRadius: 0.8 * scale,
                type: sgData.type
            });
        });
        
        // Restore tracks
        state.tracks.forEach(trackData => {
            const trackMesh = this.createTrackSegment(
                trackData.start,
                trackData.end,
                this.trackWidth,
                trackData.curved,
                trackData.controlPoint
            );
            this.tracks.push({
                start: trackData.start.clone(),
                end: trackData.end.clone(),
                radius: this.trackWidth,
                segment: trackMesh,
                fromIndex: -1,
                toIndex: -1,
                fromSnowglobe: null,
                toSnowglobe: null,
                curved: trackData.curved,
                controlPoint: trackData.controlPoint ? trackData.controlPoint.clone() : null
            });
        });
        
        this.updatePlacementUI();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.gameStarted || this.gameOver) return;
        
        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.033); // Cap at ~30fps minimum
        this.lastTime = currentTime;
        
        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.lastFPSUpdate > 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
            this.updateFPSDisplay();
        }
        
        if (this.placementMode) {
            // Update camera controls in placement mode
            if (this.controls) {
                this.controls.update();
            }
            // Update placement preview
            this.updatePlacementPreview();
        } else if (this.drivingMode) {
            // Update game
            this.updateTrainMovement(deltaTime);
            this.updateCamera(deltaTime);
            this.updateSnowglobes(deltaTime);
            this.updateUI();
        }
        
        // Always update snowglobe animations
        this.updateSnowglobes(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update mini-map
        if (this.miniMapEnabled && this.miniMapRenderer) {
            this.updateMiniMap();
        }
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
    
    updateFPSDisplay() {
        const fpsElement = document.getElementById('fps-display');
        if (fpsElement) {
            fpsElement.textContent = `FPS: ${this.fps}`;
        }
    }
    
    setupMiniMap() {
        if (!this.miniMapEnabled) return;
        
        const miniMapContainer = document.getElementById('mini-map');
        if (!miniMapContainer) {
            // Create mini-map container
            const container = document.createElement('div');
            container.id = 'mini-map';
            container.style.cssText = `
                position: absolute;
                bottom: 20px;
                right: 20px;
                width: 200px;
                height: 200px;
                background: rgba(0, 0, 0, 0.7);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 10px;
                z-index: 1000;
            `;
            document.getElementById('game-container').appendChild(container);
        }
        
        // Create mini-map camera (orthographic, top-down)
        this.miniMapCamera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 1000);
        this.miniMapCamera.position.set(0, 100, 0);
        this.miniMapCamera.lookAt(0, 0, 0);
        
        // Create mini-map renderer
        const container = document.getElementById('mini-map');
        this.miniMapRenderer = new THREE.WebGLRenderer({ antialias: true });
        this.miniMapRenderer.setSize(200, 200);
        this.miniMapRenderer.setClearColor(0x87ceeb, 0.3);
        container.appendChild(this.miniMapRenderer.domElement);
    }
    
    updateMiniMap() {
        if (!this.miniMapRenderer || !this.miniMapCamera) return;
        
        // Update camera to follow train or center on placed objects
        let centerX = 0, centerZ = 0;
        if (this.drivingMode && this.train) {
            centerX = this.train.position.x;
            centerZ = this.train.position.z;
        } else if (this.placedSnowglobes.length > 0) {
            const sum = this.placedSnowglobes.reduce((acc, sg) => {
                acc.x += sg.position.x;
                acc.z += sg.position.z;
                return acc;
            }, { x: 0, z: 0 });
            centerX = sum.x / this.placedSnowglobes.length;
            centerZ = sum.z / this.placedSnowglobes.length;
        }
        
        this.miniMapCamera.position.set(centerX, 100, centerZ);
        this.miniMapCamera.lookAt(centerX, 0, centerZ);
        
        // Render mini-map
        this.miniMapRenderer.render(this.scene, this.miniMapCamera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    quitGame() {
        // Return to main menu instead of closing window
        this.gameStarted = false;
        this.placementMode = false;
        this.drivingMode = false;
        
        // Hide game, show menu (but not the epilepsy warning)
        document.getElementById('game-container').style.display = 'none';
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) {
            mainMenu.style.display = 'flex';
        }
        // Keep epilepsy warning hidden (already acknowledged)
        const warningDiv = document.getElementById('epilepsy-warning');
        if (warningDiv) {
            warningDiv.style.display = 'none';
        }
        
        // Reset camera controls
        if (this.controls) {
            this.controls.enabled = false;
        }
        
        // Hide train
        if (this.train) {
            this.train.visible = false;
        }
        
        // Reset UI
        document.getElementById('placement-ui').style.display = 'block';
        document.getElementById('ui').style.display = 'none';
    }
    
    // ========== TERRAIN EDITING SYSTEM ==========
    editTerrainAtMouse() {
        if (!this.terrain || !this.terrain.geometry) return;
        
        // Intersect with terrain
        const intersects = this.raycaster.intersectObject(this.terrain);
        if (intersects.length === 0) return;
        
        const hitPoint = intersects[0].point;
        const vertices = this.terrain.geometry.attributes.position;
        const vertexCount = vertices.count;
        
        // Modify vertices within brush radius
        for (let i = 0; i < vertexCount; i++) {
            const x = vertices.getX(i);
            const z = vertices.getZ(i);
            const y = vertices.getY(i);
            
            const distance = Math.sqrt(
                (x - hitPoint.x) ** 2 + (z - hitPoint.z) ** 2
            );
            
            if (distance < this.terrainBrushSize) {
                const influence = 1 - (distance / this.terrainBrushSize);
                const strength = this.terrainBrushStrength * influence;
                
                let newY = y;
                
                if (this.terrainEditType === 'raise') {
                    newY += strength * 0.1;
                } else if (this.terrainEditType === 'lower') {
                    newY -= strength * 0.1;
                } else if (this.terrainEditType === 'smooth') {
                    // Average with nearby vertices
                    const nearbyY = this.getAverageHeightNear(x, z, this.terrainBrushSize);
                    newY = y + (nearbyY - y) * strength * 0.5;
                } else if (this.terrainEditType === 'paint') {
                    // Texture painting - update vertex colors
                    // This is handled in updateTerrainColors
                }
                
                vertices.setY(i, newY);
            }
        }
        
        // Update normals and colors
        this.terrain.geometry.computeVertexNormals();
        this.updateTerrainColors();
        vertices.needsUpdate = true;
        
        // If using height map, disable it (we're now editing procedurally)
        if (this.useHeightMap) {
            this.useHeightMap = false;
            console.log('Switched to procedural terrain (height map disabled for editing)');
        }
    }
    
    getAverageHeightNear(x, z, radius) {
        if (!this.terrain || !this.terrain.geometry) return 0;
        
        const vertices = this.terrain.geometry.attributes.position;
        let sum = 0;
        let count = 0;
        
        for (let i = 0; i < vertices.count; i++) {
            const vx = vertices.getX(i);
            const vz = vertices.getZ(i);
            const distance = Math.sqrt((vx - x) ** 2 + (vz - z) ** 2);
            
            if (distance < radius) {
                sum += vertices.getY(i);
                count++;
            }
        }
        
        return count > 0 ? sum / count : 0;
    }
    
    updateTerrainColors() {
        if (!this.terrain || !this.terrain.geometry) return;
        
        const vertices = this.terrain.geometry.attributes.position;
        const colors = [];
        const color = new THREE.Color();
        const season = this.currentSeason;
        const seasonColor = this.seasonColors[season];
        
        for (let i = 0; i < vertices.count; i++) {
            const height = vertices.getY(i);
            
            // Color based on height and season with more dramatic seasonal changes
            if (height < -2) {
                // Deep valleys - darker, season affects water/mud color
                if (season === 'winter') {
                    color.setRGB(0.3, 0.3, 0.35); // Darker, more blue-gray
                } else if (season === 'spring') {
                    color.setRGB(0.35, 0.4, 0.3); // Greener mud
                } else if (season === 'summer') {
                    color.setRGB(0.4, 0.35, 0.3); // Brown mud
                } else { // fall
                    color.setRGB(0.45, 0.35, 0.25); // Orange-brown
                }
            } else if (height < 0) {
                // Low areas - seasonal ground color
                if (season === 'winter') {
                    color.setRGB(0.5, 0.5, 0.55); // Gray-brown
                } else if (season === 'spring') {
                    color.setRGB(0.55, 0.6, 0.5); // Light green-brown
                } else if (season === 'summer') {
                    color.setRGB(0.6, 0.55, 0.5); // Brown
                } else { // fall
                    color.setRGB(0.65, 0.5, 0.4); // Orange-brown
                }
            } else if (height < 2) {
                // Mid elevations - grass/ground with strong seasonal variation
                const grassR = ((seasonColor.grass >> 16) & 0xff) / 255;
                const grassG = ((seasonColor.grass >> 8) & 0xff) / 255;
                const grassB = (seasonColor.grass & 0xff) / 255;
                
                if (season === 'winter') {
                    // Winter: mix with gray/white
                    color.setRGB(
                        grassR * 0.6 + 0.4 * 0.7,
                        grassG * 0.6 + 0.4 * 0.7,
                        grassB * 0.6 + 0.4 * 0.75
                    );
                } else if (season === 'spring') {
                    // Spring: vibrant green
                    color.setRGB(grassR * 0.9, grassG * 0.95, grassB * 0.85);
                } else if (season === 'summer') {
                    // Summer: darker green
                    color.setRGB(grassR * 0.85, grassG * 0.82, grassB * 0.78);
                } else { // fall
                    // Fall: mix with orange/brown
                    color.setRGB(
                        grassR * 0.7 + 0.3 * 0.8,
                        grassG * 0.7 + 0.3 * 0.5,
                        grassB * 0.7 + 0.3 * 0.3
                    );
                }
            } else if (height < 5) {
                // Higher elevations - light snow/ground
                if (season === 'winter') {
                    color.setRGB(0.95, 0.98, 1.0); // Bright white-blue
                } else if (season === 'spring') {
                    color.setRGB(0.9, 0.95, 0.88); // Light green-white
                } else if (season === 'summer') {
                    color.setRGB(0.95, 0.95, 0.98); // Light gray-white
                } else { // fall
                    color.setRGB(0.98, 0.92, 0.85); // Light orange-white
                }
            } else {
                // Mountain peaks - always snowy but season affects tint
                if (season === 'winter') {
                    color.setRGB(1.0, 1.0, 1.0); // Pure white
                } else if (season === 'spring') {
                    color.setRGB(0.98, 1.0, 0.98); // Slight green tint
                } else if (season === 'summer') {
                    color.setRGB(1.0, 1.0, 1.0); // Pure white
                } else { // fall
                    color.setRGB(1.0, 0.98, 0.95); // Slight orange tint
                }
            }
            
            colors.push(color.r, color.g, color.b);
        }
        
        this.terrain.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }
    
    // ========== CIRCUIT SYSTEM ==========
    addTrackSwitch() {
        // Find intersection with track
        const intersects = this.raycaster.intersectObjects(this.trackMeshes);
        if (intersects.length === 0) return;
        
        const hitPoint = intersects[0].point;
        const switchData = {
            position: hitPoint.clone(),
            state: false, // false = left, true = right
            mesh: null
        };
        
        // Create visual switch
        const switchGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.5);
        const switchMaterial = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            roughness: 0.5,
            metalness: 0.7
        });
        const switchMesh = new THREE.Mesh(switchGeometry, switchMaterial);
        switchMesh.position.copy(hitPoint);
        switchMesh.position.y += 0.1;
        switchMesh.castShadow = true;
        this.scene.add(switchMesh);
        
        switchData.mesh = switchMesh;
        this.trackSwitches.push(switchData);
        
        console.log('Added track switch at', hitPoint);
    }
    
    addTrackSignal() {
        // Find intersection with track
        const intersects = this.raycaster.intersectObjects(this.trackMeshes);
        if (intersects.length === 0) return;
        
        const hitPoint = intersects[0].point;
        const signalData = {
            position: hitPoint.clone(),
            state: 'red', // 'red', 'yellow', 'green'
            mesh: null
        };
        
        // Create visual signal
        const signalGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
        const signalMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.5,
            metalness: 0.5
        });
        const signalMesh = new THREE.Mesh(signalGeometry, signalMaterial);
        signalMesh.position.copy(hitPoint);
        signalMesh.position.y += 0.75;
        
        // Add light
        const lightGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const lightMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1.0
        });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.y = 0.5;
        signalMesh.add(light);
        signalData.light = light;
        
        signalMesh.castShadow = true;
        this.scene.add(signalMesh);
        
        signalData.mesh = signalMesh;
        this.trackSignals.push(signalData);
        
        console.log('Added track signal at', hitPoint);
    }
    
    addLogicGate() {
        // Find intersection with ground
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(groundPlane, intersectPoint);
        
        if (!intersectPoint) return;
        
        const gateData = {
            position: intersectPoint.clone(),
            type: 'AND', // 'AND', 'OR', 'NOT', 'XOR'
            inputs: [],
            output: false,
            mesh: null
        };
        
        // Create visual gate
        const gateGeometry = new THREE.BoxGeometry(1, 0.5, 1);
        const gateMaterial = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            roughness: 0.3,
            metalness: 0.8
        });
        const gateMesh = new THREE.Mesh(gateGeometry, gateMaterial);
        gateMesh.position.copy(intersectPoint);
        gateMesh.position.y += 0.25;
        gateMesh.castShadow = true;
        this.scene.add(gateMesh);
        
        // Add label
        // (In a real implementation, you'd use a text renderer)
        
        gateData.mesh = gateMesh;
        this.trackGates.push(gateData);
        
        console.log('Added logic gate at', intersectPoint);
    }
    
    toggleTrackSwitch(switchIndex) {
        if (switchIndex >= 0 && switchIndex < this.trackSwitches.length) {
            const sw = this.trackSwitches[switchIndex];
            sw.state = !sw.state;
            sw.mesh.rotation.y = sw.state ? Math.PI / 4 : -Math.PI / 4;
            console.log('Switch toggled:', sw.state);
        }
    }
    
    updateSignalState(signalIndex, state) {
        if (signalIndex >= 0 && signalIndex < this.trackSignals.length) {
            const signal = this.trackSignals[signalIndex];
            signal.state = state;
            
            const colors = {
                'red': 0xff0000,
                'yellow': 0xffff00,
                'green': 0x00ff00
            };
            
            signal.light.material.color.setHex(colors[state]);
            signal.light.material.emissive.setHex(colors[state]);
        }
    }
    
    evaluateLogicGate(gateIndex) {
        if (gateIndex >= 0 && gateIndex < this.trackGates.length) {
            const gate = this.trackGates[gateIndex];
            
            switch (gate.type) {
                case 'AND':
                    gate.output = gate.inputs.length > 0 && gate.inputs.every(i => i);
                    break;
                case 'OR':
                    gate.output = gate.inputs.length > 0 && gate.inputs.some(i => i);
                    break;
                case 'NOT':
                    gate.output = gate.inputs.length > 0 && !gate.inputs[0];
                    break;
                case 'XOR':
                    gate.output = gate.inputs.filter(i => i).length % 2 === 1;
                    break;
            }
            
            // Update visual
            gate.mesh.material.emissive.setHex(gate.output ? 0x00ff00 : 0x000000);
            gate.mesh.material.emissiveIntensity = gate.output ? 0.5 : 0;
            
            return gate.output;
        }
        return false;
    }
    
    // ========== SEASONAL SYSTEM ==========
    changeSeason(season) {
        this.currentSeason = season;
        
        // Update sky and fog colors
        const seasonColor = this.seasonColors[season];
        this.scene.background = new THREE.Color(seasonColor.sky);
        if (this.scene.fog) {
            this.scene.fog.color.setHex(seasonColor.fog);
        }
        
        // Update sky shader if it exists
        this.scene.traverse((child) => {
            if (child.material && child.material.uniforms) {
                if (child.material.uniforms.topColor) {
                    child.material.uniforms.topColor.value.setHex(seasonColor.sky);
                }
                    if (child.material.uniforms.bottomColor) {
                    // Adjust bottom color based on season - more vibrant
                    const bottomColors = {
                        spring: 0xfff9c4,  // Warm yellow-white
                        summer: 0xffff8d,  // Bright yellow
                        fall: 0xffcc80,    // Warm orange
                        winter: 0xe1f5fe   // Cool blue-white
                    };
                    child.material.uniforms.bottomColor.value.setHex(bottomColors[season]);
                }
            }
        });
        
        // Update lighting with more vibrant seasonal colors
        if (this.sunLight) {
            // Adjust sun color based on season - more distinct
            const sunColors = {
                spring: 0xfff9c4,  // Warm yellow-white
                summer: 0xffff8d,  // Bright yellow
                fall: 0xffcc80,    // Warm orange
                winter: 0xe1f5fe   // Cool blue-white
            };
            this.sunLight.color.setHex(sunColors[season]);
            // Adjust intensity for more dramatic effect
            const intensities = {
                spring: 1.3,
                summer: 1.5,
                fall: 1.2,
                winter: 1.0
            };
            this.sunLight.intensity = intensities[season];
        }
        
        // Update terrain colors with seasonal changes
        this.updateTerrainColors();
        
        // Update tree colors - traverse all objects
        this.scene.traverse((child) => {
            if (child.name === 'tree') {
                // Update foliage in tree group
                child.children.forEach(part => {
                    if (part.name === 'foliage' && part.material) {
                        // Update foliage color based on season - more vibrant
                        const seasonColor = this.seasonColors[season];
                        if (season === 'spring') {
                            part.material.color.setHex(0x4caf50);
                        } else if (season === 'summer') {
                            part.material.color.setHex(0x2e7d32);
                        } else if (season === 'fall') {
                            part.material.color.setHex(0xff6f00);
                        } else { // winter
                            part.material.color.setHex(0x546e7a);
                        }
                    }
                });
            } else if (child.name === 'foliage' && child.material) {
                // Direct foliage update - more vibrant
                if (season === 'spring') {
                    child.material.color.setHex(0x4caf50);
                } else if (season === 'summer') {
                    child.material.color.setHex(0x2e7d32);
                } else if (season === 'fall') {
                    child.material.color.setHex(0xff6f00);
                } else { // winter
                    child.material.color.setHex(0x546e7a);
                }
            } else if (child.name === 'grass') {
                // Update grass group and all blades
                const grassColor = seasonColor.grass;
                child.children.forEach(blade => {
                    if (blade.material) {
                        blade.material.color.setHex(grassColor);
                    }
                });
            } else if (child.name === 'grassBlade' && child.material) {
                // Direct grass blade update
                child.material.color.setHex(seasonColor.grass);
            }
        });
        
        console.log('Changed season to', season);
    }
}

// Start the game when page loads (but show menu first)
let game = null;
window.addEventListener('load', () => {
    game = new SnowglobeTrainGame();
});
