// SVGO configuration optimized for icon libraries
// This configuration removes all unnecessary elements while preserving visual structure

module.exports = {
  multipass: true,
  plugins: [
    // Remove unnecessary metadata and editor data
    { name: "removeMetadata" },
    { name: "removeEditorsNSData" },
    { name: "removeComments" },
    { name: "removeTitle" },
    { name: "removeDesc" },
    { name: "removeUselessDefs" },
    { name: "removeEmptyText" },
    { name: "removeHiddenElems" },
    
    // Remove dimensions and XML namespaces
    { name: "removeDimensions" },
    { name: "removeXMLNS" },
    { name: "removeXMLProcInst" },
    
    // Clean up attributes
    { name: "cleanupAttrs" },
    { name: "removeUselessStrokeAndFill" },
    { name: "removeUnusedNS" },
    { name: "removeNonInheritableGroupAttrs" },
    { name: "removeViewBox" },
    { name: "removeEmptyAttrs" },
    
    // Optimize paths and shapes
    { name: "convertShapeToPath" },
    { name: "convertEllipseToCircle" },
    { name: "convertPathData" },
    { name: "convertTransform" },
    { name: "mergePaths" },
    { name: "collapseGroups" },
    { name: "removeEmptyContainers" },
    
    // Style optimization
    { name: "convertStyleToAttrs" },
    { name: "inlineStyles" },
    { name: "minifyStyles" },
    
    // Replace fill and stroke with currentColor for themeability
    {
      name: "removeUselessStrokeAndFill",
      params: {
        removeNone: false,
        removeStroke: false,
        removeFill: false
      }
    },
    
    // Replace colors with currentColor
    {
      name: "replaceColors",
      params: {
        replace: {
          "#000": "currentColor",
          "#000000": "currentColor", 
          "black": "currentColor",
          "#333": "currentColor",
          "#333333": "currentColor",
          "#666": "currentColor",
          "#666666": "currentColor",
          "#999": "currentColor",
          "#999999": "currentColor",
          "#ccc": "currentColor",
          "#cccccc": "currentColor",
          "#fff": "currentColor",
          "#ffffff": "currentColor",
          "white": "currentColor"
        }
      }
    },
    
    // Remove specific attributes that are not needed for icons
    {
      name: "removeAttrs",
      params: { 
        attrs: [
          "id",
          "stroke-linejoin",
          "stroke-linecap", 
          "stroke-miterlimit",
          "stroke-dasharray",
          "stroke-dashoffset",
          "stroke-opacity",
          "fill-opacity",
          "opacity",
          "clip-rule",
          "fill-rule",
          "vector-effect",
          "paint-order",
          "color-interpolation",
          "color-interpolation-filters",
          "enable-background",
          "xml:space",
          "xml:lang",
          "xml:base",
          "xml:id",
          "xmlns:xlink",
          "xlink:href",
          "xlink:title",
          "xlink:type",
          "xlink:show",
          "xlink:actuate",
          "xlink:arcrole",
          "xlink:role",
          "xlink:from",
          "xlink:to",
          "xlink:label"
        ].join("|")
      }
    },
    
    // Remove specific elements that are not needed for icons
    {
      name: "removeElementsByAttr",
      params: {
        attrs: [
          "id",
          "class", 
          "style",
          "data-*",
          "aria-*",
          "role",
          "tabindex",
          "focusable",
          "pointer-events"
        ]
      }
    },
    
    // Optimize transforms
    { name: "transformsWithOnePath" },
    { name: "removeUselessStrokeAndFill" },
    { name: "removeUnusedNS" },
    { name: "removeNonInheritableGroupAttrs" },
    
    // Final cleanup
    { name: "cleanupNumericValues" },
    { name: "cleanupListOfValues" },
    { name: "moveElemsAttrsToGroup" },
    { name: "moveGroupAttrsToElems" },
    { name: "removeRasterImages" },
    { name: "removeDoctype" },
    { name: "removeXMLProcInst" }
  ]
};
