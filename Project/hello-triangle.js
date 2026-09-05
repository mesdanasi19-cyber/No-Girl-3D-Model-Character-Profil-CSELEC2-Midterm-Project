/** Helper method to output an error message to the screen */
function showError(errorText) {
  const errorBoxDiv = document.getElementById('error-box');
  const errorSpan = document.createElement('p');
  errorSpan.innerText = errorText;
  errorBoxDiv.appendChild(errorSpan);
  console.error(errorText);
}

//
// --- Small self-contained mat4 math helpers (column-major, WebGL style) ---
//

function mat4Multiply(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

function mat4Perspective(fovyRadians, aspect, near, far) {
  const f = 1.0 / Math.tan(fovyRadians / 2);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

function mat4LookAt(eye, target, up) {
  let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len; zy /= len; zz /= len;

  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  len = Math.hypot(xx, xy, xz);
  if (len === 0) { xx = 0; xy = 0; xz = 0; } else { xx /= len; xy /= len; xz /= len; }

  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  const out = new Float32Array(16);
  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
  out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
  out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;
  return out;
}



/**
 * Generates a the brain tissue.
 */
function generateBrainMesh() {
  const positions = [];
  const colors = [];
  const latitudeBands = 30;
  const longitudeBands = 30;
  const baseRadius = 0.45;

  const hemisphereOffsets = [-0.25, 0.25];

  // =========================================================
  // 1. CEREBRAL HEMISPHERES (Left & Right)
  // =========================================================
  hemisphereOffsets.forEach(xOffset => {
    for (let lat = 0; lat <= latitudeBands; lat++) {
      const theta = (lat * Math.PI) / latitudeBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= longitudeBands; lon++) {
        const phi = (lon * 2 * Math.PI) / longitudeBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const displacement = 0.08 * Math.sin(6 * theta) * Math.cos(6 * phi);
        const radius = baseRadius + displacement;

        const x = xOffset + radius * sinTheta * cosPhi * 0.85;
        const y = radius * cosTheta * 0.75;
        const z = radius * sinTheta * sinPhi;

        positions.push(x, y, z);

        const colorWeight = (displacement + 0.08) / 0.16;
        colors.push(
          Math.floor(140 + colorWeight * 80),
          Math.floor(50 + colorWeight * 70),
          Math.floor(70 + colorWeight * 70),
          255 // 4th byte (Alpha / Padding)
        );
      }
    }
  });

  const verticesPerHemisphere = (latitudeBands + 1) * (longitudeBands + 1);
  const hemisphereVertexCount = verticesPerHemisphere * 2;

  // Track stem offset indices to stitch quads per strand
 // Track stem offset indices to stitch quads per strand
  const stemStrandIndexOffsets = [];

  // =========================================================
  // 2. STRAND-BASED ORGANIC BRAIN STEM (Matching the image)
  // =========================================================
  const numStrands = 9;         // Number of tentacle/root-like strands
  const strandRings = 20;       // Vertical segments per strand
  const strandSegments = 8;     // Cross-section detail of each strand tube
  const stemTopY = -0.15;       // Attach point under brain base
  const stemBottomY = -0.75;    // Extends down toward the base plate

  for (let s = 0; s < numStrands; s++) {
    // FIX: Removed typo dot between stemStrand and Offsets
    stemStrandIndexOffsets.push(positions.length / 3);

    // Angular placement around the center base of the brain
    const strandAngle = (s / numStrands) * Math.PI * 2;
    const strandRadiusOffset = 0.12 * (0.6 + 0.4 * Math.sin(s * 2.5));

    // Phase offsets to make each strand wiggle independently
    const phaseX = s * 1.3;
    const phaseZ = s * 2.1;

    for (let ring = 0; ring <= strandRings; ring++) {
      const t = ring / strandRings; // Interpolation factor (0.0 to 1.0)
      const y = stemTopY + t * (stemBottomY - stemTopY);

      // Organic writhing wave displacements along Y
      const waveX = Math.sin(t * Math.PI * 3 + phaseX) * 0.04 * (1.0 - t * 0.3);
      const waveZ = Math.cos(t * Math.PI * 3.5 + phaseZ) * 0.04 * (1.0 - t * 0.3);

      // Base strand position curving inwards slightly near bottom
      const centerX = Math.cos(strandAngle) * strandRadiusOffset * (1.0 - t * 0.4) + waveX;
      const centerZ = Math.sin(strandAngle) * strandRadiusOffset * (1.0 - t * 0.4) + waveZ;

      // Thickness of individual strand tube (tapering towards tip)
      const tubeRadius = 0.035 * (1.0 - 0.5 * t);

      for (let seg = 0; seg <= strandSegments; seg++) {
        const phi = (seg * 2 * Math.PI) / strandSegments;

        const x = centerX + tubeRadius * Math.cos(phi);
        const z = centerZ + tubeRadius * Math.sin(phi);

        positions.push(x, y, z);

        // Pinkish-purple tint matching comic-style brain shading
        const pinkWeight = (Math.sin(t * Math.PI * 4 + phi) + 1.0) * 0.5;
        colors.push(
          Math.floor(150 + pinkWeight * 50), // Red
          Math.floor(60 + pinkWeight * 30),  // Green
          Math.floor(90 + pinkWeight * 50),  // Blue
          255                                // 4-byte alignment padding
        );
      }
    }
  }

  // =========================================================
  // 3. INDEX GENERATION
  // =========================================================
  const indices = [];

  // Indexing for Hemispheres
  for (let h = 0; h < 2; h++) {
    const baseIndex = h * verticesPerHemisphere;
    for (let lat = 0; lat < latitudeBands; lat++) {
      for (let lon = 0; lon < longitudeBands; lon++) {
        const first = baseIndex + lat * (longitudeBands + 1) + lon;
        const second = first + longitudeBands + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }
  }

  // Indexing for individual Stem Strands
  const verticesPerStrand = (strandRings + 1) * (strandSegments + 1);
  for (let s = 0; s < numStrands; s++) {
    const strandBaseIndex = stemStrandIndexOffsets[s];
    for (let ring = 0; ring < strandRings; ring++) {
      for (let seg = 0; seg < strandSegments; seg++) {
        const first = strandBaseIndex + ring * (strandSegments + 1) + seg;
        const second = first + strandSegments + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }
  }

  // =========================================================
  // 4. INTERLEAVED BUFFER CONSTRUCTION
  // =========================================================
  const totalVertices = positions.length / 3;
  const byteStride = 16; // 12 bytes (3x Float32) + 4 bytes (4x Uint8)
  const interleavedBuffer = new ArrayBuffer(totalVertices * byteStride);
  const dataView = new DataView(interleavedBuffer);

  let posIdx = 0, colorIdx = 0;
  for (let i = 0; i < totalVertices; i++) {
    const offset = i * byteStride;
    
    // Write 3 Float32 positions (12 bytes)
    dataView.setFloat32(offset, positions[posIdx++], true);
    dataView.setFloat32(offset + 4, positions[posIdx++], true);
    dataView.setFloat32(offset + 8, positions[posIdx++], true);

    // Write 4 Uint8 color values (4 bytes)
    dataView.setUint8(offset + 12, colors[colorIdx++]);
    dataView.setUint8(offset + 13, colors[colorIdx++]);
    dataView.setUint8(offset + 14, colors[colorIdx++]);
    dataView.setUint8(offset + 15, colors[colorIdx++]); 
  }

  return {
    bufferData: interleavedBuffer,
    indices: new Uint32Array(indices),
    vertexCount: indices.length
  };
}



/**
 * Generates a spherical mesh for the surrounding glass bowl.
 */
function generateGlassBowlMesh() {
  const positions = [];
  const colors = [];
  const latBands = 30;
  const lonBands = 30;
  const radius = 1.00; // Envelope both hemispheres and upper stem

  for (let lat = 0; lat <= latBands; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= lonBands; lon++) {
      const phi = (lon * 2 * Math.PI) / lonBands;
      const x = radius * sinTheta * Math.cos(phi);
      const y = radius * cosTheta - 0.05; // Slightly offset downward to center brain
      const z = radius * sinTheta * Math.sin(phi);

      positions.push(x, y, z);

      // Glass Tint: Soft bluish-white hue with semi-transparency (alpha = 65 / 255 ~= 0.25)
      colors.push(220, 240, 255, 65);
    }
  }

  const indices = [];
  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < lonBands; lon++) {
      const first = lat * (lonBands + 1) + lon;
      const second = first + lonBands + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  // Build interleaved ArrayBuffer (12 bytes position + 4 bytes RGBA color)
  const totalVertices = positions.length / 3;
  const byteStride = 16;
  const interleavedBuffer = new ArrayBuffer(totalVertices * byteStride);
  const dataView = new DataView(interleavedBuffer);

  let posIdx = 0, colorIdx = 0;
  for (let i = 0; i < totalVertices; i++) {
    const offset = i * byteStride;
    dataView.setFloat32(offset, positions[posIdx++], true);
    dataView.setFloat32(offset + 4, positions[posIdx++], true);
    dataView.setFloat32(offset + 8, positions[posIdx++], true);

    dataView.setUint8(offset + 12, colors[colorIdx++]);
    dataView.setUint8(offset + 13, colors[colorIdx++]);
    dataView.setUint8(offset + 14, colors[colorIdx++]);
    dataView.setUint8(offset + 15, colors[colorIdx++]); // Alpha component
  }

  return {
    bufferData: interleavedBuffer,
    indices: new Uint32Array(indices),
    vertexCount: indices.length
  };
}



/**
 * Generates a cylindrical/saucer metal base support for the glass bowl.
 */
function generateMetalBaseMesh() {
  const positions = [];
  const colors = [];
  const indices = [];

  const rings = 20;
  const segments = 32;

  // Key radii and vertical offsets adjusted to connect seamlessly with the glass sphere
  const baseProfile = [
    { y: -0.65, r: 0.76, color: [160, 165, 180] }, // Upper lip (shifted up & smaller radius to meet the sphere)
    { y: -0.75, r: 0.88, color: [140, 145, 160] }, // Outer upper bevel hugging glass contour
    { y: -1.00, r: 1.05, color: [110, 115, 130] }, // Reduced main saucer width
    { y: -1.25, r: 0.85, color: [80, 85, 100] },   // Tapered lower section
    { y: -1.35, r: 0.65, color: [50, 55, 65] }     // Compact bottom base plate
  ];

  const profileCount = baseProfile.length;

  // Generate Vertices along rings
  for (let p = 0; p < profileCount; p++) {
    const layer = baseProfile[p];
    for (let seg = 0; seg <= segments; seg++) {
      const phi = (seg * 2 * Math.PI) / segments;
      const x = layer.r * Math.cos(phi);
      const y = layer.y;
      const z = layer.r * Math.sin(phi);

      positions.push(x, y, z);

      // Subtle metallic highlight variance across faces
      const shade = (Math.sin(phi * 2) + 1.0) * 15;
      colors.push(
        Math.min(255, layer.color[0] + shade),
        Math.min(255, layer.color[1] + shade),
        Math.min(255, layer.color[2] + shade),
        255 // Opaque alpha
      );
    }
  }

  // Generate Triangles connecting adjacent rings
  for (let p = 0; p < profileCount - 1; p++) {
    for (let seg = 0; seg < segments; seg++) {
      const first = p * (segments + 1) + seg;
      const second = first + segments + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  // Build Interleaved ArrayBuffer (12 bytes Pos + 4 bytes Color)
  const totalVertices = positions.length / 3;
  const byteStride = 16;
  const interleavedBuffer = new ArrayBuffer(totalVertices * byteStride);
  const dataView = new DataView(interleavedBuffer);

  let posIdx = 0, colorIdx = 0;
  for (let i = 0; i < totalVertices; i++) {
    const offset = i * byteStride;
    dataView.setFloat32(offset, positions[posIdx++], true);
    dataView.setFloat32(offset + 4, positions[posIdx++], true);
    dataView.setFloat32(offset + 8, positions[posIdx++], true);

    dataView.setUint8(offset + 12, colors[colorIdx++]);
    dataView.setUint8(offset + 13, colors[colorIdx++]);
    dataView.setUint8(offset + 14, colors[colorIdx++]);
    dataView.setUint8(offset + 15, colors[colorIdx++]);
  }

  return {
    bufferData: interleavedBuffer,
    indices: new Uint32Array(indices),
    vertexCount: indices.length
  };
}



/**
 * Generates dark oval vent holes around the upper rim (gas-mask aesthetic).
 */
function generateMetalVentsMesh() {
  const positions = [];
  const colors = [];
  const indices = [];

  const numVents = 8;
  const ventRadius = 0.89; // Sits just on top of the outer upper bevel
  const ventY = -0.75;
  const ventWidthAngle = 0.12; 
  const ventHeight = 0.05;

  let vertexOffset = 0;

  for (let i = 0; i < numVents; i++) {
    const centerAngle = (i / numVents) * Math.PI * 2;
    const leftAngle = centerAngle - ventWidthAngle;
    const rightAngle = centerAngle + ventWidthAngle;

    // 4 corners of an elongated quad/oval vent hole
    const x1 = Math.cos(leftAngle) * ventRadius;
    const z1 = Math.sin(leftAngle) * ventRadius;
    const x2 = Math.cos(rightAngle) * ventRadius;
    const z2 = Math.sin(rightAngle) * ventRadius;

    // Outer surface vertices
    positions.push(
      x1, ventY + ventHeight, z1,
      x2, ventY + ventHeight, z2,
      x2, ventY - ventHeight, z2,
      x1, ventY - ventHeight, z1
    );

    // Dark inset color to simulate a recess hole
    for (let c = 0; c < 4; c++) {
      colors.push(20, 22, 28, 255);
    }

    indices.push(
      vertexOffset, vertexOffset + 1, vertexOffset + 2,
      vertexOffset, vertexOffset + 2, vertexOffset + 3
    );

    vertexOffset += 4;
  }

  // Build Interleaved ArrayBuffer
  const totalVertices = positions.length / 3;
  const byteStride = 16;
  const interleavedBuffer = new ArrayBuffer(totalVertices * byteStride);
  const dataView = new DataView(interleavedBuffer);

  let posIdx = 0, colorIdx = 0;
  for (let i = 0; i < totalVertices; i++) {
    const offset = i * byteStride;
    dataView.setFloat32(offset, positions[posIdx++], true);
    dataView.setFloat32(offset + 4, positions[posIdx++], true);
    dataView.setFloat32(offset + 8, positions[posIdx++], true);

    dataView.setUint8(offset + 12, colors[colorIdx++]);
    dataView.setUint8(offset + 13, colors[colorIdx++]);
    dataView.setUint8(offset + 14, colors[colorIdx++]);
    dataView.setUint8(offset + 15, colors[colorIdx++]);
  }

  return {
    bufferData: interleavedBuffer,
    indices: new Uint32Array(indices),
    vertexCount: indices.length
  };
}



/**
 * Generates glowing circular nodes/buttons around the lower belt.
 */
function generateGlowingButtonsMesh() {
  const positions = [];
  const colors = [];
  const indices = [];

  const numButtons = 10;
  const buttonRadius = 1.06; // Placed right on the widest belt of the saucer
  const buttonY = -1.00;
  const buttonSize = 0.035;
  const segments = 8;

  let vertexOffset = 0;

  for (let i = 0; i < numButtons; i++) {
    const angle = (i / numButtons) * Math.PI * 2;
    const cx = Math.cos(angle) * buttonRadius;
    const cz = Math.sin(angle) * buttonRadius;

    // Center vertex of button disc
    positions.push(cx, buttonY, cz);
    colors.push(100, 220, 255, 255); // Bright cyan/blue glow center

    const centerIdx = vertexOffset;
    vertexOffset++;

    // Outer rim of button disc
    for (let seg = 0; seg <= segments; seg++) {
      const phi = (seg * 2 * Math.PI) / segments;
      
      // Orient button face outwards
      const dx = Math.cos(phi) * buttonSize;
      const dy = Math.sin(phi) * buttonSize;

      const px = cx + dx * (-Math.sin(angle));
      const py = buttonY + dy;
      const pz = cz + dx * Math.cos(angle);

      positions.push(px, py, pz);
      colors.push(0, 140, 255, 255); // Soft blue edge

      if (seg > 0) {
        indices.push(centerIdx, vertexOffset - 1, vertexOffset);
      }
      vertexOffset++;
    }
  }

  // Build Interleaved ArrayBuffer
  const totalVertices = positions.length / 3;
  const byteStride = 16;
  const interleavedBuffer = new ArrayBuffer(totalVertices * byteStride);
  const dataView = new DataView(interleavedBuffer);

  let posIdx = 0, colorIdx = 0;
  for (let i = 0; i < totalVertices; i++) {
    const offset = i * byteStride;
    dataView.setFloat32(offset, positions[posIdx++], true);
    dataView.setFloat32(offset + 4, positions[posIdx++], true);
    dataView.setFloat32(offset + 8, positions[posIdx++], true);

    dataView.setUint8(offset + 12, colors[colorIdx++]);
    dataView.setUint8(offset + 13, colors[colorIdx++]);
    dataView.setUint8(offset + 14, colors[colorIdx++]);
    dataView.setUint8(offset + 15, colors[colorIdx++]);
  }

  return {
    bufferData: interleavedBuffer,
    indices: new Uint32Array(indices),
    vertexCount: indices.length
  };
}


/**
 * Generates syringes protruding from the glass bowl and sticking into the brain.
 */
function generateSyringesMesh() {
  const positions = [];
  const colors = [];
  const indices = [];

  // Positions and orientations (angles around center) matching the reference artwork
  // Balanced radial distribution around the glass sphere (phi: horizontal angle, theta: tilt angle from top)
  const syringeConfigs = [
    // Top-center high syringe
    { phi: 0.0,                   theta: 0.25 },
    // Upper ring evenly spaced around 360 degrees
    { phi: (0 * Math.PI) / 3,     theta: 0.70 },
    { phi: (1 * Math.PI) / 3,     theta: 0.65 },
    { phi: (2 * Math.PI) / 3,     theta: 0.75 },
    { phi: (3 * Math.PI) / 3,     theta: 0.60 },
    { phi: (4 * Math.PI) / 3,     theta: 0.70 },
    { phi: (5 * Math.PI) / 3,     theta: 0.65 },
    // Mid/Lower ring offset around the sides
    { phi: (0.5 * Math.PI) / 3,   theta: 1.15 },
    { phi: (2.5 * Math.PI) / 3,   theta: 1.20 },
    { phi: (4.5 * Math.PI) / 3,   theta: 1.10 }
  ];

  let currentVertexOffset = 0;

  syringeConfigs.forEach(config => {
    // Calculate direction vector along radial line from center
    const dirX = Math.sin(config.theta) * Math.cos(config.phi);
    const dirY = Math.cos(config.theta);
    const dirZ = Math.sin(config.theta) * Math.sin(config.phi);

    // Calculate perpendicular vectors for cylinder geometry
    let upX = 0, upY = 1, upZ = 0;
    if (Math.abs(dirY) > 0.9) {
      upX = 1; upY = 0; upZ = 0;
    }

    // Right vector (dir x up)
    const rx = dirY * upZ - dirZ * upY;
    const ry = dirZ * upX - dirX * upZ;
    const rz = dirX * upY - dirY * upX;
    const rLen = Math.hypot(rx, ry, rz) || 1;
    const normRx = rx / rLen, normRy = ry / rLen, normRz = rz / rLen;

    // Up vector (right x dir)
    const uX = normRy * dirZ - normRz * dirY;
    const uY = normRz * dirX - normRx * dirZ;
    const uZ = normRx * dirY - normRy * dirX;

    // Helper to generate a cylinder segment along the radial direction
    function appendCylinder(startDist, endDist, radius, color, segments = 8) {
      const startIdx = currentVertexOffset;

      for (let ring = 0; ring <= 1; ring++) {
        const dist = ring === 0 ? startDist : endDist;
        const baseX = dirX * dist;
        const baseY = dirY * dist - 0.05; // Offset to match bowl center offset
        const baseZ = dirZ * dist;

        for (let seg = 0; seg <= segments; seg++) {
          const angle = (seg * 2 * Math.PI) / segments;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);

          const px = baseX + (normRx * cosA + uX * sinA) * radius;
          const py = baseY + (normRy * cosA + uY * sinA) * radius;
          const pz = baseZ + (normRz * cosA + uZ * sinA) * radius;

          positions.push(px, py, pz);
          colors.push(color[0], color[1], color[2], color[3]);
          currentVertexOffset++;
        }
      }

      // Generate triangle indices connecting the rings
      for (let seg = 0; seg < segments; seg++) {
        const first = startIdx + seg;
        const second = first + segments + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    // 1. Steel Needle Piercing into Brain (Center r ~0.35 to r ~1.0)
    appendCylinder(0.35, 1.0, 0.008, [200, 205, 215, 255]);

    // 2. Yellow Liquid / Syringe Main Chamber Body (Outer r 1.0 to 1.35)
    appendCylinder(1.0, 1.35, 0.06, [240, 200, 30, 255]);

    // 3. Metallic Syringe Metallic End Cap (Outer r 1.35 to 1.45)
    appendCylinder(1.35, 1.45, 0.065, [170, 175, 190, 255]);
  });

  // Interleave geometry into binary buffer (12-byte float positions, 4-byte byte colors)
  const totalVertices = positions.length / 3;
  const byteStride = 16;
  const interleavedBuffer = new ArrayBuffer(totalVertices * byteStride);
  const dataView = new DataView(interleavedBuffer);

  let posIdx = 0, colorIdx = 0;
  for (let i = 0; i < totalVertices; i++) {
    const offset = i * byteStride;
    dataView.setFloat32(offset, positions[posIdx++], true);
    dataView.setFloat32(offset + 4, positions[posIdx++], true);
    dataView.setFloat32(offset + 8, positions[posIdx++], true);

    dataView.setUint8(offset + 12, colors[colorIdx++]);
    dataView.setUint8(offset + 13, colors[colorIdx++]);
    dataView.setUint8(offset + 14, colors[colorIdx++]);
    dataView.setUint8(offset + 15, colors[colorIdx++]);
  }

  return {
    bufferData: interleavedBuffer,
    indices: new Uint32Array(indices),
    vertexCount: indices.length
  };
}



/**
 * Generates initial geometry data for a set of floating bubbles inside the bowl.
 * Attributes include position, base scale, seed offset, and velocity parameters.
 */
function generateBubblesMesh() {
  const positions = [];
  const colors = [];
  const indices = [];

  const numBubbles = 40;
  const latBands = 8;
  const lonBands = 8;
  let vertexOffset = 0;

  for (let i = 0; i < numBubbles; i++) {
    // Randomized initial seed coordinates near the bottom of the brain
    const seedX = (Math.random() - 0.5) * 0.5;
    const seedZ = (Math.random() - 0.5) * 0.5;
    // Store phase offset in Y for asynchronous birth/rise times
    const phaseOffset = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.4;
    const radius = 0.02 + Math.random() * 0.03;

    for (let lat = 0; lat <= latBands; lat++) {
      const theta = (lat * Math.PI) / latBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= lonBands; lon++) {
        const phi = (lon * 2 * Math.PI) / lonBands;
        
        // Sphere vertex relative to particle center
        const vx = radius * sinTheta * Math.cos(phi);
        const vy = radius * cosTheta;
        const vz = radius * sinTheta * Math.sin(phi);

        // Position: Base offset + local sphere vertex
        positions.push(seedX + vx, vy, seedZ + vz);

        // Store animation attributes in unused bytes/channels:
        // R, G: Base horizontal movement seeds
        // B: Speed factor scaled to 0-255
        // A: Phase offset scaled to 0-255
        colors.push(
          Math.floor(((seedX + 0.5) / 1.0) * 255),
          Math.floor(((seedZ + 0.5) / 1.0) * 255),
          Math.floor(speed * 255),
          Math.floor((phaseOffset / (Math.PI * 2)) * 255)
        );
      }
    }

    const vertsPerBubble = (latBands + 1) * (lonBands + 1);
    for (let lat = 0; lat < latBands; lat++) {
      for (let lon = 0; lon < lonBands; lon++) {
        const first = vertexOffset + lat * (lonBands + 1) + lon;
        const second = first + lonBands + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }
    vertexOffset += vertsPerBubble;
  }

  // Interleave geometry buffer
  const totalVertices = positions.length / 3;
  const byteStride = 16;
  const interleavedBuffer = new ArrayBuffer(totalVertices * byteStride);
  const dataView = new DataView(interleavedBuffer);

  let posIdx = 0, colorIdx = 0;
  for (let i = 0; i < totalVertices; i++) {
    const offset = i * byteStride;
    dataView.setFloat32(offset, positions[posIdx++], true);
    dataView.setFloat32(offset + 4, positions[posIdx++], true);
    dataView.setFloat32(offset + 8, positions[posIdx++], true);

    dataView.setUint8(offset + 12, colors[colorIdx++]);
    dataView.setUint8(offset + 13, colors[colorIdx++]);
    dataView.setUint8(offset + 14, colors[colorIdx++]);
    dataView.setUint8(offset + 15, colors[colorIdx++]);
  }

  return {
    bufferData: interleavedBuffer,
    indices: new Uint32Array(indices),
    vertexCount: indices.length
  };
}



/**
 * Generates blocky comic-style 3D letter meshes for "NO-GIRL"
 */
function generateNoGirlTextMesh() {
  const positions = [];
  const colors = [];
  const indices = [];

  // Define simple 8x8 bitmap grids for blocky comic typography
  const font = {
    'N': [
      "10001",
      "11001",
      "10101",
      "10011",
      "10001"
    ],
    'O': [
      "11111",
      "10001",
      "10001",
      "10001",
      "11111"
    ],
    '-': [
      "00000",
      "00000",
      "11111",
      "00000",
      "00000"
    ],
    'G': [
      "11111",
      "10000",
      "10111",
      "10001",
      "11111"
    ],
    'I': [
      "11111",
      "00100",
      "00100",
      "00100",
      "11111"
    ],
    'R': [
      "11110",
      "10001",
      "11110",
      "10010",
      "10001"
    ],
    'L': [
      "10000",
      "10000",
      "10000",
      "10000",
      "11111"
    ]
  };

  const word = "NO-GIRL";
  const pixelSize = 0.095;
  const startX = -1.9;
  const startY = 1.6; // Top of the screen cover position
  const depth = 0.05;  // Extrusion depth for 3D comic edge

  let currentVertexOffset = 0;

  function addBlock(x, y, w, h, c) {
    const x0 = x, x1 = x + w;
    const y0 = y - h, y1 = y;
    
    // Front Face (Yellow Comic Text)
    positions.push(
      x0, y0, 0,
      x1, y0, 0,
      x1, y1, 0,
      x0, y1, 0
    );

    // Front/Side colors
    for (let i = 0; i < 4; i++) {
      colors.push(c[0], c[1], c[2], 255);
    }

    indices.push(
      currentVertexOffset, currentVertexOffset + 1, currentVertexOffset + 2,
      currentVertexOffset, currentVertexOffset + 2, currentVertexOffset + 3
    );

    currentVertexOffset += 4;
  }

  // Build letter geometry block by block
  let cursorX = startX;
  for (let char of word) {
    const grid = font[char];
    if (grid) {
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c] === '1') {
            const bx = cursorX + c * pixelSize;
            const by = startY - r * pixelSize;

            // Draw Black Drop-Shadow / Outline Offset
            addBlock(bx + 0.02, by - 0.02, pixelSize, pixelSize, [20, 20, 20]);
            
            // Draw Main Vibrant Yellow Front Face
            addBlock(bx, by, pixelSize, pixelSize, [255, 220, 0]);
          }
        }
      }
    }
    cursorX += (grid ? grid[0].length + 1 : 3) * pixelSize;
  }

  // Build Interleaved Buffer
  const totalVertices = positions.length / 3;
  const byteStride = 16;
  const interleavedBuffer = new ArrayBuffer(totalVertices * byteStride);
  const dataView = new DataView(interleavedBuffer);

  let posIdx = 0, colorIdx = 0;
  for (let i = 0; i < totalVertices; i++) {
    const offset = i * byteStride;
    dataView.setFloat32(offset, positions[posIdx++], true);
    dataView.setFloat32(offset + 4, positions[posIdx++], true);
    dataView.setFloat32(offset + 8, positions[posIdx++], true);

    dataView.setUint8(offset + 12, colors[colorIdx++]);
    dataView.setUint8(offset + 13, colors[colorIdx++]);
    dataView.setUint8(offset + 14, colors[colorIdx++]);
    dataView.setUint8(offset + 15, colors[colorIdx++]);
  }

  return {
    bufferData: interleavedBuffer,
    indices: new Uint32Array(indices),
    vertexCount: indices.length
  };
}


function helloTriangle() {
  /** @type {HTMLCanvasElement|null} */
  const canvas = document.getElementById('demo-canvas');
  if (!canvas) {
    showError('Could not find HTML canvas element - check for typos, or loading JavaScript file too early');
    return;
  }
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    const isWebGl1Supported = !!(document.createElement('canvas')).getContext('webgl');
    if (isWebGl1Supported) {
      showError('WebGL 1 is supported, but not v2 - try using a different device or browser');
    } else {
      showError('WebGL is not supported on this device - try using a different device or browser');
    }
    return;
  }

  



  // Generate brain mesh data
  const brainData = generateBrainMesh();

  // Create GPU Data Buffer (Interleaved positions + Uint8 colors)
  const brainVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, brainVBO);
  gl.bufferData(gl.ARRAY_BUFFER, brainData.bufferData, gl.STATIC_DRAW);

  // Create GPU Index Buffer (for rendering quads/triangles efficiently)
  const brainIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, brainIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, brainData.indices, gl.STATIC_DRAW);




  // --- Glass Bowl Buffers & VAO Setup ---
  const glassData = generateGlassBowlMesh();

  const glassVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, glassVBO);
  gl.bufferData(gl.ARRAY_BUFFER, glassData.bufferData, gl.STATIC_DRAW);

  const glassIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glassIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, glassData.indices, gl.STATIC_DRAW);

  const STRIDE = 16; // 3 floats * 4 bytes + 4 Uint8s * 1 byte = 16 bytes

  const glassVAO = gl.createVertexArray();
  gl.bindVertexArray(glassVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, glassVBO);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glassIBO);

  // Position Attribute (location = 0)
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);

  // Color Attribute (location = 1) - Normalized Uint8 RGBA
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, STRIDE, 12);

  gl.bindVertexArray(null);



  // --- Metal Base Buffers & VAO Setup ---
  const metalBaseData = generateMetalBaseMesh();

  const metalBaseVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, metalBaseVBO);
  gl.bufferData(gl.ARRAY_BUFFER, metalBaseData.bufferData, gl.STATIC_DRAW);

  const metalBaseIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, metalBaseIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, metalBaseData.indices, gl.STATIC_DRAW);

  const metalBaseVAO = gl.createVertexArray();
  gl.bindVertexArray(metalBaseVAO);

  gl.bindBuffer(gl.ARRAY_BUFFER, metalBaseVBO);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, metalBaseIBO);

  // Position Attribute
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);

  // Color Attribute
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, STRIDE, 12);

  gl.bindVertexArray(null);



  // --- Vent Details Buffers & VAO Setup ---
  const ventData = generateMetalVentsMesh();
  const ventVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ventVBO);
  gl.bufferData(gl.ARRAY_BUFFER, ventData.bufferData, gl.STATIC_DRAW);

  const ventIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ventIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ventData.indices, gl.STATIC_DRAW);

  const ventVAO = gl.createVertexArray();
  gl.bindVertexArray(ventVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, ventVBO);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ventIBO);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, STRIDE, 12);
  gl.bindVertexArray(null);



  // --- Glowing Buttons Buffers & VAO Setup ---
  const buttonData = generateGlowingButtonsMesh();
  const buttonVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buttonVBO);
  gl.bufferData(gl.ARRAY_BUFFER, buttonData.bufferData, gl.STATIC_DRAW);

  const buttonIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buttonIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, buttonData.indices, gl.STATIC_DRAW);

  const buttonVAO = gl.createVertexArray();
  gl.bindVertexArray(buttonVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, buttonVBO);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buttonIBO);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, STRIDE, 12);
  gl.bindVertexArray(null);
  

  // --- Syringes Buffers & VAO Setup ---
  const syringeData = generateSyringesMesh();
  const syringeVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, syringeVBO);
  gl.bufferData(gl.ARRAY_BUFFER, syringeData.bufferData, gl.STATIC_DRAW);

  const syringeIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, syringeIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, syringeData.indices, gl.STATIC_DRAW);

  const syringeVAO = gl.createVertexArray();
  gl.bindVertexArray(syringeVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, syringeVBO);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, syringeIBO);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, STRIDE, 12);
  gl.bindVertexArray(null);

    // --- Bubbles Buffers & VAO Setup ---
  const bubbleData = generateBubblesMesh();
  const bubbleVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bubbleVBO);
  gl.bufferData(gl.ARRAY_BUFFER, bubbleData.bufferData, gl.STATIC_DRAW);

  const bubbleIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bubbleIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, bubbleData.indices, gl.STATIC_DRAW);

  const bubbleVAO = gl.createVertexArray();
  gl.bindVertexArray(bubbleVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, bubbleVBO);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bubbleIBO);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, STRIDE, 12); // Keep unnormalized for parameter decoding
  gl.bindVertexArray(null);


  // --- NO-GIRL Text Buffers & VAO Setup ---
  const textData = generateNoGirlTextMesh();
  const textVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textVBO);
  gl.bufferData(gl.ARRAY_BUFFER, textData.bufferData, gl.STATIC_DRAW);

  const textIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, textIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, textData.indices, gl.STATIC_DRAW);

  const textVAO = gl.createVertexArray();
  gl.bindVertexArray(textVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, textVBO);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, textIBO);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, STRIDE, 12);
  gl.bindVertexArray(null);


  const vertexShaderSourceCode = `#version 300 es
  precision mediump float;

  layout(location = 0) in vec3 aPosition;
  layout(location = 1) in vec4 aColor; // Unpacks colors or particle seeds

  uniform mat4 uViewProjection;
  uniform float uTime;     // Time uniform for dynamic vertex offsets
  uniform bool uIsBubble;  // Flag to apply bubble animation & coloring

  out vec4 vColor;
  out vec3 vNormal;   // <--- ADD THIS
  out vec3 vFragPos;  // <--- ADD THIS

  void main() {
    vec3 pos = aPosition;

    if (uIsBubble) {
      // Decode bubble seed parameter attributes
      float speed = aColor.b;
      float phase = aColor.a * 6.28318;

      // Calculate looping vertical ascent from Y=-0.6 (stem base) to Y=0.6 (top)
      float cycle = mod(uTime * speed + phase, 1.0);
      float riseY = -0.6 + cycle * 1.2;
      
      // Apply sinusoidal wobble horizontally
      float wobbleX = sin(uTime * 3.0 + phase) * 0.04 * cycle;
      float wobbleZ = cos(uTime * 2.5 + phase) * 0.04 * cycle;

      pos.x += wobbleX;
      pos.y += riseY;
      pos.z += wobbleZ;

      // Calculate smooth alpha dissipation near top of rise
      float alpha = sin(cycle * 3.14159); // Fade-in at birth, fade-out at top
      vColor = vec4(0.9, 0.95, 1.0, alpha * 0.6); // Soft white/blue bubble color
    } else {
      // Normal opaque and glass objects keep their natural vertex color
      vColor = aColor;
    }

    // Pass fragment position and spherical surface normal to Fragment Shader
    vFragPos = pos;
    
    // For non-bubble geometry, normalize centered local position components
    if (uIsBubble) {
      vNormal = vec3(0.0, 1.0, 0.0); // Upward normal for flat-shaded bubbles
    } else {
      vNormal = normalize(aPosition);
    }

    gl_Position = uViewProjection * vec4(pos, 1.0);
  }`;

  const fragmentShaderSourceCode = `#version 300 es
  precision mediump float;

  in vec3 vNormal;
  in vec3 vFragPos;
  in vec4 vColor;

  uniform vec3 uViewPos;
  uniform bool uIsGlass;
  uniform bool uIsMetal;
  uniform bool uIsBrain;
  uniform bool uIsGlowing;

  out vec4 fragColor;

  void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(uViewPos - vFragPos);
      
      // Global Directional Light
      vec3 lightDir = normalize(vec3(3.0, 5.0, 4.0));
      
      // Ambient Component
      vec3 ambient = 0.25 * vColor.rgb;
      
      // Diffuse Component
      float diff = max(dot(N, lightDir), 0.0);
      vec3 diffuse = diff * vColor.rgb;
      
      // Specular Component (Blinn-Phong)
      vec3 H = normalize(lightDir + V);
      vec3 specular = vec3(0.0);
      
      if (uIsGlass) {
          // High exponent for sharp glass glints
          float spec = pow(max(dot(N, H), 0.0), 128.0);
          specular = vec3(1.0) * spec * 0.9;
          
          // Fresnel rim highlight
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          float alpha = clamp(vColor.a + fresnel * 0.5, 0.15, 0.85);
          
          fragColor = vec4(diffuse + specular, alpha);
      } 
      else if (uIsMetal) {
          // Metallic specular tinted with base metal color
          float spec = pow(max(dot(N, H), 0.0), 32.0);
          specular = vColor.rgb * spec * 0.8;
          
          fragColor = vec4(ambient + diffuse + specular, 1.0);
      } 
      else if (uIsGlowing) {
          // Unlit / Emission: Ignore lighting calculations so it glows at full brightness
          fragColor = vec4(vColor.rgb, 1.0);
      } 
      else if (uIsBrain) {
          // Soft organic lighting with a subtle rim/fresnel highlight
          float spec = pow(max(dot(N, H), 0.0), 16.0);
          float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);
          vec3 rimColor = vec3(0.3, 0.1, 0.2) * rim;
          
          fragColor = vec4(ambient + diffuse + (spec * 0.2) + rimColor, vColor.a);
      } 
      else {
          fragColor = vec4(ambient + diffuse, vColor.a);
      }
  }`;


// 1. Compile Vertex Shader
const vertexShaderObj = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShaderObj, vertexShaderSourceCode);
gl.compileShader(vertexShaderObj);
if (!gl.getShaderParameter(vertexShaderObj, gl.COMPILE_STATUS)) {
  showError(`Failed to compile vertex shader: ${gl.getShaderInfoLog(vertexShaderObj)}`);
  return;
}

// 2. Compile Fragment Shader
const fragmentShaderObj = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShaderObj, fragmentShaderSourceCode);
gl.compileShader(fragmentShaderObj);
if (!gl.getShaderParameter(fragmentShaderObj, gl.COMPILE_STATUS)) {
  showError(`Failed to compile fragment shader: ${gl.getShaderInfoLog(fragmentShaderObj)}`);
  return;
}

// 3. Link GPU Program
const helloTriangleProgram = gl.createProgram();
gl.attachShader(helloTriangleProgram, vertexShaderObj);
gl.attachShader(helloTriangleProgram, fragmentShaderObj);
gl.linkProgram(helloTriangleProgram);
if (!gl.getProgramParameter(helloTriangleProgram, gl.LINK_STATUS)) {
  showError(`Failed to link GPU program: ${gl.getProgramInfoLog(helloTriangleProgram)}`);
  return;
}


  


  const uViewProjectionLocation = gl.getUniformLocation(helloTriangleProgram, 'uViewProjection');
  const uTimeLocation = gl.getUniformLocation(helloTriangleProgram, 'uTime');
  const uIsBubbleLocation = gl.getUniformLocation(helloTriangleProgram, 'uIsBubble');
  // --- ADD UNIFORM LOCATIONS FOR LIGHTING & MATERIAL STATES ---
  const uViewPosLocation = gl.getUniformLocation(helloTriangleProgram, 'uViewPos');
  const uIsGlassLocation = gl.getUniformLocation(helloTriangleProgram, 'uIsGlass');
  const uIsMetalLocation = gl.getUniformLocation(helloTriangleProgram, 'uIsMetal');
  const uIsBrainLocation = gl.getUniformLocation(helloTriangleProgram, 'uIsBrain');
  const uIsGlowingLocation = gl.getUniformLocation(helloTriangleProgram, 'uIsGlowing');
  if (!uViewProjectionLocation) {
    showError(`Failed to get uniform location for uViewProjection`);
    return;
  }

  // Create and bind VAO (isolates all vertex state instructions)
  const brainVAO = gl.createVertexArray();
  gl.bindVertexArray(brainVAO);

  gl.bindBuffer(gl.ARRAY_BUFFER, brainVBO);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, brainIBO);


  // Attribute 0: Positions (3 floats)
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);

  // Attribute 1: Colors (3 Uint8 components rendered, skipping 4th padding byte)
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, STRIDE, 12);

  // Clean slate unbind (prevents state leakage)
  gl.bindVertexArray(null);

  gl.clearColor(0.08, 0.08, 0.08, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);





  const CAMERA_RADIUS = 5.0;
  let startTime = null;
  let rotationX = 0.2; // default pitch angle
  let rotationY = 0.0; // default yaw angle


  // --- MOUSE CONTROLS FOR ROTATION ---
  let isDragging = false;
  let previousMouseX = 0;
  let previousMouseY = 0;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMouseX = e.clientX;
    previousMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - previousMouseX;
    const deltaY = e.clientY - previousMouseY;

    // Adjust sensitivity as needed
    rotationY -= deltaX * 0.005; 
    rotationX += deltaY * 0.005; 

    // Clamp vertical angle to prevent camera flipping upside down
    const maxPitch = Math.PI / 2 - 0.05;
    rotationX = Math.max(-maxPitch, Math.min(maxPitch, rotationX));

    previousMouseX = e.clientX;
    previousMouseY = e.clientY;
  });


  function render(now) {
    if (startTime === null) startTime = now;
    const elapsed = now - startTime;

    const displayWidth = canvas.clientWidth || canvas.width || 300;
    const displayHeight = canvas.clientHeight || canvas.height || 150;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);

    // --- CALCULATE CAMERA POSITION VIA SPHERICAL COORDINATES ---
    // Calculate 3D eye coordinates using rotationX (pitch) and rotationY (yaw)
    const eyeX = CAMERA_RADIUS * Math.sin(rotationY) * Math.cos(rotationX);
    const eyeY = CAMERA_RADIUS * Math.sin(rotationX);
    const eyeZ = CAMERA_RADIUS * Math.cos(rotationY) * Math.cos(rotationX);
    const eye = [eyeX, eyeY, eyeZ];

    const up = [0.0, 0.9999, 0.001];
    const viewMatrix = mat4LookAt(eye, [0, 0, 0], up);
    const projectionMatrix = mat4Perspective(
      Math.PI / 4,
      canvas.width / canvas.height,
      0.1,
      100
    );
    const viewProjectionMatrix = mat4Multiply(projectionMatrix, viewMatrix);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(helloTriangleProgram);

    // Pass global uniforms
    gl.uniformMatrix4fv(uViewProjectionLocation, false, viewProjectionMatrix);
    gl.uniform1f(uTimeLocation, elapsed * 0.001);
    gl.uniform3fv(uViewPosLocation, eye); // Pass active camera position for specular/fresnel

    // Reset material flags to default state
    gl.uniform1i(uIsBubbleLocation, 0);
    gl.uniform1i(uIsGlassLocation, 0);
    gl.uniform1i(uIsMetalLocation, 0);
    gl.uniform1i(uIsBrainLocation, 0);
    gl.uniform1i(uIsGlowingLocation, 0);

    // --- DRAW "NO-GIRL" COMIC TITLE (Un-rotated by mouse, but affected by lighting) ---
    // Fixed camera pointing directly at center from Z = 5.0
    const fixedViewMatrix = mat4LookAt([0, 0, 5.0], [0, 0, 0], [0, 1, 0]);
    const fixedViewProjection = mat4Multiply(projectionMatrix, fixedViewMatrix);

    // Pass the fixed VP matrix so mouse rotation doesn't tilt the title cover
    gl.uniformMatrix4fv(uViewProjectionLocation, false, fixedViewProjection);

    // Draw NO-GIRL title geometry
    gl.bindVertexArray(textVAO);
    gl.drawElements(gl.TRIANGLES, textData.vertexCount, gl.UNSIGNED_INT, 0);

    // Restore interactive view-projection matrix for scene models
    gl.uniformMatrix4fv(uViewProjectionLocation, false, viewProjectionMatrix);

    // =========================================================
    // 1. OPAQUE PASS
    // =========================================================
    gl.disable(gl.BLEND);
    gl.depthMask(true);

    // Draw Brain (Enable Brain Material Flag)
    gl.uniform1i(uIsBrainLocation, 1);
    gl.bindVertexArray(brainVAO);
    gl.drawElements(gl.TRIANGLES, brainData.vertexCount, gl.UNSIGNED_INT, 0);
    gl.uniform1i(uIsBrainLocation, 0);

    // Draw Metal Base (Enable Metallic Material Flag)
    gl.uniform1i(uIsMetalLocation, 1);
    gl.bindVertexArray(metalBaseVAO);
    gl.drawElements(gl.TRIANGLES, metalBaseData.vertexCount, gl.UNSIGNED_INT, 0);

    // Draw Oval Vents
    gl.bindVertexArray(ventVAO);
    gl.drawElements(gl.TRIANGLES, ventData.vertexCount, gl.UNSIGNED_INT, 0);
    gl.uniform1i(uIsMetalLocation, 0);

    // Draw Syringes
    gl.bindVertexArray(syringeVAO);
    gl.drawElements(gl.TRIANGLES, syringeData.vertexCount, gl.UNSIGNED_INT, 0);

    // Draw Glowing Cyan Buttons (Unlit pass)
    gl.uniform1i(uIsGlowingLocation, 1);
    gl.bindVertexArray(buttonVAO);
    gl.drawElements(gl.TRIANGLES, buttonData.vertexCount, gl.UNSIGNED_INT, 0);
    gl.uniform1i(uIsGlowingLocation, 0);

    // =========================================================
    // 2. TRANSPARENT PASS
    // Enable alpha blending and ensure proper back-to-front depth sorting
    // =========================================================
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Keep depth testing active but turn OFF depth writes to eliminate transparent sorting artifacts
    gl.depthMask(false);

    // Draw Bubbles (Inside Glass)
    gl.uniform1i(uIsBubbleLocation, 1);
    gl.bindVertexArray(bubbleVAO);
    gl.drawElements(gl.TRIANGLES, bubbleData.vertexCount, gl.UNSIGNED_INT, 0);
    gl.uniform1i(uIsBubbleLocation, 0);

    // Draw Outer Glass Bowl (Enable Glass Material Flag)
    gl.uniform1i(uIsGlassLocation, 1);
    gl.bindVertexArray(glassVAO);
    gl.drawElements(gl.TRIANGLES, glassData.vertexCount, gl.UNSIGNED_INT, 0);
    gl.uniform1i(uIsGlassLocation, 0);

    // Reset WebGL State for the next frame
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    requestAnimationFrame(render);
  }

  // Kick off the continuous animation loop
  requestAnimationFrame(render);
}

try {
  helloTriangle();
} catch (e) {
  showError(`Uncaught JavaScript exception: ${e}`);
}