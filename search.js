// search.js - 改良版：シノニム優先、ハイライト、種別バッジ、クリアボタン、Enterで一番上へ
(async function(){
  const qEl = document.getElementById('q');
  const resEl = document.getElementById('searchResults');
  const clearBtn = document.getElementById('clearBtn');

  // 同義語/直接マップ（部分一致で優先表示）
  const synonyms = {
    'リオレウス': '飛竜種',
    'リオレウス亜種': '飛竜種',
    'イャンクック': '鳥竜種',
    'イャンクック亜種': '鳥竜種'
  };

  // ヘルパー: 正規表現用にエスケープ
  function escapeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

  // 検索データの読み込み
  let index = [];
  try {
    const r = await fetch('./search_index.json', {cache: "no-store"});
    index = await r.json();
  } catch (e) {
    resEl.innerHTML = '<div class="no-results">検索データの読み込みに失敗しました。</div>';
    console.error(e);
    return;
  }

  // Fuse の初期化
  const fuse = new Fuse(index, {
    keys: [
      { name: 'title', weight: 0.8 },
      { name: 'content', weight: 0.35 }
    ],
    includeMatches: true,
    threshold: 0.45,
    ignoreLocation: true,
    minMatchCharLength: 1
  });

  // 種別バッジを content から抽出（"種別:" の後ろを返す）
  function extractSpecies(item){
    if(!item || !item.content) return '';
    const m = item.content.match(/種別[:：]\s*([^\\n]+)/);
    return m ? m[1].trim() : '';
  }

  // ハイライト（見つかったキーワードを <mark> で囲む）
  function highlight(text, query){
    if(!query) return text;
    // 複数語に対応：空白で分割
    const parts = query.split(/\s+/).filter(Boolean);
    let out = text;
    parts.forEach(p=>{
      try{
        const re = new RegExp('(' + escapeRegex(p) + ')', 'ig');
        out = out.replace(re, '<mark>$1</mark>');
      }catch(e){ /* ignore */ }
    });
    return out;
  }

  // 表示処理
  function renderResults(results, rawQuery){
    if(!results || results.length === 0){
      resEl.innerHTML = `<div class="no-results">該当する結果がありません。</div>`;
      return;
    }
    // results は Fuse の出力か、生データ配列のどちらかを想定
    const html = results.map(r => {
      const item = r.item || r;
      const title = highlight(item.title || '', rawQuery);
      const snippetText = (item.content || '').slice(0, 220).replace(/\n/g,' ');
      const snippet = highlight(snippetText, rawQuery);
      const species = extractSpecies(item);

      const speciesBadge = species ? `<span class="badge" aria-hidden="true">${species}</span>` : '';
      // URL fallback
      const url = item.url || '#';
      return `<div class="result" tabindex="0">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
                  <a class="title" href="${url}">${title}</a>
                  ${speciesBadge}
                </div>
                <p class="snip">${snippet}${item.content && item.content.length > 220 ? '…' : ''}</p>
              </div>`;
    }).join('');
    resEl.innerHTML = html;
  }

  // 入力処理（デバウンス）
  let timer = null;
  qEl.addEventListener('input', (e)=>{
    const v = e.target.value.trim();
    clearTimeout(timer);
    // クリアボタン表示制御
    if(v) clearBtn.hidden = false; else clearBtn.hidden = true;

    timer = setTimeout(()=>{
      if(v === ''){
        resEl.innerHTML = '';
        return;
      }

      // 1) synonyms を部分一致でチェック（優先）
      const synResults = [];
      for(const key in synonyms){
        if(Object.prototype.hasOwnProperty.call(synonyms,key)){
          if(v.indexOf(key) !== -1){
            synResults.push({
              title: key,
              url: '#',
              content: `種別: ${synonyms[key]}`
            });
          }
        }
      }
      if(synResults.length > 0){
        renderResults(synResults, v);
        return;
      }

      // 2) Fuse 検索
      const fRes = fuse.search(v);
      renderResults(fRes, v);
    }, 180);
  });

  // クリアボタン
  clearBtn.addEventListener('click', ()=>{
    qEl.value = '';
    clearBtn.hidden = true;
    resEl.innerHTML = '';
    qEl.focus();
  });

  // Enter で最初の結果にフォーカス（その後リンクを押せる）
  qEl.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      const first = resEl.querySelector('.result a.title');
      if(first){
        // フォーカスしてスクロール（ユーザーがEnterで開きたいなら Tab→Enter など）
        first.focus();
        // そのまま開きたい場合は以下をアンコメント（確認が不要なら）：
        // first.click();
      }
    }
  });

})();
