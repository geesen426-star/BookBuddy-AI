import * as THREE from 'three';

export function createIlluminatedPageTextures(
  maxAnisotropy: number,
  side: 'left' | 'right',
): { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } {
  const width = 512;
  const height = 640;

  // Diffuse / albedo page canvas
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(
    side === 'left' ? width : 0,
    0,
    side === 'left' ? 0 : width,
    0,
  );
  grad.addColorStop(0, '#0c234a');
  grad.addColorStop(0.18, '#16457d');
  grad.addColorStop(0.6, '#1f64ab');
  grad.addColorStop(1, '#2ca8e0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle parchment-cyber border
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.72)';
  ctx.lineWidth = 4;
  ctx.strokeRect(26, 26, width - 52, height - 52);

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.48)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // Emissive map canvas (glowing runes, illuminated header & arcane text lines)
  const emCanvas = document.createElement('canvas');
  emCanvas.width = width;
  emCanvas.height = height;
  const ectx = emCanvas.getContext('2d')!;

  ectx.fillStyle = '#06152c';
  ectx.fillRect(0, 0, width, height);

  const glowGrad = ectx.createRadialGradient(
    width * (side === 'left' ? 0.62 : 0.38),
    height * 0.42,
    24,
    width * 0.5,
    height * 0.5,
    width * 0.72,
  );
  glowGrad.addColorStop(0, '#38bdf8');
  glowGrad.addColorStop(0.55, '#0ea5e9');
  glowGrad.addColorStop(1, '#082040');
  ectx.fillStyle = glowGrad;
  ectx.fillRect(28, 28, width - 56, height - 56);

  // Illuminated corner sigil
  const drawSigil = (cx: number, cy: number, r: number, color: string) => {
    ectx.save();
    ectx.strokeStyle = color;
    ectx.lineWidth = 2;
    ectx.beginPath();
    ectx.arc(cx, cy, r, 0, Math.PI * 2);
    ectx.stroke();
    ectx.beginPath();
    ectx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ectx.stroke();
    ectx.restore();
  };

  if (side === 'left') {
    drawSigil(width * 0.5, 130, 34, 'rgba(253, 224, 71, 0.9)');
  } else {
    drawSigil(width * 0.5, 130, 34, 'rgba(165, 243, 252, 0.95)');
  }

  // Stylized glowing script lines on both color & emissive maps
  const startY = 205;
  const lineCount = 15;
  for (let i = 0; i < lineCount; i++) {
    const y = startY + i * 24;
    const isBreak = i === 5 || i === 11;
    const lineW = isBreak ? width * 0.42 : width * (0.58 + ((i * 19) % 16) * 0.01);
    const x = (width - lineW) * 0.5;

    ctx.fillStyle = i % 5 === 0 ? 'rgba(253, 224, 71, 0.65)' : 'rgba(224, 242, 254, 0.55)';
    ctx.fillRect(x, y, lineW, 4);

    ectx.fillStyle = i % 5 === 0 ? 'rgba(253, 224, 71, 0.85)' : 'rgba(186, 230, 253, 0.82)';
    ectx.fillRect(x, y, lineW, 4);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const emissiveMap = new THREE.CanvasTexture(emCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = maxAnisotropy;

  return { map, emissiveMap };
}

export function createBrushedMetalRoughnessMap(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#404040';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const v = 50 + Math.floor(Math.sin(y * 0.6) * 18 + ((y * 37) % 25));
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, size, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createEnergyRingTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const width = 1024;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, width, height);

  // Luminous gradient band
  const bandGrad = ctx.createLinearGradient(0, 0, width, 0);
  bandGrad.addColorStop(0, 'rgba(34, 211, 238, 0.15)');
  bandGrad.addColorStop(0.25, 'rgba(59, 130, 246, 0.55)');
  bandGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.65)');
  bandGrad.addColorStop(0.75, 'rgba(251, 191, 36, 0.5)');
  bandGrad.addColorStop(1, 'rgba(34, 211, 238, 0.15)');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, height * 0.42, width, height * 0.16);

  // Fine astronomical tick marks & dots
  for (let i = 0; i < 64; i++) {
    const x = (i / 64) * width;
    const isMajor = i % 8 === 0;
    ctx.fillStyle = isMajor ? 'rgba(253, 224, 71, 0.95)' : 'rgba(165, 243, 252, 0.7)';
    ctx.fillRect(x, isMajor ? height * 0.24 : height * 0.34, isMajor ? 4 : 2, isMajor ? height * 0.52 : height * 0.32);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createParticleSpriteTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.28, 'rgba(190, 242, 255, 0.85)');
  grad.addColorStop(0.62, 'rgba(96, 165, 250, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
