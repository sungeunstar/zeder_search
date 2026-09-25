/**
 * Adapted from the user's tomob-game/modules/water.js (19d7f70cd73b…).
 * Shared spectrum for GPU displacement and CPU height queries. This is an
 * analytic Gerstner surface, not a Navier–Stokes fluid simulator.
 * Original spectrum is scaled to this small, sheltered coastal workshop.
 */
export const SOURCE_SPECTRUM = Object.freeze([
  {a:.42,f:.011,A:1.55,s:.30}, {a:2.61,f:.016,A:1.70,s:.36},
  {a:4.53,f:.009,A:1.25,s:.26}, {a:1.15,f:.042,A:1.45,s:.58},
  {a:3.34,f:.058,A:1.15,s:.70}, {a:5.41,f:.035,A:1.25,s:.52},
  {a:.87,f:.078,A:.75,s:.85}, {a:3.92,f:.105,A:.42,s:1.00},
  {a:2.08,f:.130,A:.32,s:1.15}, {a:5.90,f:.155,A:.26,s:1.25},
  {a:4.77,f:.185,A:.22,s:1.40}, {a:1.63,f:.235,A:.14,s:1.60}
].map(Object.freeze));
export const SEA = Object.freeze({amplitude:.085,frequency:8.5,speed:1.08,steepness:.34,gerstnerCut:.11,level:-.08});
export const WAVES = Object.freeze(SOURCE_SPECTRUM.map(w=>Object.freeze({
  kx:Math.cos(w.a)*w.f*SEA.frequency,kz:Math.sin(w.a)*w.f*SEA.frequency,
  amplitude:w.A*SEA.amplitude,speed:w.s*SEA.speed,
  gx:w.f<SEA.gerstnerCut?Math.cos(w.a)*SEA.steepness:0,
  gz:w.f<SEA.gerstnerCut?Math.sin(w.a)*SEA.steepness:0
})));
export function waveAt(x,z,time=0){
  if(![x,z,time].every(Number.isFinite))throw new TypeError('Finite water coordinates required');
  let height=SEA.level,sx=0,sz=0,dx=0,dz=0;
  for(const w of WAVES){const p=w.kx*x+w.kz*z+time*w.speed,s=Math.sin(p)*w.amplitude,c=Math.cos(p)*w.amplitude;
    height+=s;sx+=c*w.kx;sz+=c*w.kz;dx+=c*w.gx;dz+=c*w.gz;
  }
  return {height,slope:[sx,sz],displacement:[dx,dz]};
}
export function heightAt(x,z,time=0){
  let px=x,pz=z;
  for(let i=0;i<5;i++){const p=waveAt(px,pz,time);px=x-p.displacement[0];pz=z-p.displacement[1];}
  return waveAt(px,pz,time).height;
}
const f=v=>Number(v).toFixed(8);
export const spectrumGLSL=WAVES.map((w,i)=>`{
  float phase=${f(w.kx)}*p.x+${f(w.kz)}*p.y+uTime*${f(w.speed)};
  float a=${f(w.amplitude)};
  h+=sin(phase)*a;
  slope+=cos(phase)*a*vec2(${f(w.kx)},${f(w.kz)});
  displacement+=cos(phase)*a*vec2(${f(w.gx)},${f(w.gz)});
}`).join('\n');
