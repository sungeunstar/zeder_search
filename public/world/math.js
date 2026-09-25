// Deterministic scene layout: no network assets, no customer data in the scene.
export function random(seed=73) { return () => { seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296; }; }
export const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const mix=(a,b,t)=>a+(b-a)*t;
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const hash=(x,y)=>{const a=Math.sin(x*127.1+y*311.7)*43758.5453;return a-Math.floor(a);};
export function noise(x,y){const a=Math.floor(x),b=Math.floor(y),u=smooth(x-a),v=smooth(y-b);return mix(mix(hash(a,b),hash(a+1,b),u),mix(hash(a,b+1),hash(a+1,b+1),u),v);}
export function fbm(x,z){return .55*noise(x,z)+.27*noise(x*2.03+9,z*2.03)+.12*noise(x*4.11,z*4.11+13)+.06*noise(x*8.3,z*8.3);}
export function coast(a){return 1+.055*Math.sin(a*3+.4)+.034*Math.cos(a*7-1)+.019*Math.sin(a*11);}
export function radius(x,z){return Math.hypot(x/24,z/18)/coast(Math.atan2(z/18,x/24));}
export function ground(x,z){const r=radius(x,z);const h=9.2+3.1*Math.exp(-((x+3)**2/240+(z+3)**2/210))+.23*(fbm(x*.22,z*.22)-.5)-3.8*smooth((r-.57)/.43);const pad=1-smooth((Math.max(Math.abs(x+3.2)/3.5,Math.abs(z+3.2)/3.8)-.75)/.5);return 8+mix(h,12.28,pad*.94);}
export const HOUSE={x:-3.2,z:-3.2};
export function walkable(x,z){return radius(x,z)<.88 && !(Math.abs(x-HOUSE.x)<3.5&&z>HOUSE.z-2.7&&z<HOUSE.z+4.2);}
export const CAMERA_SHOTS=[
 {p:[-48,30,62],t:[-1,20,0],fov:43},
 {p:[-44,31,-28],t:[-1,20,0],fov:43},
 {p:[32,31,-29],t:[-1,21,0],fov:43},
 {p:[29,30,28],t:[-1,21.5,0],fov:43},
 {p:[7.8,25.1,23],t:[-1,22.1,0],fov:43}
];
