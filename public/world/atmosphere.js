import * as T from '../vendor/three.module.js';
import {spectrumGLSL,SEA,heightAt} from './sea-spectrum.js';
import {lightState,TIME_PRESETS} from './environment-state.js';
// The sky function is shared by the visible dome AND the sea reflection.
// No stock HDR/photo background. Crossing waves/SSS/moon path follow tomob-game.
const common=`
uniform float uTime,uNight,uDusk,uDay,uStars;
uniform vec3 uSunDir,uMoonDir,uHorizon,uZenith;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .55*noise(p)+.27*noise(p*2.03+9.)+.12*noise(p*4.11)+.06*noise(p*8.3+13.);}
vec3 skyColor(vec3 d){
 float y=max(d.y,0.),sunDot=max(dot(d,uSunDir),0.);
 vec3 col=mix(uHorizon,uZenith,pow(y,.45));
 float warm=pow(sunDot,7.)*uDusk*(1.-uNight);
 col=mix(col,vec3(1.25,.59,.26),warm*.62);
 col+=vec3(1.6,.75,.3)*pow(sunDot,38.)*.38*(1.-uNight);
 col+=vec3(10.,7.1,4.2)*smoothstep(.99955,.99989,sunDot)*(1.-uNight);
 vec2 uv=d.xz/max(.11,d.y+.16)*.65+vec2(uTime*.0015,0.);
 float shape=fbm(uv*1.2+vec2(8.4,-2.1));
 float cover=smoothstep(.55,.73,shape+.035*fbm(uv*3.));
 cover*=smoothstep(.006,.08,d.y)*(1.-smoothstep(.65,.95,d.y));
 float rim=clamp((fbm(uv*1.2+vec2(8.49,-2.07))-shape)*16.+.55,0.,1.);
 vec3 shadow=mix(vec3(.40,.50,.64),vec3(.68,.40,.26),warm);
 vec3 lit=mix(vec3(1.0,1.06,1.12),vec3(1.65,1.12,.68),uDusk*.7);
 vec3 cloud=mix(mix(shadow,lit,rim),vec3(.025,.045,.084),uNight);
 col=mix(col,cloud,cover*.38);
 // Camera-space-independent spherical star field, fading after twilight.
 vec2 starUV=vec2(atan(d.z,d.x),asin(clamp(d.y,-1.,1.)))*vec2(145.,170.);
 vec2 cell=floor(starUV),q=fract(starUV)-.5;
 float seed=hash(cell),star=pow(max(0.,1.-length(q)*5.5),4.)*step(.985,seed);
 col+=vec3(.64,.78,1.)*star*(2.5+.25*sin(uTime*.55+seed*70.))*uStars*(1.-cover)*smoothstep(.02,.17,d.y);
 // Moon disk has a softly shaded, cratered surface; it is not a point light sprite.
 float moonDot=dot(d,uMoonDir),moon=smoothstep(.99987,.99994,moonDot);
 vec3 tangent=normalize(cross(vec3(0.,1.,0.),uMoonDir)),up=cross(uMoonDir,tangent);
 vec2 mq=vec2(dot(d,tangent),dot(d,up))*150.;
 float crater=.83+.17*fbm(mq*4.);
 col=mix(col,vec3(1.45,1.61,1.80)*crater,moon*uNight);
 col+=vec3(.21,.32,.57)*pow(max(moonDot,0.),260.)*.28*uNight;
 return col;
}`;
export function atmosphere(scene,mobile=false){
 const uniforms={uTime:{value:0},time:null,uNight:{value:0},uDay:{value:1},uDusk:{value:0},uStars:{value:0},
  uSunDir:{value:new T.Vector3(-.65,.18,-.74).normalize()},uMoonDir:{value:new T.Vector3(-.09,.145,-1.).normalize()},
  uHorizon:{value:new T.Color()},uZenith:{value:new T.Color()}};
 uniforms.time=uniforms.uTime;
 const sky=new T.Mesh(new T.SphereGeometry(1900,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms,
 vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec3 vDir;${common}void main(){gl_FragColor=vec4(skyColor(normalize(vDir)),1.);}`}));
 sky.name='synchronized day dusk night sky';scene.add(sky);
 // Dense where the camera looks, increasingly coarse at the distant horizon.
 const resolution=mobile?144:224,geometry=new T.PlaneGeometry(2,2,resolution,resolution),p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getY(i);const stretch=v=>Math.sign(v)*(36*Math.abs(v)+2264*Math.pow(Math.abs(v),4));p.setXYZ(i,stretch(x),0,stretch(z));}
 geometry.computeBoundingSphere();
 const sea=new T.Mesh(geometry,new T.ShaderMaterial({uniforms,side:T.DoubleSide,
 vertexShader:`uniform float uTime;varying vec3 vWorld;varying vec2 vSlope;varying float vWaveH;
 void main(){vec4 wp=modelMatrix*vec4(position,1.);vec2 p=wp.xz;float h=0.;vec2 slope=vec2(0.),displacement=vec2(0.);
 ${spectrumGLSL}
 wp.y+=h;wp.xz+=displacement;vWorld=wp.xyz;vSlope=slope;vWaveH=h;
 gl_Position=projectionMatrix*viewMatrix*wp;}`,
 fragmentShader:`varying vec3 vWorld;varying vec2 vSlope;varying float vWaveH;${common}
 void main(){
 vec2 p=vWorld.xz;vec3 V=normalize(cameraPosition-vWorld);
 // The original uses three normal textures. Procedural crossing micro-waves
 // replace unverified texture assets and keep this scene fully self-contained.
 vec2 micro=vec2(.0);
 micro+=vec2(.79,.61)*cos(dot(p,vec2(.79,.61))*3.17-uTime*1.38)*.045;
 micro+=vec2(-.39,.92)*cos(dot(p,vec2(-.39,.92))*5.33+uTime*1.71)*.026;
 micro+=vec2(.24,-.97)*cos(dot(p,vec2(.24,-.97))*9.21-uTime*2.7)*.011;
 micro+=vec2(noise(p*2.3+uTime*.11)-.5,noise(p*2.7-uTime*.09)-.5)*.034;
 vec3 N=normalize(vec3(-vSlope.x*1.35+micro.x,1.,-vSlope.y*1.35+micro.y));
 vec3 R=reflect(-V,N);float fres=clamp(.035+.965*pow(1.-max(0.,dot(V,N)),3.5),0.,1.);
 float depthF=pow(max(0.,V.y),.55);depthF=mix(depthF,.5,uNight*.6);
 vec3 deep=mix(vec3(.008,.115,.19),vec3(.006,.015,.037),uNight);
 vec3 shallow=mix(vec3(.021,.28,.32),vec3(.022,.065,.11),uNight);
 vec3 base=mix(deep,shallow,depthF*.85);
 vec3 col=mix(base,min(skyColor(R),vec3(1.15)),clamp(fres*.43+.045,.0,.84));
 float sunSpec=pow(max(dot(R,uSunDir),0.),330.);
 col+=vec3(2.4,1.55,.64)*sunSpec*(1.-uNight);
 float md=max(dot(R,uMoonDir),0.),tight=pow(md,420.),wide=pow(md,140.);
 float glint=noise(p*1.8+uTime*.31),ripple=.55+.45*sin(p.y*.8+uTime*1.7)*sin(p.x*.61-uTime*1.1);
 col+=vec3(.55,.72,1.0)*(tight*1.6+wide*ripple*(.4+.7*smoothstep(.45,.7,glint)))*.60*uNight;
 float back=pow(max(0.,dot(V,-uSunDir)),3.);
 float thin=smoothstep(.01,.35,vWaveH+length(vSlope)*.4);
 col+=vec3(.015,.23,.19)*back*thin*.35*(1.-uNight);
 float crest=smoothstep(.33,.66,vWaveH+length(vSlope)*.3);
 float broken=smoothstep(.56,.77,fbm(p*3.1+uTime*.1));
 float distanceFade=1.-smoothstep(60.,240.,length(cameraPosition.xz-p));
 col=mix(col,mix(vec3(.7,.80,.79),vec3(.11,.18,.25),uNight),crest*broken*.38*distanceFade);
 vec2 shore=p-vec2(9.,-7.);float a=atan(shore.y/14.8,shore.x/26.);
 float coast=1.+.105*sin(a*3.+.4)+.055*cos(a*5.-1.)+.029*sin(a*11.+.3);
 float dist=(length(shore/vec2(26.,14.8))-coast-.13)*19.;
 float foam=(1.-smoothstep(0.,1.5,abs(dist+.23*sin(uTime*.65))))*smoothstep(.33,.68,fbm(p*2.+uTime*.09));
 col=mix(col,mix(vec3(.79,.85,.79),vec3(.14,.21,.30),uNight),foam*.74);
 float fog=1.-exp(-length(cameraPosition.xz-p)*.0008);
 col=mix(col,uHorizon,fog);
 gl_FragColor=vec4(col,1.);
 }`}));
 sea.position.y=SEA.level;sea.frustumCulled=false;sea.name='tomob adapted Gerstner ocean';scene.add(sea);
 const ch=new T.Color(),cz=new T.Color();
 function apply(phase,time){const s=lightState(phase);uniforms.uTime.value=time;uniforms.uNight.value=s.night;uniforms.uDay.value=s.day;uniforms.uDusk.value=s.dusk;uniforms.uStars.value=s.stars;
  ch.setRGB(.15,.34,.62).lerp(new T.Color().setRGB(.82,.53,.36),s.dusk*.12).lerp(new T.Color().setRGB(.018,.038,.078),s.night);
  cz.setRGB(.033,.145,.37).lerp(new T.Color().setRGB(.095,.17,.32),s.dusk*.44).lerp(new T.Color().setRGB(.003,.009,.031),s.night);
  uniforms.uHorizon.value.copy(ch);uniforms.uZenith.value.copy(cz);
  uniforms.uSunDir.value.set(-.21,.04+s.day*.72,-1.).normalize();
  return s;
 }
 apply(TIME_PRESETS.sunset,0);
 return {sky,sea,uniforms,apply,heightAt,debug(){return {waves:12,vertexDisplacement:true,segments:resolution,night:uniforms.uNight.value};}};
}
