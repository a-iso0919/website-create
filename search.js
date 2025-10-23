// 読み込んでFuseで検索・結果を描画する簡易スクリプト
(async function() {
  const resEl = document.getElementById('searchResults');
  const qEl = document.getElementById('q');

  // search_index.json を読み込む
  let index = [];
  try {
    const r = await fetch('./search_index.json', {cache: "no-store"});
    index = await r.json();
  } catch (e) {
    resEl.innerText = '検索データの読み込みに失敗しました。';
    console.error(e);
    return;
  }

  // Fuse の設定（重み付けやヒット項目の調整はここを変える）
  const fuse = new Fuse(index, {
    keys: [
      { name: 'title', weight: 0.7 },
      { name: 'content', weight: 0.3 }
    ],
    includeMatches: true,
    threshold: 0.4, // 0.0=厳密、1.0=緩い
  });

  function renderResults(results) {
    if (!results || results.length === 0) {
      resEl.innerHTML = '<p>該当する結果がありません。</p>';
      return;
    }
    resEl.innerHTML = results.map(r => {
      const item = r.item || r; // r が Fuse の結果か生データかで分岐
      const snippet = (item.content || '').slice(0, 150).replace(/\n/g,' ');
      return `<div class="result">
                <a href="${item.url}">${item.title}</a>
                <p>${snippet}${item.content && item.content.length>150 ? '…' : ''}</p>
              </div>`;
    }).join('');
  }

  // 入力イベント（debounce すると良いが簡易実装）
  let timer = null;
  qEl.addEventListener('input', (e) => {
    clearTimeout(timer);
    const v = e.target.value.trim();
    timer = setTimeout(() => {
      if (v === '') {
        // 空なら全件表示（必要なら変える）
        renderResults([]);
        return;
      }
      const results = fuse.search(v);
      renderResults(results);
    }, 200);
  });

})();
