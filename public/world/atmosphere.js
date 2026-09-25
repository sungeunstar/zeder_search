import * as T from '../vendor/three.module.js';
const common=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .55*noise(p)+.27*noise(p*2.03+9.)+.12*noise(p*4.11)+.06*noise(p*8.3+13.);}
vec3 skyColor(vec3 d){
 float elevation=max(d.y,0.);vec3 horizon=vec3(.27,.48,.66),zenith=vec3(.015,.11,.35);
 vec3 col=mix(horizon,zenith,pow(elevation,.40));
 vec3 sun=normalize(vec3(-.24,.065,-.969));float alignment=max(dot(d,sun),0.);
 float warmth=pow(alignment,10.);col=mix(col,vec3(1.02,.61,.32),warmth*.73);
 col+=vec3(1.1,.58,.24)*pow(alignment,60.)*.45;
 col+=vec3(7.8,5.7,3.1)*smoothstep(.99950,.99988,alignment);
 // Layered cloud banks, with a lit upper edge and blue-grey bases.
 vec2 uv=d.xz/max(.095,d.y+.18)*1.12;
 float shape=fbm(uv*1.3+vec2(8.4,-2.1));
 float detail=fbm(uv*5.+vec2(19.,3.));
 float coverage=smoothstep(.50,.665,shape+.055*detail);
 coverage*=smoothstep(.005,.04,d.y)*(1.-smoothstep(.74,.95,d.y));
 float rim=clamp((fbm(uv*1.3+vec2(8.52,-2.02))-shape)*13.+.53,0.,1.);
 vec3 shadow=mix(vec3(.37,.44,.56),vec3(.69,.43,.34),warmth);
 vec3 lit=mix(vec3(1.11,1.13,1.10),vec3(1.7,1.15,.72),warmth);
 col=mix(col,mix(shadow,lit,rim),coverage*.54);return col;

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
 vec3 deep=vec3(.008,.17,.29),shallow=vec3(.023,.32,.43);
 vec3 color=mix(mix(deep,shallow,fbm(p*.045)*.45),skyColor(reflection),clamp(fresnel*.38+.07,0.,1.));
 vec3 sun=normalize(vec3(-.24,.065,-.969));float spec=pow(max(dot(reflect(-sun,n),view),0.),180.);
 color+=vec3(4.5,3.1,1.45)*spec*.6;
 vec2 shore=p-vec2(9.,-7.);float a=atan(shore.y/14.8,shore.x/26.);float coast=1.+.105*sin(a*3.+.4)+.055*cos(a*5.-1.)+.029*sin(a*11.+.3);
 float dist=(length(shore/vec2(26.,14.8))-coast-.13)*19.;
 float foam=(1.-smoothstep(.0,1.15,abs(dist+.13*sin(time*.6))))*smoothstep(.32,.69,fbm(p*2.+time*.05));
 color=mix(color,vec3(.75,.84,.81),foam*.88);
 float fog=1.-exp(-length(cameraPosition.xz-p)*.0007);color=mix(color,skyColor(normalize(vec3(reflection.x,.015,reflection.z))),fog);
 gl_FragColor=vec4(color,1.);
 }`}));sea.rotation.x=-Math.PI/2;sea.position.y=-.08;sea.name='animated reflective ocean';scene.add(sea);
 return {sky,sea,uniforms};
}
