// Deterministic scene layout: no network assets, no customer data in the scene.
export function random(seed=73) { return () => { seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296; }; }
export const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const mix=(a,b,t)=>a+(b-a)*t;
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const hash=(x,y)=>{const a=Math.sin(x*127.1+y*311.7)*43758.5453;return a-Math.floor(a);};
export function noise(x,y){const a=Math.floor(x),b=Math.floor(y),u=smooth(x-a),v=smooth(y-b);return mix(mix(hash(a,b),hash(a+1,b),u),mix(hash(a,b+1),hash(a+1,b+1),u),v);}
export function fbm(x,z){return .55*noise(x,z)+.27*noise(x*2.03+9,z*2.03)+.12*noise(x*4.11,z*4.11+13)+.06*noise(x*8.3,z*8.3);}
// A coastal headland, not a flat disk sitting on a vertical cylinder.
export function coast(a){return 1+.105*Math.sin(a*3+.4)+.055*Math.cos(a*5-1)+.029*Math.sin(a*11+.3);}
export const LAND={x:9,z:-7,rx:26,rz:14.8};
export function radius(x,z){return Math.hypot((x-LAND.x)/LAND.rx,(z-LAND.z)/LAND.rz)/coast(Math.atan2((z-LAND.z)/LAND.rz,(x-LAND.x)/LAND.rx));}
export const HOUSE={x:6.1,z:-3.3};
export function ground(x,z){
 const r=radius(x,z),a=Math.atan2(z-LAND.z,x-LAND.x);
 const erosion=(fbm(x*.14+8,z*.14)-.5)*.085;
 const edge=smooth((r+erosion-.66)/.52);
 const fall=24.5*Math.pow(edge,1.18);
 const weather=(fbm(x*.3,z*.3)-.5)*1.22+(fbm(x*.92,z*.92)-.5)*.22;
 let h=20.25+weather+.38*Math.sin(x*.14+z*.19)-fall;
 // A level foundation blends over several meters instead of cutting a rectangle.
 const d=Math.max(Math.abs(x-HOUSE.x)/5.35,Math.abs(z-HOUSE.z)/4.55);
 const pad=1-smooth((d-.91)/.62);h=mix(h,20.28,pad);
 // Differential erosion creates gullies and ledges only below the planted soil.
 const cliff=smooth((r-.68)/.30)*(1-smooth((r-1.22)/.18));
 h+=cliff*(Math.sin(a*17+fbm(x*.11,z*.11)*4)*.65+(fbm(x*.42,z*.42)-.5)*1.4);
 return h;
}
export function walkable(x,z){return radius(x,z)<.88 && !(Math.abs(x-HOUSE.x)<3.5&&z>HOUSE.z-2.7&&z<HOUSE.z+4.2);}
export const CAMERA_SHOTS=[
 {p:[-48,30,62],t:[-1,20,0],fov:43},
 {p:[-44,31,-28],t:[-1,20,0],fov:43},
 {p:[32,31,-29],t:[-1,21,0],fov:43},
 {p:[29,30,28],t:[-1,21.5,0],fov:43},
 {p:[7.8,25.1,23],t:[-1,22.1,0],fov:43}
];
