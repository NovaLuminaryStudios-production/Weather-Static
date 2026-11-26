const API = "https://eroq.ai";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:cors})}
export default {
 async fetch(request,env){
  if(request.method==="OPTIONS") return new Response(null,{headers:cors});
  const url=new URL(request.url);
  if(!env.EROQ_API_KEY) return json({error:"Backend secret EROQ_API_KEY is not configured."},500);
  const headers={"Authorization":`Bearer ${env.EROQ_API_KEY}`,"Content-Type":"application/json"};
  try{
   if(url.pathname==="/api/generate" && request.method==="POST"){
    const body=await request.json();
    const payload={model:"eroq-music-one",seconds:Math.max(30,Math.min(240,Math.round((Number(body.seconds)||120)/30)*30)),n:body.n===2?2:1,instrumental:!!body.instrumental};
    if(typeof body.prompt==="string"&&body.prompt.trim()) payload.prompt=body.prompt.trim().slice(0,600);
    if(typeof body.style==="string"&&body.style.trim()) payload.style=body.style.trim().slice(0,600);
    if(typeof body.lyrics==="string"&&body.lyrics.trim()) payload.lyrics=body.lyrics.trim().slice(0,3000);
    if(!payload.prompt&&!payload.style&&!payload.lyrics) return json({error:"Add a song idea, style or lyrics."},400);
    const upstream=await fetch(`${API}/v1/music/generations`,{method:"POST",headers,body:JSON.stringify(payload)});
    const data=await upstream.json().catch(()=>({}));
    return json(data,upstream.status);
   }
   const match=url.pathname.match(/^\/api\/status\/([A-Za-z0-9-]+)$/);
   if(match&&request.method==="GET"){
    const upstream=await fetch(`${API}/v1/music/generations/${encodeURIComponent(match[1])}`,{headers:{"Authorization":`Bearer ${env.EROQ_API_KEY}`}});
    const data=await upstream.json().catch(()=>({}));
    return json(data,upstream.status);
   }
   if(url.pathname==="/api/enhance" && request.method==="POST"){
    if(!env.REPLICATE_API_TOKEN) return json({error:"Backend secret REPLICATE_API_TOKEN is not configured."},500);
    const form=await request.formData();
    const file=form.get("audio");
    if(!file || typeof file==="string") return json({error:"Choose an audio file to enhance."},400);
    if(file.size>25*1024*1024) return json({error:"Audio files must be 25 MB or smaller."},413);
    const uploadForm=new FormData();
    uploadForm.append("content",file,file.name||"recording.audio");
    const uploaded=await fetch("https://api.replicate.com/v1/files",{method:"POST",headers:{"Authorization":`Bearer ${env.REPLICATE_API_TOKEN}`},body:uploadForm});
    const uploadData=await uploaded.json().catch(()=>({}));
    if(!uploaded.ok) return json({error:uploadData.detail||uploadData.title||"Could not upload audio to the AI provider."},uploaded.status);
    const audioUrl=uploadData.urls?.get||uploadData.url;
    if(!audioUrl) return json({error:"The provider did not return an uploaded audio URL."},502);
    const prediction=await fetch("https://api.replicate.com/v1/predictions",{method:"POST",headers:{"Authorization":`Bearer ${env.REPLICATE_API_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({version:"25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953",input:{audio:audioUrl,stem:"vocals",model_name:"htdemucs",shifts:1,overlap:0.25,output_format:"mp3",mp3_bitrate:320}})});
    const predictionData=await prediction.json().catch(()=>({}));
    return json(predictionData,prediction.status);
   }
   const enhancePrefix="/api/enhance/status/";
   const enhanceId=url.pathname.startsWith(enhancePrefix)?url.pathname.slice(enhancePrefix.length):"";
   if(enhanceId && /^[A-Za-z0-9-]+$/.test(enhanceId) && request.method==="GET"){
    if(!env.REPLICATE_API_TOKEN) return json({error:"Backend secret REPLICATE_API_TOKEN is not configured."},500);
    const upstream=await fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(enhanceId)}`,{headers:{"Authorization":`Bearer ${env.REPLICATE_API_TOKEN}`}});
    const data=await upstream.json().catch(()=>({}));
    return json(data,upstream.status);
   }
   return json({error:"Route not found."},404);
  }catch(e){return json({error:"Backend could not reach the music provider.",detail:String(e)},502)}
 }
};
