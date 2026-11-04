/** Contoh awal Google Apps Script — jangan dianggap backend produksi sebelum dilengkapi. */
const SPREADSHEET_ID = 'GANTI_DENGAN_ID_SPREADSHEET';
const SHEETS = { Users: ['id','name','role','kelas'], Logs: ['id','name','date','time','method','timestamp'], Kas: ['id','status','updated'], Izin: ['id','name','date','reason','detail','status','timestamp'], Sessions: ['sessionId','tokenHash','lat','lng','expiresAt','active'] };
function setupSheets(){
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.entries(SHEETS).forEach(([name,headers])=>{let sh=ss.getSheetByName(name)||ss.insertSheet(name);if(sh.getLastRow()===0)sh.appendRow(headers);});
  return 'Sheets siap: '+Object.keys(SHEETS).join(', ');
}
function doGet(){return json({ok:true,service:'e-absensi-robotik',message:'Backend online. Tambahkan autentikasi dan action handlers sebelum dipakai.'});}
function doPost(e){
  try{
    const body=JSON.parse(e.postData.contents||'{}');
    // TODO production: authenticate user, validate short-lived QR token server-side,
    // enforce one attendance per user/session/day, verify geofence on server,
    // validate roles, sanitize inputs, and log audit events.
    return json({ok:false,error:'Endpoint belum diaktifkan. Implementasikan handler server-side sebelum dipakai.'});
  }catch(err){return json({ok:false,error:String(err)});}
}
function json(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
