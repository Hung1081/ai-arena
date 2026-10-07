import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { mergeVertices } from "https://unpkg.com/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js";

const DEFAULT_MEASUREMENTS = Object.freeze({
    height: 168,
    weight: 58,
    chest: 86,
    waist: 66,
    hip: 92,
});

const MANNEQUIN_IVORY = 0xe9dfcf;
const GOLD = 0xd4af37;

export class TraditionalVisualizer3D {
    constructor(containerId = "avatar-stage-3d") {
        this.container = (typeof containerId === "string" ? document.getElementById(containerId) : containerId)
            || document.getElementById("avatar-stage-3d")
            || document.getElementById("avatar-stage")
            || document.querySelector(".visualizer-wrapper");
        if (!this.container) throw new Error(`Không tìm thấy vùng 3D: ${containerId}`);

        this.measurements = { ...DEFAULT_MEASUREMENTS };
        this.realisticBody = null;
        this.realisticBodyMesh = null;
        this.realisticBodyBaseScale = 1;
        this.skinDetailGroup = null;
        this.outfit = {
            garmentId: "ao_dai",
            color: "#9E1A1A",
            bottomType: "pants_white",
            headdress: "khan_vanh",
            jewelry: "kieng_bac",
            shoes: "guoc_moc",
            bag: "none",
            hairstyle: "bui_tram",
            hasFan: true,
        };

        this.scene = new THREE.Scene();
        this.scene.background = null;
        this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        this.camera.position.set(0, 1.68, 5.9);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance",
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.domElement.className = "studio-3d-canvas";
        this.renderer.domElement.setAttribute("aria-label", "Người mẫu 3D mặc Việt phục, kéo để xoay và cuộn để phóng to");
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 1.7, 0);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.075;
        this.controls.enablePan = false;
        this.controls.minDistance = 2.8;
        this.controls.maxDistance = 7.2;
        this.controls.minPolarAngle = 0.12;
        // Không cho camera chui xuống dưới gấu áo như nhìn từ dưới sàn;
        // vẫn đủ góc thấp để xem quần, chân và giày.
        this.controls.maxPolarAngle = Math.PI * 0.75;

        this.modelRoot = new THREE.Group();
        this.bodyGroup = new THREE.Group();
        this.garmentGroup = new THREE.Group();
        this.accessoryGroup = new THREE.Group();
        this.modelRoot.add(this.bodyGroup, this.garmentGroup, this.accessoryGroup);
        this.scene.add(this.modelRoot);

        this.addEnvironment();
        this.buildBody();
        this.buildGarment();
        this.buildAccessories();
        this.loadRealisticBody();
        this.handleResize = () => this.resize();
        window.addEventListener("resize", this.handleResize);
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => this.resize());
            this.resizeObserver.observe(this.container);
        }
        this.resize();
        this.animate = this.animate.bind(this);
        this.animationFrame = requestAnimationFrame(this.animate);
    }

    addEnvironment() {
        const hemi = new THREE.HemisphereLight(0xfff4dc, 0x5b4634, 2.1);
        this.scene.add(hemi);

        const key = new THREE.DirectionalLight(0xffe0b0, 3.2);
        key.position.set(3.5, 5.5, 4.5);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        this.scene.add(key);

        const rim = new THREE.DirectionalLight(0xb9d8ff, 1.2);
        rim.position.set(-4, 3.2, -3);
        this.scene.add(rim);

        const floor = new THREE.Mesh(
            new THREE.CircleGeometry(1.28, 64),
            new THREE.MeshStandardMaterial({ color: 0xd8ccb5, roughness: 0.88, transparent: true, opacity: 0.72 }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.035;
        floor.receiveShadow = true;
        this.scene.add(floor);

    }

    getShape() {
        const m = this.measurements;
        const weightFactor = THREE.MathUtils.clamp(Math.pow(m.weight / 58, 0.16), 0.88, 1.16);
        return {
            heightScale: m.height / DEFAULT_MEASUREMENTS.height,
            chestR: m.chest * 0.00485 * weightFactor,
            waistR: m.waist * 0.0048 * weightFactor,
            hipR: m.hip * 0.00475 * weightFactor,
            shoulderR: THREE.MathUtils.clamp(m.chest * 0.00565 * weightFactor, 0.43, 0.62),
            depthScale: THREE.MathUtils.clamp(0.66 + (m.weight - 45) * 0.0028, 0.65, 0.86),
            limbR: THREE.MathUtils.clamp(0.105 + (m.weight - 45) * 0.00115, 0.1, 0.17),
        };
    }

    material(color, options = {}) {
        return new THREE.MeshStandardMaterial({
            color,
            roughness: options.roughness ?? 0.58,
            metalness: options.metalness ?? 0.02,
            side: options.side ?? THREE.FrontSide,
            transparent: options.transparent ?? false,
            opacity: options.opacity ?? 1,
        });
    }

    disposeGroup(group) {
        while (group.children.length) {
            const child = group.children.pop();
            child.traverse((node) => {
                if (node.geometry) node.geometry.dispose();
                if (node.material) {
                    const materials = Array.isArray(node.material) ? node.material : [node.material];
                    materials.forEach((mat) => {
                        const textures = new Set([mat.map, mat.bumpMap, mat.roughnessMap, mat.normalMap].filter(Boolean));
                        textures.forEach((texture) => texture.dispose());
                        mat.dispose();
                    });
                }
            });
        }
    }

    mesh(geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) {
        const node = new THREE.Mesh(geometry, material);
        node.position.set(...position);
        node.scale.set(...scale);
        node.castShadow = true;
        node.receiveShadow = true;
        return node;
    }

    cylinderBetween(a, b, radius, material, radiusEnd = radius, radialSegments = 24) {
        const start = new THREE.Vector3(...a);
        const end = new THREE.Vector3(...b);
        const direction = end.clone().sub(start);
        const node = this.mesh(
            new THREE.CylinderGeometry(radiusEnd, radius, direction.length(), radialSegments, 1, false),
            material,
        );
        node.position.copy(start.clone().add(end).multiplyScalar(0.5));
        node.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        return node;
    }

    lathe(profile, material, depthScale = 0.74, segments = 48) {
        const points = profile.map(([radius, y]) => new THREE.Vector2(radius, y));
        const node = this.mesh(new THREE.LatheGeometry(points, segments), material);
        node.scale.z = depthScale;
        return node;
    }

    ellipticalShell(rings, material, options = {}) {
        const segments = options.segments || 64;
        const thetaStart = options.thetaStart ?? 0;
        const thetaLength = options.thetaLength ?? Math.PI * 2;
        const verticalSubdivisions = Math.max(1, options.verticalSubdivisions || 1);
        if (verticalSubdivisions > 1 && rings.length > 2) {
            const sourceRings = rings;
            const scalarKeys = ["rx", "rz", "x", "z", "frontBulge", "bustBulge", "backBulge", "sideContour", "foldAmplitude", "foldPhase"];
            const catmull = (p0, p1, p2, p3, t) => {
                const t2 = t * t;
                const t3 = t2 * t;
                return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
            };
            const smoothRings = [];
            for (let index = 0; index < sourceRings.length - 1; index += 1) {
                const p0 = sourceRings[Math.max(0, index - 1)];
                const p1 = sourceRings[index];
                const p2 = sourceRings[index + 1];
                const p3 = sourceRings[Math.min(sourceRings.length - 1, index + 2)];
                for (let step = 0; step < verticalSubdivisions; step += 1) {
                    const t = step / verticalSubdivisions;
                    const ring = { y: THREE.MathUtils.lerp(p1.y, p2.y, t) };
                    scalarKeys.forEach((key) => {
                        const value = catmull(p0[key] || 0, p1[key] || 0, p2[key] || 0, p3[key] || 0, t);
                        if (key === "rx" || key === "rz") ring[key] = Math.max(0.001, value);
                        else if (Math.abs(value) > 1e-6) ring[key] = value;
                    });
                    ring.foldCount = p1.foldCount || p2.foldCount;
                    smoothRings.push(ring);
                }
            }
            smoothRings.push({ ...sourceRings[sourceRings.length - 1] });
            rings = smoothRings;
        }
        const vertices = [];
        const indices = [];
        const uvs = [];

        rings.forEach((ring, ringIndex) => {
            for (let segment = 0; segment <= segments; segment += 1) {
                const u = segment / segments;
                const theta = thetaStart + thetaLength * u;
                const frontWeight = Math.max(0, Math.cos(theta));
                const backWeight = Math.max(0, -Math.cos(theta));
                const sideWeight = Math.pow(Math.abs(Math.sin(theta)), 2);
                const frontBulge = (ring.frontBulge || 0) * frontWeight * frontWeight;
                const bustLobe = (ring.bustBulge || 0)
                    * Math.pow(frontWeight, 1.55)
                    * (0.55 + 0.9 * Math.pow(Math.abs(Math.sin(theta)), 0.72));
                const backBulge = (ring.backBulge || 0) * backWeight * backWeight;
                const sideScale = 1 + (ring.sideContour || 0) * sideWeight;
                const foldAmplitude = ring.foldAmplitude || 0;
                const foldCount = ring.foldCount || 10;
                const foldPhase = ring.foldPhase || 0;
                const radialFold = 1 + Math.cos(theta * foldCount + foldPhase) * foldAmplitude;
                vertices.push(
                    (ring.x || 0) + ring.rx * radialFold * sideScale * Math.sin(theta),
                    ring.y,
                    (ring.z || 0) + ring.rz * radialFold * Math.cos(theta) + frontBulge + bustLobe - backBulge,
                );
                uvs.push(u, ringIndex / Math.max(rings.length - 1, 1));
            }
        });

        for (let ring = 0; ring < rings.length - 1; ring += 1) {
            for (let segment = 0; segment < segments; segment += 1) {
                const a = ring * (segments + 1) + segment;
                const b = a + segments + 1;
                indices.push(a, b, a + 1, b, b + 1, a + 1);
            }
        }

        if (options.capBottom && thetaLength >= Math.PI * 2 - 0.001) {
            const bottom = rings[0];
            const center = vertices.length / 3;
            vertices.push(bottom.x || 0, bottom.y, bottom.z || 0);
            uvs.push(0.5, 0.5);
            for (let segment = 0; segment < segments; segment += 1) {
                indices.push(center, segment + 1, segment);
            }
        }
        if (options.capTop && thetaLength >= Math.PI * 2 - 0.001) {
            const top = rings[rings.length - 1];
            const center = vertices.length / 3;
            const start = (rings.length - 1) * (segments + 1);
            vertices.push(top.x || 0, top.y, top.z || 0);
            uvs.push(0.5, 0.5);
            for (let segment = 0; segment < segments; segment += 1) {
                indices.push(center, start + segment, start + segment + 1);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return this.mesh(geometry, material);
    }

    mannequinHead(material) {
        // Closed, multi-section display head: jaw, cheek, temple and crown are
        // modeled independently instead of stretching a single sphere.
        return this.ellipticalShell([
            { y: 2.76, rx: 0.125, rz: 0.11, frontBulge: 0.01 },
            { y: 2.83, rx: 0.18, rz: 0.16, frontBulge: 0.025 },
            { y: 2.93, rx: 0.235, rz: 0.215, frontBulge: 0.045 },
            { y: 3.07, rx: 0.285, rz: 0.255, frontBulge: 0.05 },
            { y: 3.2, rx: 0.278, rz: 0.245, frontBulge: 0.035 },
            { y: 3.32, rx: 0.235, rz: 0.215, frontBulge: 0.018 },
            { y: 3.4, rx: 0.145, rz: 0.135 },
            { y: 3.43, rx: 0.025, rz: 0.025 },
        ], material, { segments: 72, capBottom: true, capTop: true });
    }

    mannequinNeck(material) {
        return this.ellipticalShell([
            { y: 2.58, rx: 0.14, rz: 0.125 },
            { y: 2.68, rx: 0.122, rz: 0.11 },
            { y: 2.8, rx: 0.13, rz: 0.115 },
            { y: 2.84, rx: 0.17, rz: 0.15 },
        ], material, { segments: 48 });
    }

    taperedSleeve(curve, radiusProfile, material, tubularSegments = 32, radialSegments = 18) {
        const frames = curve.computeFrenetFrames(tubularSegments, false);
        const vertices = [];
        const indices = [];
        const uvs = [];
        for (let i = 0; i <= tubularSegments; i += 1) {
            const t = i / tubularSegments;
            const center = curve.getPointAt(t);
            const profileIndex = t * (radiusProfile.length - 1);
            const low = Math.floor(profileIndex);
            const high = Math.min(low + 1, radiusProfile.length - 1);
            const radius = THREE.MathUtils.lerp(radiusProfile[low], radiusProfile[high], profileIndex - low);
            const normal = frames.normals[i];
            const binormal = frames.binormals[i];
            for (let j = 0; j <= radialSegments; j += 1) {
                const v = j / radialSegments;
                const angle = v * Math.PI * 2;
                const radial = normal.clone().multiplyScalar(Math.cos(angle) * radius)
                    .add(binormal.clone().multiplyScalar(Math.sin(angle) * radius));
                const point = center.clone().add(radial);
                vertices.push(point.x, point.y, point.z);
                uvs.push(t, v);
            }
        }
        for (let i = 0; i < tubularSegments; i += 1) {
            for (let j = 0; j < radialSegments; j += 1) {
                const a = i * (radialSegments + 1) + j;
                const b = a + radialSegments + 1;
                indices.push(a, b, a + 1, b, b + 1, a + 1);
            }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return this.mesh(geometry, material);
    }

    shoeLast(x, material, style = "giay_da", side = 1, skinMaterial = null, ankleScale = 1) {
        const shoe = new THREE.Group();
        const skin = skinMaterial || this.material(MANNEQUIN_IVORY, { roughness: 0.76, side: THREE.DoubleSide });
        const ankle = this.mesh(
            new THREE.CylinderGeometry(0.052 * ankleScale, 0.064 * ankleScale, 0.22, 24),
            skin,
            [x, 0.235, -0.055],
        );
        shoe.add(ankle);
        const soleColor = material.color.clone().multiplyScalar(style === "guoc_moc" ? 0.72 : 0.5);
        const sole = this.mesh(
            new THREE.SphereGeometry(0.13, 28, 12),
            this.material(soleColor, { roughness: 0.8 }),
            [x, 0.025, -0.175],
            [1.04, style === "guoc_moc" ? 0.24 : 0.16, 1.58],
        );
        shoe.add(sole);

        const addRoundedUpper = (heightScale = 0.58, toeScale = [1.02, 0.72, 0.9]) => {
            const upper = this.mesh(
                new THREE.CapsuleGeometry(0.112, 0.16, 10, 24),
                material,
                [x, 0.105, -0.14],
                [1.05, 1, heightScale],
            );
            upper.rotation.x = Math.PI / 2;
            const toe = this.mesh(
                new THREE.SphereGeometry(0.115, 28, 18),
                material,
                [x, 0.105, -0.29],
                toeScale,
            );
            shoe.add(upper, toe);
        };

        if (style === "guoc_moc") {
            addRoundedUpper(0.42, [1.02, 0.5, 0.82]);
            const strap = this.mesh(
                new THREE.SphereGeometry(0.105, 24, 14),
                material,
                [x, 0.155, -0.17],
                [1.12, 0.38, 0.72],
            );
            shoe.add(strap);
            const studMaterial = this.material(0xc99b45, { metalness: 0.5, roughness: 0.3 });
            [-0.055, 0, 0.055].forEach((offset) => {
                shoe.add(this.mesh(new THREE.SphereGeometry(0.011, 12, 8), studMaterial, [x + offset, 0.147, -0.29], [1, 0.3, 1]));
            });
        } else if (style === "hai_theu") {
            addRoundedUpper(0.62, [0.95, 0.76, 1.05]);
            const goldThread = this.material(GOLD, { metalness: 0.35, roughness: 0.38 });
            [-0.06, -0.03, 0, 0.03, 0.06].forEach((offset, index) => {
                const arch = Math.abs(index - 2) * 0.012;
                shoe.add(this.mesh(new THREE.SphereGeometry(0.013, 14, 10), goldThread, [x + offset, 0.17 - arch * 0.15, -0.31 + arch], [1, 0.25, 1.1]));
            });
        } else if (style === "dep_coi") {
            const foot = this.mesh(
                new THREE.CapsuleGeometry(0.082, 0.2, 10, 22),
                skin,
                [x, 0.11, -0.11],
                [1.02, 1, 0.55],
            );
            foot.rotation.x = Math.PI / 2;
            shoe.add(foot);
            const toeOffsets = [-0.052, -0.025, 0, 0.023, 0.043];
            const toeRadii = [0.027, 0.024, 0.0215, 0.019, 0.0165];
            const toeLengths = [-0.305, -0.315, -0.31, -0.297, -0.282];
            toeOffsets.forEach((offset, index) => {
                const toe = this.mesh(
                    new THREE.SphereGeometry(toeRadii[index], 16, 12),
                    skin,
                    [x + side * offset, 0.145 - index * 0.002, toeLengths[index]],
                    [1, 0.78, 1.18],
                );
                shoe.add(toe);
            });
            const rope = this.material(0xe1bf7b, { roughness: 0.92 });
            shoe.add(
                this.cylinderBetween([x - 0.085, 0.155, -0.12], [x + 0.085, 0.155, -0.28], 0.013, rope, 0.013, 12),
                this.cylinderBetween([x + 0.085, 0.158, -0.12], [x - 0.085, 0.158, -0.28], 0.013, rope, 0.013, 12),
            );
        } else {
            addRoundedUpper(0.68, [1.04, 0.76, 0.92]);
            const tongue = this.mesh(
                new THREE.BoxGeometry(0.105, 0.035, 0.19),
                this.material(material.color.clone().multiplyScalar(1.25), { roughness: 0.34 }),
                [x, 0.178, -0.1],
            );
            tongue.rotation.x = -0.16;
            const buckle = this.mesh(
                new THREE.BoxGeometry(0.13, 0.025, 0.035),
                this.material(0x6f5732, { metalness: 0.48, roughness: 0.3 }),
                [x, 0.17, -0.29],
            );
            shoe.add(tongue, buckle);
        }
        if (style !== "dep_coi") {
            const heelCollar = this.mesh(
                new THREE.TorusGeometry(0.066, 0.011, 10, 32),
                material,
                [x, 0.158, 0.018],
                [1, 1, 1.12],
            );
            heelCollar.rotation.x = Math.PI / 2;
            shoe.add(heelCollar);
        }
        return shoe;
    }

    handWithFingers(side, x, y, z, material, limbR) {
        const hand = new THREE.Group();
        const palm = this.mesh(
            new THREE.SphereGeometry(limbR * 0.63, 24, 18),
            material,
            [x, y, z],
            [0.86, 1.08, 0.66],
        );
        const wrist = this.mesh(
            new THREE.CylinderGeometry(limbR * 0.36, limbR * 0.43, 0.14, 18),
            material,
            [x, y + 0.095, z],
        );
        hand.add(palm, wrist);

        const fingerOffsets = [-0.034, -0.011, 0.011, 0.034];
        const fingerLengths = [0.032, 0.045, 0.042, 0.03];
        fingerOffsets.forEach((offset, index) => {
            const length = fingerLengths[index];
            const finger = this.mesh(
                new THREE.CapsuleGeometry(0.013, length, 5, 10),
                material,
                [x + offset, y - limbR * 0.42 - length * 0.28, z - 0.003],
                [0.94, 1, 0.82],
            );
            hand.add(finger);
        });

        const thumb = this.mesh(
            new THREE.CapsuleGeometry(0.014, 0.035, 5, 10),
            material,
            [x - side * 0.047, y - 0.018, z + 0.004],
            [0.96, 1, 0.84],
        );
        thumb.rotation.z = side * 0.72;
        hand.add(thumb);
        return hand;
    }

    extractHumanHands(root, material) {
        const hands = new THREE.Group();
        root.updateMatrixWorld(true);
        root.traverse((node) => {
            if (!node.isMesh || !node.geometry?.getAttribute("position")) return;
            const source = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
            const position = source.getAttribute("position");
            const kept = [];
            const a = new THREE.Vector3();
            const b = new THREE.Vector3();
            const c = new THREE.Vector3();
            for (let index = 0; index < position.count; index += 3) {
                a.fromBufferAttribute(position, index).applyMatrix4(node.matrixWorld);
                b.fromBufferAttribute(position, index + 1).applyMatrix4(node.matrixWorld);
                c.fromBufferAttribute(position, index + 2).applyMatrix4(node.matrixWorld);
                const centerX = (a.x + b.x + c.x) / 3;
                const centerY = (a.y + b.y + c.y) / 3;
                if (Math.abs(centerX) < 0.39 || centerY < 1.08 || centerY > 1.58) continue;
                kept.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
            }
            source.dispose();
            if (!kept.length) return;
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute("position", new THREE.Float32BufferAttribute(kept, 3));
            geometry.computeVertexNormals();
            const handMesh = this.mesh(geometry, material);
            handMesh.renderOrder = 5;
            hands.add(handMesh);
        });
        return hands;
    }

    loadRealisticBody() {
        // CC0 adult human base mesh by Quaternius / UMRAM Bilkent:
        // https://github.com/UMRAM-Bilkent/supine-human-model
        const loader = new GLTFLoader();
        const candidateUrls = [
            "/static/assets/models/human_posed.glb",
            "/assets/models/human_posed.glb",
            "./assets/models/human_posed.glb",
            "assets/models/human_posed.glb"
        ];

        const tryLoad = (index) => {
            if (index >= candidateUrls.length) {
                console.warn("[Studio 3D] Không thể tải mô hình human_posed.glb từ bất kỳ đường dẫn nào; tiếp tục dùng mannequin tham số.");
                return;
            }
            const url = candidateUrls[index];
            loader.load(
                url,
                (gltf) => {
                    const human = gltf.scene;
                    const mannequinMaterial = this.material(MANNEQUIN_IVORY, { roughness: 0.72, metalness: 0.01, side: THREE.DoubleSide });
                    mannequinMaterial.flatShading = false;
                    mannequinMaterial.depthTest = true;
                    mannequinMaterial.depthWrite = true;
                    mannequinMaterial.polygonOffset = true;
                    mannequinMaterial.polygonOffsetFactor = 1;
                    mannequinMaterial.polygonOffsetUnits = 2;
                    // The source mesh faced opposite the garment/hair coordinate system.
                    human.rotation.y = -Math.PI / 2;
                    human.traverse((node) => {
                        if (!node.isMesh) return;
                        node.material = mannequinMaterial;
                        node.castShadow = true;
                        node.receiveShadow = true;
                        if (node.geometry) {
                            node.geometry = mergeVertices(node.geometry.clone(), 1e-4);
                            node.geometry.computeVertexNormals();
                        }
                    });

                    human.updateMatrixWorld(true);
                    const rawBox = new THREE.Box3().setFromObject(human);
                    const rawSize = rawBox.getSize(new THREE.Vector3());
                    const baseScale = rawSize.y > 0 ? 3.35 / rawSize.y : 0.6;
                    human.scale.setScalar(baseScale);
                    human.updateMatrixWorld(true);

                    const scaledBox = new THREE.Box3().setFromObject(human);
                    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
                    human.position.x -= scaledCenter.x;
                    human.position.y -= scaledBox.min.y;
                    human.position.z -= scaledCenter.z;
                    human.updateMatrixWorld(true);

                    const wrapper = new THREE.Group();
                    wrapper.add(human);
                    // Hiển thị mô hình người thật kết hợp trang phục
                    human.visible = true;
                    this.disposeGroup(this.bodyGroup);
                    this.bodyGroup.add(wrapper);
                    const smoothHead = this.mannequinHead(mannequinMaterial);
                    const neck = this.mannequinNeck(mannequinMaterial);
                    const skinDetails = new THREE.Group();
                    skinDetails.add(smoothHead, neck);
                    const extractedHands = this.extractHumanHands(human, mannequinMaterial);
                    if (extractedHands.children.length) {
                        skinDetails.add(extractedHands);
                    } else {
                        const shape = this.getShape();
                        const handX = shape.shoulderR * 0.94 + 0.02;
                        [-1, 1].forEach((side) => {
                            skinDetails.add(this.handWithFingers(side, side * handX, 1.39, -0.12, mannequinMaterial, shape.limbR));
                        });
                    }
                    this.skinDetailGroup = skinDetails;
                    this.bodyGroup.add(skinDetails);
                    this.realisticBody = wrapper;
                    this.realisticBodyMesh = human;
                    this.realisticBodyBaseScale = baseScale;
                    this.updateRealisticBodyShape();
                    this.render();
                },
                undefined,
                (error) => {
                    console.warn(`[Studio 3D] Không thể tải ${url}:`, error?.message || error);
                    tryLoad(index + 1);
                },
            );
        };

        tryLoad(0);
    }

    updateRealisticBodyShape() {
        if (!this.realisticBodyMesh) return;
        const m = this.measurements;
        const widthScale = THREE.MathUtils.clamp(
            ((m.chest / DEFAULT_MEASUREMENTS.chest + m.hip / DEFAULT_MEASUREMENTS.hip) / 2) * Math.pow(m.weight / DEFAULT_MEASUREMENTS.weight, 0.1),
            0.82,
            1.26,
        );
        const depthScale = THREE.MathUtils.clamp(
            (m.waist / DEFAULT_MEASUREMENTS.waist) * Math.pow(m.weight / DEFAULT_MEASUREMENTS.weight, 0.12),
            0.84,
            1.28,
        );
        this.realisticBodyMesh.scale.set(
            this.realisticBodyBaseScale * widthScale,
            this.realisticBodyBaseScale,
            this.realisticBodyBaseScale * depthScale,
        );
        if (this.skinDetailGroup) {
            this.skinDetailGroup.scale.set(
                THREE.MathUtils.clamp(widthScale, 0.9, 1.16),
                1,
                THREE.MathUtils.clamp(depthScale, 0.92, 1.14),
            );
        }
    }

    buildBody() {
        if (this.realisticBody) {
            this.updateRealisticBodyShape();
            const shape = this.getShape();
            this.modelRoot.scale.set(1, shape.heightScale, 1);
            this.controls.target.y = 1.7 * shape.heightScale;
            return;
        }
        this.disposeGroup(this.bodyGroup);
        const s = this.getShape();
        const skin = this.material(MANNEQUIN_IVORY, { roughness: 0.84, side: THREE.DoubleSide });
        skin.depthTest = true;
        skin.depthWrite = true;
        skin.polygonOffset = true;
        skin.polygonOffsetFactor = 1;
        skin.polygonOffsetUnits = 2;

        const torso = this.lathe([
            [s.hipR * 0.88, -0.63],
            [s.hipR, -0.48],
            [s.waistR, -0.12],
            [s.chestR * 0.9, 0.3],
            [0.2, 0.52],
            [0.15, 0.61],
        ], skin, s.depthScale);
        torso.position.y = 2.03;
        this.bodyGroup.add(torso);

        const neck = this.mannequinNeck(skin);
        // Mannequin trưng bày ngoài đời thường không có mắt, môi hay tóc.
        // Bề mặt đầu trơn tránh cảm giác "mặt giả" và không xuyên với khăn/nón.
        const head = this.mannequinHead(skin);
        this.bodyGroup.add(neck, head);

        const armX = s.shoulderR * 0.94;
        const handX = armX + 0.02;
        [-1, 1].forEach((side) => {
            // Tất cả bộ Việt phục trong studio đều có tay dài. Chỉ dựng bàn tay
            // ở ngoài ống tay để tránh cánh tay mannequin xuyên qua lớp vải.
            const hand = this.mesh(new THREE.CapsuleGeometry(s.limbR * 0.52, s.limbR * 0.72, 8, 16), skin, [side * handX, 1.34, 0.06], [0.78, 1, 0.66]);
            this.bodyGroup.add(hand);
        });

        // Chân mannequin không dựng dưới lớp quần/váy. Nhờ vậy sẽ không còn
        // mảng màu da lộ ra qua khe giữa hai ống quần khi đổi số đo.

        this.modelRoot.scale.set(1, s.heightScale, 1);
        this.modelRoot.position.y = 0;
        this.controls.target.y = 1.7 * s.heightScale;
    }

    createFabricTextures(color, style = "silk") {
        const size = 256;
        const canvas = document.createElement("canvas");
        const bumpCanvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        bumpCanvas.width = bumpCanvas.height = size;
        const ctx = canvas.getContext("2d");
        const bump = bumpCanvas.getContext("2d");
        const base = new THREE.Color(color);
        ctx.fillStyle = base.getStyle();
        ctx.fillRect(0, 0, size, size);
        bump.fillStyle = "rgb(128,128,128)";
        bump.fillRect(0, 0, size, size);

        if (style === "silk" || style === "matte-silk") {
            for (let x = 0; x < size; x += 2) {
                ctx.strokeStyle = x % 4 === 0 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.018)";
                ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, size); ctx.stroke();
                bump.strokeStyle = x % 4 === 0 ? "rgb(140,140,140)" : "rgb(118,118,118)";
                bump.beginPath(); bump.moveTo(x + 0.5, 0); bump.lineTo(x + 0.5, size); bump.stroke();
            }
        } else {
            const spacing = style === "brocade" ? 5 : 4;
            for (let i = 0; i < size; i += spacing) {
                ctx.strokeStyle = i % (spacing * 2) === 0 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.055)";
                ctx.beginPath(); ctx.moveTo(i + 0.5, 0); ctx.lineTo(i + 0.5, size); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i + 0.5); ctx.lineTo(size, i + 0.5); ctx.stroke();
                bump.strokeStyle = i % (spacing * 2) === 0 ? "rgb(153,153,153)" : "rgb(108,108,108)";
                bump.beginPath(); bump.moveTo(i + 0.5, 0); bump.lineTo(i + 0.5, size); bump.stroke();
                bump.beginPath(); bump.moveTo(0, i + 0.5); bump.lineTo(size, i + 0.5); bump.stroke();
            }
            if (style === "brocade") {
                for (let y = 32; y < size; y += 64) {
                    for (let x = 32; x < size; x += 64) {
                        ctx.strokeStyle = "rgba(255,224,148,0.2)";
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(x, y - 16); ctx.lineTo(x + 13, y); ctx.lineTo(x, y + 16); ctx.lineTo(x - 13, y); ctx.closePath();
                        ctx.stroke();
                        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke();
                        bump.strokeStyle = "rgb(172,172,172)";
                        bump.lineWidth = 2;
                        bump.beginPath();
                        bump.moveTo(x, y - 16); bump.lineTo(x + 13, y); bump.lineTo(x, y + 16); bump.lineTo(x - 13, y); bump.closePath();
                        bump.stroke();
                    }
                }
            }
        }

        const map = new THREE.CanvasTexture(canvas);
        map.colorSpace = THREE.SRGBColorSpace;
        const bumpMap = new THREE.CanvasTexture(bumpCanvas);
        [map, bumpMap].forEach((texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(style === "brocade" ? 2.4 : 7, style === "brocade" ? 3.5 : 11);
            texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
        });
        return { map, bumpMap };
    }

    fabricMaterial(color, style = "silk") {
        const profiles = {
            silk: { roughness: 0.34, sheen: 0.9, sheenRoughness: 0.24, clearcoat: 0.035, bumpScale: 0.004 },
            "matte-silk": { roughness: 0.5, sheen: 0.62, sheenRoughness: 0.46, clearcoat: 0.01, bumpScale: 0.006 },
            brocade: { roughness: 0.5, sheen: 0.68, sheenRoughness: 0.4, clearcoat: 0.02, bumpScale: 0.012 },
            linen: { roughness: 0.8, sheen: 0.14, sheenRoughness: 0.84, clearcoat: 0, bumpScale: 0.018 },
            woven: { roughness: 0.7, sheen: 0.2, sheenRoughness: 0.76, clearcoat: 0, bumpScale: 0.022 },
        };
        const profile = profiles[style] || profiles.silk;
        const textures = this.createFabricTextures(color, style);
        const mat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            map: textures.map,
            bumpMap: textures.bumpMap,
            bumpScale: profile.bumpScale,
            roughness: profile.roughness,
            metalness: 0.015,
            sheen: profile.sheen,
            sheenRoughness: profile.sheenRoughness,
            sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.22),
            clearcoat: profile.clearcoat,
            clearcoatRoughness: 0.45,
            side: THREE.DoubleSide,
        });
        mat.envMapIntensity = style === "silk" ? 0.72 : 0.42;
        mat.depthTest = true;
        mat.depthWrite = true;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -1;
        mat.polygonOffsetUnits = -1;
        return mat;
    }

    enforceGarmentLayering() {
        this.garmentGroup.traverse((node) => {
            if (!node.isMesh) return;
            node.renderOrder = 10;
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach((material) => {
                material.depthTest = true;
                material.depthWrite = true;
                material.polygonOffset = true;
                material.polygonOffsetFactor = -1;
                material.polygonOffsetUnits = -2;
            });
        });
    }

    addSleeves(group, material, style = "fitted", accentMaterial = null) {
        const s = this.getShape();
        const armX = s.shoulderR * 0.94;
        const elbowX = armX + 0.09;
        const handX = armX + 0.02;
        [-1, 1].forEach((side) => {
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(side * armX * 0.82, 2.43, -0.075),
                new THREE.Vector3(side * armX * 1.02, 2.38, -0.09),
                new THREE.Vector3(side * elbowX, 2.18, -0.12),
                new THREE.Vector3(side * elbowX, 1.93, -0.14),
                new THREE.Vector3(side * handX, 1.51, -0.12),
            ]);
            const radiusProfile = style === "wide"
                ? [s.limbR * 1.18, s.limbR * 1.55, s.limbR * 1.72, s.limbR * 1.78, s.limbR * 1.78]
                : [s.limbR * 1.04, s.limbR * 1.32, s.limbR * 1.28, s.limbR * 1.12, s.limbR * 0.96];
            const sleeve = this.taperedSleeve(curve, radiusProfile, material, 44, 20);
            group.add(sleeve);
            if (accentMaterial) {
                const cuffRadius = style === "wide" ? s.limbR * 2.18 : s.limbR * 0.98;
                const cuff = this.cylinderBetween(
                    [side * (handX + 0.012), 1.61, -0.12],
                    [side * handX, 1.48, -0.12],
                    cuffRadius,
                    accentMaterial,
                    cuffRadius,
                );
                group.add(cuff);
            }
        });
    }

    ethnicFabricMaterial() {
        const canvas = document.createElement("canvas");
        canvas.width = 192;
        canvas.height = 192;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#17365D";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const colors = ["#9E1A1A", "#D4AF37", "#F6E7C1"];
        for (let row = 0; row < 4; row += 1) {
            for (let col = 0; col < 4; col += 1) {
                const x = 24 + col * 48 + (row % 2 ? 24 : 0);
                const y = 24 + row * 48;
                ctx.fillStyle = colors[(row + col) % colors.length];
                ctx.beginPath();
                ctx.moveTo(x, y - 10);
                ctx.lineTo(x + 8, y);
                ctx.lineTo(x, y + 10);
                ctx.lineTo(x - 8, y);
                ctx.closePath();
                ctx.fill();
            }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2.5, 3.4);
        const weave = this.createFabricTextures("#17365D", "woven");
        weave.map.dispose();
        return new THREE.MeshPhysicalMaterial({
            map: texture,
            bumpMap: weave.bumpMap,
            bumpScale: 0.05,
            roughness: 0.66,
            metalness: 0.01,
            sheen: 0.28,
            sheenRoughness: 0.75,
            side: THREE.DoubleSide,
        });
    }

    openCoatShell(radiusTop, radiusBottom, height, y, material, depthScale) {
        const geometry = new THREE.CylinderGeometry(
            radiusTop,
            radiusBottom,
            height,
            64,
            8,
            true,
            Math.PI * 0.08,
            Math.PI * 1.84,
        );
        return this.mesh(geometry, material, [0, y, 0], [1, 1, depthScale]);
    }

    buildGarment() {
        this.disposeGroup(this.garmentGroup);
        const s = this.getShape();
        const id = this.outfit.garmentId;
        const fabricStyle = {
            ao_dai: "silk",
            ngu_than: "brocade",
            tu_than: "linen",
            nhat_binh: "brocade",
            ao_ba_ba: "matte-silk",
            trang_phuc_dan_toc: "woven",
        }[id] || "silk";
        const fabric = this.fabricMaterial(this.outfit.color || "#9E1A1A", fabricStyle);
        const gold = this.material(GOLD, { metalness: 0.25, roughness: 0.38 });
        let activeUpperMaterial = fabric;
        const fit = {
            ao_dai: { bust: 0.024, waist: 0.018, hip: 0.024, shoulder: 0.05, projection: 0.014 },
            ngu_than: { bust: 0.032, waist: 0.027, hip: 0.032, shoulder: 0.06, projection: 0.016 },
            tu_than: { bust: 0.038, waist: 0.032, hip: 0.04, shoulder: 0.065, projection: 0.017 },
            nhat_binh: { bust: 0.045, waist: 0.04, hip: 0.048, shoulder: 0.075, projection: 0.015 },
            ao_ba_ba: { bust: 0.035, waist: 0.032, hip: 0.038, shoulder: 0.06, projection: 0.016 },
            trang_phuc_dan_toc: { bust: 0.034, waist: 0.028, hip: 0.036, shoulder: 0.06, projection: 0.016 },
        }[id] || { bust: 0.03, waist: 0.025, hip: 0.03, shoulder: 0.055, projection: 0.016 };
        const clothDepth = Math.max(s.depthScale + 0.06, 0.76);
        const seamY = 1.48;
        const seamRx = s.hipR + fit.hip;
        const seamRz = seamRx * clothDepth + 0.022;

        const makeBodice = (material = fabric) => {
            // Một bề mặt liên tục từ cổ xuống hông. Hai vòng trên khép sát cổ rồi
            // mở ra vai, vì vậy áo luôn phủ vai thay vì biến thành áo trễ vai.
            return this.ellipticalShell([
                { y: seamY, rx: seamRx, rz: seamRz, sideContour: 0.01, backBulge: 0.016 },
                { y: 1.58, rx: s.hipR + fit.hip * 0.82, rz: (s.hipR + fit.hip * 0.82) * clothDepth + 0.018, sideContour: 0.012, backBulge: 0.02 },
                { y: 1.76, rx: s.waistR + fit.waist, rz: (s.waistR + fit.waist) * clothDepth + 0.014, sideContour: -0.014 },
                { y: 1.91, rx: THREE.MathUtils.lerp(s.waistR, s.chestR, 0.38) + fit.waist, rz: (THREE.MathUtils.lerp(s.waistR, s.chestR, 0.34) + fit.waist) * clothDepth + 0.015 },
                { y: 2.08, rx: s.chestR * 0.96 + fit.bust, rz: (s.chestR * 0.84 + fit.bust) * clothDepth + 0.018, frontBulge: 0.008 + fit.projection * 0.36 },
                { y: 2.17, rx: s.chestR + fit.bust, rz: (s.chestR * 0.87 + fit.bust) * clothDepth + 0.019, frontBulge: 0.009 + fit.projection * 0.48 },
                { y: 2.29, rx: THREE.MathUtils.lerp(s.chestR, s.shoulderR, 0.46) + fit.bust, rz: 0.315, frontBulge: 0.008 + fit.projection * 0.18 },
                { y: 2.41, rx: s.shoulderR + fit.shoulder, rz: 0.33, frontBulge: 0.008 },
                { y: 2.52, rx: s.shoulderR - 0.025, rz: 0.295, frontBulge: 0.006 },
                { y: 2.63, rx: 0.285, rz: 0.225, frontBulge: 0.004 },
                { y: 2.73, rx: 0.185, rz: 0.17 },
            ], material, { segments: 88, verticalSubdivisions: 4 });
        };

        const makeLowerShell = (material, topY, hemY, topRx, hemRx, options = {}) => {
            const topRz = options.topRz ?? topRx * clothDepth + 0.035;
            const hemRz = options.hemRz ?? hemRx * Math.max(clothDepth, 0.78) + 0.015;
            const foldAmplitude = options.foldAmplitude ?? 0.022;
            const foldCount = options.foldCount ?? 10;
            const ringAt = (amount, foldScale) => ({
                y: THREE.MathUtils.lerp(topY, hemY, amount),
                rx: THREE.MathUtils.lerp(topRx, hemRx, Math.pow(amount, 0.86)),
                rz: THREE.MathUtils.lerp(topRz, hemRz, Math.pow(amount, 0.86)),
                foldAmplitude: foldAmplitude * foldScale,
                foldCount,
                foldPhase: options.foldPhase || 0,
            });
            return this.ellipticalShell([
                { y: topY, rx: topRx, rz: topRz, frontBulge: options.frontBulge || 0 },
                { ...ringAt(0.15, 0.08), frontBulge: options.frontBulge || 0 },
                ringAt(0.32, 0.2),
                ringAt(0.5, 0.42),
                ringAt(0.68, 0.68),
                ringAt(0.84, 0.88),
                { y: hemY, rx: hemRx, rz: hemRz, foldAmplitude, foldCount, foldPhase: options.foldPhase || 0 },
            ], material, {
                segments: 72,
                thetaStart: options.thetaStart,
                thetaLength: options.thetaLength,
            });
        };

        const makeSplitPanels = (material, hemY, hemRx) => {
            const panels = new THREE.Group();
            const slit = 0.075;
            panels.add(
                makeLowerShell(material, seamY, hemY, seamRx, hemRx, {
                    topRz: seamRz,
                    thetaStart: -Math.PI / 2 + slit,
                    thetaLength: Math.PI - slit * 2,
                    frontBulge: 0.01,
                }),
                makeLowerShell(material, seamY, hemY, seamRx, hemRx, {
                    topRz: seamRz,
                    thetaStart: Math.PI / 2 + slit,
                    thetaLength: Math.PI - slit * 2,
                }),
            );
            return panels;
        };

        const addTailoringDetails = (material, includeCenterPlacket = true) => {
            const seamMaterial = material.clone();
            if (seamMaterial.color) seamMaterial.color.offsetHSL(0, -0.02, 0.07);
            seamMaterial.roughness = 0.5;
            [-1, 1].forEach((side) => {
                const curve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(side * 0.22, 2.42, 0.405),
                    new THREE.Vector3(side * 0.25, 2.2, (s.chestR + 0.055) * clothDepth + 0.095),
                    new THREE.Vector3(side * 0.2, 1.9, (s.waistR + 0.05) * clothDepth + 0.08),
                    new THREE.Vector3(side * 0.17, 1.62, seamRz + 0.035),
                    new THREE.Vector3(side * 0.2, seamY, seamRz + 0.028),
                ]);
                this.garmentGroup.add(this.mesh(new THREE.TubeGeometry(curve, 36, 0.0065, 8, false), seamMaterial));
            });
            if (includeCenterPlacket) {
                const placket = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(0, 2.68, 0.205),
                    new THREE.Vector3(0, 2.35, 0.43),
                    new THREE.Vector3(0, 1.95, (s.chestR + 0.04) * clothDepth + 0.09),
                    new THREE.Vector3(0, 1.5, seamRz + 0.03),
                ]);
                this.garmentGroup.add(this.mesh(new THREE.TubeGeometry(placket, 34, 0.0075, 8, false), seamMaterial));
            }
            const collarPiping = this.mesh(new THREE.TorusGeometry(0.187, 0.009, 10, 48), seamMaterial, [0, 2.7, 0]);
            collarPiping.rotation.x = Math.PI / 2;
            collarPiping.scale.y = 0.88;
            this.garmentGroup.add(collarPiping);
        };

        if (id === "ao_ba_ba") {
            const bodice = makeBodice();
            this.garmentGroup.add(bodice);
            this.addSleeves(this.garmentGroup, fabric, "fitted");
            const tunic = makeLowerShell(fabric, 1.82, 1.02, s.waistR + fit.waist + 0.012, s.hipR + fit.hip + 0.055, { frontBulge: 0.012, foldAmplitude: 0.012 });
            this.garmentGroup.add(tunic);
        } else if (id === "trang_phuc_dan_toc") {
            const blue = this.fabricMaterial("#17365D", "woven");
            const red = this.fabricMaterial("#9E1A1A", "woven");
            activeUpperMaterial = blue;
            const bodice = makeBodice(blue);
            this.garmentGroup.add(bodice);
            this.addSleeves(this.garmentGroup, blue, "fitted", red);
            const waistband = this.ellipticalShell([
                { y: 1.61, rx: s.waistR + 0.085, rz: (s.waistR + 0.085) * clothDepth },
                { y: 1.49, rx: s.waistR + 0.085, rz: (s.waistR + 0.085) * clothDepth },
            ], red);
            this.garmentGroup.add(waistband);
        } else if (id === "nhat_binh") {
            const bodice = makeBodice();
            this.garmentGroup.add(bodice);
            this.addSleeves(this.garmentGroup, fabric, "wide", gold);
            const coat = makeLowerShell(fabric, 1.82, 0.5, s.waistR + fit.waist + 0.02, s.hipR + fit.hip + 0.12, { frontBulge: 0.014, foldAmplitude: 0.018 });
            this.garmentGroup.add(coat);
        } else if (id === "tu_than") {
            const yem = this.fabricMaterial("#9E1A1A", "silk");
            const inner = this.ellipticalShell([
                { y: 1.42, rx: s.waistR + fit.waist, rz: (s.waistR + fit.waist) * clothDepth + 0.018 },
                { y: 1.72, rx: s.waistR + fit.waist, rz: (s.waistR + fit.waist) * clothDepth + 0.018, sideContour: -0.015 },
                { y: 1.92, rx: THREE.MathUtils.lerp(s.waistR, s.chestR, 0.5) + fit.bust, rz: (THREE.MathUtils.lerp(s.waistR, s.chestR, 0.5) + fit.bust) * clothDepth + 0.02 },
                { y: 2.1, rx: s.chestR + fit.bust, rz: (s.chestR + fit.bust) * clothDepth + 0.024, frontBulge: 0.014 + fit.projection * 0.72 },
                { y: 2.23, rx: s.chestR * 0.96 + fit.bust, rz: (s.chestR * 0.96 + fit.bust) * clothDepth + 0.02, frontBulge: 0.012 + fit.projection * 0.32 },
                { y: 2.34, rx: 0.29, rz: 0.27, frontBulge: 0.012 },
            ], yem, { segments: 64, thetaStart: -Math.PI / 2, thetaLength: Math.PI });
            const upperJacket = this.ellipticalShell([
                { y: 2.02, rx: s.chestR * 0.9 + fit.bust, rz: (s.chestR * 0.9 + fit.bust) * clothDepth + 0.02 },
                { y: 2.12, rx: s.chestR + fit.bust, rz: (s.chestR + fit.bust) * clothDepth + 0.024, frontBulge: 0.014 + fit.projection * 0.55 },
                { y: 2.24, rx: s.chestR * 0.98 + fit.bust, rz: (s.chestR * 0.98 + fit.bust) * clothDepth + 0.02, frontBulge: 0.012 + fit.projection * 0.24 },
                { y: 2.36, rx: s.shoulderR + fit.shoulder, rz: 0.38, frontBulge: 0.022 },
                { y: 2.46, rx: s.shoulderR + fit.shoulder * 0.65, rz: 0.35, frontBulge: 0.018 },
                { y: 2.55, rx: s.shoulderR - 0.04, rz: 0.305, frontBulge: 0.014 },
                { y: 2.64, rx: 0.29, rz: 0.235, frontBulge: 0.01 },
                { y: 2.73, rx: 0.185, rz: 0.17, frontBulge: 0.008 },
            ], fabric, { segments: 80 });
            // Áo tứ thân là một lớp áo ngoài mở phía trước; khe mở hẹp dần ở eo,
            // còn hai tà rủ tách nhau ở dưới thay vì hai tấm hộp phẳng.
            const outer = this.ellipticalShell([
                { y: 2.55, rx: 0.23, rz: 0.17 },
                { y: 2.45, rx: s.shoulderR + fit.shoulder, rz: 0.33 },
                { y: 2.22, rx: s.chestR * 0.98 + fit.bust, rz: (s.chestR * 0.98 + fit.bust) * clothDepth + 0.018, frontBulge: 0.012 + fit.projection * 0.2 },
                { y: 2.08, rx: s.chestR + fit.bust, rz: (s.chestR + fit.bust) * clothDepth + 0.02, frontBulge: 0.014 + fit.projection * 0.38 },
                { y: 1.88, rx: THREE.MathUtils.lerp(s.waistR, s.chestR, 0.42) + fit.waist, rz: (THREE.MathUtils.lerp(s.waistR, s.chestR, 0.42) + fit.waist) * clothDepth + 0.015 },
                { y: 1.68, rx: s.waistR + fit.waist + 0.018, rz: (s.waistR + fit.waist + 0.018) * clothDepth + 0.015, sideContour: -0.012 },
                { y: 1.45, rx: s.hipR + fit.hip + 0.03, rz: (s.hipR + fit.hip + 0.03) * clothDepth + 0.018 },
                { y: 1.05, rx: s.hipR + fit.hip + 0.13, rz: (s.hipR + fit.hip + 0.1) * clothDepth, foldAmplitude: 0.012, foldCount: 8 },
                { y: 0.29, rx: 0.65, rz: 0.5, foldAmplitude: 0.032, foldCount: 8 },
            ], fabric, { segments: 80, thetaStart: Math.PI * 0.09, thetaLength: Math.PI * 1.82 });
            this.garmentGroup.add(upperJacket, inner, outer);
            this.addSleeves(this.garmentGroup, fabric, "fitted");
            const sash = this.ellipticalShell([
                { y: 1.63, rx: s.waistR + 0.075, rz: (s.waistR + 0.075) * clothDepth },
                { y: 1.5, rx: s.waistR + 0.075, rz: (s.waistR + 0.075) * clothDepth },
            ], this.fabricMaterial("#1A5336", "linen"));
            this.garmentGroup.add(sash);
        } else if (id === "ngu_than") {
            const bodice = makeBodice();
            this.garmentGroup.add(bodice);
            this.addSleeves(this.garmentGroup, fabric, "fitted");
            const coat = makeSplitPanels(fabric, 0.27, 0.62);
            const collar = this.mesh(
                new THREE.CylinderGeometry(0.18, 0.19, 0.11, 40),
                fabric,
                [0, 2.63, 0],
                [1, 1, clothDepth],
            );
            this.garmentGroup.add(coat, collar);
        } else {
            const bodice = makeBodice();
            this.garmentGroup.add(bodice);
            this.addSleeves(this.garmentGroup, fabric, "fitted");
            const longPanel = makeSplitPanels(fabric, 0.24, 0.66);
            this.garmentGroup.add(longPanel);
        }

        this.addBottoms();
        this.enforceGarmentLayering();
    }

    addBottoms() {
        const s = this.getShape();
        const bottomDepth = Math.max(s.depthScale + 0.02, 0.72);
        const type = this.outfit.bottomType;
        const color = type === "pants_black" || type === "skirt_black" ? 0x171923 : 0xf5f0e7;
        const mat = type === "skirt_ethnic"
            ? this.ethnicFabricMaterial()
            : this.fabricMaterial(color, type.startsWith("skirt") ? "linen" : "silk");
        if (type === "skirt_black" || type === "skirt_ethnic") {
            const skirt = this.ellipticalShell([
                { y: 1.59, rx: s.waistR + 0.035, rz: (s.waistR + 0.035) * bottomDepth - 0.025 },
                { y: 1.34, rx: s.hipR + 0.035, rz: (s.hipR + 0.035) * bottomDepth - 0.02, foldAmplitude: 0.005, foldCount: 12 },
                { y: 0.72, rx: 0.54, rz: 0.46, foldAmplitude: 0.02, foldCount: 12 },
                { y: 0.2, rx: 0.63, rz: 0.53, foldAmplitude: 0.036, foldCount: 12 },
            ], mat, { segments: 72 });
            this.garmentGroup.add(skirt);
            return;
        }
        const hipBridge = this.ellipticalShell([
            { y: 1.55, rx: s.waistR - 0.01, rz: Math.max(0.2, (s.waistR - 0.01) * bottomDepth - 0.045) },
            { y: 1.34, rx: s.hipR - 0.025, rz: Math.max(0.23, (s.hipR - 0.025) * bottomDepth - 0.045) },
            { y: 1.0, rx: s.hipR * 0.7, rz: s.hipR * 0.56 },
        ], mat, { segments: 56 });
        this.garmentGroup.add(hipBridge);
        [-1, 1].forEach((side) => {
            const x = side * s.hipR * 0.36;
            const leg = this.ellipticalShell([
                { y: 1.08, x, rx: s.limbR * 1.35, rz: s.limbR * 1.35 * Math.max(bottomDepth, 0.82) },
                { y: 0.68, x, rx: s.limbR * 1.24, rz: s.limbR * 1.24 * Math.max(bottomDepth, 0.82) },
                { y: 0.14, x, rx: s.limbR * 1.12, rz: s.limbR * 1.12 * Math.max(bottomDepth, 0.82) },
            ], mat, { segments: 40 });
            this.garmentGroup.add(leg);
        });
    }

    buildAccessories() {
        this.disposeGroup(this.accessoryGroup);
        const s = this.getShape();
        const fabric = this.fabricMaterial(this.outfit.color || "#9E1A1A", "brocade");
        const darkTextile = this.fabricMaterial("#241B18", "linen");
        const wearingSkirt = this.outfit.bottomType === "skirt_black" || this.outfit.bottomType === "skirt_ethnic";
        if (wearingSkirt) {
            const legMaterial = this.material(MANNEQUIN_IVORY, { roughness: 0.76, side: THREE.DoubleSide });
            legMaterial.depthTest = true;
            legMaterial.depthWrite = true;
            legMaterial.polygonOffset = true;
            legMaterial.polygonOffsetFactor = 1;
            legMaterial.polygonOffsetUnits = 2;
            [-1, 1].forEach((side) => {
                const legX = side * s.hipR * 0.36;
                const legCurve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(legX, 1.28, -0.015),
                    new THREE.Vector3(legX * 0.94, 0.94, 0),
                    new THREE.Vector3(legX * 0.91, 0.64, 0.015),
                    new THREE.Vector3(legX * 0.96, 0.34, 0.02),
                    new THREE.Vector3(legX, 0.3, 0.025),
                ]);
                const leg = this.taperedSleeve(
                    legCurve,
                    [s.limbR * 1.18, s.limbR, s.limbR * 0.78, s.limbR * 0.62],
                    legMaterial,
                    42,
                    18,
                );
                leg.renderOrder = 1;
                this.accessoryGroup.add(leg);
            });
        }
        const hairMaterial = this.material(0x241914, { roughness: 0.82 });
        // Hair respects the head depth, but does not occlude headwear drawn later.
        hairMaterial.depthTest = true;
        hairMaterial.depthWrite = false;
        const hairGold = this.material(GOLD, { metalness: 0.42, roughness: 0.28 });

        const hairCap = this.mesh(
            new THREE.SphereGeometry(0.305, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.48),
            hairMaterial,
            [0, 3.16, -0.055],
            [0.96, 0.98, 0.75],
        );
        hairCap.renderOrder = 20;
        this.accessoryGroup.add(hairCap);

        const rearHairCap = this.mesh(
            new THREE.SphereGeometry(0.31, 40, 30, 0, Math.PI * 2, 0, Math.PI * 0.78),
            hairMaterial,
            [0, 3.09, -0.18],
            [0.98, 1.08, 0.65],
        );
        rearHairCap.renderOrder = 20;
        this.accessoryGroup.add(rearHairCap);

        if (this.outfit.hairstyle === "xoa_tu_nhien") {
            // Mái tóc được ghép từ nhiều lọn cong liên tục. Tất cả cùng nằm
            // trong modelRoot nên giữ đúng vị trí khi camera xoay quanh người.
            [-0.25, -0.19, -0.125, -0.06, 0, 0.06, 0.125, 0.19, 0.25].forEach((x, index) => {
                const sway = (index - 4) * 0.008;
                const endY = 1.82 + Math.abs(index - 4) * 0.035 + (index % 2) * 0.025;
                const backLockCurve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(x * 0.62, 3.17, -0.22),
                    new THREE.Vector3(x * 0.9, 2.88, -0.36),
                    new THREE.Vector3(x * 1.04 + sway, 2.45, -0.47),
                    new THREE.Vector3(x * 1.12 + sway * 2, endY, -0.51),
                ]);
                const backLock = this.taperedSleeve(backLockCurve, [0.048, 0.041, 0.024], hairMaterial, 40, 10);
                backLock.renderOrder = 20;
                this.accessoryGroup.add(backLock);
            });
            [-1, 1].forEach((side) => {
                const lockCurve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(side * 0.19, 3.12, 0.16),
                    new THREE.Vector3(side * 0.27, 2.82, 0.3),
                    new THREE.Vector3(side * 0.29, 2.5, 0.36),
                    new THREE.Vector3(side * 0.25, 2.18, 0.38),
                ]);
                const sideLock = this.taperedSleeve(lockCurve, [0.04, 0.034, 0.018], hairMaterial, 34, 10);
                sideLock.renderOrder = 20;
                this.accessoryGroup.add(sideLock);
            });
        } else if (this.outfit.hairstyle === "tet_duoi_sam") {
            const braidStrands = 3;
            let braidEnd = null;
            for (let strand = 0; strand < braidStrands; strand += 1) {
                const points = [];
                const phase = strand * Math.PI * 2 / braidStrands;
                for (let i = 0; i <= 30; i += 1) {
                    const t = i / 30;
                    const angle = t * Math.PI * 9 + phase;
                    const amplitude = 0.042 * (1 - t * 0.28);
                    const centerX = 0.16 + Math.sin(t * Math.PI) * 0.045;
                    const centerY = 3.04 - 1.24 * t;
                    // Đuôi sam luôn nằm ngoài sống lưng và mặt sau áo; điểm cuối
                    // không quay trở vào thân như đường cong cũ.
                    const centerZ = -0.3 - Math.sin(t * Math.PI) * 0.2 - t * 0.16;
                    const point = new THREE.Vector3(
                        centerX + Math.cos(angle) * amplitude,
                        centerY,
                        centerZ + Math.sin(angle) * amplitude,
                    );
                    points.push(point);
                    if (strand === 0 && i === 30) braidEnd = point;
                }
                const strandCurve = new THREE.CatmullRomCurve3(points);
                const strandMesh = this.mesh(new THREE.TubeGeometry(strandCurve, 72, 0.022, 9, false), hairMaterial);
                strandMesh.renderOrder = 20;
                this.accessoryGroup.add(strandMesh);
            }
            const hairTie = this.mesh(new THREE.TorusGeometry(0.043, 0.011, 10, 24), hairGold, [braidEnd.x, braidEnd.y - 0.035, braidEnd.z]);
            hairTie.rotation.x = Math.PI / 2;
            this.accessoryGroup.add(hairTie);
        } else {
            const naturalHead = this.outfit.headdress === "natural";
            // Búi tóc nằm cao và lùi khỏi dải khăn, vì thế vẫn nhìn thấy được dù
            // khăn/nón luôn được render trên tóc ở vùng thật sự giao nhau.
            const bunY = naturalHead ? 3.4 : 3.43;
            const bunZ = naturalHead ? -0.23 : -0.25;
            const bun = this.mesh(new THREE.SphereGeometry(0.18, 32, 22), hairMaterial, [0, bunY, bunZ], [1.14, 0.92, 0.86]);
            bun.renderOrder = 20;
            this.accessoryGroup.add(bun);
            if (naturalHead) {
                const hairpin = this.cylinderBetween([-0.16, 3.41, -0.09], [0.18, 3.43, -0.09], 0.011, hairGold, 0.011, 12);
                const pinGem = this.mesh(new THREE.SphereGeometry(0.027, 16, 10), hairGold, [0.18, 3.43, -0.09]);
                this.accessoryGroup.add(hairpin, pinGem);
            }
        }

        const headwear = this.outfit.headdress;
        const addHeadwear = (node) => {
            node.traverse((part) => {
                if (!part.isMesh) return;
                part.renderOrder = 100;
                const materials = Array.isArray(part.material) ? part.material : [part.material];
                materials.forEach((material) => {
                    material.depthTest = true;
                    material.depthWrite = true;
                    material.polygonOffset = true;
                    material.polygonOffsetFactor = -1;
                    material.polygonOffsetUnits = -1;
                });
            });
            this.accessoryGroup.add(node);
        };
        if (headwear === "khan_vanh") {
            // Ba vòng khăn mảnh ôm sát đỉnh đầu, không còn torus lớn xuyên qua mặt.
            [
                { radius: 0.265, tube: 0.04, y: 3.25 },
                { radius: 0.25, tube: 0.036, y: 3.295 },
                { radius: 0.235, tube: 0.032, y: 3.335 },
            ].forEach((band) => {
                const wrap = this.mesh(new THREE.TorusGeometry(band.radius, band.tube, 14, 48), fabric, [0, band.y, 0]);
                wrap.rotation.x = Math.PI / 2;
                addHeadwear(wrap);
            });
        } else if (headwear === "khan_dong" || headwear === "khan_mo_qua") {
            addHeadwear(this.mesh(new THREE.CylinderGeometry(0.25, 0.285, 0.14, 40), darkTextile, [0, 3.32, -0.015]));
        } else if (headwear === "khan_ran") {
            const scarf = new THREE.Group();
            const wrap = this.mesh(new THREE.TorusGeometry(0.268, 0.04, 12, 48), darkTextile, [0, 3.24, 0]);
            const stripe = this.mesh(new THREE.TorusGeometry(0.269, 0.012, 10, 48), this.material(0xf4f0e7), [0, 3.243, 0]);
            wrap.rotation.x = Math.PI / 2;
            stripe.rotation.x = Math.PI / 2;
            scarf.add(wrap, stripe);
            addHeadwear(scarf);
        } else if (headwear === "non_la" || headwear === "non_quai_thao") {
            const radius = headwear === "non_quai_thao" ? 0.68 : 0.52;
            const hat = this.mesh(new THREE.ConeGeometry(radius, 0.26, 64, 1, false), this.material(0xd8bd82, { side: THREE.DoubleSide }), [0, 3.47, -0.01]);
            addHeadwear(hat);
        }

        const addOuterAccessory = (node, renderOrder = 20) => {
            node.traverse((part) => {
                if (!part.isMesh) return;
                part.renderOrder = renderOrder;
                const materials = Array.isArray(part.material) ? part.material : [part.material];
                materials.forEach((material) => {
                    material.depthTest = true;
                    material.depthWrite = true;
                    material.polygonOffset = true;
                    material.polygonOffsetFactor = -1;
                    material.polygonOffsetUnits = -2;
                });
            });
            this.accessoryGroup.add(node);
        };

        const makeNeckCurve = (layer = 0, frontDrop = 0.06) => {
            const points = [];
            const radiusX = 0.225 + layer * 0.016;
            const radiusZ = 0.218 + layer * 0.015;
            for (let index = 0; index < 64; index += 1) {
                const angle = index / 64 * Math.PI * 2;
                const front = Math.max(0, Math.cos(angle));
                points.push(new THREE.Vector3(
                    Math.sin(angle) * radiusX,
                    2.685 - Math.pow(front, 1.7) * frontDrop,
                    Math.cos(angle) * radiusZ + front * (0.072 + layer * 0.008),
                ));
            }
            return new THREE.CatmullRomCurve3(points, true, "centripetal");
        };

        const addNeckAccessory = (node) => {
            addOuterAccessory(node, 35);
            node.traverse((part) => {
                if (!part.isMesh) return;
                const materials = Array.isArray(part.material) ? part.material : [part.material];
                materials.forEach((material) => {
                    material.polygonOffsetFactor = -2;
                    material.polygonOffsetUnits = -4;
                });
            });
        };

        const jewelry = this.outfit.jewelry;
        const silver = this.material(0xdfe7ed, { metalness: 0.72, roughness: 0.24 });
        if (jewelry === "vong_ngoc") {
            const wristX = s.shoulderR * 0.94 + 0.02;
            const jade = this.material(0x2f7d57, { metalness: 0.18, roughness: 0.22 });
            [-1, 1].forEach((side) => {
                const bracelet = this.mesh(
                    new THREE.TorusGeometry(0.135, 0.018, 12, 36),
                    jade,
                    [side * wristX, 1.49, -0.12],
                );
                bracelet.rotation.x = Math.PI / 2;
                addOuterAccessory(bracelet);
            });
        } else if (jewelry === "kieng_bac" || jewelry === "kieng_tho_cam") {
            const layers = jewelry === "kieng_tho_cam" ? 3 : 1;
            for (let i = 0; i < layers; i += 1) {
                const neckRing = this.mesh(
                    new THREE.TubeGeometry(makeNeckCurve(i, 0.045 + i * 0.018), 72, jewelry === "kieng_tho_cam" ? 0.011 : 0.014, 12, true),
                    silver,
                );
                addNeckAccessory(neckRing);
            }
        } else if (jewelry === "chuoi_ngoc_trai") {
            const pearl = this.material(0xf8f2e8, { metalness: 0.08, roughness: 0.18 });
            const pearlCurve = makeNeckCurve(0.45, 0.09);
            const pearlStrand = new THREE.Group();
            pearlStrand.add(this.mesh(
                new THREE.TubeGeometry(pearlCurve, 80, 0.004, 7, true),
                this.material(0xb9a98d, { metalness: 0.18, roughness: 0.45 }),
            ));
            const pearlCount = 38;
            for (let i = 0; i < pearlCount; i += 1) {
                const point = pearlCurve.getPointAt(i / pearlCount);
                const frontWeight = Math.max(0, point.z / 0.31);
                const beadRadius = THREE.MathUtils.lerp(0.014, 0.02, frontWeight);
                pearlStrand.add(this.mesh(new THREE.SphereGeometry(beadRadius, 16, 12), pearl, point.toArray()));
            }
            addNeckAccessory(pearlStrand);
        } else if (jewelry === "xa_tich_bac") {
            const chain = new THREE.Group();
            const chainCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0.24, 1.62, 0.39),
                new THREE.Vector3(0.38, 1.4, 0.43),
                new THREE.Vector3(0.32, 1.13, 0.45),
            ]);
            chain.add(this.mesh(new THREE.TubeGeometry(chainCurve, 28, 0.009, 8, false), silver));
            chain.add(this.mesh(new THREE.SphereGeometry(0.04, 16, 12), silver, [0.32, 1.08, 0.45]));
            addOuterAccessory(chain);
        }

        const shoeColor = {
            giay_da: 0x191919,
            hai_theu: 0x9e1a1a,
            dep_coi: 0xb8894d,
            guoc_moc: 0x7a4629,
        }[this.outfit.shoes] || 0x7a4629;
        const shoeMaterial = this.material(shoeColor, { roughness: this.outfit.shoes === "giay_da" ? 0.38 : 0.66 });
        const footwearSkin = this.material(MANNEQUIN_IVORY, { roughness: 0.76, side: THREE.DoubleSide });
        const trouserHemDepth = Math.max(s.depthScale + 0.02, 0.82);
        const trouserHemDiameter = s.limbR * 1.12 * trouserHemDepth * 2;
        [-1, 1].forEach((side) => {
            const x = side * s.hipR * 0.36;
            const shoe = this.shoeLast(
                x,
                shoeMaterial,
                this.outfit.shoes,
                side,
                footwearSkin,
                wearingSkirt ? 1.25 : 1,
            );
            // Flip only the front/back axis. X remains untouched, preserving
            // the correct left/right foot and toe anatomy.
            // Footwear and the visible mannequin legs must share the same
            // coordinate scale. Scaling shoes only for skirts displaced the
            // ankle joint vertically and broke the shin-to-foot connection.
            const footwearScale = 1;
            // Each shoe already uses the exact same per-leg X anchor as the
            // visible shin. Never apply a shared lateral offset to both feet.
            shoe.position.x = 0;
            shoe.position.z = 0.18 - trouserHemDiameter;
            shoe.scale.set(footwearScale, footwearScale, -footwearScale);
            addOuterAccessory(shoe);
        });

        // Trang sức cổ, túi và quạt tạm thời không dựng ở chế độ 3D vì các
        // chi tiết rời này dễ xuyên cổ/tay. Chúng vẫn có đầy đủ trong 2D.
    }

    updateOutfit(options = {}) {
        this.outfit = { ...this.outfit, ...options };
        this.buildGarment();
        this.buildAccessories();
        this.render();
    }

    updateMeasurements(options = {}) {
        this.measurements = { ...this.measurements, ...options };
        this.buildBody();
        this.buildGarment();
        this.buildAccessories();
        this.render();
    }

    resetCamera() {
        const heightScale = this.getShape().heightScale;
        this.camera.position.set(0, 1.7 * heightScale, 5.9 * Math.max(0.92, heightScale));
        this.controls.target.set(0, 1.7 * heightScale, 0);
        this.controls.update();
        this.render();
    }

    setAutoRotate(enabled) {
        this.controls.autoRotate = Boolean(enabled);
        this.controls.autoRotateSpeed = 1.6;
    }

    resize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        if (width > 0 && height > 0) {
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.render();
        } else {
            const fallbackWidth = this.container.parentElement?.clientWidth || 500;
            const fallbackHeight = this.container.parentElement?.clientHeight || 560;
            if (fallbackWidth > 0 && fallbackHeight > 0) {
                this.camera.aspect = fallbackWidth / fallbackHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(fallbackWidth, fallbackHeight);
                this.render();
            }
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    captureDataUrl() {
        this.render();
        return this.renderer.domElement.toDataURL("image/png");
    }

    animate() {
        this.controls.update();
        this.render();
        this.animationFrame = requestAnimationFrame(this.animate);
    }

    destroy() {
        cancelAnimationFrame(this.animationFrame);
        if (this.handleResize) {
            window.removeEventListener("resize", this.handleResize);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.controls.dispose();
        this.disposeGroup(this.bodyGroup);
        this.disposeGroup(this.garmentGroup);
        this.disposeGroup(this.accessoryGroup);
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }
}

export { DEFAULT_MEASUREMENTS };
