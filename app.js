let state = { stars: 0, games: 0, correct: 0, total: 0, level: 1 };
let activeTimer = null;
let currentActivity = null;

const $ = (id) => document.getElementById(id);
const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };

function syncUI(){
  setText('hStars', state.stars);
  setText('hLevel', state.level);
  setText('hCorrect', state.correct);
  setText('hGames', state.games);
  setText('hAccuracy', state.total ? Math.round((state.correct / state.total) * 100) + '%' : '0%');
  setText('starsCount', state.stars);
  updateAchs();
}

function updateLevel(){
  state.level = Math.max(1, 1 + Math.floor(state.stars / 10));
  setText('hLevel', state.level);
}

function updateAchs(){
  const a1 = $('ach1'), a2 = $('ach2'), a3 = $('ach3');
  if (a1) a1.classList.toggle('earned', state.stars >= 1);
  if (a2) a2.classList.toggle('earned', state.stars >= 10);
  if (a3) a3.classList.toggle('earned', state.stars >= 25);
}

function go(name){
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const sec = $('sec-' + name);
  if (sec) sec.classList.add('active');
  document.querySelectorAll('.ntab').forEach(b => b.classList.remove('active'));
  const map = {home:0,games:1,rules:2,plan:3,awards:4};
  const tabs = document.querySelectorAll('.ntab');
  if (tabs[map[name]]) tabs[map[name]].classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function highlightRule(el){
  document.querySelectorAll('.rule-row.active').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
}

function showFeedback(msg, ok){
  let fb = $('feedbackBar');
  if(!fb){
    fb = document.createElement('div');
    fb.id = 'feedbackBar';
    fb.className = 'feedback-bar';
    document.body.appendChild(fb);
  }
  fb.textContent = msg;
  fb.className = 'feedback-bar show ' + (ok ? 'fb-correct' : 'fb-wrong');
  clearTimeout(showFeedback.t);
  showFeedback.t = setTimeout(() => fb.className = 'feedback-bar', 1800);
}

function fmt(s){
  const m = Math.floor(s/60), r = s % 60;
  return String(m).padStart(2,'0') + ':' + String(r).padStart(2,'0');
}

function showFloatTimer(label, left){
  setText('ftLabel', label);
  setText('ftTime', fmt(left));
  $('floatTimer').classList.add('visible');
}

function updateFloatTimer(left){
  setText('ftTime', fmt(left));
  $('ftTime').classList.toggle('urgent', left <= 5);
}

function hideFloatTimer(){
  $('floatTimer').classList.remove('visible');
}

function stopFloatTimer(){
  if (activeTimer) clearInterval(activeTimer);
  activeTimer = null;
  hideFloatTimer();
}

function startPlanTimer(btn, seconds, label){
  if (activeTimer) clearInterval(activeTimer);
  let left = seconds;
  const old = btn.textContent;
  btn.classList.add('running');
  btn.disabled = true;
  btn.textContent = `⏳ ${left}s`;
  showFloatTimer(label, left);
  activeTimer = setInterval(() => {
    left--;
    updateFloatTimer(left);
    btn.textContent = left > 0 ? `⏳ ${left}s` : '✓ تم';
    if(left <= 0){
      clearInterval(activeTimer);
      activeTimer = null;
      btn.classList.remove('running');
      btn.classList.add('done');
      btn.disabled = false;
      btn.textContent = old;
      state.stars += 1;
      updateLevel();
      syncUI();
      showFeedback('✅ انتهى المؤقت بنجاح', true);
      hideFloatTimer();
      setTimeout(() => btn.classList.remove('done'), 1200);
    }
  }, 1000);
}

function mascotSpeak(){
  const bubble = $('mascotBubble');
  const msgs = ['يلا نبدأ! 🚀','أنت بطل اليوم ⭐','حلّ سريع وخذ نجمة! ✨','مستعد للتحدي؟ 🦁'];
  bubble.textContent = msgs[Math.floor(Math.random() * msgs.length)];
  $('mascotContainer').classList.add('visible');
  clearTimeout(mascotSpeak.t);
  mascotSpeak.t = setTimeout(() => $('mascotContainer').classList.remove('visible'), 2500);
}

function startGame(name){
  go('games');
  openActivity(name);
}

function openActivity(type){
  currentActivity = type;
  const host = $('actHost');
  host.style.display = 'block';
  host.innerHTML = '';
  if (type === 'speedmath') buildSpeedMath(host);
  if (type === 'dice') buildDice(host);
  if (type === 'puzzle') buildPuzzle(host);
  if (type === 'memory') buildMemoryGame(host);
  if (type === 'typing') buildTypingChallenge(host);
  if (type === 'dragdrop') buildMatchGame(host);
  state.games += 1;
  syncUI();
  window.scrollTo({ top: host.offsetTop - 8, behavior: 'smooth' });
}

function buildSpeedMath(body){
  const pairs = [4,3,2,1];
  let sm = { score: 0, streak: 0, best: 0, answered: false };
  let q = null, timer = null, sec = 5;

  body.innerHTML = `
    <div class="act-card">
      <div class="act-h1">⚡ تحدي السرعة الذهنية</div>
      <div class="act-sub">لديك 5 ثوانٍ لكل سؤال</div>
      <div style="display:flex;justify-content:center;gap:14px;margin-bottom:12px;flex-wrap:wrap">
        <div class="badge">نقاط <span id="smScore">0</span></div>
        <div class="badge">متتالي <span id="smStreak">0</span></div>
        <div class="badge">أفضل <span id="smBest">0</span></div>
      </div>
      <div class="q-box" id="smQ">جاهز؟ 🎯</div>
      <div class="answers-wrap" id="smOpts"></div>
      <div id="smFeed" style="text-align:center;font-weight:800;min-height:24px;margin-top:10px"></div>
      <button class="act-btn act-btn-gold" id="smStartBtn" onclick="smStart()">🚀 ابدأ!</button>
    </div>
  `;

  function gen(){
    const add = pairs[Math.floor(Math.random() * pairs.length)];
    const base = Math.floor(Math.random() * 6) + 1;
    return { text: `${base} + ${add} = ?`, ans: base + add };
  }

  function render(){
    q = gen();
    sm.answered = false;
    $('smQ').textContent = q.text;
    $('smFeed').textContent = '';
    const wrong = new Set();
    [1,-1,2,-2,3].forEach(o => { const n = q.ans + o; if (n >= 0 && n !== q.ans) wrong.add(n); });
    const opts = [q.ans, ...[...wrong].slice(0,3)].sort(() => Math.random() - 0.5);
    const wrap = $('smOpts');
    wrap.innerHTML = '';
    opts.forEach(o => {
      const b = document.createElement('button');
      b.className = 'ans-btn';
      b.textContent = o;
      b.onclick = () => check(o, b);
      wrap.appendChild(b);
    });
    sec = 5;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      sec--;
      if (sec <= 0) {
        clearInterval(timer);
        if (!sm.answered) timeout();
      }
    }, 1000);
  }

  function check(v, btn){
    if (sm.answered) return;
    sm.answered = true;
    clearInterval(timer);
    document.querySelectorAll('#smOpts button').forEach(b => b.disabled = true);
    if (v === q.ans){
      btn.classList.add('correct');
      sm.score += 10 + sec * 2;
      sm.streak++;
      sm.best = Math.max(sm.best, sm.streak);
      state.correct++; state.total++;
      showFeedback('✅ صحيح', true);
    } else {
      btn.classList.add('wrong');
      sm.streak = 0;
      state.total++;
      showFeedback('❌ خطأ', false);
      document.querySelectorAll('#smOpts button').forEach(b => {
        if (+b.textContent === q.ans) b.classList.add('correct');
      });
    }
    setText('smScore', sm.score);
    setText('smStreak', sm.streak);
    setText('smBest', sm.best);
    syncUI();
    updateLevel();
    setTimeout(render, 1100);
  }

  function timeout(){
    sm.answered = true;
    sm.streak = 0;
    state.total++;
    showFeedback('⏰ انتهى الوقت', false);
    document.querySelectorAll('#smOpts button').forEach(b => {
      if (+b.textContent === q.ans) b.classList.add('correct');
    });
    setText('smStreak', sm.streak);
    syncUI();
    setTimeout(render, 1100);
  }

  window.smStart = () => {
    $('smStartBtn').style.display = 'none';
    render();
  };
}

function buildDice(body){
  body.innerHTML = `
    <div class="act-card">
      <div class="act-h1">🎲 لعبة النرد السحري</div>
      <div class="act-sub">ارمِ النرد واحسب الجمع أو الطرح</div>
      <div style="display:flex;justify-content:center;gap:12px;align-items:center;margin:12px 0">
        <div style="font-size:4rem" id="d1">⚄</div>
        <div style="font-size:2rem;font-weight:900" id="diceOp">+</div>
        <div style="font-size:4rem" id="d2">⚂</div>
      </div>
      <div id="diceQ" class="q-box" style="font-size:1.4rem;margin-top:8px">جاهز؟</div>
      <div class="answers-wrap" id="diceOpts"></div>
      <div id="diceFeed" style="text-align:center;font-weight:800;min-height:24px;margin-top:10px"></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="act-btn act-btn-gold" style="flex:1" onclick="rollDice('+')">➕ ارمِ للجمع</button>
        <button class="act-btn act-btn-rose" style="flex:1" onclick="rollDice('-')">➖ ارمِ للطرح</button>
      </div>
    </div>
  `;
  const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
  window.rollDice = (op) => {
    let a = Math.floor(Math.random() * 6) + 1;
    let b = Math.floor(Math.random() * 6) + 1;
    if (op === '-' && b > a) [a,b] = [b,a];
    $('d1').textContent = faces[a-1];
    $('d2').textContent = faces[b-1];
    $('diceOp').textContent = op;
    const ans = op === '+' ? a + b : a - b;
    $('diceQ').textContent = `${a} ${op} ${b} = ?`;
    const wrong = [1,-1,2,-2,3,-3].map(o => ans + o).filter(n => n >= 0 && n !== ans).slice(0,3);
    const opts = [ans, ...wrong].sort(() => Math.random() - 0.5);
    const wrap = $('diceOpts');
    wrap.innerHTML = '';
    opts.forEach(o => {
      const btn = document.createElement('button');
      btn.className = 'ans-btn';
      btn.textContent = o;
      btn.onclick = () => {
        wrap.querySelectorAll('button').forEach(x => x.disabled = true);
        if (+btn.textContent === ans){
          btn.classList.add('correct');
          $('diceFeed').innerHTML = '<span style="color:var(--green)">🎲 ممتاز!</span>';
          state.correct++; state.total++; state.stars += 1;
          updateLevel(); syncUI();
        } else {
          btn.classList.add('wrong');
          wrap.querySelectorAll('button').forEach(x => { if (+x.textContent === ans) x.classList.add('correct'); });
          $('diceFeed').innerHTML = `<span style="color:var(--rose)">الجواب: ${ans}</span>`;
          state.total++;
          syncUI();
        }
      };
      wrap.appendChild(btn);
    });
  };
  window.rollDice('+');
}

function buildPuzzle(body){
  const puzzles = [
    { q:'3 + ❓ = 5', ans:2, hint:'صديق الثلاثة هو؟' },
    { q:'❓ + 4 = 5', ans:1, hint:'+4 = +5 − 1' },
    { q:'5 − ❓ = 2', ans:3, hint:'−3 = −5 + 2' },
    { q:'❓ + 3 = 5', ans:2, hint:'+3 = +5 − 2' },
    { q:'1 + ❓ = 5', ans:4, hint:'+4 = +5 − 1' },
  ];
  let pi = 0, tried = false;
  body.innerHTML = `
    <div class="act-card">
      <div class="act-h1">🧩 ألغاز الأرقام المفقودة</div>
      <div class="act-sub">أوجد الرقم المفقود ❓</div>
      <div class="q-box" id="puzzleQ"></div>
      <input class="typing-input" id="puzzleInp" type="number" min="0" max="20" placeholder="الجواب ؟" />
      <div id="puzzleFeed" style="text-align:center;font-weight:800;min-height:24px;margin-top:10px"></div>
      <div id="puzzleHintDiv" style="display:none;text-align:center;color:var(--teal);font-size:.85rem;margin-top:6px"></div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="act-btn act-btn-purple" onclick="pHint()" style="flex:1">💡 تلميح</button>
        <button class="act-btn act-btn-teal" onclick="pNext()" style="flex:1">التالي ▶</button>
      </div>
    </div>
  `;
  function render(){
    tried = false;
    $('puzzleQ').textContent = puzzles[pi].q;
    $('puzzleInp').value = '';
    $('puzzleFeed').textContent = '';
    $('puzzleHintDiv').style.display = 'none';
  }
  window.pHint = () => {
    $('puzzleHintDiv').style.display = 'block';
    $('puzzleHintDiv').textContent = '💡 ' + puzzles[pi].hint;
  };
  window.pNext = () => {
    pi = (pi + 1) % puzzles.length;
    render();
  };
  $('puzzleInp').addEventListener('input', () => {
    const val = parseInt($('puzzleInp').value, 10);
    if (Number.isNaN(val)) return;
    const ans = puzzles[pi].ans;
    if (val === ans){
      state.correct++; state.total++;
      $('puzzleFeed').innerHTML = '<span style="color:var(--green)">🎉 ممتاز! الجواب صحيح!</span>';
      $('puzzleInp').classList.add('correct');
      syncUI(); updateLevel();
      setTimeout(pNext, 900);
    } else if (!tried && $('puzzleInp').value.length >= String(ans).length){
      tried = true;
      state.total++;
      $('puzzleFeed').innerHTML = '<span style="color:var(--rose)">❌ حاول مجددًا!</span>';
      $('puzzleInp').classList.add('wrong');
      setTimeout(() => $('puzzleInp').classList.remove('wrong'), 500);
      syncUI();
    }
  });
  render();
}

function buildMemoryGame(body){
  const cards = ['1','2','3','4','5','1','2','3','4','5','6','6'];
  let flipped = [], matched = 0, moves = 0, canFlip = true;
  body.innerHTML = `
    <div class="act-card">
      <div class="act-h1">🧠 لعبة الذاكرة</div>
      <div class="act-sub">اكشف البطاقات المتطابقة</div>
      <div style="text-align:center;margin-bottom:10px;font-weight:800">الحركات: <span id="memMoves">0</span></div>
      <div class="memory-grid" id="memoryGrid"></div>
    </div>
  `;
  const grid = $('memoryGrid');
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  shuffled.forEach(val => {
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.textContent = '❓';
    card.addEventListener('click', () => {
      if (!canFlip || card.dataset.done === '1' || card.dataset.open === '1') return;
      card.dataset.open = '1';
      card.textContent = val;
      flipped.push({el: card, val});
      if (flipped.length === 2){
        moves++;
        $('memMoves').textContent = moves;
        canFlip = false;
        setTimeout(() => {
          if (flipped[0].val === flipped[1].val){
            flipped[0].el.dataset.done = '1';
            flipped[1].el.dataset.done = '1';
            matched++;
            if (matched === 6) showFeedback('🧠 رائع! أكملت الذاكرة', true);
          } else {
            flipped[0].el.dataset.open = '0'; flipped[1].el.dataset.open = '0';
            flipped[0].el.textContent = '❓'; flipped[1].el.textContent = '❓';
          }
          flipped = [];
          canFlip = true;
        }, 700);
      }
    });
    grid.appendChild(card);
  });
}

function buildTypingChallenge(body){
  const challenges = [
    { text:'4 + 1 = 5', answer:'5' },
    { text:'3 + 2 = 5', answer:'5' },
    { text:'5 + 4 = 9', answer:'9' },
    { text:'10 - 3 = 7', answer:'7' },
    { text:'8 + 2 = 10', answer:'10' },
  ];
  let ci = 0, score = 0, start = Date.now();
  body.innerHTML = `
    <div class="act-card">
      <div class="act-h1">⌨️ تحدي الكتابة السريعة</div>
      <div class="act-sub">اكتب الجواب بأسرع ما يمكن</div>
      <div class="typing-display" id="typeDisplay"></div>
      <input class="typing-input" id="typeInput" type="text" placeholder="اكتب الجواب..." />
      <div id="typeFeed" style="text-align:center;font-weight:800;margin-top:10px;min-height:24px"></div>
    </div>
  `;
  function render(){
    const c = challenges[ci % challenges.length];
    $('typeDisplay').textContent = c.text + ' = ?';
    $('typeInput').value = '';
    $('typeInput').className = 'typing-input';
    $('typeFeed').textContent = '';
    start = Date.now();
    $('typeInput').focus();
  }
  $('typeInput').addEventListener('input', () => {
    const val = $('typeInput').value.trim();
    const ans = challenges[ci % challenges.length].answer;
    if (val === ans){
      const sec = (Date.now() - start) / 1000;
      const pts = Math.max(10, Math.floor(20 - sec));
      score += pts;
      state.correct++; state.total++; state.stars += 1;
      $('typeFeed').innerHTML = `<span style="color:var(--green)">✦ ممتاز! +${pts} نقطة</span>`;
      updateLevel(); syncUI();
      ci++;
      setTimeout(render, 900);
    }
  });
  render();
}

function buildMatchGame(body){
  const pairs = [
    { item:'+4', target:'+5 − 1' },
    { item:'+3', target:'+5 − 2' },
    { item:'+2', target:'+5 − 3' },
    { item:'+1', target:'+5 − 4' },
  ];
  body.innerHTML = `
    <div class="act-card">
      <div class="act-h1">🎯 المطابقة السريعة</div>
      <div class="act-sub">اضغط على القاعدة ثم اضغط على جوابها الصحيح</div>
      <div class="drag-container" id="matchGrid"></div>
    </div>
  `;
  const grid = $('matchGrid');
  const shuffled = [...pairs].sort(() => Math.random() - 0.5);

  const stateSel = { from: null };

  shuffled.forEach(p => {
    const b = document.createElement('button');
    b.className = 'drag-item';
    b.textContent = p.item;
    b.onclick = () => {
      stateSel.from = p.item;
      grid.querySelectorAll('.drag-item').forEach(x => x.style.outline = '');
      b.style.outline = '2px solid var(--gold)';
    };
    grid.appendChild(b);
  });

  pairs.forEach(p => {
    const z = document.createElement('button');
    z.className = 'drop-zone';
    z.textContent = p.target;
    z.onclick = () => {
      if (stateSel.from && p.item === stateSel.from){
        z.classList.add('earned');
        z.style.borderStyle = 'solid';
        z.style.borderColor = 'var(--green)';
        z.textContent = '✓ ' + p.target;
        state.stars += 1;
        updateLevel(); syncUI();
      } else {
        showFeedback('❌ حاول مرة أخرى', false);
      }
      stateSel.from = null;
      grid.querySelectorAll('.drag-item').forEach(x => x.style.outline = '');
    };
    grid.appendChild(z);
  });
}

function updateAchs(){
  const a1 = $('ach1'), a2 = $('ach2'), a3 = $('ach3');
  if (a1) a1.classList.toggle('earned', state.stars >= 1);
  if (a2) a2.classList.toggle('earned', state.stars >= 10);
  if (a3) a3.classList.toggle('earned', state.stars >= 25);
}

window.addEventListener('DOMContentLoaded', () => {
  syncUI();
  updateLevel();
  $('mascotAvatar').addEventListener('click', mascotSpeak);
  setTimeout(() => $('mascotContainer').classList.add('visible'), 1000);
  setTimeout(() => $('mascotContainer').classList.remove('visible'), 3000);
});
