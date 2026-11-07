import { auth, db, createMemberAccount, resetMemberPassword } from "./firebase.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, where, serverTimestamp, runTransaction, setDoc, updateDoc, onSnapshot, Timestamp, addDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const DB={users:'ear_users',logs:'ear_logs',kas:'ear_kas',izin:'ear_izin',session:'ear_session',theme:'ear_theme',sessionData:'ear_qr_session'};
const get=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},put=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function seed(){if(!localStorage.getItem(DB.logs))put(DB.logs,[]);if(!localStorage.getItem(DB.kas))put(DB.kas,[]);if(!localStorage.getItem(DB.izin))put(DB.izin,[])}
function user(){return get(DB.session,null)}function toast(msg){let n=$('#toast');if(!n){n=document.createElement('div');n.id='toast';n.style.cssText='position:fixed;z-index:99;bottom:95px;left:50%;transform:translateX(-50%);background:#171923;color:white;padding:13px 18px;border-radius:13px;max-width:90%;font-size:13px;box-shadow:0 8px 25px #0003';document.body.append(n)}n.textContent=msg;n.classList.remove('hidden');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>n.classList.add('hidden'),2800)}
function initTheme(){if(get(DB.theme,'light')==='dark')document.body.classList.add('dark');$$('[data-theme]').forEach(b=>b.addEventListener('click',()=>{document.body.classList.toggle('dark');put(DB.theme,document.body.classList.contains('dark')?'dark':'light')}))}
async function logout(){try{await signOut(auth)}catch(e){console.warn(e)}localStorage.removeItem(DB.session);location.href='index.html'}
function requireUser(role){let u=user();if(!u){location.href='index.html';return null}if(role&&u.role!==role&&!(role==='siswa'&&u.role==='pengurus')){location.href=u.role==='pengurus'?'dashboard-pengurus.html':'dashboard-siswa.html';return null}return u}
function dateLabel(){return new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function todayKey(){return new Date().toLocaleDateString('en-CA')}
function todayLogs(id){return get(DB.logs,[]).filter(x=>x.id===id&&x.date===todayKey())}
function statusKas(id){let r=get(DB.kas,[]).find(x=>x.id===id);return r?.status||'Belum bayar'}
function nav(active){return `<nav class="bottom-nav"><a class="nav-item ${active==='home'?'active':''}" href="dashboard-siswa.html"><span class="glyph">⌂</span>Beranda</a><a class="nav-item ${active==='riwayat'?'active':''}" href="dashboard-siswa.html#riwayat"><span class="glyph">▤</span>Riwayat</a><a class="nav-send" href="verifikasi.html" aria-label="QR">⌗</a><a class="nav-item" href="dashboard-siswa.html#izin"><span class="glyph">◷</span>Izin</a><a class="nav-item" href="#" data-logout><span class="glyph">♙</span>Profil</a></nav>`}
function bindCommon(){initTheme();$$('[data-logout]').forEach(x=>x.addEventListener('click',e=>{e.preventDefault();logout()}));$$('[data-logout-btn]').forEach(x=>x.addEventListener('click',logout))}
function idToEmail(id){return `${id.toLowerCase()}@absenin.local`}

// Firestore helpers: data for attendance is shared across signed-in devices.
async function fsList(name, constraints=[]) {
  const ref=collection(db,name);
  const q=constraints.length?query(ref,...constraints):query(ref);
  const snap=await getDocs(q);
  return snap.docs.map(d=>({docId:d.id,...d.data()}));
}
async function loadStudentAttendance(id) {
  return fsList('attendances',[where('user_id','==',id)]);
}
async function saveAttendanceOnce(u, sessionId, qrToken, geo) {
  const day=todayKey();
  const attendanceId=`${u.id}_${day}`.replace(/[^A-Za-z0-9_-]/g,'_');
  const ref=doc(db,'attendances',attendanceId);
  const sessionRef=doc(db,'sessions','current');
  return runTransaction(db,async tx=>{
    const old=await tx.get(ref);
    if(old.exists()) return false;
    const sessionSnap=await tx.get(sessionRef);
    if(!sessionSnap.exists()) throw new Error('Sesi absensi tidak ditemukan.');
    const session=sessionSnap.data();
    if(!session.active || session.token!==qrToken || !session.tokenExpiresAt || session.tokenExpiresAt.toMillis()<=Date.now()) throw new Error('QR kedaluwarsa atau sudah diganti. Pindai ulang.');
    tx.set(ref,{user_id:u.id,nama:u.name,session_id:sessionId,qr_token:qrToken,created_at:serverTimestamp(),date:day,time:new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}),method:'QR',status:geo.status||'Hadir',user_lat:geo.lat,user_lng:geo.lng,gps_accuracy:Math.round(geo.acc),distance_m:Math.round(geo.dist)});
    return true;
  });
}

async function loadProfile(uid){const snap=await getDoc(doc(db,'users',uid));if(!snap.exists())throw new Error('Profil belum terdaftar di Firestore. Hubungi pengurus.');const d=snap.data();return {uid,id:d.user_id||d.userId||'',name:d.nama||d.nama_lengkap||d.name||'',role:String(d.role||'SISWA').toLowerCase()==='pengurus'?'pengurus':'siswa',kelas:d.kelas||'Anggota Robotik'};}
function login(){seed();initTheme();$('#loginForm')?.addEventListener('submit',async e=>{e.preventDefault();const id=$('#idUnik').value.trim().toUpperCase();const password=$('#loginPassword').value;if(!/^[A-Z0-9_-]{2,50}$/.test(id)){toast('Format ID tidak valid.');return}const submit=$('#loginForm button[type=submit]');if(submit)submit.disabled=true;try{const cred=await signInWithEmailAndPassword(auth,idToEmail(id),password);const profile=await loadProfile(cred.user.uid);if(profile.id!==id)throw new Error('ID akun tidak cocok dengan profil.');put(DB.session,{...profile,authUid:cred.user.uid});location.href=profile.role==='pengurus'?'dashboard-pengurus.html':'dashboard-siswa.html';}catch(err){console.error(err);toast(err.code==='auth/invalid-credential'?'ID atau password salah.':err.message||'Login gagal.')}finally{if(submit)submit.disabled=false}});onAuthStateChanged(auth,async u=>{if(u&&document.body.dataset.page==='login'){try{const profile=await loadProfile(u.uid);put(DB.session,{...profile,authUid:u.uid});location.href=profile.role==='pengurus'?'dashboard-pengurus.html':'dashboard-siswa.html'}catch(e){console.warn(e)}}});}
async function student(){seed();const u=requireUser('siswa');if(!u)return;bindCommon();$('#userName').textContent=u.name.split(' ')[0]+'!';$('#userFull').textContent=u.name;$('#dateToday').textContent=dateLabel();{let kasText='Belum bayar';try{const k=await getDoc(doc(db,'kas_transactions',u.id));if(k.exists())kasText=k.data().status||kasText}catch(e){console.warn('kas',e)}$('#kasStatus').textContent=kasText}let logs=[];try{logs=(await loadStudentAttendance(u.id)).map(x=>({...x,id:x.user_id,timestamp:x.created_at?.toMillis?.()||0})).sort((a,b)=>b.timestamp-a.timestamp)}catch(e){console.error(e);toast('Gagal memuat absensi dari Firestore: '+(e.message||''))}$('#attendanceCount').textContent=logs.length;$('#lastAttendance').textContent=logs[0]?.time||'—';let mine=[];try{mine=(await fsList('leave_requests',[where('user_id','==',u.id)])).sort((a,b)=>(b.created_at?.toMillis?.()||0)-(a.created_at?.toMillis?.()||0));}catch(e){console.error(e);toast('Gagal memuat pengajuan izin: '+(e.message||''))}$('#izinStatus').textContent=mine[0]?.status||'Belum ada';const history=$('#historyRows');history.innerHTML=logs.length?logs.slice(0,8).map(x=>`<tr><td>${x.date}</td><td>${x.time}</td><td><span class="pill ${x.status==='Telat'?'':'green'}">${x.status||'Hadir'}</span></td><td>${x.method||'QR'}</td></tr>`).join(''):'<tr><td colspan="4" class="muted">Belum ada riwayat absensi.</td></tr>';const izinRows=$('#izinRows');if(izinRows)izinRows.innerHTML=mine.length?mine.slice(0,5).map(x=>`<tr><td>${x.date}</td><td>${x.reason}</td><td><span class="pill ${x.status==='Disetujui'?'green':x.status==='Ditolak'?'red':''}">${x.status}</span></td></tr>`).join(''):'<tr><td colspan="3" class="muted">Belum ada pengajuan izin.</td></tr>';$('#izinForm')?.addEventListener('submit',async e=>{e.preventDefault();const date=$('#izinDate').value,reason=$('#izinReason').value.trim(),detail=$('#izinDetail').value.trim();if(!date||!reason){toast('Tanggal dan alasan wajib diisi.');return}const btn=$('#izinForm button[type=submit]');if(btn)btn.disabled=true;try{await addDoc(collection(db,'leave_requests'),{user_id:u.id,nama:u.name,date,reason,detail,status:'Menunggu',created_at:serverTimestamp()});toast('Pengajuan izin berhasil dikirim ke Firestore.');setTimeout(()=>location.reload(),650)}catch(err){console.error(err);toast('Gagal mengirim izin: '+(err.message||'Periksa Firestore Rules.'))}finally{if(btn)btn.disabled=false}});$('#scanBtn')?.addEventListener('click',scanQR);$('#manualAttendance')?.addEventListener('click',()=>toast('Absensi hanya dapat diproses melalui QR sesi aktif dan validasi lokasi.'));const notifyBtn=$('#enableNotifications'),notifyState=$('#notificationState');if(notifyBtn&&notifyState){notifyState.textContent=('Notification' in window)?(Notification.permission==='granted'?'Notifikasi diizinkan':Notification.permission==='denied'?'Izin diblokir':'Belum diaktifkan'):'Browser tidak mendukung';notifyBtn.addEventListener('click',async()=>{if(!('Notification' in window)){toast('Browser ini tidak mendukung notifikasi.');return}let permission=Notification.permission;if(permission==='default')permission=await Notification.requestPermission();notifyState.textContent=permission==='granted'?'Notifikasi diizinkan':permission==='denied'?'Izin diblokir':'Belum diizinkan';if(permission==='granted'){if(navigator.serviceWorker?.controller){navigator.serviceWorker.ready.then(reg=>reg.showNotification('AbsenIn',{body:'Notifikasi berhasil diaktifkan di perangkat ini.',tag:'absenin-test',icon:'./icon-192.png'}))}else new Notification('AbsenIn',{body:'Notifikasi berhasil diaktifkan di perangkat ini.'});toast('Notifikasi browser diaktifkan di perangkat ini.')}})}}
async function scanQR(){const box=$('#scannerBox');box.classList.remove('hidden');if(!window.Html5Qrcode){toast('Modul pemindai belum termuat. Periksa koneksi internet.');return}if(window.qrScanner){try{await window.qrScanner.stop()}catch{}}window.qrScanner=new Html5Qrcode('qr-reader');try{await window.qrScanner.start({facingMode:'environment'},{fps:10,qrbox:{width:230,height:230}},async text=>{try{await window.qrScanner.stop()}catch{};processQR(text)})}catch(e){toast('Kamera tidak tersedia. Izinkan akses kamera dan gunakan HTTPS.')}}
function wibMin(){const d=new Date(Date.now()+7*3600000);return d.getUTCHours()*60+d.getUTCMinutes()}
function hm(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
function toMin(v){if(!/^\d{2}:\d{2}$/.test(v||''))return null;const [h,m]=v.split(':').map(Number);return h*60+m}
function getFreshPosition(){
  return new Promise((ok,no)=>navigator.geolocation.getCurrentPosition(ok,no,{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
}
async function processQR(raw){
  let payload;try{payload=JSON.parse(raw)}catch{toast('QR tidak valid.');return}
  if(payload.sessionId!=='current'||!payload.token){toast('QR tidak valid.');return}
  const u=user();
  if(!u){toast('Silakan login ulang.');return}
  if(!navigator.geolocation){toast('Absen wajib memakai lokasi, tetapi browser ini tidak mendukungnya.');return}
  try{
    const snap=await getDoc(doc(db,'sessions','current'));
    if(!snap.exists()) throw new Error('Belum ada sesi absensi aktif.');
    const sess=snap.data();
    if(!sess.active||sess.token!==payload.token||!sess.tokenExpiresAt||sess.tokenExpiresAt.toMillis()<=Date.now()) throw new Error('QR kedaluwarsa atau bukan sesi aktif. Pindai ulang.');
    let status='Hadir';
    if(Number.isFinite(sess.closeMin)){
      const n=wibMin();
      if(n<sess.openMin){toast(`Absen belum dibuka. Dibuka pukul ${hm(sess.openMin)} WIB.`);return}
      if(n>sess.closeMin){toast(`Absen sudah ditutup pukul ${hm(sess.closeMin)} WIB. Tidak tercatat hadir.`);return}
      status=n>sess.onTimeMin?'Telat':'Hadir';
    }
    const radius=Number.isFinite(sess.radius)?sess.radius:50;
    let pos;
    try{pos=await getFreshPosition()}
    catch(err){
      toast(err.code===1?'Lokasi dimatikan atau ditolak. Aktifkan lokasi lalu pindai ulang. Tanpa lokasi, absen tidak tercatat hadir.':'Lokasi belum terbaca. Aktifkan GPS, pindah ke tempat terbuka, lalu pindai ulang.');
      return;
    }
    const geo={lat:pos.coords.latitude,lng:pos.coords.longitude,acc:pos.coords.accuracy};
    geo.dist=distance(geo.lat,geo.lng,sess.lat,sess.lng);geo.status=status;
    if(geo.acc>150){toast(`Sinyal GPS lemah (±${Math.round(geo.acc)} m). Pindah ke tempat terbuka lalu pindai ulang.`);return}
    if(geo.dist>radius){
      try{await addDoc(collection(db,'system_logs'),{user_id:u.id,timestamp:serverTimestamp(),action_type:'OUT_OF_RADIUS',coords_data:{lat:geo.lat,lng:geo.lng,accuracy:Math.round(geo.acc),distance_m:Math.round(geo.dist),radius_m:radius}})}catch{}
      toast(`Kamu di luar area absen (${Math.round(geo.dist)} m, batas ${radius} m). Tidak tercatat hadir. Ada keperluan? Ajukan izin.`);
      return;
    }
    try{const ok=await saveAttendanceOnce(u,'current',payload.token,geo);if(!ok){toast('Kamu sudah tercatat hadir hari ini.');return}toast(status==='Telat'?'Absen tercatat: TELAT.':'Absensi berhasil disimpan!');setTimeout(()=>location.reload(),900)}catch(e){console.error(e);toast(e.code==='permission-denied'?'Ditolak server. Pastikan jam HP otomatis (WIB), absen belum ditutup, dan kamu di dalam area.':(e.message||'Gagal menyimpan absensi.'))}
  }catch(e){console.error(e);toast(e.message||'Gagal memeriksa sesi QR.')}
}
function distance(a,b,c,d){const r=x=>x*Math.PI/180;let x=r(c-a),y=r(d-b),z=Math.sin(x/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(y/2)**2;return 6371000*2*Math.atan2(Math.sqrt(z),Math.sqrt(1-z))}
function makeTempPassword(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';const bytes=new Uint8Array(14);crypto.getRandomValues(bytes);return Array.from(bytes,b=>chars[b%chars.length]).join('')}
async function admin(){
  seed();
  const u=requireUser('pengurus');

  if(!u){
    return;
  }

  bindCommon();
  $('#dateToday').textContent=dateLabel();
  
  let users=[],logs=[],izin=[],outs=[],sess=null,kasList=[];
  try {
    users=(await fsList('users')).filter(x=>String(x.role).toUpperCase()==='SISWA').map(x=>({...x,id:x.user_id,name:x.nama||x.nama_lengkap||x.name||'',role:'siswa'}));
    logs=(await fsList('attendances')).map(x=>({...x,id:x.user_id,name:x.nama,date:x.date||'',time:x.time||'',timestamp:x.created_at?.toMillis?.()||0,method:x.method||'QR'}));
    izin=await fsList('leave_requests');
    try{outs=await fsList('system_logs')}catch(e){console.warn(e)}
    try{kasList=await fsList('kas_transactions')}catch(e){console.warn(e);toast('Gagal memuat data kas: '+(e.message||''))}
    try{const ss=await getDoc(doc(db,'sessions','current'));if(ss.exists())sess=ss.data()}catch(e){console.warn(e)}
  } catch(e) {
    console.error(e);
    toast('Gagal memuat data Firestore: '+(e.message||''));
  }

  // Pengaman anti-crash DOM (tidak akan error meskipun elemen HTML belum siap)
  const memberEl = $('#memberCount'); if (memberEl) memberEl.textContent = users.length;
  const presentEl = $('#presentCount'); if (presentEl) presentEl.textContent = logs.filter(x=>x.date===todayKey()).length;
  const pendingEl = $('#pendingCount'); if (pendingEl) pendingEl.textContent = izin.filter(x=>x.status==='Menunggu').length;
  const adminEl = $('#adminName'); if (adminEl) { adminEl.textContent = (u.name||'Pengurus').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase(); adminEl.title = u.name||'Pengurus'; }

  $('#logRows').innerHTML=logs.slice().sort((a,b)=>b.timestamp-a.timestamp).slice(0,12).map(x=>`<tr><td>${x.name}</td><td>${x.date}</td><td>${x.time}</td><td><span class="pill ${x.status==='Telat'?'':'green'}">${x.status||'Hadir'}</span></td></tr>`).join('')||'<tr><td colspan="4" class="muted">Belum ada absensi tercatat.</td></tr>';
  
  renderIzin(izin);
  renderKas(users,kasList);
  renderRecap(users,logs,izin,outs,sess);
  try{const j=JSON.parse(localStorage.getItem('absenin_jam')||'null');if(j){['sessionOpen','sessionOnTime','sessionClose'].forEach((id,i)=>{const el=$('#'+id);if(el)el.value=j[i]||''})}}catch{}
  
  $('#openSession')?.addEventListener('click',openSession);
  
  $('#kasForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const id=$('#kasUser').value,st=$('#kasValue').value;
    const m=users.find(x=>x.id===id);
    if(!id||!m){toast('Pilih anggota dulu.');return}
    const btn=$('#kasForm button[type=submit]');if(btn)btn.disabled=true;
    try{
      await setDoc(doc(db,'kas_transactions',id),{user_id:id,nama:m.name,status:st,updated_label:dateLabel(),updated_at:serverTimestamp()});
      kasList=kasList.filter(x=>x.user_id!==id);kasList.push({user_id:id,nama:m.name,status:st,updated_label:dateLabel()});
      toast('Status kas disimpan.');renderKas(users,kasList);
    }catch(err){console.error(err);toast('Gagal menyimpan kas: '+(err.message||'Periksa Firestore Rules.'))}
    finally{if(btn)btn.disabled=false}
  });

  $('#manForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const id=$('#manUser').value,st=$('#manStatus').value,date=$('#manDate').value||todayKey();
    const m=users.find(x=>x.id===id);
    if(!m){toast('Pilih anggota dulu.');return}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){toast('Tanggal tidak valid.');return}
    const btn=$('#manForm button[type=submit]');if(btn)btn.disabled=true;
    try{
      const docId=`${id}_${date}`.replace(/[^A-Za-z0-9_-]/g,'_');
      const w=new Date(Date.now()+7*3600000);
      const time=String(w.getUTCHours()).padStart(2,'0')+':'+String(w.getUTCMinutes()).padStart(2,'0');
      await setDoc(doc(db,'attendances',docId),{user_id:id,nama:m.name,session_id:'manual',date,time,method:'Manual',status:st,note:($('#manNote')?.value||'').trim().slice(0,120),created_at:serverTimestamp()});
      toast('Absen manual disimpan.');setTimeout(()=>location.reload(),700);
    }catch(err){console.error(err);toast('Gagal menyimpan absen manual: '+(err.message||'Periksa Firestore Rules.'))}
    finally{if(btn)btn.disabled=false}
  });

  $('#pwGen')?.addEventListener('click',()=>{const p=makeTempPassword();const el=$('#pwNew');if(el)el.value=p});
  $('#pwForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const id=$('#pwUser').value,pw=($('#pwNew').value||'');
    const out=$('#pwMsg');
    if(!id){toast('Pilih anggota dulu.');return}
    if(pw.length<6){toast('Password minimal 6 karakter.');return}
    const btn=$('#pwForm button[type=submit]');if(btn)btn.disabled=true;
    if(out)out.textContent='Mengganti password...';
    try{
      await resetMemberPassword({userId:id,password:pw});
      if(out)out.textContent=`Password ${id} sudah diganti menjadi: ${pw}  (catat dan berikan ke anggota; anggota sebaiknya login ulang).`;
      $('#pwNew').value='';toast('Password berhasil diganti.');
    }catch(err){console.error(err);if(out)out.textContent='Gagal: '+(err.message||'')+(err.code?` (${err.code})`:'')}
    finally{if(btn)btn.disabled=false}
  });

  $('#addUserForm')?.addEventListener('submit', async e => {
    e.preventDefault();

    console.log('[AbsenIn] Form tambah anggota terdeteksi.');

    const id = $('#newUserId').value.trim().toUpperCase();
    const name = $('#newUserName').value.trim();
    const kelas = $('#newUserClass').value.trim() || 'Anggota Robotik';
    const password = $('#newUserPassword')?.value || '';

    if (!/^[A-Z0-9_-]{2,50}$/.test(id) || !name || password.length < 6) {
      toast('Isi ID valid, nama, dan password minimal 6 karakter.');
      return;
    }

    const btn = $('#addUserForm button[type=submit]');
    if (btn) btn.disabled = true;

    try {
      console.log('[AbsenIn] Mengirim data anggota ke Vercel:', id);

      const created = await createMemberAccount({
        userId: id,
        name,
        kelas,
        password
      });

      console.log('[AbsenIn] Akun berhasil dibuat:', created);

      toast('Akun anggota berhasil dibuat di Authentication dan Firestore.');
      $('#addUserForm').reset();

      setTimeout(() => location.reload(), 700);
    } catch (err) {
      console.error('[AbsenIn] Gagal membuat akun:', err);
      toast('Gagal membuat akun: ' + (err.code || err.message || 'Periksa koneksi.'));
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  $('#bulkMemberImport')?.addEventListener('click',async()=>{
    const raw=$('#bulkMemberCsv')?.value.trim();
    if(!raw){toast('Tempel daftar anggota terlebih dahulu.');return}
    const rows=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const results=[];
    const button=$('#bulkMemberImport');
    button.disabled=true;
    for(let i=0;i<rows.length;i++){
      const parts=rows[i].split(',').map(x=>x.trim());
      if(i===0&&parts[0]?.toUpperCase()==='ID')continue;
      const [idRaw,name,kelas='Anggota Robotik']=parts;
      const id=(idRaw||'').toUpperCase();
      if(!/^[A-Z0-9_-]{2,50}$/.test(id)||!name){results.push({id:idRaw||'',status:'FORMAT SALAH'});continue}
      const password=makeTempPassword();
      let created=null;
      try{
        created=await createMemberAccount({userId:id,name,kelas,password});
        results.push({id,nama:name,email:created.email,password,status:'BERHASIL'})
      }catch(err){
        results.push({id,nama:name,status:err.code==='auth/email-already-in-use'?'EMAIL SUDAH ADA':err.message||'GAGAL'})
      }finally{}
    }
    const csv=['ID,NAMA,EMAIL,PASSWORD_AWAL,STATUS',...results.map(x=>[x.id,x.nama||'',x.email||'',x.password||'',x.status].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))].join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='absenin-akun-anggota.csv';a.click();URL.revokeObjectURL(url);
    $('#bulkResult').textContent=`Selesai: ${results.filter(x=>x.status==='BERHASIL').length} berhasil dari ${results.length}. File CSV berisi password awal sudah diunduh; simpan dan bagikan secara pribadi.`;
    button.disabled=false;
  });

  $('#exportCsv')?.addEventListener('click',exportCSV);
}
function renderRecap(users,logs,izin,outs,sess){
  const body=$('#recapRows');if(!body)return;
  const today=todayKey();
  const sod=new Date();sod.setHours(0,0,0,0);
  const n=wibMin();
  const sessToday=sess&&sess.date===today;
  const closed=!!sessToday&&(sess.active===false||(Number.isFinite(sess.closeMin)&&n>sess.closeMin));
  body.innerHTML=users.map(u=>{
    const a=logs.find(x=>x.date===today&&x.user_id===u.id);
    const iz=izin.find(x=>x.date===today&&x.user_id===u.id);
    const out=outs.filter(x=>x.user_id===u.id&&x.action_type==='OUT_OF_RADIUS'&&(x.timestamp?.toMillis?.()||0)>=sod.getTime()).sort((p,q)=>(q.timestamp?.toMillis?.()||0)-(p.timestamp?.toMillis?.()||0))[0];
    let st='Belum absen',cls='',note='';
    if(a){st=a.status||'Hadir';cls=st==='Telat'?'':'green';note=`${a.time||''}${a.distance_m!=null?` · ${a.distance_m} m dari titik`:''}`}
    else if(iz&&iz.status==='Disetujui'){st='Izin';note=iz.reason||''}
    else if(iz&&iz.status==='Menunggu'){st='Izin (menunggu)';note=iz.reason||''}
    else if(closed){st='Alpa';cls='red'}
    if(out)note+=(note?' · ':'')+`Coba absen di luar area (${out.coords_data?.distance_m??'?'} m)`;
    return `<tr><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.id)}</td><td><span class="pill ${cls}">${escapeHtml(st)}</span></td><td class="muted">${escapeHtml(note)}</td></tr>`;
  }).join('')||'<tr><td colspan="4" class="muted">Belum ada anggota.</td></tr>';
}
function renderIzin(izin=[]){
  const body=$('#izinAdminRows');if(!body)return;
  const sorted=izin.slice().sort((a,b)=>(b.created_at?.toMillis?.()||0)-(a.created_at?.toMillis?.()||0));
  body.innerHTML=sorted.map(x=>`<tr><td>${escapeHtml(x.nama||'')}</td><td>${escapeHtml(x.date||'')}</td><td>${escapeHtml(x.reason||'')}<div class="muted">${escapeHtml(x.detail||'')}</div></td><td><span class="pill ${x.status==='Disetujui'?'green':x.status==='Ditolak'?'red':''}">${escapeHtml(x.status||'Menunggu')}</span></td><td>${x.status==='Menunggu'?`<button class="btn small" data-izin-id="${x.docId}" data-izin-status="Disetujui">Setujui</button> <button class="btn small ghost" data-izin-id="${x.docId}" data-izin-status="Ditolak">Tolak</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">Belum ada pengajuan izin.</td></tr>';
  body.querySelectorAll('[data-izin-id]').forEach(btn=>btn.addEventListener('click',async()=>{btn.disabled=true;try{await updateDoc(doc(db,'leave_requests',btn.dataset.izinId),{status:btn.dataset.izinStatus,reviewed_at:serverTimestamp(),reviewed_by:user()?.id||''});toast('Status izin diperbarui: '+btn.dataset.izinStatus);const fresh=await fsList('leave_requests');renderIzin(fresh);$('#pendingCount').textContent=fresh.filter(x=>x.status==='Menunggu').length}catch(e){console.error(e);toast('Gagal memperbarui izin: '+(e.message||''));btn.disabled=false}}));
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderKas(users=[],kasList=[]){
  const sel=$('#kasUser'),rows=$('#kasRows');
  const keep=sel?.value;
  if(sel){sel.innerHTML=users.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)} (${escapeHtml(x.id)})</option>`).join('');if(keep)sel.value=keep}
  const opts=users.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)} (${escapeHtml(x.id)})</option>`).join('');
  ['#manUser','#pwUser'].forEach(q=>{const el=$(q);if(el){const k=el.value;el.innerHTML=opts;if(k)el.value=k}});
  const md=$('#manDate');if(md&&!md.value)md.value=todayKey();
  if(rows)rows.innerHTML=users.map(x=>{const k=kasList.find(y=>y.user_id===x.id);const lunas=k?.status==='Lunas';return `<tr><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.id)}</td><td><span class="pill ${lunas?'green':'red'}">${escapeHtml(k?.status||'Belum bayar')}</span></td><td>${escapeHtml(k?.updated_label||'—')}</td></tr>`}).join('')||'<tr><td colspan="4" class="muted">Belum ada anggota.</td></tr>';
}
async function openSession(){
  const lat=Number($('#sessionLat').value),lng=Number($('#sessionLng').value),radius=Math.round(Number($('#sessionRadius')?.value||100));
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){toast('Pilih lokasi di peta atau tekan Pakai lokasi saya.');return}
  if(!Number.isFinite(radius)||radius<20||radius>500){toast('Radius harus 20 sampai 500 meter.');return}
  const oIn=$('#sessionOpen')?.value||'',tIn=$('#sessionOnTime')?.value||'',cIn=$('#sessionClose')?.value||'';
  const timeFields={};
  if(oIn||tIn||cIn){
    const o=toMin(oIn),t=toMin(tIn),c=toMin(cIn);
    if(o==null||t==null||c==null){toast('Isi ketiga jam (dibuka, batas tepat waktu, ditutup) atau kosongkan semuanya.');return}
    if(!(o<=t&&t<=c)){toast('Urutan jam harus: dibuka ≤ batas tepat waktu ≤ ditutup.');return}
    if(c<=wibMin()){toast('Jam ditutup sudah lewat hari ini. Atur jam yang masih ke depan.');return}
    Object.assign(timeFields,{openMin:o,onTimeMin:t,closeMin:c});
  }
  try{localStorage.setItem('absenin_jam',JSON.stringify([oIn,tIn,cIn]))}catch{}
  const win=window.open('verifikasi.html','_blank');
  try{
    const now=Date.now(),token=crypto.randomUUID();
    await setDoc(doc(db,'sessions','current'),{sessionId:'current',token,lat,lng,radius,...timeFields,date:todayKey(),active:true,createdAt:serverTimestamp(),tokenExpiresAt:Timestamp.fromMillis(now+30000),updatedAt:serverTimestamp()});
    toast('Sesi QR online aktif.');
    if(!win) toast('Izinkan pop-up untuk membuka layar QR.');
  }catch(e){if(win)win.close();console.error(e);toast('Gagal membuka sesi: '+(e.message||'Periksa Firestore Rules.'))}
}
let stopSessionListener=null,qrRotateTimer=null,sessionRotationBusy=false;
function tv(){
  initTheme();$('#tvDate').textContent=dateLabel();
  $('#refreshSession')?.addEventListener('click',rotate);
  $('#closeSession')?.addEventListener('click',closeSession);
  stopSessionListener=onSnapshot(doc(db,'sessions','current'),snap=>{
    if(!snap.exists()){drawQR(null);return}
    const s=snap.data();drawQR(s);
  },err=>{console.error(err);toast('Tidak bisa membaca sesi Firestore: '+err.message)});
  const qi=$('#qrImage');if(qi){qi.setAttribute('draggable','false');qi.addEventListener('contextmenu',e=>e.preventDefault())}
  qrRotateTimer=setInterval(()=>tickQr(window.currentQrSession),1000);
}
let autoClosing=false;
function tickQr(s){
  if(!s||!s.active)return;
  const cd=$('#countdown'),st=$('#qrStatus');
  const exp=s.tokenExpiresAt?.toMillis?.()||0;
  if(cd)cd.textContent=Math.max(0,Math.ceil((exp-Date.now())/1000))+' dtk';
  if(Number.isFinite(s.closeMin)){
    const n=wibMin();
    if(n>s.closeMin){
      if(!autoClosing){autoClosing=true;closeSession().finally(()=>{autoClosing=false})}
      return;
    }
    if(st)st.textContent=n<s.openMin?`Absen dibuka pukul ${hm(s.openMin)} WIB`:`Sesi online · ditutup otomatis ${hm(s.closeMin)} WIB`;
  }
  if(exp<=Date.now())rotate();
}
async function rotate(){
  if(sessionRotationBusy)return;sessionRotationBusy=true;
  try{
    const ref=doc(db,'sessions','current'),snap=await getDoc(ref);
    if(!snap.exists()||!snap.data().active){toast('Belum ada sesi aktif. Buka sesi dari dashboard pengurus.');return}
    const s=snap.data(),token=crypto.randomUUID();
    await updateDoc(ref,{token,tokenExpiresAt:Timestamp.fromMillis(Date.now()+30000),updatedAt:serverTimestamp()});
  }catch(e){console.error(e);toast('Gagal memperbarui token: '+e.message)}finally{sessionRotationBusy=false}
}
async function closeSession(){
  try{await updateDoc(doc(db,'sessions','current'),{active:false,token:'',tokenExpiresAt:Timestamp.fromMillis(0),closedAt:serverTimestamp()});toast('Sesi QR ditutup untuk semua perangkat.')}catch(e){console.error(e);toast('Gagal menutup sesi: '+e.message)}
}
let tvMapObj=null,tvLayer=null;
function showSessionLoc(s){
  const la=$('#tvLat'),lo=$('#tvLng'),ra=$('#tvRad');
  if(!s||!Number.isFinite(s.lat)||!Number.isFinite(s.lng)){if(la)la.value='';if(lo)lo.value='';if(ra)ra.value='';return}
  const radius=Number.isFinite(s.radius)?s.radius:50;
  if(la)la.value=s.lat.toFixed(6);if(lo)lo.value=s.lng.toFixed(6);if(ra)ra.value=radius+' meter';
  const box=$('#tvMap');if(!box||!window.L)return;
  if(!tvMapObj){
    tvMapObj=L.map(box,{zoomControl:false,dragging:false,scrollWheelZoom:false,touchZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(tvMapObj);
  }
  if(tvLayer)tvLayer.remove();
  const c=L.circle([s.lat,s.lng],{radius,color:'#f59b22',fillOpacity:.15});
  const m=L.marker([s.lat,s.lng]);
  tvLayer=L.layerGroup([c,m]).addTo(tvMapObj);
  tvMapObj.fitBounds(c.getBounds(),{padding:[10,10],animate:false});
  setTimeout(()=>tvMapObj.invalidateSize(),200);
}
function drawQR(s){
  window.currentQrSession=s;showSessionLoc(s);
  const img=$('#qrImage'),status=$('#qrStatus');
  if(!s||!s.active||!s.token){img.removeAttribute('src');status.textContent='Sesi ditutup';$('#countdown').textContent='—';return}
  const expires=s.tokenExpiresAt?.toMillis?.()||0;
  const payload=encodeURIComponent(JSON.stringify({sessionId:'current',token:s.token}));
  try{img.src=window.AbsenQR.svgDataUrl(decodeURIComponent(payload))}
  catch(e){console.error('QR gagal dibuat',e);img.removeAttribute('src');status.textContent='QR gagal dibuat. Muat ulang halaman.';return}
  status.textContent=expires>Date.now()?'Sesi online · token berganti':'Memperbarui token…';
  $('#countdown').textContent=Math.max(0,Math.ceil((expires-Date.now())/1000))+' dtk';
}

async function exportCSV(){
  try{
    toast('Menyiapkan CSV...');
    const att=await fsList('attendances'),izin=await fsList('leave_requests');
    const rows=[];
    att.forEach(x=>rows.push({date:x.date||'',id:x.user_id||'',name:x.nama||'',time:x.time||'',status:x.status||'Hadir',method:x.method||'QR',dist:x.distance_m??'',acc:x.gps_accuracy??'',note:''}));
    izin.filter(x=>x.status==='Disetujui').forEach(x=>rows.push({date:x.date||'',id:x.user_id||'',name:x.nama||'',time:'',status:'Izin',method:'Izin',dist:'',acc:'',note:x.reason||''}));
    rows.sort((p,q)=>String(q.date).localeCompare(String(p.date))||String(p.name).localeCompare(String(q.name)));
    const q=v=>{let s=String(v??'');if(/^[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
    const head=['Tanggal','ID','Nama','Waktu','Status','Metode','Jarak (m)','Akurasi GPS (m)','Keterangan'];
    const csv='\ufeff'+[head.map(q).join(','),...rows.map(r=>[r.date,r.id,r.name,r.time,r.status,r.method,r.dist,r.acc,r.note].map(q).join(','))].join('\n');
    const link=document.createElement('a');
    link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    link.download='rekap-absensi-'+todayKey()+'.csv';
    link.click();setTimeout(()=>URL.revokeObjectURL(link.href),2000);
    toast(rows.length?`CSV siap: ${rows.length} baris.`:'CSV diunduh, tapi belum ada data absensi.');
  }catch(e){console.error(e);toast('Gagal membuat CSV: '+(e.message||''))}
}
document.addEventListener('DOMContentLoaded',()=>{seed();const page=document.body.dataset.page;if(page==='login')login();if(page==='student')student();if(page==='admin')admin();if(page==='tv')tv()});

window.$=$;
