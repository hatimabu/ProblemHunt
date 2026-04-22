# Video Assets

Place your local looping video files here for the space hero background.

## Supported Formats
- `.mp4` (recommended)
- `.webm`

## How to Use

1. Drop your video files into this folder, e.g.:
   - `problem-hunt/public/videos/space-hero.mp4`

2. Update the `SpaceVideoBackground` component to use local paths instead of the default CDN URLs:

```tsx
// In src/app/components/space-video-background.tsx
const DEFAULT_SOURCES: VideoSource[] = [
  { src: "/videos/space-hero.mp4", type: "video/mp4" },
];
```

## Recommended Video Specs
- **Resolution**: 1920x1080 minimum (4K preferred)
- **Duration**: 10-30 seconds, seamlessly looped
- **Codec**: H.264 for MP4, VP9 for WebM
- **File size**: Under 20MB for fast loading
- **Style**: Dark space footage, starfields, nebulae, earth from space, or abstract dark motion graphics

## Free Sources
- [Pexels Space Videos](https://www.pexels.com/search/videos/space/)
- [Pixabay Space Videos](https://pixabay.com/videos/search/space/)
- [NASA Video Gallery](https://images.nasa.gov/)

## Current Fallback
If no local videos are provided, the component uses free CDN video URLs from Pexels as defaults, with a CSS starfield animation as a graceful fallback.
