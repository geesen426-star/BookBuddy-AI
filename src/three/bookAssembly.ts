import * as THREE from 'three';
import {
  createBrushedMetalRoughnessMap,
  createIlluminatedPageTextures,
} from './proceduralTextures';

export interface MagicalBookHandle {
  group: THREE.Group;
  leftPageMat: THREE.MeshStandardMaterial;
  rightPageMat: THREE.MeshStandardMaterial;
  bookLight: THREE.PointLight;
  dispose: () => void;
}

function createCurvedPageGeometry(side: 'left' | 'right'): THREE.BufferGeometry {
  const width = 0.72;
  const height = 0.96;
  const segW = 20;
  const segH = 12;
  const geo = new THREE.PlaneGeometry(width, height, segW, segH);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const localX = pos.getX(i); // -width/2 .. +width/2
    // u goes 0 at spine -> 1 at outer page edge
    const u = side === 'right' ? (localX + width / 2) / width : (width / 2 - localX) / width;

    // Classic open-book S-arch: rises sharply near spine, crests, then settles gently
    const archZ = Math.sin(u * Math.PI) * 0.13 + Math.sin(u * Math.PI * 0.5) * 0.04;
    const worldX = side === 'right' ? u * width + 0.035 : -(u * width + 0.035);

    pos.setX(i, worldX);
    pos.setZ(i, archZ);
  }

  geo.computeVertexNormals();
  return geo;
}

function createCoverBoardShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, -h / 2 + r);
  s.lineTo(0, h / 2 - r);
  s.quadraticCurveTo(0, h / 2, r, h / 2);
  s.lineTo(w - r, h / 2);
  s.quadraticCurveTo(w, h / 2, w, h / 2 - r);
  s.lineTo(w, -h / 2 + r);
  s.quadraticCurveTo(w, -h / 2, w - r, -h / 2);
  s.lineTo(r, -h / 2);
  s.quadraticCurveTo(0, -h / 2, 0, -h / 2 + r);
  return s;
}

export function createMagicalBookAssembly(maxAnisotropy: number): MagicalBookHandle {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const metalRoughnessMap = createBrushedMetalRoughnessMap();
  disposables.push(metalRoughnessMap);

  const leftPageTex = createIlluminatedPageTextures(maxAnisotropy, 'left');
  const rightPageTex = createIlluminatedPageTextures(maxAnisotropy, 'right');
  disposables.push(
    leftPageTex.map,
    leftPageTex.emissiveMap,
    rightPageTex.map,
    rightPageTex.emissiveMap,
  );

  // 1. Brushed gold spine material (metalness > 0.85, low roughness)
  const goldTrimMat = new THREE.MeshPhysicalMaterial({
    color: 0xf5b942,
    metalness: 0.92,
    roughness: 0.22,
    roughnessMap: metalRoughnessMap,
    anisotropy: 0.8,
    emissive: 0x5c3604,
    emissiveIntensity: 0.35,
  });
  disposables.push(goldTrimMat);

  // 2. Luminous cyan-sapphire hardcover binding material (varied roughness >= 0.45)
  const coverMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f3b78,
    metalness: 0.42,
    roughness: 0.48,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.42,
  });
  disposables.push(coverMat);

  // 3. Page block edge material (stacked luminous pages)
  const pageStackMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    roughness: 0.65,
    metalness: 0.08,
    emissive: 0x0284c7,
    emissiveIntensity: 0.55,
  });
  disposables.push(pageStackMat);

  // 4. Illuminated open top page materials
  const leftPageMat = new THREE.MeshStandardMaterial({
    map: leftPageTex.map,
    emissiveMap: leftPageTex.emissiveMap,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 1.15,
    roughness: 0.42,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const rightPageMat = new THREE.MeshStandardMaterial({
    map: rightPageTex.map,
    emissiveMap: rightPageTex.emissiveMap,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 1.25,
    roughness: 0.42,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  disposables.push(leftPageMat, rightPageMat);

  // Part 1: Curved Spine Cradle
  const spineGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.06, 20, 1, false, Math.PI * 0.5, Math.PI);
  const spineMesh = new THREE.Mesh(spineGeo, goldTrimMat);
  spineMesh.rotation.y = Math.PI;
  spineMesh.position.set(0, 0, -0.07);
  group.add(spineMesh);
  disposables.push(spineGeo);

  // Part 2 & 3: Spine end-cap finials (top & bottom golden caps)
  const capGeo = new THREE.SphereGeometry(0.068, 16, 12);
  const topCap = new THREE.Mesh(capGeo, goldTrimMat);
  topCap.position.set(0, 0.53, -0.07);
  const botCap = new THREE.Mesh(capGeo, goldTrimMat);
  botCap.position.set(0, -0.53, -0.07);
  group.add(topCap, botCap);
  disposables.push(capGeo);

  // Part 4 & 5: Left & Right Beveled Hardcover Boards
  const boardShape = createCoverBoardShape(0.8, 1.06, 0.045);
  const boardGeo = new THREE.ExtrudeGeometry(boardShape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 3,
  });
  boardGeo.computeTangents();
  disposables.push(boardGeo);

  const rightCover = new THREE.Mesh(boardGeo, coverMat);
  rightCover.position.set(0.03, 0, -0.065);
  rightCover.rotation.y = -0.24;

  const leftCover = new THREE.Mesh(boardGeo, coverMat);
  leftCover.scale.x = -1;
  leftCover.position.set(-0.03, 0, -0.065);
  leftCover.rotation.y = 0.24;

  group.add(rightCover, leftCover);

  // Part 6 & 7: Gold Corner Trim Plates on Covers
  const trimGeo = new THREE.BoxGeometry(0.06, 1.04, 0.056);
  const rightOuterTrim = new THREE.Mesh(trimGeo, goldTrimMat);
  rightOuterTrim.position.set(0.77, 0, 0.02);
  rightCover.add(rightOuterTrim);

  const leftOuterTrim = new THREE.Mesh(trimGeo, goldTrimMat);
  leftOuterTrim.position.set(0.77, 0, 0.02);
  leftCover.add(leftOuterTrim);
  disposables.push(trimGeo);

  // Part 8 & 9: Left & Right Stacked Page Blocks
  const stackGeo = new THREE.BoxGeometry(0.71, 0.94, 0.075);
  const rightStack = new THREE.Mesh(stackGeo, pageStackMat);
  rightStack.position.set(0.4, 0, 0.02);
  rightStack.rotation.y = -0.22;

  const leftStack = new THREE.Mesh(stackGeo, pageStackMat);
  leftStack.position.set(-0.4, 0, 0.02);
  leftStack.rotation.y = 0.22;

  group.add(rightStack, leftStack);
  disposables.push(stackGeo);

  // Part 10 & 11: Curved Illuminated Top Open Pages
  const rightPageGeo = createCurvedPageGeometry('right');
  const rightPage = new THREE.Mesh(rightPageGeo, rightPageMat);
  rightPage.rotation.y = -0.2;
  rightPage.position.set(0, 0, 0.025);

  const leftPageGeo = createCurvedPageGeometry('left');
  const leftPage = new THREE.Mesh(leftPageGeo, leftPageMat);
  leftPage.rotation.y = 0.2;
  leftPage.position.set(0, 0, 0.025);

  group.add(rightPage, leftPage);
  disposables.push(rightPageGeo, leftPageGeo);

  // Part 12: Flowing Golden Ribbon Bookmark
  const ribbonCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.12, 0.04),
    new THREE.Vector3(0.03, -0.25, 0.11),
    new THREE.Vector3(0.08, -0.58, 0.16),
    new THREE.Vector3(0.14, -0.78, 0.09),
  ]);
  const ribbonGeo = new THREE.TubeGeometry(ribbonCurve, 24, 0.015, 8, false);
  const ribbonMesh = new THREE.Mesh(ribbonGeo, goldTrimMat);
  group.add(ribbonMesh);
  disposables.push(ribbonGeo);

  // Interior warm-cyan point light emanating from the open book
  const bookLight = new THREE.PointLight(0x38bdf8, 2.4, 5.5, 1.6);
  bookLight.position.set(0, 0.12, 0.45);
  group.add(bookLight);

  // Slight natural reading tilt
  group.rotation.x = -0.18;

  return {
    group,
    leftPageMat,
    rightPageMat,
    bookLight,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
