---
quick_id: 260811-emq
status: ready
---

# Quick Task: Post Item Page iOS Redesign

Redesign `/post` (PostPageClient + PostForm) to native iOS specifications.

## Tasks

### Task 1: Multi-image carousel
- Replace fixed 16:9 single photo with horizontal snap carousel
- object-contain previews, 1/N counter, delete badge, add-more card
- Submit uses first photo (API single-photo contract)

### Task 2: Inset grouped form + category chips
- Title + description in focus-within grouped card
- Auto-expanding textarea
- Replace `<select>` with 3-column category chip grid
- Align condition chips to same visual language

### Task 3: Floating bottom action bar
- Fixed backdrop-blur submit bar with pill button + micro-animations
- Adjust PostPageClient padding; add i18n for add-more label
