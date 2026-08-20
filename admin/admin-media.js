import { auth, storage } from '../firebase-config.js';
import { getDownloadURL, ref, uploadBytes } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js';

const ADMIN_EMAILS=new Set(['stellarisairlines@gmail.com','stellaris.web.dev@gmail.com']);

function isAdmin(){return Boolean(auth.currentUser&&ADMIN_EMAILS.has(String(auth.currentUser.email||'').toLowerCase()));}
function safeName(name='image'){return String(name).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-80)||'image';}

export async function uploadAdminImage(file,folder='misc'){
  if(!isAdmin())throw new Error('관리자 로그인 후 이미지를 업로드해 주세요.');
  if(!(file instanceof File))throw new Error('이미지 파일을 선택해 주세요.');
  if(!String(file.type||'').startsWith('image/'))throw new Error('이미지 파일만 업로드할 수 있습니다.');
  if(file.size>8*1024*1024)throw new Error('이미지는 8MB 이하만 업로드할 수 있습니다.');
  const key=`site-content/${safeName(folder)}/${Date.now()}-${Math.random().toString(36).slice(2,9)}-${safeName(file.name)}`;
  const target=ref(storage,key);
  await uploadBytes(target,file,{contentType:file.type,cacheControl:'public,max-age=31536000,immutable'});
  return await getDownloadURL(target);
}
