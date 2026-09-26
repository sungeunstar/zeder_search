// Camera cues never replace user orbit input and never recenter a document reader.
export function workFraming(pose,{reduced=false,mobile=false}={}){
 if(reduced||pose?.ambient||pose?.action==='walk'||!['think','research','read','prepare','ready'].includes(pose?.action))return {offset:[0,0,0],yaw:0};
 const gain=mobile?.30:1;
 const cue=pose.station==='board'?{offset:[.42,.12,-.08],yaw:.032}:pose.station==='shelf'?{offset:[-.40,.08,-.08],yaw:-.032}:{offset:[.12,-.09,.10],yaw:.015};
 return {offset:cue.offset.map(v=>v*gain),yaw:cue.yaw*gain};
}
