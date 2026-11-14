import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createMagicalBookAssembly } from '../three/bookAssembly';
import {
  createEnergyRingTexture,
  createParticleSpriteTexture,
} from '../three/proceduralTextures';

interface MagicBookSphereProps {
  /** 'welcome' centers and highlights the sphere; 'journey' gently dims and recesses it behind cards */
  stageMode: 'welcome' | 'journey';
  /** Optional callback to notify parent when user actively drags the sphere */
  onInteractChange?: (interacting: boolean) => void;
  /** Optional callback triggered when anyone taps/clicks the sphere 7 times */
  onSevenTaps?: () => void;
}

// Pre-allocated module-scope scratch objects to avoid GC in animation loop
const _scratchMatrix = new THREE.Matrix4();
const _scratchVec3 = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();
const _scratchScale = new THREE.Vector3(1, 1, 1);

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function MagicBookSphere({
  stageMode,
  onInteractChange,
  onSevenTaps,
}: MagicBookSphereProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stageModeRef = useRef(stageMode);
  const onInteractRef = useRef(onInteractChange);
  const onSevenTapsRef = useRef(onSevenTaps);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    stageModeRef.current = stageMode;
  }, [stageMode]);

  useEffect(() => {
    onInteractRef.current = onInteractChange;
  }, [onInteractChange]);

  useEffect(() => {
    onSevenTapsRef.current = onSevenTaps;
  }, [onSevenTaps]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSoftwareGl = detectSoftwareWebGL();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setContextLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a18);
    scene.fog = new THREE.FogExp2(0x050a18, 0.026);

    // Studio environment reflection for glass & metallic gold trims
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    const updateCameraDistance = (w: number, h: number) => {
      const aspect = w / Math.max(h, 1);
      // Frame the sphere cleanly on narrow portrait screens and wide desktop screens
      const targetZ = aspect < 0.75 ? 9.6 : aspect < 1.1 ? 8.2 : 6.7;
      camera.position.set(0, 0.12, targetZ);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    };
    updateCameraDistance(width, height);

    // Three-point + warm/cool lighting rig
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0b1229, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe4b5, 1.5);
    keyLight.position.set(4.5, 5.5, 5.0);
    scene.add(keyLight);

    const purpleRimLight = new THREE.PointLight(0xa855f7, 3.2, 16, 1.4);
    purpleRimLight.position.set(-4.2, 2.8, -2.5);
    scene.add(purpleRimLight);

    const cyanFillLight = new THREE.PointLight(0x22d3ee, 2.6, 15, 1.4);
    cyanFillLight.position.set(3.5, -2.5, 2.2);
    scene.add(cyanFillLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const disposables: Array<{ dispose: () => void }> = [envTarget];

    // Root interactive sphere group (user drags this)
    const sphereRoot = new THREE.Group();
    scene.add(sphereRoot);

    // 1. Central Floating Open Magical Book inside the sphere
    const book = createMagicalBookAssembly(maxAniso);
    book.group.scale.setScalar(0.86);
    sphereRoot.add(book.group);

    // 2. Luminous Particle-Wave Sphere Shell (blue -> cyan -> purple -> gold crest)
    const shellCount = isSoftwareGl ? 3200 : 6200;
    const shellPositions = new Float32Array(shellCount * 3);
    const shellSeeds = new Float32Array(shellCount);
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const baseRadius = 2.02;

    for (let i = 0; i < shellCount; i++) {
      const t = (i + 0.5) / shellCount;
      const phi = Math.acos(1 - 2 * t);
      const theta = (2 * Math.PI * i) / goldenRatio;

      const x = Math.sin(phi) * Math.cos(theta) * baseRadius;
      const y = Math.cos(phi) * baseRadius;
      const z = Math.sin(phi) * Math.sin(theta) * baseRadius;

      shellPositions[i * 3] = x;
      shellPositions[i * 3 + 1] = y;
      shellPositions[i * 3 + 2] = z;
      shellSeeds[i] = (i * 0.6180339887) % 1;
    }

    const shellGeo = new THREE.BufferGeometry();
    shellGeo.setAttribute('position', new THREE.BufferAttribute(shellPositions, 3));
    shellGeo.setAttribute('aSeed', new THREE.BufferAttribute(shellSeeds, 1));
    disposables.push(shellGeo);

    const shellMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uOpacityScale: { value: 1.0 },
      },
      vertexShader: `
        attribute float aSeed;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vHeight;
        varying float vSeed;
        varying float vFresnel;

        void main() {
          vSeed = aSeed;
          vec3 dir = normalize(position);

          // Organic harmonic wave displacement like an acoustic / magical energy field
          float wave1 = sin(dir.x * 4.2 + uTime * 0.9) * cos(dir.y * 3.8 - uTime * 0.7);
          float wave2 = sin(dir.z * 5.0 + dir.y * 4.0 + uTime * 1.15);
          float ripple = (wave1 * 0.11 + wave2 * 0.065) * (0.45 + 0.55 * smoothstep(-0.3, 0.9, dir.y));

          vec3 displaced = position + dir * ripple;
          vHeight = clamp((dir.y + 1.0) * 0.5 + ripple * 1.8, 0.0, 1.0);

          vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
          vec3 viewDir = normalize(-mvPosition.xyz);
          vec3 worldNormal = normalize(normalMatrix * dir);
          vFresnel = pow(1.0 - abs(dot(viewDir, worldNormal)), 1.6);

          gl_PointSize = (11.5 + aSeed * 8.5 + vFresnel * 7.0) * uPixelRatio / max(-mvPosition.z, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uOpacityScale;
        varying float vHeight;
        varying float vSeed;
        varying float vFresnel;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.06, dist);

          vec3 cyan = vec3(0.13, 0.85, 0.96);
          vec3 blue = vec3(0.24, 0.52, 0.98);
          vec3 purple = vec3(0.72, 0.36, 0.98);
          vec3 gold = vec3(0.99, 0.78, 0.25);

          vec3 col = mix(cyan, blue, smoothstep(0.08, 0.48, vHeight));
          col = mix(col, purple, smoothstep(0.45, 0.92, vHeight));
          // Subtle golden sparkle on select particles
          float goldMask = step(0.91, vSeed);
          col = mix(col, gold, goldMask * 0.85);

          float brightness = 0.58 + vFresnel * 0.68;
          gl_FragColor = vec4(col * (1.15 + vFresnel * 0.4), alpha * brightness * uOpacityScale);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    disposables.push(shellMat);

    const particleSphere = new THREE.Points(shellGeo, shellMat);
    sphereRoot.add(particleSphere);

    // 3. Outer Optical Glass Sphere Shell (premium 3D glass effect)
    const glassGeo = new THREE.SphereGeometry(2.08, 48, 36);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbfe8ff,
      metalness: 0.0,
      roughness: 0.06,
      transmission: isSoftwareGl ? 0 : 0.92,
      transparent: true,
      opacity: isSoftwareGl ? 0.16 : 0.95,
      ior: 1.48,
      thickness: 1.2,
      attenuationColor: new THREE.Color(0x1e3a8a),
      attenuationDistance: 4.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    const glassSphere = new THREE.Mesh(glassGeo, glassMat);
    glassSphere.renderOrder = 3;
    sphereRoot.add(glassSphere);
    disposables.push(glassGeo, glassMat);

    // 4. Fresnel Aura Rim Shell (custom GLSL outer atmospheric glow)
    const fresnelGeo = new THREE.SphereGeometry(2.14, 48, 36);
    const fresnelMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacityScale: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying vec3 vLocalPos;
        void main() {
          vLocalPos = normalize(position);
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacityScale;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying vec3 vLocalPos;

        void main() {
          vec3 viewDir = normalize(vViewPos);
          float rim = pow(1.0 - max(0.0, dot(viewDir, vNormal)), 3.2);
          float band = smoothstep(-0.6, 0.8, vLocalPos.y + sin(vLocalPos.x * 3.0 + uTime * 0.7) * 0.12);
          vec3 cyanRim = vec3(0.14, 0.86, 0.98);
          vec3 purpleRim = vec3(0.68, 0.34, 0.98);
          vec3 col = mix(cyanRim, purpleRim, band);
          gl_FragColor = vec4(col, rim * 0.62 * uOpacityScale);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const fresnelMesh = new THREE.Mesh(fresnelGeo, fresnelMat);
    fresnelMesh.renderOrder = 4;
    sphereRoot.add(fresnelMesh);
    disposables.push(fresnelGeo, fresnelMat);

    // 5. Tilted Energy Rings (3 distinct parts + instanced orbital motes)
    const ringsGroup = new THREE.Group();
    sphereRoot.add(ringsGroup);

    const ringTex = createEnergyRingTexture(maxAniso);
    disposables.push(ringTex);

    // Ring A: Astronomical Cyan/Gold Rune Band
    const ringAGeo = new THREE.CylinderGeometry(2.38, 2.38, 0.16, 72, 1, true);
    const ringAMat = new THREE.MeshBasicMaterial({
      map: ringTex,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ringA = new THREE.Mesh(ringAGeo, ringAMat);
    ringA.rotation.set(0.42, 0.2, 0.32);
    ringsGroup.add(ringA);
    disposables.push(ringAGeo, ringAMat);

    // Ring B: Sleek Violet-Blue Energy Torus
    const ringBGeo = new THREE.TorusGeometry(2.56, 0.013, 12, 96);
    const ringBMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringB = new THREE.Mesh(ringBGeo, ringBMat);
    ringB.rotation.set(-0.68, 0.35, -0.25);
    ringsGroup.add(ringB);
    disposables.push(ringBGeo, ringBMat);

    // Ring C: Delicate Golden Equatorial Orbit Ring
    const ringCGeo = new THREE.TorusGeometry(2.26, 0.009, 10, 96);
    const ringCMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringC = new THREE.Mesh(ringCGeo, ringCMat);
    ringC.rotation.set(1.18, -0.45, 0.15);
    ringsGroup.add(ringC);
    disposables.push(ringCGeo, ringCMat);

    // Orbital glowing beads on the rings via InstancedMesh
    const beadCount = 24;
    const beadGeo = new THREE.SphereGeometry(0.026, 10, 10);
    const beadMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beadInstances = new THREE.InstancedMesh(beadGeo, beadMat, beadCount);
    const beadColor = new THREE.Color();
    for (let i = 0; i < beadCount; i++) {
      const palette = i % 3 === 0 ? 0xfbbf24 : i % 3 === 1 ? 0x22d3ee : 0xc084fc;
      beadColor.setHex(palette);
      beadInstances.setColorAt(i, beadColor);
      const angle = (i / beadCount) * Math.PI * 2;
      _scratchVec3.set(Math.cos(angle) * 2.56, Math.sin(angle) * 2.56, 0);
      _scratchMatrix.compose(_scratchVec3, _scratchQuat.identity(), _scratchScale);
      beadInstances.setMatrixAt(i, _scratchMatrix);
    }
    beadInstances.instanceMatrix.needsUpdate = true;
    if (beadInstances.instanceColor) beadInstances.instanceColor.needsUpdate = true;
    beadInstances.computeBoundingSphere();
    ringB.add(beadInstances);
    disposables.push(beadGeo, beadMat);

    // 6. Magical Floating Dust & Rising Motes inside & around the Sphere
    const spriteTex = createParticleSpriteTexture();
    disposables.push(spriteTex);

    const moteCount = 140;
    const motePositions = new Float32Array(moteCount * 3);
    const moteColors = new Float32Array(moteCount * 3);
    const moteBaseData: Array<{ angle: number; radius: number; y: number; speed: number }> = [];
    const tmpColor = new THREE.Color();

    for (let i = 0; i < moteCount; i++) {
      const r = 0.35 + Math.random() * 1.45;
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 2.6;
      moteBaseData.push({
        angle,
        radius: r,
        y,
        speed: 0.2 + Math.random() * 0.45,
      });
      motePositions[i * 3] = Math.cos(angle) * r;
      motePositions[i * 3 + 1] = y;
      motePositions[i * 3 + 2] = Math.sin(angle) * r;

      const pick = i % 4;
      tmpColor.setHex(
        pick === 0 ? 0xfbbf24 : pick === 1 ? 0x22d3ee : pick === 2 ? 0x60a5fa : 0xc084fc,
      );
      moteColors[i * 3] = tmpColor.r;
      moteColors[i * 3 + 1] = tmpColor.g;
      moteColors[i * 3 + 2] = tmpColor.b;
    }

    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
    moteGeo.setAttribute('color', new THREE.BufferAttribute(moteColors, 3));
    const moteMat = new THREE.PointsMaterial({
      size: 0.085,
      map: spriteTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const motes = new THREE.Points(moteGeo, moteMat);
    sphereRoot.add(motes);
    disposables.push(moteGeo, moteMat);

    // 7. Cosmic Futuristic Library Starfield Background
    const starCount = 380;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 28;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      starPositions[i * 3 + 2] = -4 - Math.random() * 14;

      const c = i % 5 === 0 ? 0xfde68a : i % 3 === 0 ? 0x7dd3fc : 0xc4b5fd;
      tmpColor.setHex(c);
      starColors[i * 3] = tmpColor.r;
      starColors[i * 3 + 1] = tmpColor.g;
      starColors[i * 3 + 2] = tmpColor.b;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.075,
      map: spriteTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const starfield = new THREE.Points(starGeo, starMat);
    scene.add(starfield);
    disposables.push(starGeo, starMat);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // --- Interactive Drag Rotation + Natural Inertia + Idle Auto-Rotation ---
    let isDragging = false;
    let activePointerId: number | null = null;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let rotY = 0.15;
    let rotX = 0.05;
    let velY = 0;
    let velX = 0;
    let lastInteractTimestamp = 0;

    let downX = 0;
    let downY = 0;
    let downTime = 0;
    let tapCount = 0;
    let lastTapTime = 0;

    const canvasEl = renderer.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isDragging = true;
      activePointerId = e.pointerId;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      downX = e.clientX;
      downY = e.clientY;
      downTime = performance.now();
      velX = 0;
      velY = 0;
      lastInteractTimestamp = performance.now();
      canvasEl.style.cursor = 'grabbing';
      canvasEl.setPointerCapture?.(e.pointerId);
      onInteractRef.current?.(true);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || e.pointerId !== activePointerId) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;

      const sensitivity = 0.0065;
      const deltaRotY = dx * sensitivity;
      const deltaRotX = dy * sensitivity;

      rotY += deltaRotY;
      rotX = THREE.MathUtils.clamp(rotX + deltaRotX, -1.15, 1.15);

      // Impart instantaneous angular velocity for smooth inertia after release
      velY = THREE.MathUtils.lerp(velY, deltaRotY * 55, 0.55);
      velX = THREE.MathUtils.lerp(velX, deltaRotX * 55, 0.55);
      lastInteractTimestamp = performance.now();
    };

    const endDrag = (e: PointerEvent) => {
      if (!isDragging || e.pointerId !== activePointerId) return;
      isDragging = false;
      activePointerId = null;
      canvasEl.style.cursor = 'grab';
      const now = performance.now();
      lastInteractTimestamp = now;
      canvasEl.releasePointerCapture?.(e.pointerId);
      onInteractRef.current?.(false);

      // Register genuine tap/click (minimal movement, short press)
      if (e.type === 'pointerup') {
        const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
        const heldMs = now - downTime;
        if (moved < 20 && heldMs < 600) {
          if (now - lastTapTime <= 1800) {
            tapCount += 1;
          } else {
            tapCount = 1;
          }
          lastTapTime = now;
          if (tapCount >= 7) {
            tapCount = 0;
            onSevenTapsRef.current?.();
          }
        }
      }
    };

    canvasEl.addEventListener('pointerdown', handlePointerDown);
    canvasEl.addEventListener('pointermove', handlePointerMove);
    canvasEl.addEventListener('pointerup', endDrag);
    canvasEl.addEventListener('pointercancel', endDrag);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      shellMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      updateCameraDistance(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    let currentJourneyBlend = stageModeRef.current === 'journey' ? 1 : 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.1);
      const elapsed = clock.getElapsedTime();
      const motionMult = prefersReducedMotion ? 0.15 : 1.0;

      // Smoothly transition sphere scale & glow when switching between welcome & journey screens
      const targetBlend = stageModeRef.current === 'journey' ? 1 : 0;
      currentJourneyBlend = THREE.MathUtils.damp(currentJourneyBlend, targetBlend, 4.5, dt);

      const targetScale = THREE.MathUtils.lerp(1.0, 0.84, currentJourneyBlend);
      sphereRoot.scale.setScalar(targetScale);

      const opacityScale = THREE.MathUtils.lerp(1.0, 0.42, currentJourneyBlend);
      shellMat.uniforms.uOpacityScale.value = opacityScale;
      fresnelMat.uniforms.uOpacityScale.value = opacityScale;
      ringAMat.opacity = 0.72 * opacityScale;
      ringBMat.opacity = 0.68 * opacityScale;
      ringCMat.opacity = 0.55 * opacityScale;
      moteMat.opacity = 0.85 * opacityScale;

      // Apply inertia and idle auto-rotation
      if (!isDragging) {
        // Exponential inertia decay
        const dampingFactor = Math.exp(-3.4 * dt);
        velY *= dampingFactor;
        velX *= dampingFactor;

        rotY += velY * dt;
        rotX = THREE.MathUtils.clamp(rotX + velX * dt, -1.15, 1.15);

        // Gently return vertical tilt toward balanced horizon when idle
        const idleSince = (performance.now() - lastInteractTimestamp) * 0.001;
        if (idleSince > 0.65 && Math.abs(velY) < 0.12) {
          const autoSpeed = 0.16 * motionMult;
          rotY += autoSpeed * dt;
          rotX = THREE.MathUtils.damp(rotX, 0.06, 1.2, dt);
        }
      }

      sphereRoot.rotation.y = rotY;
      sphereRoot.rotation.x = rotX;

      // Gentle book levitation and luminous pulse inside the sphere
      book.group.position.y = Math.sin(elapsed * 1.45 * motionMult) * 0.085;
      book.group.rotation.z = Math.sin(elapsed * 0.8 * motionMult) * 0.035;
      book.bookLight.intensity = 2.2 + Math.sin(elapsed * 2.1) * 0.35;
      book.leftPageMat.emissiveIntensity = 1.12 + Math.sin(elapsed * 1.8) * 0.15;
      book.rightPageMat.emissiveIntensity = 1.22 + Math.cos(elapsed * 1.8) * 0.15;

      // Energy ring harmonic rotations
      ringA.rotation.z += 0.22 * dt * motionMult;
      ringB.rotation.z -= 0.31 * dt * motionMult;
      ringC.rotation.y += 0.26 * dt * motionMult;

      // Update particle-sphere shader & floating motes
      shellMat.uniforms.uTime.value = elapsed * motionMult;
      fresnelMat.uniforms.uTime.value = elapsed * motionMult;

      const motePosAttr = moteGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < moteCount; i++) {
        const m = moteBaseData[i];
        const a = m.angle + elapsed * m.speed * 0.35 * motionMult;
        const y = ((m.y + elapsed * m.speed * 0.22 * motionMult + 1.3) % 2.6) - 1.3;
        const radialScale = Math.sqrt(Math.max(0.15, 1.0 - (y / 1.85) * (y / 1.85)));
        motePosAttr.setXYZ(
          i,
          Math.cos(a) * m.radius * radialScale,
          y,
          Math.sin(a) * m.radius * radialScale,
        );
      }
      motePosAttr.needsUpdate = true;

      starfield.rotation.y = elapsed * 0.015 * motionMult;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      canvasEl.removeEventListener('pointerdown', handlePointerDown);
      canvasEl.removeEventListener('pointermove', handlePointerMove);
      canvasEl.removeEventListener('pointerup', endDrag);
      canvasEl.removeEventListener('pointercancel', endDrag);
      canvasEl.removeEventListener('webglcontextlost', handleContextLost);
      canvasEl.removeEventListener('webglcontextrestored', handleContextRestored);

      book.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (canvasEl.parentNode === container) {
        container.removeChild(canvasEl);
      }
    };
  }, []);

  if (contextLost) {
    return (
      <div
        className="fixed inset-0 z-0 flex items-center justify-center bg-[#050a18]"
        aria-hidden="true"
      >
        <div className="h-72 w-72 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(168,85,247,0.45),rgba(34,211,238,0.28)_50%,rgba(5,10,24,0.9)_75%)] shadow-[0_0_90px_rgba(56,189,248,0.35)]" />
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 z-0 h-full w-full select-none"
      aria-label="Interactive 3D magical sphere containing a floating open book"
    />
  );
}
