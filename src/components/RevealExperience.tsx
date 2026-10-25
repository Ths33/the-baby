import { useEffect, useRef, useState } from 'react';
import './RevealExperience.css';

type Step = 'intro' | 'permission' | 'ready' | 'countdown' | 'flight' | 'revealed' | 'review' | 'done';
type Gender = 'boy' | 'girl';
const DELAY = (ms:number) => new Promise<void>(resolve=>setTimeout(resolve,ms));
const message = (gender:Gender) => gender === 'boy' ? 'É um menino!' : 'É uma menina!';

export default function RevealExperience() {
  const [step,setStep] = useState<Step>('intro');
  const [name,setName] = useState('');
  const [guess,setGuess] = useState<Gender|null>(null);
  const [consent,setConsent] = useState(false);
  const [cameraAvailable,setCameraAvailable] = useState(false);
  const [recordingEnabled,setRecordingEnabled] = useState(true);
  const [error,setError] = useState('');
  const [remaining,setRemaining] = useState(3);
  const [gender,setGender] = useState<Gender|null>(null);
  const [videoUrl,setVideoUrl] = useState<string|null>(null);
  const [uploading,setUploading] = useState(false);
  const [demoMode,setDemoMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement|null>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const recorderRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob|null>(null);
  const uploadUrlRef = useRef<string|null>(null);
  const runningRef = useRef(false);

  useEffect(()=>{ return ()=>{ streamRef.current?.getTracks().forEach(t=>t.stop());if(recorderRef.current?.state==='recording')recorderRef.current.stop();if(uploadUrlRef.current)URL.revokeObjectURL(uploadUrlRef.current);}; },[]);
  useEffect(()=>{ if(videoRef.current && streamRef.current) videoRef.current.srcObject=streamRef.current; },[step,cameraAvailable]);

  async function enableCamera(){
    setError('');
    if(!consent){setError('Confirme seu consentimento antes de continuar.');return;}
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {setError('Este navegador não permite gravação aqui. Você pode participar sem câmera.');return;}
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:720},height:{ideal:1280}},audio:{echoCancellation:true,noiseSuppression:true}});
      streamRef.current = stream;
      setCameraAvailable(true);
      setRecordingEnabled(true);
      setStep('ready');
    } catch {
      setError('Não foi possível acessar câmera e microfone. Confira as permissões do navegador ou continue sem gravar.');
    }
  }
  function withoutRecording(){
    setError('');setRecordingEnabled(false);setCameraAvailable(false);
    streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;
    setStep('ready');
  }
  function preferredMime(){
    return ['video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(type=>MediaRecorder.isTypeSupported(type)) || '';
  }
  function startRecording(){
    if(!recordingEnabled || !streamRef.current) return;
    chunksRef.current=[];blobRef.current=null;
    const mimeType=preferredMime();
    const recorder = new MediaRecorder(streamRef.current,mimeType ? {mimeType} : undefined);
    recorderRef.current=recorder;
    recorder.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data);};
    recorder.onstop=()=>{
      const blob=new Blob(chunksRef.current,{type:recorder.mimeType||'video/webm'});
      blobRef.current=blob;
      if(uploadUrlRef.current)URL.revokeObjectURL(uploadUrlRef.current);
      const url=URL.createObjectURL(blob);
      uploadUrlRef.current=url;
      setVideoUrl(url);
      setStep('review');
      streamRef.current?.getTracks().forEach(t=>t.stop());
    };
    recorder.start(1000);
  }
  async function run(){
    if(runningRef.current)return;
    runningRef.current=true;
    setError('');
    let value:Gender;
    try {
      const response=await fetch('/api/reveal',{method:'POST',cache:'no-store'});
      if(!response.ok) throw new Error('reveal-not-configured');
      const data=await response.json();
      if(data.gender !== 'boy' && data.gender !== 'girl')throw new Error('invalid-gender');
      value=data.gender;
      setDemoMode(false);
    } catch {
      // Local preview is intentionally neutral: only an explicit demo choice may reveal.
      setError('A surpresa ainda não foi ativada pelos pais. Volte em breve!');
      runningRef.current=false;
      return;
    }
    setGender(value);
    try {startRecording();} catch {setRecordingEnabled(false);}
    setRemaining(3);setStep('countdown');
    for(let i=3;i>0;i--){setRemaining(i);await DELAY(1000);}
    setStep('flight');
    await DELAY(7400);
    setStep('revealed');
    await DELAY(19000);
    if(recorderRef.current?.state==='recording')recorderRef.current.stop();
    else {streamRef.current?.getTracks().forEach(t=>t.stop());setStep('done');}
    runningRef.current=false;
  }
  async function upload(){
    if(!blobRef.current || !guess || !name.trim())return;
    setUploading(true);setError('');
    try{
      const form=new FormData();
      const mime=blobRef.current.type;
      form.append('video',blobRef.current,'reaction.'+(mime.includes('mp4')?'mp4':'webm'));
      form.append('name',name.trim());form.append('guess',guess);form.append('consent',String(consent));
      const res=await fetch('/api/reactions',{method:'POST',body:form});
      if(!res.ok) throw Error('Não foi possível enviar sua reação. Você pode tentar novamente.');
      setStep('done');
    } catch(e) {setError(e instanceof Error?e.message:'Falha ao enviar.');}
    finally{setUploading(false);}
  }
  function skipUpload(){blobRef.current=null;setVideoUrl(null);setStep('done');}
  function restart(){setStep('permission');setCameraAvailable(false);setVideoUrl(null);blobRef.current=null;setGender(null);setError('');setConsent(false);setRecordingEnabled(true);}
  const finished = step==='revealed'||step==='review'||step==='done';
  return <main className={`experience ${finished?'is-revealed':''} ${gender==='boy'&&finished?'is-boy':''} ${gender==='girl'&&finished?'is-girl':''}`}>
    <div className="night" aria-hidden="true"><div className="twinkle twinkle-one"/><div className="twinkle twinkle-two"/><div className="twinkle twinkle-three"/><div className="horizon"/><div className={`main-star ${step==='flight'?'ascending':''} ${finished?'burst':''}`}><span>✦</span></div>{(step==='flight'||finished)&&<div className="stardust">{Array.from({length:40},(_,i)=><i key={i} style={{'--i':i,'--rotation':`${i*137.508}deg`,'--distance':`${55+(i%7)*24}px`,'--delay':`${(i%8)*.06}s`} as React.CSSProperties}/>)}</div>}</div>
    <div className="vignette"/>
    <section className="content">
      <header className="brand">OUR LITTLE <span>✦</span> STAR</header>
      {step==='intro' && <div className="panel intro"><span className="eyebrow">Um convite muito especial</span><h1>Uma nova estrela está chegando à nossa família.</h1><p>Existe um segredinho brilhando lá no céu. Queremos que você faça parte desse momento com a gente.</p><button className="primary" onClick={()=>setStep('permission')}>Quero descobrir <span>↗</span></button><small>Uma surpresa feita com amor</small></div>}
      {step==='permission' && <div className="panel"><span className="eyebrow">Antes de começarmos</span><h1>Queremos ver seu sorriso.</h1><p>Se você quiser, vamos gravar sua reação com a câmera frontal e o microfone. Você poderá assistir e decidir se deseja enviar o vídeo aos pais.</p><label className="field-label" htmlFor="visitor-name">Como podemos te chamar?</label><input id="visitor-name" className="text-field" placeholder="Seu nome" value={name} maxLength={80} onChange={e=>setName(e.target.value)}/><div className="field-label">Qual é seu palpite?</div><div className="guess-options"><button className={guess==='girl'?'selected':''} onClick={()=>setGuess('girl')}>♡ Menina</button><button className={guess==='boy'?'selected':''} onClick={()=>setGuess('boy')}>✧ Menino</button></div><label className="consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Autorizo a gravação da minha imagem e voz para esta lembrança privada da família. Posso descartar o vídeo antes do envio.</span></label><button className="primary" onClick={enableCamera} disabled={!name.trim()||!guess||!consent}>Ativar câmera</button><button className="text-button" onClick={withoutRecording} disabled={!name.trim()||!guess}>Participar sem gravar</button></div>}
      {step==='ready' && <div className="panel"><span className="eyebrow">Tudo preparado</span><h1>Olhe para a estrelinha.</h1>{cameraAvailable && <div className="camera-preview"><video ref={videoRef} autoPlay playsInline muted/><span>PRÉVIA DA CÂMERA · AINDA NÃO ESTÁ GRAVANDO</span></div>}<p>{recordingEnabled?'A gravação começa quando você tocar no botão. Segure o celular à sua frente e aproveite a surpresa.':'Você vai viver a mesma experiência sem gravação.'}</p><button className="primary" onClick={run}>Estou pronto <span>✦</span></button></div>}
      {step==='countdown' && <div className="panel countdown"><span className="eyebrow">{recordingEnabled?'● Gravando sua reação':'Sua surpresa começa em'}</span><h1>{remaining}</h1><p>Não tire os olhos do céu...</p></div>}
      {step==='flight' && <div className="panel flight"><span className="eyebrow">{recordingEnabled?'● Gravando sua reação':'Um momento especial'}</span><h1>Às vezes, a menor estrela traz a maior alegria.</h1><p>Olhe para cima...</p></div>}
      {step==='revealed' && gender && <div className="panel revealed"><span className="eyebrow">Nossa estrelinha é...</span><h1>{message(gender)}</h1><p>Uma nova história está começando.<br/>E você faz parte dela. ♡</p><small>{recordingEnabled?'● Gravando sua reação':'Feito com todo o nosso amor'}</small></div>}
      {step==='review' && <div className="panel"><span className="eyebrow">Esse momento é seu</span><h1>Que reação linda!</h1><p>Assista antes de decidir. O vídeo só será enviado à família quando você confirmar.</p>{videoUrl&&<video className="review-video" src={videoUrl} controls playsInline/>}<button className="primary" onClick={upload} disabled={uploading}>{uploading?'Enviando vídeo...':'Enviar minha reação ♡'}</button><button className="text-button" onClick={skipUpload} disabled={uploading}>Descartar vídeo e finalizar</button></div>}
      {step==='done' && <div className="panel"><span className="eyebrow">Para sempre em nossos corações</span><h1>Obrigado por fazer parte dessa história.</h1><p>A nossa estrelinha já tem muita sorte por ter você por perto.</p><button className="primary" onClick={()=>navigator.share?.({title:'Our Little Star',text:'Tem uma estrelinha chegando! ✨',url:location.origin}).catch(()=>{})}>Compartilhar convite ♡</button><small>Com amor, nossa família</small></div>}
      {error && <div className="notice" role="alert">{error}</div>}
    </section>
    <footer className="footer">{(step==='countdown'||step==='flight'||step==='revealed')&&recordingEnabled?'● REC': 'FEITO COM AMOR'} <span>✦</span> 2026</footer>
  </main>;
}
