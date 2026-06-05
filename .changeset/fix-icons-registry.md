---
"@fluixi/icons": patch
---

Fix: ship `dist/all/registry.js` in the published tarball. The CDN bundle is now built before the API copy step so the full icon registry is included.
