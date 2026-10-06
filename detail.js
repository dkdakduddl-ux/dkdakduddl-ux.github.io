(() => {
  'use strict';
  const params = new URLSearchParams(window.location.search);
  const assetVersion = '20261006-works-1';
  const assetSrc = (path) => `/${path}?v=${assetVersion}`;
  const works = Array.isArray(window.WORKS) ? window.WORKS : [];
  const requestedId = params.get('id');
  const foundIndex = works.findIndex(item => item.id === requestedId);
  const workIndex = foundIndex >= 0 ? foundIndex : (requestedId ? -1 : 0);
  const work = works[workIndex];
  const $ = (id) => document.getElementById(id);
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  if (!work) {
    const section = el('section',null,'not-found');
    const link = el('a','아카이브로 돌아가기');
    link.href = 'index.html';
    section.append(el('h1','작품을 찾을 수 없습니다.'),link);
    $('detail-main').replaceChildren(section);
    return;
  }

  document.documentElement.style.setProperty('--work-accent',work.accent);
  const cover = $('detail-cover');
  cover.src = assetSrc(work.cover);
  cover.alt = `${work.title} 대표 이미지`;
  $('detail-index').textContent = `ARCHIVE FILE ${String(workIndex+1).padStart(2,'0')}`;
  $('detail-subtitle').textContent = work.subtitle;
  $('detail-summary').textContent = work.summary;
  $('detail-tags').replaceChildren(...work.tags.map(tag=>el('li',tag)));
  const variants = Array.isArray(work.documentVariants) ? work.documentVariants : [];
  const control = $('document-variant-control');
  const options = $('document-variant-options');
  const buttons = [];

  function renderDocuments(documents) {
    const grid = $('document-grid');
    grid.classList.toggle('continuous-documents',Boolean(work.continuousDocuments));
    grid.replaceChildren(...documents.map((record,index)=>{
      const figure = el('figure',null,`archive-document ${record.layout||''}`);
      const image = el('img');
      image.src = assetSrc(record.src);
      image.alt = record.alt;
      image.loading = index===0 ? 'eager' : 'lazy';
      image.decoding = 'async';
      if(record.width && record.height){ image.width=record.width;image.height=record.height; }
      const caption = el('figcaption');
      caption.append(el('span',record.caption),el('i',`FILE · ${work.id.toUpperCase()}`));
      figure.append(image,caption);
      return figure;
    }));
  }
  function renderLinks(links) {
    $('link-grid').replaceChildren(...links.map(link=>{
      const a = el('a',null,`external-link ${link.status.toLowerCase()}`);
      a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';
      a.append(el('span',link.platform),el('strong',link.status==='OPEN'?'작품 열기':link.status),el('i','↗'));
      return a;
    }));
    $('external-warning').hidden = !links.some(link=>link.status==='UNSAFE');
  }
  function selectVariant(variant,remember=false) {
    const title=variant?.title||work.title;
    document.title=`${title} · 땅콩마미 ARCHIVE`;
    $('detail-title').textContent=title;
    renderLinks(variant?.links||work.links);
    renderDocuments(variant?.documents||work.documents);
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.variant===variant?.id)));
    if(remember && variant){
      const url=new URL(window.location.href);
      url.searchParams.set('version',variant.id);
      window.history.replaceState(null,'',url);
    }
  }
  if(variants.length>1 && control && options){
    control.hidden=false;
    for(const variant of variants){
      const button=el('button',variant.label);
      button.type='button';button.dataset.variant=variant.id;
      button.setAttribute('aria-controls','document-grid link-grid');
      button.addEventListener('click',()=>selectVariant(variant,true));
      buttons.push(button);options.append(button);
    }
  }
  selectVariant(variants.find(variant=>variant.id===params.get('version'))||variants[0]);
  window.addEventListener('popstate',()=>{
    const version=new URLSearchParams(window.location.search).get('version');
    selectVariant(variants.find(variant=>variant.id===version)||variants[0]);
  });
  const previous=works[(workIndex-1+works.length)%works.length];
  const next=works[(workIndex+1)%works.length];
  $('previous-work').href=`work.html?id=${encodeURIComponent(previous.id)}`;
  $('previous-work').textContent=`← ${previous.title}`;
  $('next-work').href=`work.html?id=${encodeURIComponent(next.id)}`;
  $('next-work').textContent=`${next.title} →`;
})();
