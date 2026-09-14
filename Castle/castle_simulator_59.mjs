import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createEnvironment } from './castle_test_env_59.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url)),args=process.argv.slice(2);
const arg=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const html=fs.readFileSync(path.resolve(ROOT,arg('--source','castle_index_59.html')),'utf8');
const bot=fs.readFileSync(path.join(ROOT,'castle_bot_59.js'),'utf8');
const runtime=fs.readFileSync(path.join(ROOT,'castle_sim_runtime_59.js'),'utf8');
const arrows=fs.readFileSync(path.join(ROOT,'castle_arrow_checks_59.js'),'utf8');
const regressions=fs.readFileSync(path.join(ROOT,'castle_regression_checks_59.js'),'utf8');
const sizes=JSON.parse(fs.readFileSync(path.join(ROOT,'castle_sprite_sizes_57.json'),'utf8'));
function makeEngine(html,bot,runtime,arrows,regressions='',sizes={}){
  const env=createEnvironment(sizes);
  const source=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean).join('\n');
  const globals='document,Image,Audio,Math,performance,crypto,location,navigator,screen,window,form,p1,innerWidth,innerHeight,addEventListener,requestAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,fetch,URLSearchParams';
  const factory=new Function('env','const {'+globals+'}=env;\n'+bot+'\nconst CastleBotUnderTest=CastleBot59;\n'+source+'\n'+arrows+'\n'+runtime+'\n'+regressions+'\nreturn {run:simRun,checks:simChecks,arrowChecks:simArrowChecks,regressions:typeof regressionChecks==="function"?regressionChecks:null,inspect:()=>({profiles:CastleBotUnderTest.profiles}),env};');
  return factory(env);
}
const engine=makeEngine(html,bot,runtime,arrows,regressions,sizes);
if(args.includes('--verify')){
  console.log(JSON.stringify({physics:await engine.checks(),regressions:await engine.regressions(),arrows:await engine.arrowChecks(Number(arg('--scenes','2000')))},null,2));
}else{
  const count=Number(arg('--count','1000')),firstSeed=Number(arg('--seed','10000')),reference=arg('--reference','reference');
  const output={source:'castle_index_59.html',sourceSha256:crypto.createHash('sha256').update(html).digest('hex'),botSha256:crypto.createHash('sha256').update(bot).digest('hex'),firstSeed,countPerLevel:count,reference,results:[]};
  for(const level of arg('--levels','easy,medium,hard').split(',')){
    const total={level,matches:count,botWins:0,humanWins:0,timeouts:0,botFriendlyBalloonHits:0,botEnemyBalloonHits:0,botObjectWins:0,botCastleWins:0,meanSeconds:0,meanTurns:0};
    for(let i=0;i<count;i++){
      const r=await engine.run(firstSeed+i,level,{reference});
      if(r.winner===2){total.botWins++;total[r.reason==='objects'?'botObjectWins':'botCastleWins']++}
      else if(r.winner===1)total.humanWins++;else total.timeouts++;
      total.botFriendlyBalloonHits+=r.botFriendlyBalloonHits;total.botEnemyBalloonHits+=r.botEnemyBalloonHits;
      total.meanSeconds+=r.seconds/count;total.meanTurns+=r.turns/count;
    }
    total.botWinPercent=total.botWins/count*100;output.results.push(total);console.log(JSON.stringify(total));
  }
  const file=path.resolve(ROOT,arg('--out','castle_simulation_59_local.json'));
  fs.writeFileSync(file,JSON.stringify(output,null,2)+'\n');console.log('Saved '+file);
}
