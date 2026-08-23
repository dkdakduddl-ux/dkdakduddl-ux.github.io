const params = new URLSearchParams(window.location.search);
const requestedId = params.get('id');
const works = Array.isArray(window.WORKS) ? window.WORKS : [];
const workIndex = works.findIndex((item) => item.id === requestedId);
const work = workIndex >= 0 ? works[workIndex] : works[0];

if (!work) {
  document.querySelector('#detail-main').innerHTML = '<section class="not-found"><h1>작품을 찾을 수 없습니다.</h1><a href="index.html">아카이브로 돌아가기</a></section>';
} else {
  document.documentElement.style.setProperty('--work-accent', work.accent);
  document.title = `${work.title} · BOM ARCHIVE`;

  const cover = document.querySelector('#detail-cover');
  cover.src = work.cover;
  cover.alt = `${work.title} 움직이는 대표 이미지`;
  document.querySelector('#detail-index').textContent = `ARCHIVE FILE ${String(workIndex + 1).padStart(2, '0')} / ${String(works.length).padStart(2, '0')}`;
  document.querySelector('#detail-subtitle').textContent = work.subtitle;
  document.querySelector('#detail-title').textContent = work.title;
  document.querySelector('#detail-summary').textContent = work.summary;
  document.querySelector('#detail-tags').innerHTML = work.tags.map((tag) => `<li>${tag}</li>`).join('');

  const linkGrid = document.querySelector('#link-grid');
  linkGrid.innerHTML = work.links.map((link) => {
    const statusClass = link.status.toLowerCase();
    const statusText = link.status === 'OPEN' ? '작품 열기' : link.status;
    return `<a class="external-link ${statusClass}" href="${link.url}" target="_blank" rel="noopener noreferrer"><span>${link.platform}</span><strong>${statusText}</strong><i>↗</i></a>`;
  }).join('');

  const hasUnsafe = work.links.some((link) => link.status === 'UNSAFE');
  document.querySelector('#external-warning').hidden = !hasUnsafe;

  const documentGrid = document.querySelector('#document-grid');
  documentGrid.innerHTML = work.documents.map((document) => `
    <figure class="archive-document ${document.layout || ''}">
      <img src="${document.src}" alt="${document.alt}" loading="lazy">
      <figcaption><span>${document.caption}</span><i>FILE · ${work.id.toUpperCase()}</i></figcaption>
    </figure>
  `).join('');

  const previousIndex = (workIndex - 1 + works.length) % works.length;
  const nextIndex = (workIndex + 1) % works.length;
  const previousLink = document.querySelector('#previous-work');
  const nextLink = document.querySelector('#next-work');
  previousLink.href = `work.html?id=${encodeURIComponent(works[previousIndex].id)}`;
  previousLink.textContent = `← ${works[previousIndex].title}`;
  nextLink.href = `work.html?id=${encodeURIComponent(works[nextIndex].id)}`;
  nextLink.textContent = `${works[nextIndex].title} →`;
}
