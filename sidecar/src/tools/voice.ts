import { mkdir,mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os'; import { dirname,join,resolve } from 'node:path'; import { spawn,type ChildProcess } from 'node:child_process';
import { config } from '../config.js'; import { registerTool } from './registry.js';

export type WhisperRunner=(executable:string,args:string[],cwd?:string)=>Promise<void>;
export type PiperRunner=(executable:string,args:string[],input:string,cwd?:string)=>Promise<void>;

export async function runProcess(executable:string,args:string[],input?:string,cwd?:string):Promise<void>{
 await new Promise<void>((resolveRun,rejectRun)=>{
  const child:ChildProcess=spawn(executable,args,{cwd,windowsHide:true,stdio:['pipe','pipe','pipe']});let stderr='';
  child.stderr?.on('data',(chunk:Buffer)=>{stderr+=chunk.toString()});child.once('error',rejectRun);
  child.once('close',code=>{if(code===0)return resolveRun();const detail=stderr.trim();rejectRun(new Error(executable+' exited with code '+(code??'unknown')+(detail?': '+detail:'')))});
  child.stdin?.end(input);
 });
}
export function runWhisperCli(executable:string,args:string[],cwd?:string){return runProcess(executable,args,undefined,cwd)}
export async function transcribeWav(audioPath:string,runner:WhisperRunner=runWhisperCli,settings:{executable?:string;model?:string}={}):Promise<{text:string;model:string}>{
 const inputPath=resolve(audioPath);if(!inputPath.toLowerCase().endsWith('.wav'))throw new Error('voice.listen currently accepts 16-bit WAV audio only.');
 const executable=settings.executable??config.whisperCli,model=settings.model??config.whisperModel;
 if(!executable)throw new Error('TJ_CORTEX_WHISPER_CLI is not configured.');if(!model)throw new Error('TJ_CORTEX_WHISPER_MODEL is not configured.');
 const tempDir=await mkdtemp(join(tmpdir(),'tj-cortex-whisper-')),outputBase=join(tempDir,'transcript');
 try{await runner(executable,['--model',resolve(model),'--file',inputPath,'--output-txt','--output-file',outputBase,'--no-timestamps','--no-prints'],dirname(inputPath));return{text:(await readFile(outputBase+'.txt','utf8')).trim(),model:resolve(model)}}finally{await rm(tempDir,{recursive:true,force:true})}
}
export function runPiperCli(executable:string,args:string,input:string,cwd?:string){return runProcess(executable,args,input,cwd)}
export async function synthesizeSpeech(text:string,outputPath:string,runner:PiperRunner=runPiperCli,settings:{executable?:string;model?:string}={}):Promise<{audioPath:string;model:string}>{
 const normalizedText=text.trim();if(!normalizedText)throw new Error('voice.speak requires non-empty text.');
 const targetPath=resolve(outputPath);if(!targetPath.toLowerCase().endsWith('.wav'))throw new Error('voice.speak currently outputs WAV audio only.');
 const executable=settings.executable??config.piperCli,model=settings.model??config.piperModel;
 if(!executable)throw new Error('TJ_CORTEX_PIPER_CLI is not configured.');if(!model)throw new Error('TJ_CORTEX_PIPER_MODEL is not configured.');
 await mkdir(dirname(targetPath),{recursive:true});await runner(executable,['--model',resolve(model),'--output_file',targetPath,'--quiet'],normalizedText,dirname(targetPath));
 return{audioPath:targetPath,model:resolve(model)};
}
registerTool({descriptor:{name:'voice.listen',category:'voice',description:'Transcribe a local 16-bit WAV recording with the configured local whisper.cpp CLI.',risk:'read',parameters:{type:'object',properties:{audioPath:{type:'string',description:'Path to a 16-bit WAV recording.'}},required:['audioPath']},requiresConsent:true,scoped:true,enabled:true},async run(inv){const audioPath=String(inv.args.audioPath??'');if(!audioPath)throw new Error('audioPath is required.');return transcribeWav(audioPath)}});
registerTool({descriptor:{name:'voice.speak',category:'voice',description:'Synthesize speech locally with the configured single Piper voice.',risk:'write',parameters:{type:'object',properties:{text:{type:'string',description:'Text to speak.'},outputPath:{type:'string',description:'Destination WAV path.'}},required:['text','outputPath']},requiresConsent:true,scoped:true,enabled:true},async run(inv){const text=String(inv.args.text??''),outputPath=String(inv.args.outputPath??'');if(!text.trim())throw new Error('text is required.');if(!outputPath)throw new Error('outputPath is required.');return synthesizeSpeech(text,outputPath)}});
