// tomob-game/sky.js time convention: 0 sunrise, .25 noon, .5 sunset, .75 midnight.
export const TIME_PRESETS=Object.freeze({day:.24,sunset:.465,night:.74});
export const DEFAULT_TIME='sunset';
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export function lightState(phase){
 if(!Number.isFinite(phase))throw new TypeError('Finite time phase required');
 const p=((phase%1)+1)%1,elevation=Math.sin(p*Math.PI*2);
 const night=1-smooth((elevation+.14)/.43),day=smooth((elevation+.03)/.65);
 const dusk=(1-smooth(Math.abs(elevation)/.70))*(1-night*.9);
 return {phase:p,day,night,dusk,elevation,
  exposure:1.12-.16*night+.03*dusk,
  sun:Math.max(.05,2.4+day*1.5)*(1-night),
  hemi:1.40-.60*night,bounce:1.44-.90*night,moon:1.15*night,
  stars:smooth((night-.52)/.42),lamps:1+night*1.35};
}
export function approachPhase(current,target,dt){
 if(![current,target,dt].every(Number.isFinite))throw new TypeError('Invalid time transition');
 return current+(target-current)*(1-Math.exp(-Math.max(0,dt)*1.5));
}
export function cameraOrbit(base,target,pointer,aspect=1){
 const dx=base[0]-target[0],dy=base[1]-target[1],dz=base[2]-target[2];
 const r=Math.hypot(dx,dy,dz),yaw=Math.atan2(dx,dz)+clamp(pointer[0],-1,1)*.082;
 const pitch=Math.asin(dy/r)+clamp(pointer[1],-1,1)*.025;
 const rr=r*(aspect<.8?1:1);
 return [target[0]+Math.sin(yaw)*Math.cos(pitch)*rr,target[1]+Math.sin(pitch)*rr,target[2]+Math.cos(yaw)*Math.cos(pitch)*rr];
}
