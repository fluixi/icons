// const LICENSES = {
//     "icon-lucide": {
//         name: "Lucide Icons",
//         license: "ISC",
//         url: "https://lucide.dev",
//         copyright: "© Lucide Contributors",
//         variants: [],
//         size: []
//     },
//     "icon-heroicons": {
//         name: "Heroicons",
//         license: "MIT",
//         url: "https://heroicons.com",
//         copyright: "© Tailwind Labs, Inc.",
//         variants: ["solid", "outline"],
//         size: ["16", "20", "24"]
//     },
//     "icon-remix": {
//         name: "Remix Icon",
//         license: "Apache-2.0",
//         url: "https://remixicon.com",
//         copyright: "© Remix Design",
//         variants: [
//             "arrows", "buildings", "business", 
//             "communication", "design", "development", 
//             "device", "document", "editor", "finance", 
//             "food", "health_mediacal", "logos", 
//             "map", "media", "others", "system",
//             "user_faces", "weather"
//         ],
//         size: []
//     },
//     "icon-tabler":{
//         name: "Tabler Icons",
//         license: "Apache-2.0",
//         url: "https://tablericons.com",
//         copyright: "© Tabler Contributors",
//         variants: ["filled", "outline"],
//         size: []
//     },
//     "icon-material-design": {
//         name: "Material Design Icons",
//         license: "Apache-2.0",
//         url: "https://materialdesignicons.com",
//         copyright: "© Google",
//         variants: ["filled", "outlined", "round", "sharp", "two-tone"],
//         size: []
//     },
//     "icon-font-awesome": {
//         name: "Font Awesome",
//         license: "MIT",
//         url: "https://fontawesome.com",
//         copyright: "© Font Awesome Contributors",
//         variants: ["brands", "regular", "solid"],
//         size: []
//     },
// } as const;

// export function insertLicense(svg: string, licenseText: string) {
//     const cleanLicense = licenseText.replace(/--/g, "–"); // prevent comment break
//     return svg.replace(/>/, `>\n<!-- ${cleanLicense} -->\n`)
//       // ? `<!-- ${cleanLicense} -->\n${svg}`
//       // : svg.replace(/^<svg/, `<!-- ${cleanLicense} -->\n<svg`);
//       // : svg.replace(/^>/, `>\n<!-- ${cleanLicense} -->\n`);
// }

// export function getLicense(pkgName: string) {
//     const info = LICENSES[pkgName];
//     if (!info)
//         return `Unknown License Source (${pkgName})`;

//     const { name, license, url, copyright } = info;
//     return `${name} — ${license}${url ? ` (${url})` : ""}${copyright ? ` ${copyright}` : ""}`;
// }

// export default LICENSES