import * as T from '../vendor/three.module.js';
const common=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .55*noise(p)+.27*noise(p*2.03+9.)+.12*noise(p*4.11)+.06*noise(p*8.3+13.);}
vec3 skyColor(vec3 d){
 float elevation=max(d.y,0.);vec3 horizon=vec3(.18,.30,.38);vec3 zenith=vec3(.007,.08,.18);
 vec3 col=mix(horizon,zenith,pow(elevation,.46));
 vec3 sun=normalize(vec3(-.7,.22,-.62));float alignment=max(dot(d,sun),0.);
 col+=vec3(.42,.24,.11)*pow(alignment,8.)*.4;
 col=mix(col,vec3(1.6,1.28,.78),pow(alignment,900.));
 col+=vec3(.9,.52,.16)*pow(alignment,40.)*.28;
 vec2 uv=d.xz/max(.12,d.y+.23)*1.35;float clouds=smoothstep(.51,.77,fbm(uv*1.4+vec2(12.,-6.)));
 clouds*=smoothstep(.0,.10,d.y)*(1.-smoothstep(.6,.94,d.y));
 vec3 cloudColor=mix(vec3(.43,.50,.54),vec3(.82,.61,.39),pow(alignment,6.));
 col=mix(col,cloudColor,clouds*.3);return col;
}`;
export function atmosphere(scene){
 const sky=new T.Mesh(new T.SphereGeometry(1900,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{},vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vDir;${common}void main(){gl_FragColor=vec4(skyColor(normalize(vDir)),1.);}`}));sky.name='clouds and evening atmosphere';scene.add(sky);
 const uniforms={time:{value:0}};
 const sea=new T.Mesh(new T.PlaneGeometry(6000,6000,1,1),new T.ShaderMaterial({uniforms,vertexShader:`varying vec3 vWorld;void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`
 uniform float time;varying vec3 vWorld;${common}
 void main(){
 vec2 p=vWorld.xz;float t=time*.32;vec3 view=normalize(cameraPosition-vWorld);
 // Several crossing wave trains: continuous animated specular normals across a real water plane.
 vec2 slope=vec2(0.);
 slope+=vec2(.76,.34)*cos(dot(p,vec2(.76,.34))*.54-t*1.7)*.048;
 slope+=vec2(-.36,.93)*cos(dot(p,vec2(-.36,.93))*1.24+t*1.3)*.027;
 slope+=vec2(.68,-.73)*cos(dot(p,vec2(.68,-.73))*2.55-t*2.6)*.014;
 slope+=vec2(.23,.95)*cos(dot(p,vec2(.23,.95))*5.8+t*3.)*.008;
 slope+=vec2(noise(p*.7+t)-.5,noise(p*.9-t)-.5)*.032;
 vec3 n=normalize(vec3(-slope.x,1.,-slope.y));vec3 reflection=reflect(-view,n);
 float fresnel=.035+.965*pow(1.-max(dot(view,n),0.),4.);
 vec3 deep=vec3(.008,.095,.15),shallow=vec3(.024,.23,.29);
 vec3 color=mix(mix(deep,shallow,fbm(p*.045)*.45),skyColor(reflection),clamp(fresnel*.65+.06,0.,1.));
 vec3 sun=normalize(vec3(-.7,.22,-.62));float spec=pow(max(dot(reflect(-sun,n),view),0.),180.);
 color+=vec3(2.5,1.8,.85)*spec;
 float a=atan(p.y/18.,p.x/24.);float coast=1.+.055*sin(a*3.+.4)+.034*cos(a*7.-1.)+.019*sin(a*11.);
 float dist=(length(p/vec2(24.,18.))-coast-.105)*19.;
 float foam=(1.-smoothstep(.0,1.15,abs(dist+.13*sin(time*.6))))*smoothstep(.32,.69,fbm(p*2.+time*.05));
 color=mix(color,vec3(.75,.84,.81),foam*.88);
 float fog=1.-exp(-length(cameraPosition.xz-p)*.0007);color=mix(color,skyColor(normalize(vec3(reflection.x,.015,reflection.z))),fog);
 gl_FragColor=vec4(color,1.);
 }`}));sea.rotation.x=-Math.PI/2;sea.position.y=-.08;sea.name='animated reflective ocean';scene.add(sea);
 return {sky,sea,uniforms};
}
