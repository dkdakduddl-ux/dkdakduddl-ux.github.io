(() => {
  'use strict';
  const config = window.BOM_BOARD_CONFIG;
  const $ = (id) => document.getElementById(id);
  if (!config || !$('board')) return;
  const dialog = $('bom-dialog');
  const content = $('bom-dialog-content');
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const sessionKey = 'bom-board-admin-session-v1';
  let page = 0, admin = false, adminView = false, session = null, epoch = 0, listRequest = 0, expiryTimer = null;
  const date = (value) => new Intl.DateTimeFormat('ko-KR', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) {
      if (name.startsWith('on')) node.addEventListener(name.slice(2), value);
      else if (name === 'class') node.className = value;
      else if (['checked','disabled','hidden','required','readOnly'].includes(name)) node[name] = value;
      else node.setAttribute(name, String(value));
    }
    for (const child of children.flat()) if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    return node;
  };
  const button = (label, action, primary = false) => el('button', {type:'button',class:primary ? 'bom-primary' : '',onclick:action}, label);
  const field = (label, input, help) => el('label', {class:'bom-field'}, el('span', {}, label), input, help ? el('span',{class:'bom-help'},help) : null);
  const input = (name, attrs = {}) => el('input', {name,...attrs});
  const textArea = (name, value = '') => el('textarea', {name,required:true,maxlength:5000,rows:7}, value);
  const message = (text) => { $('bom-dialog-status').textContent = text; };
  function show(title) {
    epoch += 1;
    $('bom-dialog-title').textContent = title;
    content.replaceChildren(); message('');
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    return epoch;
  }
  function forgetSession() {
    clearTimeout(expiryTimer);
    session = null; admin = false; adminView = false;
    try { sessionStorage.removeItem(sessionKey); } catch {}
    updateAdmin();
  }
  function scheduleExpiry() {
    clearTimeout(expiryTimer);
    if(!session) return;
    expiryTimer=setTimeout(()=>{
      forgetSession();dialog.close();page=0;void loadList();
    },Math.max(0,session.expires-Date.now()));
  }
  function updateAdmin() {
    $('bom-admin').textContent = admin ? '관리자 로그아웃' : '관리자 로그인';
    $('bom-inbox').hidden = !admin;
    $('bom-inbox').setAttribute('aria-pressed', String(adminView));
    $('bom-public').setAttribute('aria-pressed', String(!adminView));
  }
  async function request(path, payload, authenticated = false) {
    const headers = {'apikey':config.key,'Content-Type':'application/json'};
    if (authenticated) {
      if (!session || session.expires <= Date.now()) { forgetSession(); throw new Error('관리자 로그인이 만료됐어요. 다시 로그인해 주세요.'); }
      headers.Authorization = `Bearer ${session.token}`;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${config.url}${path}`, {method:'POST',headers,body:JSON.stringify(payload),cache:'no-store',signal:controller.signal});
      const data = response.status === 204 ? {} : await response.json();
      if (!response.ok) {
        if (authenticated && response.status === 401) forgetSession();
        if (path.startsWith('/auth/')) throw new Error('이메일 또는 비밀번호를 확인해 주세요.');
        if (data.code === 'PGRST202' || data.code === 'PGRST205') throw new Error('게시판을 준비하고 있어요. 잠시 후 다시 방문해 주세요.');
        throw new Error('요청을 처리하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.');
      }
      if (data.ok === false) throw new Error(data.error || '요청을 처리하지 못했어요.');
      return data;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('연결이 지연되고 있어요. 입력 내용은 그대로 두고 다시 시도해 주세요.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  const rpc = (name, args = {}, useAdmin = admin) => request(`/rest/v1/rpc/bom_${name}`, args, useAdmin);
  function bindForm(form, task) {
    let busy = false;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy || !form.reportValidity()) return;
      const version = epoch;
      busy = true;
      const submit = form.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      message('처리 중이에요…');
      try { await task(new FormData(form), version); }
      catch (error) { if (version === epoch && dialog.open) message(error.message); }
      finally { busy = false; if (submit) submit.disabled = false; }
    });
    return form;
  }
  const current = (version) => dialog.open && version === epoch;
  const submit = (label) => el('button', {type:'submit',class:'bom-primary'}, label);
  const receiptURL = (id) => { const url = new URL(location.href); url.searchParams.set('post',id); url.hash='board'; return url.href; };
  function parsePost(value) {
    const text = value.trim();
    let id = text;
    if (!uuidPattern.test(id)) { try { id = new URL(text).searchParams.get('post') || ''; } catch { id = ''; } }
    if (!uuidPattern.test(id)) throw new Error('저장한 글 주소를 그대로 붙여넣어 주세요.');
    return id;
  }
  function rememberPost(id) {
    try {
      const stored = JSON.parse(localStorage.getItem('bom-board-receipts-v1') || '[]');
      const rows = Array.isArray(stored) ? stored.filter((x) => uuidPattern.test(x.id)) : [];
      localStorage.setItem('bom-board-receipts-v1',JSON.stringify([{id,date:new Date().toISOString()},...rows.filter((x)=>x.id!==id)].slice(0,30)));
    } catch {}
  }
  async function loadList() {
    const turn = ++listRequest;
    $('bom-status').textContent = '글을 불러오는 중이에요…';
    $('bom-prev').disabled = true; $('bom-next').disabled = true;
    try {
      const data = await rpc('list',{p_page:page,p_admin:adminView},adminView);
      if (turn !== listRequest) return;
      const last = Math.max(0,Math.ceil(data.total/10)-1);
      if (page > last) { page=last; return loadList(); }
      const rows = data.items.map((post) => {
        const title = el('span',{class:'bom-post-title'},
          post.pinned ? el('span',{class:'bom-badge'},'공지') : null,
          post.is_private ? el('span',{class:'bom-badge'},'비밀') : null,post.title);
        return el('button',{type:'button',class:'bom-post-row',onclick:()=>openPost(post.id)},
          el('span',{},title,el('span',{class:'bom-post-meta'},post.is_creator ? '땅콩마미 · 제작자' : post.nickname,`답글 ${post.reply_count}`)),
          el('time',{class:'bom-post-date',datetime:post.created_at},date(post.created_at)));
      });
      $('bom-list').replaceChildren(...(rows.length ? rows : [el('p',{class:'bom-empty'},'아직 남겨진 글이 없어요. 첫 인사를 남겨주세요.')]));
      $('bom-page').textContent = `${page+1} / ${last+1}`;
      $('bom-prev').disabled = page<=0; $('bom-next').disabled=page>=last;
      $('bom-status').textContent = adminView ? '관리자만 보는 목록이에요. 비밀글도 포함되어 있어요.' : '';
      updateAdmin();
    } catch (error) {
      if (turn !== listRequest) return;
      $('bom-status').textContent = error.message;
      $('bom-list').replaceChildren(button('다시 불러오기',loadList));
    }
  }
  function receipt(id) {
    const link = input('post-link',{value:receiptURL(id),readOnly:true});
    const copy = button('글 주소 복사',async () => {
      try { await navigator.clipboard.writeText(link.value); message('글 주소를 복사했어요. 비밀번호와 함께 보관해 주세요.'); }
      catch { link.focus(); link.select(); message('선택된 주소를 복사해서 보관해 주세요.'); }
    });
    return el('div',{class:'bom-receipt'},el('strong',{},'내 글을 다시 확인할 주소'),
      el('p',{class:'bom-help'},'비밀글은 공개 목록에 나오지 않아요. 이 주소와 글 비밀번호를 보관해 주세요.'),field('글 주소',link),el('div',{class:'bom-actions'},copy));
  }
  function writePost() {
    show(admin ? '땅콩마미의 글' : '글 남기기');
    const requestId = crypto.randomUUID();
    const form = el('form',{class:'bom-form'},
      field('닉네임',input('nickname',{required:true,maxlength:30,value:admin?'땅콩마미':'',readOnly:admin,autocomplete:'nickname'})),
      field('제목',input('title',{required:true,maxlength:100})),
      field('내용',textArea('body')),
      !admin ? field('글 비밀번호',input('password',{type:'password',required:true,minlength:8,maxlength:64,autocomplete:'new-password'}),'8~64자. 글 수정·삭제와 비밀글 확인에 사용해요. 다른 계정의 비밀번호는 사용하지 마세요.') : null,
      el('label',{class:'bom-check'},input('private',{type:'checkbox'}),'비밀글로 남기기'),
      admin ? el('label',{class:'bom-check'},input('notice',{type:'checkbox'}),'공개 공지로 등록') : null,
      el('label',{class:'bom-trap','aria-hidden':'true'},'이 칸은 비워두세요',input('website',{tabindex:-1,autocomplete:'off'})),
      submit('등록하기'));
    bindForm(form,async (values,version) => {
      if (values.get('website')) throw new Error('입력 내용을 확인해 주세요.');
      const data = await rpc('create',{p_id:requestId,p_nickname:values.get('nickname'),p_title:values.get('title'),p_body:values.get('body'),p_password:values.get('password')||'',p_private:values.has('private'),p_notice:values.has('notice')});
      rememberPost(data.id);
      if (!current(version)) return;
      show('글을 남겼어요');
      content.append(receipt(data.id),button('내 글과 답글 확인',()=>openPost(data.id,String(values.get('password')||''),true),true));
      page=0; void loadList();
    });
    content.append(form); form.querySelector('input').focus();
  }
  function unlockPost(value = '') {
    show('내 글 열기');
    const password = input('password',{type:'password',required:!admin,minlength:8,maxlength:64,autocomplete:'current-password'});
    const form=el('form',{class:'bom-form'},
      field('글 주소 또는 글 번호',input('address',{required:true,value}), '글을 등록한 뒤 보관한 주소를 붙여넣어 주세요.'),
      !admin ? field('글 비밀번호',password) : null,submit('글과 답글 확인'));
    bindForm(form,async(values,version)=>{
      const id=parsePost(String(values.get('address')));
      const pass=String(values.get('password')||'');
      const data=await rpc('read',{p_id:id,p_password:pass,p_owner:true,p_admin:admin});
      if(current(version)) renderPost(data,pass);
    });
    content.append(form);
    try {
      const saved=JSON.parse(localStorage.getItem('bom-board-receipts-v1')||'[]');
      if(Array.isArray(saved)&&saved.length) {
        const items=saved.filter(x=>uuidPattern.test(x.id)&&Number.isFinite(Date.parse(x.date))).slice(0,10);
        content.append(el('p',{class:'bom-help'},'이 브라우저에서 최근 남긴 글 — 비밀번호는 저장하지 않아요.'),
          el('div',{class:'bom-actions'},...items.map(item=>button(date(item.date),()=>{form.querySelector('[name="address"]').value=receiptURL(item.id); password.focus();}))));
      }
    } catch {}
    form.querySelector('input').focus();
  }
  async function openPost(id, password='', owner=false) {
    const version=show('글 읽기'); message('글을 불러오는 중이에요…');
    try {
      const data=await rpc('read',{p_id:id,p_password:password,p_owner:owner,p_admin:admin});
      if(current(version)) renderPost(data,password);
    } catch(error) {
      if(!current(version)) return;
      message(error.message);
      content.append(button('비밀번호로 내 글 열기',()=>unlockPost(receiptURL(id))));
    }
  }
  function renderPost(data,password='') {
    const post=data.post;
    show(post.title);
    content.append(el('p',{class:'bom-post-meta'},post.is_private?'비밀글':'공개 글',post.is_creator?'땅콩마미 · 제작자':post.nickname,date(post.created_at)),
      el('div',{class:'bom-post-body'},post.body));
    for(const reply of post.replies) content.append(el('section',{class:'bom-reply'},el('h3',{},'땅콩마미의 답글'),el('time',{datetime:reply.created_at},date(reply.created_at)),el('p',{class:'bom-reply-body'},reply.body)));
    if(!post.replies.length) content.append(el('p',{class:'bom-help'},'아직 답글이 없어요.'));
    const actions=el('div',{class:'bom-actions'});
    if(data.owner) {
      actions.append(button('글 수정',()=>editPost(post,password)),button('글 삭제',()=>deletePost(post,password)));
    } else actions.append(button('내 글 수정·삭제',()=>unlockPost(receiptURL(post.id))));
    actions.append(button('글 주소 확인',()=>{show('글 주소');content.append(receipt(post.id),button('글로 돌아가기',()=>openPost(post.id,password,data.owner)));}));
    content.append(actions);
    if(admin) {
      const form=el('form',{class:'bom-form'},field(post.is_private?'비밀 답글':'답글',textArea('body')),submit('답글 등록'));
      bindForm(form,async(values,version)=>{
        const result=await rpc('admin_action',{p_action:'reply',p_id:post.id,p_body:values.get('body')},true);
        if(current(version)){renderPost(result,password);void loadList();}
      });
      content.append(el('hr'),form);
      if(!post.is_private) {
        const pinForm=el('form',{},submit(post.pinned?'공지 해제':'공지로 고정'));
        bindForm(pinForm,async(_,version)=>{
          const result=await rpc('admin_action',{p_action:'pin',p_id:post.id,p_pinned:!post.pinned},true);
          if(current(version)){renderPost(result,password);void loadList();}
        }); content.append(pinForm);
      }
    }
  }
  function editPost(post,password) {
    show('글 수정');
    const form=el('form',{class:'bom-form'},field('제목',input('title',{required:true,maxlength:100,value:post.title})),field('내용',textArea('body',post.body)),el('p',{class:'bom-help'},'처음 정한 공개·비밀 설정은 유지돼요.'),submit('수정 저장'));
    bindForm(form,async(values,version)=>{
      const data=await rpc('edit',{p_id:post.id,p_password:password,p_title:values.get('title'),p_body:values.get('body')});
      if(current(version)){renderPost(data,password);void loadList();}
    });content.append(form);
  }
  function deletePost(post,password) {
    show('글 삭제 확인');
    content.append(el('p',{},'이 글을 삭제할까요? 게시판에서 글과 답글이 함께 사라져요.'));
    const form=el('form',{class:'bom-actions'},submit('삭제하기'),button('취소',()=>openPost(post.id,password,true)));
    bindForm(form,async(_,version)=>{
      await rpc('delete',{p_id:post.id,p_password:password});
      if(current(version)){show('삭제했어요');content.append(el('p',{},'게시판에서 글을 삭제했어요.'));void loadList();}
    });content.append(form);
  }
  function adminLogin() {
    show('관리자 로그인');
    const form=el('form',{class:'bom-form'},
      field('관리자 이메일',input('email',{type:'email',required:true,autocomplete:'username'})),
      field('비밀번호',input('password',{type:'password',required:true,autocomplete:'current-password'})),
      el('p',{class:'bom-help'},'땅콩마미 전용이에요. 방문자는 로그인 없이 글을 남길 수 있어요.'),submit('로그인'));
    bindForm(form,async(values,version)=>{
      const data=await request('/auth/v1/token?grant_type=password',{email:values.get('email'),password:values.get('password')});
      if(!current(version)) return;
      session={token:data.access_token,expires:Date.now()+Number(data.expires_in)*1000};
      let status;
      try { status=await rpc('admin_status',{},true); } catch(error) {forgetSession();throw error;}
      if(!current(version)){forgetSession();return;}
      if(!status.admin){forgetSession();throw new Error('이 계정에는 게시판 관리자 권한이 없어요.');}
      admin=true; adminView=true; page=0;
      try{sessionStorage.setItem(sessionKey,JSON.stringify(session));}catch{}
      scheduleExpiry();
      updateAdmin();dialog.close();void loadList();
    });content.append(form);form.querySelector('input').focus();
  }
  $('bom-write').addEventListener('click',writePost);
  $('bom-private-open').addEventListener('click',()=>unlockPost());
  $('bom-public').addEventListener('click',()=>{adminView=false;page=0;void loadList();});
  $('bom-inbox').addEventListener('click',()=>{adminView=true;page=0;void loadList();});
  $('bom-prev').addEventListener('click',()=>{page=Math.max(0,page-1);void loadList();});
  $('bom-next').addEventListener('click',()=>{page+=1;void loadList();});
  $('bom-dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{epoch+=1;content.replaceChildren();message('');});
  $('bom-admin').addEventListener('click',()=>{
    if(!admin) return adminLogin();
    // Invalidate this session server-side when possible, without affecting other devices.
    if(session) void request('/auth/v1/logout?scope=local',{},true).catch(()=>{});
    forgetSession();dialog.close();page=0;void loadList();
  });
  async function start() {
    try {
      const value=JSON.parse(sessionStorage.getItem(sessionKey)||'null');
      if(value&&typeof value.token==='string'&&Number.isFinite(value.expires)&&value.expires>Date.now()) {
        session=value;
        try {const status=await rpc('admin_status',{},true);admin=status.admin===true;if(!admin)forgetSession();}catch{forgetSession();}
      }
    }catch{}
    updateAdmin();scheduleExpiry();void loadList();
    const id=new URL(location.href).searchParams.get('post');
    if(id&&uuidPattern.test(id)) void openPost(id);
    let visitor=null;
    try {
      const stored=localStorage.getItem('bom-archive-visitor-v1');
      visitor=stored&&uuidPattern.test(stored)?stored:crypto.randomUUID();
      localStorage.setItem('bom-archive-visitor-v1',visitor);
    }catch { visitor=null; }
    try {
      const counts=await rpc('visits',{p_visitor:visitor},false);
      $('bom-today').textContent=Number(counts.today).toLocaleString('ko-KR');
      $('bom-total').textContent=Number(counts.total).toLocaleString('ko-KR');
    }catch {
      $('bom-today').textContent='—';$('bom-total').textContent='—';
      $('bom-today').title='방문 수를 불러오지 못했어요.';
    }
  }
  void start();
})();
