const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let mode='simple',toastTimer;
function toast(s){const t=$('#toast');t.textContent=s;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3000)}
const titles={home:'Make something that stays.',generator:'AI Song Generator',studio:'Music Studio',library:'My Library'};
function showPage(id){$$('.page').forEach(p=>p.classList.toggle('active-page',p.id===id));$$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page===id));$('#page-title').textContent=titles[id]||'WEATHER STATIC STUDIO';window.scrollTo(0,0)}
$$('.nav').forEach(n=>n.onclick=()=>showPage(n.dataset.page));$$('[data-go]').forEach(n=>n.onclick=()=>showPage(n.dataset.go));$$('[data-page="home"].brand').onclick=e=>{e.preventDefault();showPage('home')};
$$('.seg').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;$$('.seg').forEach(x=>x.classList.toggle('active',x===b));$('#idea-field').hidden=mode!=='simple';$('#custom-fields').hidden=mode!=='custom'});
function getApi(){return localStorage.getItem('wss_api_url')||''}$('#api-url').value=getApi();$('#api-state').textContent=getApi()?'Backend URL saved in this browser':'Not connected yet';
$('#save-api').onclick=()=>{let u=$('#api-url').value.trim().replace(/\/+$/,'');if(u&&!/^https:\/\/.+/.test(u)){toast('Use your HTTPS backend URL.');return}localStorage.setItem('wss_api_url',u);$('#api-state').textContent=u?'Backend URL saved in this browser':'Not connected yet';toast('Connection setting saved.')};
const libraryKey='wss_library_v1';let library=JSON.parse(localStorage.getItem(libraryKey)||'[]');
function saveLibrary(){localStorage.setItem(libraryKey,JSON.stringify(library));renderLibrary()}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderLibrary(){ $('#library-count').textContent=`${library.length} TRACK${library.length===1?'':'S'}`;$('#library-list').innerHTML=library.length?library.map((x,i)=>`<div class="library-item"><div><b>${escapeHtml(x.title||'Untitled song')}</b><small>${escapeHtml(x.style||x.prompt||'AI generated')} · ${new Date(x.savedAt).toLocaleString()}</small><div class="result-actions"><a href="${x.url}" download="${escapeHtml((x.title||'weather-static-song').replace(/[^\w-]+/g,'_'))}.mp3">DOWNLOAD MP3 ↧</a><a href="#" data-add="${i}">ADD TO STUDIO ↗</a></div></div><audio controls src="${x.url}"></audio></div>`).join(''):'<div class="empty">Your library is waiting for its first song.</div>';$$('[data-add]').forEach(a=>a.onclick=e=>{e.preventDefault();const x=library[+a.dataset.add];addTrack(x.title,x.url);showPage('studio');toast('Song added to your studio.')})}
renderLibrary();
function setBusy(b){$('#generate').disabled=b;$('#generate').textContent=b?'◌ Generating…':'✦ Generate my song'}
function renderResult(title,detail){$('#result-state').textContent=title;$('#result-detail').textContent=detail}
function addResult(job,title,style){const div=document.createElement('div');div.className='result-item';div.innerHTML=`<b>${escapeHtml(title||'Your generated take')}</b><small>${escapeHtml(style||'AI music')} · ${escapeHtml(job.status||'processing')}</small><div class="job-content"></div>`;$('#results').prepend(div);return div}
async function requestJson(url,opts={}){const r=await fetch(url,opts);let data;try{data=await r.json()}catch{throw new Error('The backend returned an unreadable response.')}if(!r.ok)throw new Error(data.error||data.message||`Request failed (${r.status})`);return data}
$('#generate').onclick=async()=>{
 const base=getApi();if(!base){toast('Add your private backend URL first.');$('#api-url').focus();return}
 const seconds=+$('#length').value,n=+$('#takes').value,instrumental=$('#instrumental').checked;
 const body={seconds,n,instrumental};
 if(mode==='simple'){body.prompt=$('#idea').value.trim();if(!body.prompt){toast('Describe the song first.');return}}
 else{body.style=$('#style').value.trim();body.lyrics=$('#lyrics').value.trim();if(!body.style&&!body.lyrics){toast('Add a style or some lyrics first.');return}}
 setBusy(true);$('#results').innerHTML='';renderResult('Sending your idea…','Connecting to the music engine.');
 try{
  const data=await requestJson(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const jobs=data.jobs||[];if(!jobs.length)throw new Error('The provider did not return any generation jobs.');
  renderResult('Song is being created',`${jobs.length} take(s) submitted. This can take a few minutes.`);
  for(const job of jobs)pollJob(base,job.id,job.poll,body);
 }catch(e){renderResult('Could not start generation',e.message);toast(e.message);setBusy(false)}
};
async function pollJob(base,id,poll,recipe){
 const card=addResult({status:'processing'},recipe.prompt||recipe.title||'New song',recipe.style||'AI music');
 const info=card.querySelector('small'),content=card.querySelector('.job-content');
 for(let attempt=0;attempt<90;attempt++){
  try{
   const data=await requestJson(base+'/api/status/'+encodeURIComponent(id));
   info.textContent=`${data.status||'processing'} · ${data.title||recipe.title||'Untitled song'}`;
   if(data.status==='succeeded'){
    const audio=data.data?.[0]||data.data||{};const url=audio.url||data.url;
    if(!url)throw new Error('The provider marked this take complete but returned no audio URL.');
    const item={title:data.title||recipe.title||'Untitled song',style:data.style||recipe.style||recipe.prompt||'',prompt:recipe.prompt||'',url,savedAt:Date.now()};
    library.unshift(item);saveLibrary();
    content.innerHTML=`<audio controls src="${url}"></audio><div class="result-actions"><a href="${url}" download="${escapeHtml(item.title.replace(/[^\w-]+/g,'_'))}.mp3">DOWNLOAD MP3 ↧</a><a href="#" class="add-track">ADD TO STUDIO ↗</a></div>`;
    content.querySelector('.add-track').onclick=e=>{e.preventDefault();addTrack(item.title,url);showPage('studio');toast('Song added to your studio.')};
    renderResult('Your song is ready',item.title+' · MP3 delivered');toast('Your song is ready!');
    setBusy(false);return;
   }
   if(data.status==='failed')throw new Error(data.error?.message||data.message||'The music engine could not complete this take.');
  }catch(e){info.textContent='Error: '+e.message;toast(e.message);renderResult('Generation stopped',e.message);setBusy(false);return}
  await new Promise(r=>setTimeout(r,5000));
 }
 info.textContent='Still processing. Check your provider library; this page stopped polling after 7.5 minutes.';setBusy(false);
}
let tracks=[],recorder=null,recordChunks=[],recordStream=null,playState=false,masterVol=.85;
function addTrack(name,src){const a=new Audio(src);a.preload='metadata';a.volume=masterVol;const t={id:crypto.randomUUID?.()||String(Date.now()+Math.random()),name,src,a,muted:false,volume:1};tracks.push(t);renderTracks()}
function renderTracks(){ $('#track-count').textContent=`${tracks.length} TRACK${tracks.length===1?'':'S'}`;$('#tracks').innerHTML=tracks.length?tracks.map((t,i)=>`<div class="track-row" data-track="${i}"><div><div class="track-info"><span class="track-color">${i+1}</span><div><b>${escapeHtml(t.name)}</b><small>Audio track · ${t.a.duration?Math.round(t.a.duration)+' sec':'loaded'}</small></div></div><div class="track-wave"></div></div><div class="track-controls"><input aria-label="Track volume" type="range" min="0" max="1" step=".01" value="${t.volume}"><button data-mute="${i}" class="${t.muted?'active':''}">MUTE</button><button data-remove="${i}">REMOVE</button></div></div>`).join(''):'<div class="empty">Your timeline is empty. Add an audio file or record a vocal take to begin.</div>';
 $$('[data-track]').forEach(row=>{const i=+row.dataset.track;row.querySelector('input').oninput=e=>{tracks[i].volume=+e.target.value;tracks[i].a.volume=tracks[i].muted?0:tracks[i].volume*masterVol}});$$('[data-mute]').forEach(b=>b.onclick=()=>{let t=tracks[+b.dataset.mute];t.muted=!t.muted;t.a.volume=t.muted?0:t.volume*masterVol;renderTracks()});$$('[data-remove]').forEach(b=>b.onclick=()=>{let t=tracks[+b.dataset.remove];t.a.pause();tracks.splice(+b.dataset.remove,1);renderTracks()})}
$('#audio-files').onchange=e=>{[...e.target.files].forEach(f=>addTrack(f.name,URL.createObjectURL(f)));e.target.value='';toast('Audio added to the session.')};
$('#master-volume').oninput=e=>{masterVol=+e.target.value;tracks.forEach(t=>t.a.volume=t.muted?0:t.volume*masterVol)};
$('#play-all').onclick=()=>{if(!tracks.length){toast('Add a track first.');return}tracks.forEach(t=>{t.a.currentTime=0;t.a.volume=t.muted?0:t.volume*masterVol;t.a.play().catch(()=>{})});playState=true;$('#play-all').textContent='↻ Restart mix';toast('Playing your session.')};
$('#record-vocal').onclick=async()=>{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Microphone recording is unavailable in this browser.');return}try{recordStream=await navigator.mediaDevices.getUserMedia({audio:true});recordChunks=[];recorder=new MediaRecorder(recordStream);recorder.ondataavailable=e=>{if(e.data.size)recordChunks.push(e.data)};recorder.onstop=()=>{const blob=new Blob(recordChunks,{type:recorder.mimeType||'audio/webm'});addTrack('Vocal recording',URL.createObjectURL(blob));recordStream.getTracks().forEach(t=>t.stop());toast('Vocal take added to the session.')};recorder.start();$('#record-vocal').disabled=true;$('#stop-record').disabled=false;toast('Recording. Sing your idea!')}catch(e){toast('Microphone permission was not granted.') }};
$('#stop-record').onclick=()=>{if(recorder?.state==='recording'){recorder.stop();$('#record-vocal').disabled=false;$('#stop-record').disabled=true}};
$('#export-project').onclick=()=>{const data={name:'WEATHER STATIC STUDIO session',savedAt:new Date().toISOString(),tracks:tracks.map(t=>({name:t.name,source:t.src.startsWith('blob:')?'Temporary browser recording or uploaded file — re-add this file after importing the project':t.src,volume:t.volume,muted:t.muted}))};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='weather-static-session.json';a.click();URL.revokeObjectURL(a.href);toast('Project track list downloaded. Audio files must be kept separately.')};
const wave=$('#wave');for(let i=0;i<65;i++){const s=document.createElement('span');s.style.setProperty('--h',(10+Math.abs(Math.sin(i*1.7)*70+Math.cos(i*.42)*25))+'px');wave.append(s)}

// AI vocal isolation / background-music removal
let enhanceFile=null, enhancePollTimer=null;
const enhanceInput=$('#enhance-file');
if(enhanceInput){
 enhanceInput.addEventListener('change',()=>{
  enhanceFile=enhanceInput.files?.[0]||null;
  if(!enhanceFile){$('#enhance-file-info').textContent='No recording selected yet.';return}
  const size=(enhanceFile.size/1024/1024).toFixed(1);
  $('#enhance-file-info').textContent=`${enhanceFile.name} · ${size} MB`;
  $('#enhance-state').textContent='Ready to clean up.';
  $('#enhance-detail').textContent='Your original file stays untouched.';
  $('#enhance-progress-bar').style.width='0%';
  $('#enhance-output').innerHTML='<div class="empty">Ready when you are.</div>';
 });
 $('#enhance-button').onclick=async()=>{
  const base=getApi();
  if(!base){toast('Save your private backend URL in the AI Song Generator first.');showPage('generator');$('#api-url').focus();return}
  if(!enhanceFile){toast('Choose an audio recording first.');return}
  if(enhanceFile.size>25*1024*1024){toast('This first version supports files up to 25 MB.');return}
  const btn=$('#enhance-button');btn.disabled=true;btn.textContent='◌ Uploading recording…';
  $('#enhance-state').textContent='Preparing your recording';$('#enhance-detail').textContent='Uploading securely to the private processing backend…';$('#enhance-progress-bar').style.width='12%';
  $('#enhance-output').innerHTML='<div class="empty">AI is separating the vocal and instrumental parts.</div>';
  try{
   const fd=new FormData();fd.append('audio',enhanceFile,enhanceFile.name);
   const data=await requestJson(base+'/api/enhance',{method:'POST',body:fd});
   if(!data.id)throw new Error('The enhancer did not return a processing ID.');
   $('#enhance-state').textContent='Separating voice from music';$('#enhance-detail').textContent='The AI model is processing your recording. This may take a minute or two.';$('#enhance-progress-bar').style.width='35%';btn.textContent='◌ Processing…';
   pollEnhancement(base,data.id,enhanceFile.name,btn);
  }catch(e){$('#enhance-state').textContent='Could not process recording';$('#enhance-detail').textContent=e.message;$('#enhance-progress-bar').style.width='0%';toast(e.message);btn.disabled=false;btn.textContent='✧ Isolate my voice'}
 };
}
async function pollEnhancement(base,id,originalName,btn){
 let attempts=0;
 const poll=async()=>{
  attempts++;
  try{
   const data=await requestJson(base+'/api/enhance/status/'+encodeURIComponent(id));
   if(data.status==='succeeded'){
    const output=data.output||{};
    const vocal=output.vocals||output.vocal||output;
    const audioUrl=typeof vocal==='string'?vocal:(vocal?.url||vocal?.href);
    if(!audioUrl)throw new Error('The AI finished but did not return a vocal audio file.');
    $('#enhance-state').textContent='Your vocal is ready';
    $('#enhance-detail').textContent='Background music has been separated. Listen and download your cleaned vocal.';
    $('#enhance-progress-bar').style.width='100%';
    const safeName=(originalName.replace(/\.[^.]+$/,'').replace(/[^\w-]+/g,'_')||'recording')+'-vocals.mp3';
    $('#enhance-output').innerHTML=`<b>Isolated vocal</b><audio controls src="${audioUrl}"></audio><a class="enhance-download" href="${audioUrl}" target="_blank" rel="noopener">OPEN / SAVE CLEAN VOCAL ↗</a><div class="result-actions"><button class="secondary small" id="enhanced-add-studio">Add to Music Studio</button></div>`;
    $('#enhanced-add-studio').onclick=()=>{addTrack('AI Vocal — '+originalName,audioUrl);showPage('studio');toast('Clean vocal added to the studio.')};
    toast('Your vocal isolation is ready.');
    btn.disabled=false;btn.textContent='✧ Isolate my voice';return;
   }
   if(['failed','canceled'].includes(data.status))throw new Error(data.error||'The AI enhancer could not process this file.');
   $('#enhance-progress-bar').style.width=Math.min(90,35+attempts*2)+'%';
   $('#enhance-detail').textContent=`AI processing: ${data.status||'working'}…`;
   if(attempts<180){enhancePollTimer=setTimeout(poll,4000)}else throw new Error('Processing is taking longer than expected. Please try again later.');
  }catch(e){$('#enhance-state').textContent='Enhancement stopped';$('#enhance-detail').textContent=e.message;toast(e.message);btn.disabled=false;btn.textContent='✧ Isolate my voice'}
 };
 poll();
}
