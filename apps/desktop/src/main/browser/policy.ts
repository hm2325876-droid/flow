import type {Slot} from '@flowproof/contracts';
export function isAllowedUrl(value:string,origin:string):boolean {
  try {const u=new URL(value);return u.protocol==='http:'&&u.hostname==='localhost'&&!u.username&&!u.password&&u.origin===origin;} catch{return false;}
}
export function clampSlot(slot:Slot,width:number,height:number){
  const x=Math.min(width,Math.round(slot.x)),y=Math.min(height,Math.round(slot.y));
  return {x,y,width:Math.max(0,Math.min(Math.round(slot.width),width-x)),height:Math.max(0,Math.min(Math.round(slot.height),height-y))};
}
export class RunGate {
  private active=false; private uncertain=false;
  enter(){if(this.active||this.uncertain)return false;this.active=true;return true;}
  finish(known:boolean){this.active=false;if(!known)this.uncertain=true;}
}
