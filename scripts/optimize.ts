import {optimize} from "SVGO";
// const SIZE_MAP = {
//     "16": "1em",
//     "20": "1.25em",
//     "24": "1.5em",
// }

export function optimizeSVG(svg: string, setName: string) {
    // const size = parents.find(p=>SIZE_MAP[p]!==undefined) || "24"
    // const sizeValue = SIZE_MAP[size]
    const result = optimize(svg, {
        multipass: true,
        plugins: [
            {
                name: "preset-default",
                params: {
                    overrides: {
                        removeViewBox: false,
                        convertColors: {
                            currentColor: false,
                        },
                    },
                },
            },
            {
                name: 'removeAllComments',
                fn(root, e, info){
                    return {
                        comment: {
                            enter(node, parentNode){
                                node.value = '';
                                return;
                            }
                        }
                    }
                }
            },
            {
                name: "convertStyleToAttrs",
            },
            {
                name: "removeDimensions",
            },
            {
                name: "removeAttributesBySelector",
                params: {
                    selector: "*:not(svg)",
                    attributes: ["stroke"],
                },
            },
            {
                name: "removeAttrs",
                params: { attrs: "data.*" },
            },
            "removeMetadata",
            "removeEditorsNSData",
            "removeComments",
            "removeTitle", 
            "removeDesc",
            "removeDimensions",
            "removeXMLNS",
            "removeXMLProcInst",
            "removeDoctype",
            "cleanupAttrs",
            "removeUselessStrokeAndFill",
            "removeUnusedNS",
            "removeNonInheritableGroupAttrs",
            "removeEmptyAttrs",
            "convertShapeToPath",
            "convertPathData",
            "mergePaths",
            "collapseGroups",
            "removeEmptyContainers",
            "convertStyleToAttrs",
            "cleanupNumericValues",
            "removeRasterImages",
            {
                name: "replaceColors",
                fn: () => {
                    // Regex to match hex, rgb, hsl, and named colors
                    const colorRegex = /^(#([0-9a-f]{3}|[0-9a-f]{6})|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)|hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)|black|white|red|green|blue|yellow|orange|purple|pink|brown|gray|grey)$/i;
                    const white_black = /white|black/i;

                    return {
                        element: {
                            enter: (node) => {
                                if (node.attributes) {
                                    if(node.attributes.fill === "white" || node.attributes.fill === "#fff" && setName==="internal"){
                                        node.attributes.fill = "transparent";
                                    }else{
                                        if (node.attributes.fill && colorRegex.test(node.attributes.fill)) {
                                            node.attributes.fill = "currentColor";
                                        }
                                        if (node.attributes.stroke && colorRegex.test(node.attributes.stroke)) {
                                            node.attributes.stroke = "currentColor";
                                        }
                                    }
                                }
                            }
                        }
                    };
                }
            },

            // {
            //     name: "addAttributes",
            //     fn: () => {
            //         return {
            //             element: {
            //                 enter: (node) => {
            //                     if (node.attributes) {
            //                         node.attributes.width = sizeValue;
            //                         node.attributes.height = sizeValue;
            //                     }
            //                 }
            //             }
            //         };
            //     }
            // }
        ]
    });
    return result.data;
}