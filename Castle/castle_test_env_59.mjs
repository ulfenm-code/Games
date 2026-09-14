function createEnvironment(sizes={}){
  const noop=()=>{},elements=new Map(),timers=new Map(),intervals=new Map(),frames=new Map();
  let now=1000,id=0,uuid=0,errors=[];
  const context=new Proxy({arcs:[]},{get:(target,key)=>key in target?target[key]:key==='arc'?(...a)=>target.arcs.push(a):key==='createRadialGradient'?()=>({addColorStop:noop}):noop,set:(o,k,v)=>(o[k]=v,true)});
  const element=(key='anonymous')=>{
    if(elements.has(key))return elements.get(key);
    const listeners={};
    const el={style:{},hidden:false,value:'',disabled:false,textContent:'',innerHTML:'',listeners,
      addEventListener:(name,fn)=>{(listeners[name]??=[]).push(fn)},
      dispatch:async(name,data={})=>{const event={preventDefault:noop,pointerId:1,...data};for(const fn of listeners[name]||[])await fn(event)},
      getContext:()=>context,querySelector:selector=>element(key+':'+selector),focus:noop,setPointerCapture:noop,
      getBoundingClientRect:()=>env.rect};
    elements.set(key,el);return el;
  };
  const env={
    rect:{left:0,top:0,width:1600,height:900},elements,context,
    document:{getElementById:element,documentElement:{}},
    Image:class{constructor(){this.complete=true;this.naturalWidth=this.naturalHeight=1024}set src(value){[this.naturalWidth,this.naturalHeight]=sizes[value]||[1024,1024]}},
    Audio:class{cloneNode(){return this}play(){return Promise.resolve()}},
    Math:Object.create(Math),performance:{now:()=>now},
    crypto:{randomUUID:()=> 'SIM-'+(++uuid),getRandomValues:a=>{for(let i=0;i<a.length;i++)a[i]=uuid*97+i+31;return a}},
    URLSearchParams:class{constructor(search){this.params={};for(const pair of search.replace(/^\?/,'').split('&')){const [k,v='']=pair.split('=');this.params[decodeURIComponent(k)]=decodeURIComponent(v)}}get(k){return this.params[k]??null}},
    location:{search:''},navigator:{userAgent:'SIMULATION'},screen:{},window:{location:{}},
    form:element('form'),p1:element('p1'),innerWidth:1600,innerHeight:900,addEventListener:noop,
    requestAnimationFrame:fn=>{const k=++id;frames.set(k,fn);return k},
    setTimeout:(fn,ms=0)=>{const k=++id;timers.set(k,{fn,at:now+Math.max(0,ms)});return k},
    clearTimeout:k=>timers.delete(k),
    setInterval:(fn,ms)=>{if(!env.allowPoll)throw new Error('Unexpected network polling');const k=++id;intervals.set(k,{fn,ms});env.poll=fn;return k},
    clearInterval:k=>intervals.delete(k),
    fetch:()=>{throw new Error('Network forbidden in simulation')},
    reset:()=>{now=1000;timers.clear();intervals.clear();frames.clear();errors=[];env.rect={left:0,top:0,width:1600,height:900}},
    time:()=>now,advance:ms=>{now+=ms},
    nextTimer:()=>Math.min(Infinity,...[...timers.values()].map(t=>t.at)),
    fireDue:()=>{if(errors.length)throw errors[0];let fired=false;for(const [k,t] of [...timers])if(t.at<=now){timers.delete(k);const r=t.fn();if(r?.catch)r.catch(e=>errors.push(e));fired=true}return fired},
    fireFrames:()=>{const batch=[...frames];frames.clear();for(const [,fn] of batch)fn(now)},
    pollAll:async()=>{for(const [,t] of [...intervals])await t.fn()},
    intervalCount:()=>intervals.size,
    allowPoll:false
  };env.p1.value='REFERENCE';return env;
}
export { createEnvironment };
