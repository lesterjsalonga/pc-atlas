# Computer Atlas — source and credits

All 562 computer pieces, the catalog text, and the application were authored
for this project. Geometry is procedural: boxes, cylinders, rings, extruded
fan blades, and tube cables. There are no externally sourced 3D models,
textures, photographs, fonts, logos, anatomy data, or other downloaded visual
assets. The application uses locally available system fonts.

## Blueprint

[Human Atlas](https://github.com/ashemag/human-atlas), by ashemag, was studied
for architecture and interaction design. Its README, repository tree, scene,
catalog, packed-layout, pointer, and UI modules and its
[live demonstration](https://human-atlas-seven.vercel.app/) informed the brief.
No Human Atlas source code or anatomy assets were copied into this project.
Human Atlas's original code is MIT licensed; its anatomy assets carry a
separate license and are not distributed here.

## Runtime dependencies and icons

- Three.js — MIT, https://github.com/mrdoob/three
- React / React DOM — MIT, https://github.com/facebook/react
- Radix UI primitives — MIT, https://github.com/radix-ui/primitives
- Lucide icons — ISC with Feather-derived MIT portions, https://lucide.dev/license
- class-variance-authority — Apache-2.0, https://github.com/joe-bell/cva
- clsx — MIT, https://github.com/lukeed/clsx
- tailwind-merge — MIT, https://github.com/dcastil/tailwind-merge
- Tailwind CSS — MIT, https://github.com/tailwindlabs/tailwindcss

Dependency licenses were verified from the installed packages. See
[THIRD_PARTY_LICENSES.txt](./THIRD_PARTY_LICENSES.txt) for the installed license
texts. The Button and Switch components use the shadcn/ui ownership and
composition pattern with Radix primitives; no shadcn source was copied.

Original Computer Atlas code and data are released under the root MIT LICENSE.
Any future external asset must have a source and verified redistribution
license recorded here before it is added.
