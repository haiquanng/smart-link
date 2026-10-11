import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom has no canvas/SVG layout; illustrations are decorative, so stub the engine.
vi.mock('lottie-web/build/player/lottie_light', () => ({
  default: { loadAnimation: () => ({ destroy: () => undefined }) },
}));
