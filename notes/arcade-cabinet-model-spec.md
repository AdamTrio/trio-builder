# Trio Arcade Cabinet: model spec for the 3D artist (v1)

The cabinet goes into Trio's 3D rooms. Its screen plays short teaser clips of the games, and the builder puts those clips on the screen automatically. To make that work, please follow these rules.

## 1. The screen
- Make the screen **its own separate object**, named exactly **`SCREEN`**.
- It is only the glass area. The bezel and frame around it are a different object.
- Give it **its own material**, named **`SCREEN`**. A plain black material is fine, because it gets replaced by video.
- It should be flat, or only gently curved.
- Its face must point **out, toward the player** (normals facing outward).

## 2. The screen's UVs (most important)
- UV-unwrap the screen so it **fills the whole 0–1 UV square, edge to edge**.
- It must not be rotated or mirrored. The **top of the screen = the top of the UV square**.
- **Shape:** build the screen in a **4:3 (landscape)** or **3:4 (portrait)** shape and tell us which. We'll cut the teaser clips to match.

## 3. Size and orientation
- Use real-world size in **meters**, roughly 1.7–1.9 m tall.
- Put the **origin at the bottom centre**, on the floor.
- The **front of the cabinet faces Blender's Front view (−Y)**.
- **Apply all transforms** (scale 1, rotation 0) before export.

## 4. Weight (it has to run on phones)
- Whole cabinet: **under 50,000 triangles**.
- Textures: **1024 px** preferred, **2048 px** maximum.
- Use standard materials (Principled BSDF: colour, roughness, metal, normal). No special shader node setups.
- If the marquee or buttons should glow, give them an emissive colour.

## 5. Nice to have (name these parts too)
- **`MARQUEE`:** the lit sign at the top.
- **`BUTTONS`:** the joystick and buttons.
- Any animation (blinking lights, etc.) can stay in the file. Trio will support playing it later.

## 6. Export and delivery
- Export as **.glb** (glTF Binary) with **+Y Up**, modifiers applied, UVs and normals included.
- Leave cameras and lights out.
- Send the **.glb** and a **screenshot** of the cabinet, and tell us the **screen shape** (4:3 or 3:4).
