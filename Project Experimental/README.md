git pull origin main --allow-unrelated-histories# No-Girl-3D-Model-Character-Profil-CSELEC2-Midterm-Project
# Interactive 3D Character Showcase

A responsive, interactive WebGL2 application showcasing a comic-style 3D brain model ("NO-GIRL") inside a fluid-filled glass chamber alongside a retractable character profile card.

---

## Features

* **Custom WebGL2 Rendering Pipeline:** Custom procedural mesh generators for complex geometry, including cerebral hemispheres, organic brain stem strands, metal support bases, syringe assemblies, and floating bubble particles.
* **Shader Lighting & Materials:** Blinn-Phong specular highlights, Fresnel rim lighting for glass refraction, glowing emission shaders, and custom vertex animation for rising bubbles.
* **Responsive Viewport Split:** Separate viewport rendering allows the 3D model to stay anchored in a 1:1 aspect ratio on the left without stretching or elongating, while 3D typography translates smoothly across the full canvas width into the side panel header space[cite: 1, 2, 3].
* **Interactive Orbit Camera:** Drag-to-rotate mouse controls for inspecting the model from multiple angles.
* **Collapsible UI Profile Panel:** CSS transition overlay displaying character lore, stats, and power indicators[cite: 2].

---

## Technical Stack

* **Frontend:** HTML5, CSS3[cite: 2]
* **Graphics API:** WebGL2 (Shader Language: GLSL ES 3.0)
* **Language:** JavaScript (ES6+, vanilla)

---

## File Structure

```text
.
├── Index.html           # Structure, UI overlays, and styles
├── helloTriangle.js     # WebGL setup, shaders, mesh generation, and render loop
└── README.md            # Project documentation