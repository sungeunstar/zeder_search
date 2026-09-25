import * as T from '../vendor/three.module.js';
// Color and depth come from the SAME render; wind-deformed leaves/grass stay aligned.
// This is depth-aware postprocessing, not a CSS blur or a pre-rendered background.
export function createLens(renderer,camera){
 const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,stencilBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
 target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
 const uniforms={tColor:{value:target.texture},tDepth:{value:target.depthTexture},uResolution:{value:new T.Vector2(1,1)},uFocus:{value:25},uAperture:{value:1},uNear:{value:camera.near},uFar:{value:camera.far},uTime:{value:0}};
 const material=new T.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
 varying vec2 vUv;uniform sampler2D tColor,tDepth;uniform vec2 uResolution;uniform float uFocus,uAperture,uNear,uFar,uTime;
 float depthAt(vec2 uv){float d=texture2D(tDepth,uv).r;return (uNear*uFar)/(uFar-d*(uFar-uNear));}
 void main(){
 float depth=depthAt(vUv);float coc=clamp((depth-uFocus)/max(depth,.1)*uAperture,-1.,1.);
 if(depth>1200.)coc=0.;
 float radius=abs(coc)*10.5;vec3 color=texture2D(tColor,vUv).rgb;float weight=1.;
 // Golden-angle bokeh disk. Don't blur sharp foreground with objects behind it.
 for(int i=0;i<24;i++){float fi=float(i)+.5;float a=fi*2.399963;vec2 off=vec2(cos(a),sin(a))*sqrt(fi/24.)*radius/uResolution;vec2 uv=clamp(vUv+off,vec2(.001),vec2(.999));float dd=depthAt(uv);float w=dd<depth*.8?.2:1.;vec3 s=texture2D(tColor,uv).rgb;color+=s*w;weight+=w;}
 color/=weight;
 // Gentle photographic highlight diffusion, not an all-over glow.
 vec3 bloom=vec3(0.);for(int i=0;i<8;i++){float a=float(i)*.7854;vec3 c=texture2D(tColor,clamp(vUv+vec2(cos(a),sin(a))*5./uResolution,0.,1.)).rgb;bloom+=max(c-vec3(1.1),vec3(0.));}color+=bloom*.014;
 float vignette=1.-.13*pow(length((vUv-.5)*vec2(1.05,.9)),1.5);color*=vignette;
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const screen=new T.Scene();screen.add(new T.Mesh(new T.PlaneGeometry(2,2),material));const camera2=new T.Camera();
 const stats={calls:0,triangles:0};
 return {uniforms,target,stats,setSize(w,h){target.setSize(w,h);uniforms.uResolution.value.set(w,h);},render(scene){renderer.setRenderTarget(target);renderer.render(scene,camera);Object.assign(stats,renderer.info.render);renderer.setRenderTarget(null);renderer.render(screen,camera2);},dispose(){target.dispose();material.dispose();screen.children[0].geometry.dispose();}};
}
