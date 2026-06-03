const LICENSES = {
    "icon-lucide": {
        name: "Lucide Icons",
        license: "ISC",
        url: "https://lucide.dev",
        copyright: "© Lucide Contributors",
        variants: [],
        size: []
    },
    "icon-heroicons": {
        name: "Heroicons",
        license: "MIT",
        url: "https://heroicons.com",
        copyright: "© Tailwind Labs, Inc.",
        variants: ["solid", "outline"],
        size: ["16", "20", "24"]
    },
    "icon-remix": {
        name: "Remix Icon",
        license: "Apache-2.0",
        url: "https://remixicon.com",
        copyright: "© Remix Design",
        variants: [],
        size: []
    },
    "icon-tabler":{
        name: "Tabler Icons",
        license: "Apache-2.0",
        url: "https://tablericons.com",
        copyright: "© Tabler Contributors",
        variants: ["filled", "outline"],
        size: []
    },
    "icon-material-design": {
        name: "Material Design Icons",
        license: "Apache-2.0",
        url: "https://materialdesignicons.com",
        copyright: "© Google",
        variants: ["filled", "outlined", "round", "sharp", "two-tone"],
        size: []
    },
    "icon-font-awesome": {
        name: "Font Awesome Free 7.1.0",
        license: "CC BY 4.0",
        url: "https://fontawesome.com",
        copyright: "© 2025 Fonticons, Inc",
        variants: ["brands", "regular", "solid"],
        size: []
    },
    "icon-internal": {
        name: "Internal Fluixi Icons",
        license: "MIT",
        url: "https://fluixi.dev",
        copyright: "© Fluixi",
        variants: ["outline", "filled"],
        size: []
    },
    "icon-phosphor": {
        name: "Phosphor Icons",
        license: "MIT",
        url: "https://phosphoricons.com",
        copyright: "© 2023 Phosphor Icons",
        variants: ["bold", "duotone", "fill", "light", "regular", "thin"],
        size: []
    },
    "icon-bootstrap": {
        name: "Bootstrap Icons",
        license: "MIT",
        url: "https://icons.getbootstrap.com",
        copyright: "© 2019–2024 The Bootstrap Authors",
        variants: [],
        size: []
    },
    "icon-iconoir": {
        name: "Iconoir",
        license: "MIT",
        url: "https://iconoir.com",
        copyright: "© 2021 Luca Burgio",
        variants: ["regular", "solid"],
        size: []
    },
} as const;

const LICENCES_VARIANTS = Array.from(
  new Set(
    Object.keys(LICENSES).flatMap((d) => [
      ...(LICENSES[d as keyof typeof LICENSES].variants as string[]),
      ...(LICENSES[d as keyof typeof LICENSES].size as string[]),
    ]),
  ),
);

export default LICENSES;
export { LICENSES, LICENCES_VARIANTS };
