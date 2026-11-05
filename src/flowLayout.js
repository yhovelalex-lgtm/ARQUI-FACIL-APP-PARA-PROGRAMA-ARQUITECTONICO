/** Guías ortogonales y transferencia de distribución, sin cambiar vínculos ni superficies. */
export const FLOW_GRID_DEFAULT = 40;
const integer = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const quantize = (value, step) => Math.round(value/step)*step;
const collides = (a,b,pad) => a.x < b.x+b.w+pad && a.x+a.w+pad > b.x &&
 a.y < b.y+b.h+pad && a.y+a.h+pad > b.y;

/** Copies a bubble composition into the relationship diagram, then separates overlapping boxes. */
export function layoutFlowFromBubbles(spaces, topologyNodes=[], gridSize=FLOW_GRID_DEFAULT) {
  if (!Array.isArray(spaces)||spaces.length===0) return [];
  const step=Math.max(10,integer(gridSize)||FLOW_GRID_DEFAULT);
  const ref=new Map((Array.isArray(topologyNodes)?topologyNodes:[]).map(n=>[n.id,n]));
  const golden=Math.PI*2*1.61803398875;
  const draft=spaces.map((s,i)=>{
    const bubble=ref.get(s.id);
    const bx=Number.isFinite(bubble?.x)?bubble.x:400+Math.cos(i*golden)*(100+Math.sqrt(i)*60);
    const by=Number.isFinite(bubble?.y)?bubble.y:300+Math.sin(i*golden)*(100+Math.sqrt(i)*60);
    const w=Math.max(50,integer(s.w)||120),h=Math.max(50,integer(s.h)||80);
    return {...s,w,h,x:bx-w/2,y:by-h/2};
  });
  const minX=Math.min(...draft.map(n=>n.x)),minY=Math.min(...draft.map(n=>n.y));
  const placed=[];
  for(const n of draft) {
    const wanted={...n,x:quantize(n.x-minX+100,step),y:quantize(n.y-minY+100,step)};
    let selected=null;
    // Search rings near the desired position, preserving the bubble topology and avoiding overlap.
    for(let ring=0;ring<80 && !selected;ring++){
      const candidates=[];
      for(let dx=-ring;dx<=ring;dx++)for(let dy=-ring;dy<=ring;dy++){
        if(Math.max(Math.abs(dx),Math.abs(dy))!==ring)continue;
        candidates.push({x:wanted.x+dx*step,y:wanted.y+dy*step});
      }
      candidates.sort((a,b)=>Math.hypot(a.x-wanted.x,a.y-wanted.y)-Math.hypot(b.x-wanted.x,b.y-wanted.y)||a.y-b.y||a.x-b.x);
      for(const candidate of candidates) {
        const proposed={...wanted,...candidate};
        if(candidate.x<0||candidate.y<0)continue;
        if(placed.every(previous=>!collides(proposed,previous,step*.4))){selected=proposed;break;}
      }
    }
    placed.push(selected||wanted);
  }
  return placed;
}

/** Find nearby X/Y edges or centers to snap one box and draw alignment lines. */
export function alignFlowNode(space,others,x,y,{grid=40,snap=true,guides=true,tolerance=10}={}) {
  const w=Math.max(1,integer(space.w)||120),h=Math.max(1,integer(space.h)||80);
  let outX=x,outY=y,vertical=null,horizontal=null;
  if(guides){
    const targetsX=others.flatMap(n=>[n.x,n.x+n.w/2,n.x+n.w]);
    const targetsY=others.flatMap(n=>[n.y,n.y+n.h/2,n.y+n.h]);
    const xOffsets=[0,w/2,w],yOffsets=[0,h/2,h];
    let bestX=tolerance+1,bestY=tolerance+1;
    for(const target of targetsX)for(const off of xOffsets){
      const diff=Math.abs((x+off)-target);
      if(diff<bestX && diff<=tolerance){bestX=diff;outX=target-off;vertical=target;}
    }
    for(const target of targetsY)for(const off of yOffsets){
      const diff=Math.abs((y+off)-target);
      if(diff<bestY && diff<=tolerance){bestY=diff;outY=target-off;horizontal=target;}
    }
  }
  if(snap){
    const size=Math.max(10,integer(grid)||40);
    if(vertical===null)outX=quantize(outX,size);
    if(horizontal===null)outY=quantize(outY,size);
  }
  return {x:outX,y:outY,vertical,horizontal};
}
