(async function() {
  const resEl = document.getElementById('searchResults');
  const qEl = document.getElementById('q');

  // 同義語マップ（検索ワードにこれが含まれていれば対応する種別を返す）
  const synonyms = {
    'リオレウス': '飛竜種',
    'イャンクック': '鳥竜種'
  };

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

  // Fuse の設定
  const fuse = new Fuse(index, {
    keys: [
      { name: 'title', weight: 0.7 },
      { name: 'content', weight: 0.3 }
    ],
    includeMatches: true,
    threshold: 0.4,
  });

  function renderResults(results) {
    if (!results || results.length === 0) {
      resEl.innerHTML = '<p>該当する結果がありません。</p>';
      return;
    }
    resEl.innerHTML = results.map(r => {
      const item = r.item || r; // Fuse の結果オブジェクトか生データか
      const snippet = (item.content || '').slice(0, 150).replace(/\n/g,' ');
      return `<div class="result">
                <a href="${item.url || '#'}">${item.title}</a>
                <p>${snippet}${item.content && item.content.length>150 ? '…' : ''}</p>
              </div>`;
    }).join('');
  }

  // 入力イベント（デバウンス付き）
  let timer = null;
  qEl.addEventListener('input', (e) => {
    clearTimeout(timer);
    const v = e.target.value.trim();
    timer = setTimeout(() => {
      if (v === '') {
        renderResults([]);
        return;
      }

      // 1) 同義語マップにマッチ（部分一致）するかチェック — 優先して表示
      const synResults = [];
      for (const key in synonyms) {
        if (Object.prototype.hasOwnProperty.call(synonyms, key)) {
          if (v.indexOf(key) !== -1) { // 部分一致でOK
            synResults.push({
              title: key,
              url: '#', // 必要なら monsters の個別ページの URL に変更
              content: synonyms[key]
            });
          }
        }
      }
      if (synResults.length > 0) {
        // 同義語ヒットは即表示
        renderResults(synResults);
        return;
      }

      // 2) 通常の Fuse 検索
      const results = fuse.search(v);
      // results は Fuse のオブジェクト配列。renderResults で処理可能。
      renderResults(results);
    }, 200);
  });
})();
