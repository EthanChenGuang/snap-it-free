# Post Form Redesign + Draft Fix

Fix multi-image draft persistence when navigating to `/select-location`, expand category grid to all 17 Subito slugs, add 5-grade condition pills, and polish iOS-style PostForm UI.

## Tasks

1. Multi-image draft: `photoDataUrls[]` in sessionStorage, await persist before location navigation
2. Category grid: SUBITO_CATEGORY_SLUGS 3-col + clear selection
3. Condition: 5 grades (brand_new → poor) with pill styling
4. API/schema: accept Subito slugs as `postCategory`
