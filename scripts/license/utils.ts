import LICENSES from "./licenses";

export const SVGRepoLicenses = {
    // CC0 1.0 - Public Domain
    cc0: {
        license: 'CC0 1.0 Universal',
        attribution: 'No attribution required',
        licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        description: 'Public domain - use freely'
    },
    // CC BY 4.0 - Attribution required
    ccBy4: {
        license: 'CC BY 4.0',
        attribution: 'Icons by SVG Repo (https://www.svgrepo.com/) - Licensed under CC BY 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        description: 'Attribution required - commercial use allowed'
    },
    // CC BY-SA 4.0 - Attribution + ShareAlike
    ccBySa4: {
        license: 'CC BY-SA 4.0',
        attribution: 'Icons by SVG Repo (https://www.svgrepo.com/) - Licensed under CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        description: 'Attribution required - derivatives must use same license'
    },
    // CC BY-NC 4.0 - Attribution + NonCommercial
    ccByNc4: {
        license: 'CC BY-NC 4.0',
        attribution: 'Icons by SVG Repo (https://www.svgrepo.com/) - Licensed under CC BY-NC 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
        description: 'Attribution required - non-commercial use only'
    },
    // MIT License
    mit: {
        license: 'MIT',
        attribution: 'Icons by SVG Repo (https://www.svgrepo.com/)',
        licenseUrl: 'https://opensource.org/licenses/MIT',
        description: 'MIT License - attribution required'
    }
} as const;

export const getIconLicense = (iconName: string) => {
    // Map specific icons to their licenses
    const licenseMap: Record<string, keyof typeof SVGRepoLicenses> = {
        'add-item': 'ccBy4',
        'angle-down': 'mit',
        'angle-up': 'mit',
        'angle-left': 'mit',
        'angle-right': 'mit',
        'arrow-up': 'cc0',
        'arrow-down': 'cc0',
        'arrow-left': 'cc0',
        'arrow-right': 'cc0',
        'close': 'ccBy4',
        'close-outlined': 'mit',
        'close-circle-filled': 'mit',
        'check': 'mit',
        'check-circle-outlined': 'mit',
        'check-circle-filled': 'mit',
        'check-badge': 'mit',
        'check-badge-outlined': 'mit',
        'check-badge-filled': 'mit',
        'chevron-down': 'mit',
        'chevron-up': 'mit',
        'campaign': 'ccBy4',
        'cloud-upload-filled': 'mit',
        'cloud-upload-outlined': 'cc0',
        'files-folder-outlined': 'cc0',
        'files-outlined': 'ccBy4',
        'exclamation-circle-outlined': 'ccBy4',
        'edit-outlined': 'ccBy4',
        'edit-filled': 'mit',
        'infographic-elements-filled': 'cc0',
        'image-gallery-outlined': 'ccBy4',
        'photo-upload-outlined': 'ccBy4',
        'times': 'mit',
        'search-glass-outlined': 'cc0',
        'search-outlined': 'ccBy4',
        'picture-photo-outlined': 'cc0',
        'pictures-photo-outlined': 'cc0',
        'search-globe-outlined': 'ccBy4',
        'plus': 'ccBy4',
      // Add more mappings as needed
    };
    
    return SVGRepoLicenses[licenseMap[iconName] || 'cc0'];
};

export function insertLicense(svg: string, licenseText: string) {
    const cleanLicense = licenseText.replace(/--/g, "–"); // prevent comment break
    return svg.replace(/>/, `>\n<!-- ${cleanLicense} -->\n`)
      // ? `<!-- ${cleanLicense} -->\n${svg}`
      // : svg.replace(/^<svg/, `<!-- ${cleanLicense} -->\n<svg`);
      // : svg.replace(/^>/, `>\n<!-- ${cleanLicense} -->\n`);
}

export function getLicense(pkgName: string) {
    const info = LICENSES[pkgName];
    if (!info)
        return `Unknown License Source (${pkgName})`;

    const { name, license, url, copyright } = info;
    return `${name} — ${license}${url ? ` (${url})` : ""}${copyright ? ` ${copyright}` : ""}`;
}
