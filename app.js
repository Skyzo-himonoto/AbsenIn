import { auth, db, createMemberAccount } from "./firebase.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, where, serverTimestamp, runTransaction, setDoc, updateDoc, onSnapshot, Timestamp, addDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const DB={users:'ear_users',logs:'ear_logs',kas:'ear_kas',izin:'ear_izin',session:'ear_session',theme:'ear_theme',sessionData:'ear_qr_session'};
const get=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},put=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function seed(){if(!localStorage.getItem(DB.logs))put(DB.logs,[]);if(!localStorage.getItem(DB.kas))put(DB.kas,[]);if(!localStorage.getItem(DB.izin))put(DB.izin,[])}
function user(){return get(DB.session,null)}function toast(msg){let n=$('#toast');if(!n){n=document.createElement('div');n.id='toast';n.style.cssText='position:fixed;z-index:99;bottom:95px;left:50%;transform:translateX(-50%);background:#171923;color:white;padding:13px 18px;border-radius:13px;max-width:90%;font-size:13px;box-shadow:0 8px 25px #0003';document.body.append(n)}n.textContent=msg;n.classList.remove('hidden');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>n.classList.add('hidden'),2800)}
function initTheme(){if(get(DB.theme,'light')==='dark')document.body.classList.add('dark');$$('[data-theme]').forEach(b=>b.addEventListener('click',()=>{document.body.classList.toggle('dark');put(DB.theme,document.body.classList.contains('dark')?'dark':'light')}))}
async function logout(){try{await signOut(auth)}catch(e){console.warn(e)}localStorage.removeItem(DB.session);location.href='index.html'}
function requireUser(role){let u=user();if(!u){location.href='index.html';return null}if(role&&u.role!==role){location.href=u.role==='pengurus'?'dashboard-pengurus.html':'dashboard-siswa.html';return null}return u}
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
async function saveAttendanceOnce(u, sessionId, qrToken) {
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
    tx.set(ref,{user_id:u.id,nama:u.name,session_id:sessionId,qr_token:qrToken,created_at:serverTimestamp(),date:day,time:new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}),method:'QR'});
    return true;
  });
}

async function loadProfile(uid){const snap=await getDoc(doc(db,'users',uid));if(!snap.exists())throw new Error('Profil belum terdaftar di Firestore. Hubungi pengurus.');const d=snap.data();return {uid,id:d.user_id||d.userId||'',name:d.nama||d.nama_lengkap||d.name||'',role:String(d.role||'SISWA').toLowerCase()==='pengurus'?'pengurus':'siswa',kelas:d.kelas||'Anggota Robotik'};}
function login(){seed();initTheme();$('#loginForm')?.addEventListener('submit',async e=>{e.preventDefault();const id=$('#idUnik').value.trim().toUpperCase();const password=$('#loginPassword').value;if(!/^[A-Z0-9_-]{2,50}$/.test(id)){toast('Format ID tidak valid.');return}const submit=$('#loginForm button[type=submit]');if(submit)submit.disabled=true;try{const cred=await signInWithEmailAndPassword(auth,idToEmail(id),password);const profile=await loadProfile(cred.user.uid);if(profile.id!==id)throw new Error('ID akun tidak cocok dengan profil.');put(DB.session,{...profile,authUid:cred.user.uid});location.href=profile.role==='pengurus'?'dashboard-pengurus.html':'dashboard-siswa.html';}catch(err){console.error(err);toast(err.code==='auth/invalid-credential'?'ID atau password salah.':err.message||'Login gagal.')}finally{if(submit)submit.disabled=false}});onAuthStateChanged(auth,async u=>{if(u&&document.body.dataset.page==='login'){try{const profile=await loadProfile(u.uid);put(DB.session,{...profile,authUid:u.uid});location.href=profile.role==='pengurus'?'dashboard-pengurus.html':'dashboard-siswa.html'}catch(e){console.warn(e)}}});}
async function student(){seed();const u=requireUser('siswa');if(!u)return;bindCommon();$('#userName').textContent=u.name.split(' ')[0]+'!';$('#userFull').textContent=u.name;$('#dateToday').textContent=dateLabel();$('#kasStatus').textContent=statusKas(u.id);let logs=[];try{logs=(await loadStudentAttendance(u.id)).map(x=>({...x,id:x.user_id,timestamp:x.created_at?.toMillis?.()||0})).sort((a,b)=>b.timestamp-a.timestamp)}catch(e){console.error(e);toast('Gagal memuat absensi dari Firestore: '+(e.message||''))}$('#attendanceCount').textContent=logs.length;$('#lastAttendance').textContent=logs[0]?.time||'—';let mine=[];try{mine=(await fsList('leave_requests',[where('user_id','==',u.id)])).sort((a,b)=>(b.created_at?.toMillis?.()||0)-(a.created_at?.toMillis?.()||0));}catch(e){console.error(e);toast('Gagal memuat pengajuan izin: '+(e.message||''))}$('#izinStatus').textContent=mine[0]?.status||'Belum ada';const history=$('#historyRows');history.innerHTML=logs.length?logs.slice(0,8).map(x=>`<tr><td>${x.date}</td><td>${x.time}</td><td><span class="pill green">Hadir</span></td><td>${x.method||'QR'}</td></tr>`).join(''):'<tr><td colspan="4" class="muted">Belum ada riwayat absensi.</td></tr>';const izinRows=$('#izinRows');if(izinRows)izinRows.innerHTML=mine.length?mine.slice(0,5).map(x=>`<tr><td>${x.date}</td><td>${x.reason}</td><td><span class="pill ${x.status==='Disetujui'?'green':x.status==='Ditolak'?'red':''}">${x.status}</span></td></tr>`).join(''):'<tr><td colspan="3" class="muted">Belum ada pengajuan izin.</td></tr>';$('#izinForm')?.addEventListener('submit',async e=>{e.preventDefault();const date=$('#izinDate').value,reason=$('#izinReason').value.trim(),detail=$('#izinDetail').value.trim();if(!date||!reason){toast('Tanggal dan alasan wajib diisi.');return}const btn=$('#izinForm button[type=submit]');if(btn)btn.disabled=true;try{await addDoc(collection(db,'leave_requests'),{user_id:u.id,nama:u.name,date,reason,detail,status:'Menunggu',created_at:serverTimestamp()});toast('Pengajuan izin berhasil dikirim ke Firestore.');setTimeout(()=>location.reload(),650)}catch(err){console.error(err);toast('Gagal mengirim izin: '+(err.message||'Periksa Firestore Rules.'))}finally{if(btn)btn.disabled=false}});$('#scanBtn')?.addEventListener('click',scanQR);$('#manualAttendance')?.addEventListener('click',()=>toast('Absensi hanya dapat diproses melalui QR sesi aktif dan validasi lokasi.'));const notifyBtn=$('#enableNotifications'),notifyState=$('#notificationState');if(notifyBtn&&notifyState){notifyState.textContent=('Notification' in window)?(Notification.permission==='granted'?'Notifikasi diizinkan':Notification.permission==='denied'?'Izin diblokir':'Belum diaktifkan'):'Browser tidak mendukung';notifyBtn.addEventListener('click',async()=>{if(!('Notification' in window)){toast('Browser ini tidak mendukung notifikasi.');return}let permission=Notification.permission;if(permission==='default')permission=await Notification.requestPermission();notifyState.textContent=permission==='granted'?'Notifikasi diizinkan':permission==='denied'?'Izin diblokir':'Belum diizinkan';if(permission==='granted'){if(navigator.serviceWorker?.controller){navigator.serviceWorker.ready.then(reg=>reg.showNotification('AbsenIn',{body:'Notifikasi berhasil diaktifkan di perangkat ini.',tag:'absenin-test',icon:'./icon-192.png'}))}else new Notification('AbsenIn',{body:'Notifikasi berhasil diaktifkan di perangkat ini.'});toast('Notifikasi browser diaktifkan di perangkat ini.')}})}}
async function scanQR(){const box=$('#scannerBox');box.classList.remove('hidden');if(!window.Html5Qrcode){toast('Modul pemindai belum termuat. Periksa koneksi internet.');return}if(window.qrScanner){try{await window.qrScanner.stop()}catch{}}window.qrScanner=new Html5Qrcode('qr-reader');try{await window.qrScanner.start({facingMode:'environment'},{fps:10,qrbox:{width:230,height:230}},async text=>{try{await window.qrScanner.stop()}catch{};processQR(text)})}catch(e){toast('Kamera tidak tersedia. Izinkan akses kamera dan gunakan HTTPS.')}}
async function processQR(raw){
  let payload;try{payload=JSON.parse(raw)}catch{toast('QR tidak valid.');return}
  if(payload.sessionId!=='current'||!payload.token){toast('QR tidak valid.');return}
  const u=user();
  if(!u){toast('Silakan login ulang.');return}
  if(!navigator.geolocation){toast('Browser tidak mendukung validasi lokasi.');return}
  try{
    const snap=await getDoc(doc(db,'sessions','current'));
    if(!snap.exists()) throw new Error('Belum ada sesi absensi aktif.');
    const sess=snap.data();
    if(!sess.active||sess.token!==payload.token||!sess.tokenExpiresAt||sess.tokenExpiresAt.toMillis()<=Date.now()) throw new Error('QR kedaluwarsa atau bukan sesi aktif. Pindai ulang.');
    navigator.geolocation.getCurrentPosition(async pos=>{
      const dist=distance(pos.coords.latitude,pos.coords.longitude,sess.lat,sess.lng);
      if(dist>50){toast(`Di luar radius absensi (${Math.round(dist)} m).`);return}
      try{const ok=await saveAttendanceOnce(u,'current',payload.token);if(!ok){toast('Kamu sudah tercatat hadir hari ini.');return}toast('Absensi berhasil disimpan ke Firestore!');setTimeout(()=>location.reload(),900)}catch(e){console.error(e);toast(e.message||'Gagal menyimpan absensi.')}
    },()=>toast('Izin lokasi diperlukan untuk absensi.'),{enableHighAccuracy:true,timeout:10000});
  }catch(e){console.error(e);toast(e.message||'Gagal memeriksa sesi QR.')}
}

function distance(a,b,c,d){const r=x=>x*Math.PI/180;let x=r(c-a),y=r(d-b),z=Math.sin(x/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(y/2)**2;return 6371000*2*Math.atan2(Math.sqrt(z),Math.sqrt(1-z))}
function makeTempPassword(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';const bytes=new Uint8Array(14);crypto.getRandomValues(bytes);return Array.from(bytes,b=>chars[b%chars.length]).join('')}
async function admin(){
  alert('TES: fungsi admin berjalan');

  seed();
  const u=requireUser('pengurus');

  if(!u){
    alert('TES: sesi pengurus tidak ditemukan');
    return;
  }

  alert('TES: sesi pengurus ditemukan');

  bindCommon();$('#dateToday').textContent=dateLabel();let users=[],logs=[],izin=[];try{users=(await fsList('users')).filter(x=>String(x.role).toUpperCase()==='SISWA').map(x=>({...x,id:x.user_id,name:x.nama||x.nama_lengkap||x.name||'',role:'siswa'}));logs=(await fsList('attendances')).map(x=>({...x,id:x.user_id,name:x.nama,date:x.date||'',time:x.time||'',timestamp:x.created_at?.toMillis?.()||0,method:x.method||'QR'}));izin=await fsList('leave_requests');}catch(e){console.error(e);toast('Gagal memuat data Firestore: '+(e.message||''))const memberEl = $('#memberCount'); if (memberEl) memberEl.textContent = users.length;
const presentEl = $('#presentCount'); if (presentEl) presentEl.textContent = logs.filter(x=>x.date===todayKey()).length;
const pendingEl = $('#pendingCount'); if (pendingEl) pendingEl.textContent = izin.filter(x=>x.status==='Menunggu').length;
const adminEl = $('#adminName'); if (adminEl) adminEl.textContent = u.name;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
if (adminEl) adminEl.textContent = u.name;$('#logRows').innerHTML=logs.slice().sort((a,b)=>b.timestamp-a.timestamp).slice(0,12).map(x=>`<tr><td>${x.name}</td><td>${x.date}</td><td>${x.time}</td><td><span class="pill green">Hadir</span></td></tr>`).join('')||'<tr><td colspan="4" class="muted">Belum ada absensi tercatat.</td></tr>';renderIzin(izin);renderKas();$('#openSession')?.addEventListener('click',openSession);$('#kasForm')?.addEventListener('submit',e=>{e.preventDefault();let id=$('#kasUser').value,st=$('#kasValue').value;let arr=get(DB.kas,[]).filter(x=>x.id!==id);arr.push({id,status:st,updated:dateLabel()});put(DB.kas,arr);toast('Status kas diperbarui.');renderKas()});$('#addUserForm')?.addEventListener('submit', async e => {
  e.preventDefault();

  alert('Tombol berhasil diklik!');

  toast('HANDLER FORM BERJALAN');
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
$('#bulkMemberImport')?.addEventListener('click',async()=>{const raw=$('#bulkMemberCsv')?.value.trim();if(!raw){toast('Tempel daftar anggota terlebih dahulu.');return}const rows=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const results=[];const button=$('#bulkMemberImport');button.disabled=true;for(let i=0;i<rows.length;i++){const parts=rows[i].split(',').map(x=>x.trim());if(i===0&&parts[0]?.toUpperCase()==='ID')continue;const [idRaw,name,kelas='Anggota Robotik']=parts;const id=(idRaw||'').toUpperCase();if(!/^[A-Z0-9_-]{2,50}$/.test(id)||!name){results.push({id:idRaw||'',status:'FORMAT SALAH'});continue}const password=makeTempPassword();let created=null;try{created=await createMemberAccount({userId:id,name,kelas,password});results.push({id,nama:name,email:created.email,password,status:'BERHASIL'})}catch(err){results.push({id,nama:name,status:err.code==='auth/email-already-in-use'?'EMAIL SUDAH ADA':err.message||'GAGAL'})}finally{}}const csv=['ID,NAMA,EMAIL,PASSWORD_AWAL,STATUS',...results.map(x=>[x.id,x.nama||'',x.email||'',x.password||'',x.status].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))].join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='absenin-akun-anggota.csv';a.click();URL.revokeObjectURL(url);$('#bulkResult').textContent=`Selesai: ${results.filter(x=>x.status==='BERHASIL').length} berhasil dari ${results.length}. File CSV berisi password awal sudah diunduh; simpan dan bagikan secara pribadi.`;button.disabled=false;});$('#exportCsv')?.addEventListener('click',exportCSV)}
function renderIzin(izin=[]){
  const body=$('#izinAdminRows');if(!body)return;
  const sorted=izin.slice().sort((a,b)=>(b.created_at?.toMillis?.()||0)-(a.created_at?.toMillis?.()||0));
  body.innerHTML=sorted.map(x=>`<tr><td>${escapeHtml(x.nama||'')}</td><td>${escapeHtml(x.date||'')}</td><td>${escapeHtml(x.reason||'')}<div class="muted">${escapeHtml(x.detail||'')}</div></td><td><span class="pill ${x.status==='Disetujui'?'green':x.status==='Ditolak'?'red':''}">${escapeHtml(x.status||'Menunggu')}</span></td><td>${x.status==='Menunggu'?`<button class="btn small" data-izin-id="${x.docId}" data-izin-status="Disetujui">Setujui</button> <button class="btn small ghost" data-izin-id="${x.docId}" data-izin-status="Ditolak">Tolak</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">Belum ada pengajuan izin.</td></tr>';
  body.querySelectorAll('[data-izin-id]').forEach(btn=>btn.addEventListener('click',async()=>{btn.disabled=true;try{await updateDoc(doc(db,'leave_requests',btn.dataset.izinId),{status:btn.dataset.izinStatus,reviewed_at:serverTimestamp(),reviewed_by:user()?.id||''});toast('Status izin diperbarui: '+btn.dataset.izinStatus);const fresh=await fsList('leave_requests');renderIzin(fresh);$('#pendingCount').textContent=fresh.filter(x=>x.status==='Menunggu').length}catch(e){console.error(e);toast('Gagal memperbarui izin: '+(e.message||''));btn.disabled=false}}));
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderKas(){const users=get(DB.users,[]).filter(x=>x.role==='siswa'),kas=get(DB.kas,[]);$('#kasUser').innerHTML=users.map(x=>`<option value="${x.id}">${x.name} (${x.id})</option>`).join('');$('#kasRows').innerHTML=users.map(x=>{let k=kas.find(y=>y.id===x.id);return `<tr><td>${x.name}</td><td>${x.id}</td><td><span class="pill ${k?.status==='Lunas'?'green':'red'}">${k?.status||'Belum bayar'}</span></td><td>${k?.updated||'—'}</td></tr>`}).join('')}
async function openSession(){
  const lat=Number($('#sessionLat').value),lng=Number($('#sessionLng').value);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){toast('Masukkan koordinat lokasi yang valid.');return}
  const win=window.open('verifikasi.html','_blank');
  try{
    const now=Date.now(),token=crypto.randomUUID();
    await setDoc(doc(db,'sessions','current'),{sessionId:'current',token,lat,lng,active:true,createdAt:serverTimestamp(),tokenExpiresAt:Timestamp.fromMillis(now+30000),updatedAt:serverTimestamp()});
    toast('Sesi QR online aktif.');
    if(!win) toast('Izinkan pop-up untuk membuka layar QR.');
  }catch(e){if(win)win.close();console.error(e);toast('Gagal membuka sesi: '+(e.message||'Periksa Firestore Rules.'))}
}
let stopSessionListener=null,qrRotateTimer=null,sessionRotationBusy=false;
function tv(){
  initTheme();$('#tvDate').textContent=dateLabel();
  $('#refreshSession')?.addEventListener('click',rotate);
  $('#closeSession')?.addEventListener('click',closeSession);
  const lat=$('#tvLat'),lng=$('#tvLng');
  if(lat)lat.value='';if(lng)lng.value='';
  stopSessionListener=onSnapshot(doc(db,'sessions','current'),snap=>{
    if(!snap.exists()){drawQR(null);return}
    const s=snap.data();drawQR(s);
  },err=>{console.error(err);toast('Tidak bisa membaca sesi Firestore: '+err.message)});
  qrRotateTimer=setInterval(()=>{const s=window.currentQrSession;if(s?.active&&s.tokenExpiresAt?.toMillis?.()<=Date.now())rotate()},1000);
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
function drawQR(s){
  window.currentQrSession=s;
  const img=$('#qrImage'),status=$('#qrStatus');
  if(!s||!s.active||!s.token){img.removeAttribute('src');status.textContent='Sesi ditutup';$('#countdown').textContent='—';return}
  const expires=s.tokenExpiresAt?.toMillis?.()||0;
  const payload=encodeURIComponent(JSON.stringify({sessionId:'current',token:s.token}));
  img.src='https://api.qrserver.com/v1/create-qr-code/?size=320x320&data='+payload;
  status.textContent=expires>Date.now()?'Sesi online · token berganti':'Memperbarui token…';
  $('#countdown').textContent=Math.max(0,Math.ceil((expires-Date.now())/1000))+' dtk';
}

function exportCSV(){let logs=get(DB.logs,[]),csv='Nama,ID,Tanggal,Waktu,Metode\n'+logs.map(x=>[x.name,x.id,x.date,x.time,x.method].map(v=>'"'+String(v||'').replaceAll('"','""')+'"').join(',')).join('\n');let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='rekap-absensi.csv';a.click();URL.revokeObjectURL(a.href)}
document.addEventListener('DOMContentLoaded',()=>{seed();const page=document.body.dataset.page;if(page==='login')login();if(page==='student')student();if(page==='admin')admin();if(page==='tv')tv()});

window.$=$;
