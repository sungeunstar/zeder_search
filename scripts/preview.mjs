// Backward-compatible preview command. The standalone contains the real Three.js engine.
process.argv[2] ??= 'preview.html';
await import('./standalone.mjs');
