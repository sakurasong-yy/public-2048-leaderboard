(function () {
  "use strict";

  const STORAGE_KEY = "adult-piano-20-progress";
  const CHECKLIST_KEY = "adult-piano-daily-checklist";

  const stages = [
    {
      id: "reading",
      title: "读谱坐标",
      range: "第1-5课",
      color: "#f06f61",
      soft: "#fff1ee",
      summary: "从五线四间、谱号和中央C开始，让纸上的位置能落到琴键上。"
    },
    {
      id: "rhythm",
      title: "节奏与双手",
      range: "第6-10课",
      color: "#4f9b69",
      soft: "#e9f4ea",
      summary: "用节拍器和身体律动稳定拍点，再把左右手拆开合上。"
    },
    {
      id: "harmony",
      title: "音阶与和声",
      range: "第11-15课",
      color: "#dcae53",
      soft: "#fff6de",
      summary: "理解C大调、三和弦和简单伴奏型，让旋律有支撑。"
    },
    {
      id: "music",
      title: "表现与成曲",
      range: "第16-20课",
      color: "#111216",
      soft: "#eeeeec",
      summary: "加入踏板、力度和录音复盘，完成第一首能分享的小曲。"
    }
  ];

  const lessons = [
    {
      id: 1,
      stage: "reading",
      title: "五线四间和键盘地图",
      focus: "读谱启蒙",
      summary: "认识谱表坐标，把纸上的线间和琴键上的位置连起来。",
      goals: ["说出五条线、四个间的编号", "找到中央C和相邻白键", "理解音越高位置越高"],
      game: "用便签给琴键做临时门牌，老师报“第2线”“第3间”，你用手指抢答对应方向。",
      practice: "每天3分钟画五线谱，标出5个随机音，再到琴上找到它们。"
    },
    {
      id: 2,
      stage: "reading",
      title: "高音谱表：C到G",
      focus: "右手定位",
      summary: "用右手1到5指建立中央C到G的第一组手位。",
      goals: ["认识高音谱号中央C到G", "记住右手指号1-5", "弹出均匀的五指上行"],
      game: "玩“电梯上楼”：每弹准一个音就上升一层，错音就停一拍重新定位。",
      practice: "右手C-D-E-F-G-G-F-E-D-C，慢速弹5遍，每遍都念音名。"
    },
    {
      id: 3,
      stage: "reading",
      title: "低音谱表：C到F",
      focus: "左手定位",
      summary: "让左手不再靠猜，能读出低音谱表的基础位置。",
      goals: ["认识低音谱号C到F", "区分高音谱表和低音谱表", "左手保持自然弧度"],
      game: "做“左右手接力”：右手说出音名，左手在低音区找到同名音。",
      practice: "左手C-D-E-F-G再返回，配合节拍器60BPM，每拍一音。"
    },
    {
      id: 4,
      stage: "reading",
      title: "四分音符和小节",
      focus: "稳定拍点",
      summary: "理解一拍、四拍小节和小节线，开始像读句子一样读谱。",
      goals: ["数出4/4拍中的四拍", "识别四分音符", "边数拍边弹单音"],
      game: "用桌面敲“强弱弱弱”，再把敲击换成琴键，保持同样的律动。",
      practice: "选C和G两个音，按1-2-3-4数拍弹8小节。"
    },
    {
      id: 5,
      stage: "reading",
      title: "第一首右手旋律",
      focus: "短句成形",
      summary: "把音高和节奏合起来，弹一段8小节的右手小曲。",
      goals: ["读出2小节为一组的旋律", "保持手型不塌", "遇到错音能回到小节开头"],
      game: "把旋律当成一句话，给每两小节起一个画面名字，再按画面记忆。",
      practice: "每天录一次右手旋律，听有没有忽快忽慢。"
    },
    {
      id: 6,
      stage: "rhythm",
      title: "左手低音支点",
      focus: "双手准备",
      summary: "用左手弹根音，给右手旋律建立稳稳的地板。",
      goals: ["左手在C和G之间移动", "右手旋律不停顿", "听见低音的支撑感"],
      game: "右手当歌手，左手当鼓点，只允许左手在每小节第1拍出现。",
      practice: "右手第5课旋律，左手每小节第1拍弹C或G。"
    },
    {
      id: 7,
      stage: "rhythm",
      title: "双手交替",
      focus: "协调入门",
      summary: "先不急着同时弹，用交替动作建立左右手的轮流感。",
      goals: ["看懂左右手分谱表", "完成左右手轮流进出的节奏", "保持肩膀放松"],
      game: "玩“对话弹奏”：右手问一句，左手答一句，像两个人聊天。",
      practice: "左右手各2小节轮流，节拍器64BPM，连弹3轮不停止。"
    },
    {
      id: 8,
      stage: "rhythm",
      title: "二分音符与全音符",
      focus: "延长音",
      summary: "学习把音按住，不被下一拍的数拍打断。",
      goals: ["区分一拍、两拍和四拍", "手指按住时继续数拍", "听见声音的尾巴"],
      game: "做“音符瑜伽”：音越长，呼吸越慢，手指稳住不抢跑。",
      practice: "用C、E、G弹长短组合，每次说出“按住几拍”。"
    },
    {
      id: 9,
      stage: "rhythm",
      title: "休止符和音乐呼吸",
      focus: "停顿控制",
      summary: "知道不弹也是音乐的一部分，学会在休止时保持拍子。",
      goals: ["识别四分休止符", "休止时手离键但拍子不断", "用停顿塑造句子"],
      game: "玩“红灯绿灯”：音符是绿灯，休止符是红灯，脚还要继续数拍。",
      practice: "把第5课旋律加入两个休止，感受句子呼吸。"
    },
    {
      id: 10,
      stage: "rhythm",
      title: "反复记号和乐句",
      focus: "读谱路线",
      summary: "不只看一个音，还要看整张谱子的行进路线。",
      goals: ["识别反复记号", "用铅笔圈出乐句", "知道哪里回头、哪里结束"],
      game: "把谱子当地铁图，标出起点、换乘、返回和终点。",
      practice: "选一首16小节小曲，只读路线不弹，再慢弹。"
    },
    {
      id: 11,
      stage: "harmony",
      title: "C大调五指音阶",
      focus: "音阶手感",
      summary: "把C-D-E-F-G从读谱知识变成稳定的手指路径。",
      goals: ["右手五指音阶均匀", "左手五指音阶均匀", "理解全音和半音的触感差异"],
      game: "做“慢动作镜头”：每个手指落键前都停半秒，观察有没有多余动作。",
      practice: "左右手分别弹五指音阶，各5遍，最后一遍闭眼感受距离。"
    },
    {
      id: 12,
      stage: "harmony",
      title: "连奏与断奏",
      focus: "触键变化",
      summary: "同一组音可以像说话一样连起来，也可以像雨点一样跳起来。",
      goals: ["区分legato和staccato", "手腕保持弹性", "听出不同触键的性格"],
      game: "给旋律换角色：连奏像讲故事，断奏像敲门，用同一段旋律切换两种表情。",
      practice: "第5课旋律先全连奏，再全断奏，最后自己选择混合版本。"
    },
    {
      id: 13,
      stage: "harmony",
      title: "C、F、G基础和弦",
      focus: "三和弦",
      summary: "认识最常用的三个和弦，理解旋律下面的和声颜色。",
      goals: ["找到C、F、G三和弦", "听出稳定与不稳定", "左手一次按下三个音时不紧张"],
      game: "玩“和弦调色盘”：同一句旋律换不同和弦，听颜色如何变化。",
      practice: "C-F-G-C慢弹，每个和弦保持4拍，听完再换。"
    },
    {
      id: 14,
      stage: "harmony",
      title: "左手伴奏型",
      focus: "分解和弦",
      summary: "把和弦拆成低音加中音，让伴奏轻一点、流动一点。",
      goals: ["弹出低音-和弦的基础型", "右手旋律保持突出", "左手音量轻于右手"],
      game: "右手拿麦克风，左手做灯光师：灯光要托住歌手，不能抢戏。",
      practice: "C和G两个和弦做低音-和弦伴奏，配合右手短旋律。"
    },
    {
      id: 15,
      stage: "harmony",
      title: "G大调和升F",
      focus: "调号入门",
      summary: "第一次遇到黑键，理解升记号不是麻烦，而是新的地图规则。",
      goals: ["找到F升", "认识G大调调号", "弹G大调五指位置"],
      game: "把F升当作“秘密台阶”，只有G大调地图里才会出现。",
      practice: "G-A-B-C-D五指练习，遇到F升时单独找3次。"
    },
    {
      id: 16,
      stage: "music",
      title: "F大调和降B",
      focus: "黑键亲近",
      summary: "继续认识黑键，用F大调建立降记号的概念。",
      goals: ["找到降B", "理解降记号方向", "比较G大调和F大调的手感"],
      game: "做“黑键寻宝”：只看谱号提示，在键盘上快速找到降B和升F。",
      practice: "F-G-A-Bb-C五指练习，慢速弹到每个音都能说出名字。"
    },
    {
      id: 17,
      stage: "music",
      title: "踏板入门",
      focus: "声音连接",
      summary: "学会最基础的延音踏板：少踩、晚换、听浑浊就放。",
      goals: ["脚跟稳定落地", "听出干净和浑浊", "在和弦变化时换踏板"],
      game: "玩“声音滤镜”：同一和弦先不踩，再轻踩，比较房间变大了多少。",
      practice: "C-F-G-C每个和弦4拍，换和弦后马上换踏板。"
    },
    {
      id: 18,
      stage: "music",
      title: "力度和表情记号",
      focus: "音乐语气",
      summary: "从弹对音，进入弹出强弱和句子方向。",
      goals: ["认识p、mf、f", "做出渐强和渐弱", "让旋律有起伏"],
      game: "给旋律配字幕：悄悄说、正常说、坚定说，再用力度弹出来。",
      practice: "选8小节旋律，标出最想强调的两个音。"
    },
    {
      id: 19,
      stage: "music",
      title: "完整小曲排练",
      focus: "整合演奏",
      summary: "把读谱、节奏、双手、和弦和表情放进同一首曲子。",
      goals: ["分段练习再合并", "错了能继续往下走", "完成一次不中断演奏"],
      game: "开一场“客厅彩排”：允许错音，但不允许停，练舞台恢复力。",
      practice: "全曲分A、B两段，各练3遍，再合起来录音。"
    },
    {
      id: 20,
      stage: "music",
      title: "录音复盘与下一阶段",
      focus: "复盘规划",
      summary: "用录音找进步证据，并决定接下来强化读谱、节奏还是曲目。",
      goals: ["完成一次录音", "写下3个进步点和1个问题", "选择下一阶段目标"],
      game: "做“自己的老师”：只评价一件最值得表扬的事和一件最想改的事。",
      practice: "保留第1遍和第3遍录音，比较节奏、音色和停顿。"
    }
  ];

  const noteQuestions = [
    { prompt: "高音谱表第1线是什么音？", answer: "E", top: 94 },
    { prompt: "高音谱表第2间是什么音？", answer: "A", top: 70 },
    { prompt: "高音谱表第3线是什么音？", answer: "B", top: 62 },
    { prompt: "高音谱表第4间是什么音？", answer: "E", top: 38 },
    { prompt: "低音谱表第2线是什么音？", answer: "B", top: 78 },
    { prompt: "低音谱表第1间是什么音？", answer: "A", top: 86 }
  ];

  const checklistItems = [
    "五线谱随机点名5个音",
    "节拍器慢速弹2分钟",
    "右手旋律分句练3遍",
    "左手伴奏轻声练3遍",
    "录30秒并写一句复盘"
  ];

  const elements = {
    roadmap: document.querySelector("#roadmap-grid"),
    filterRow: document.querySelector(".filter-row"),
    lessonList: document.querySelector("#lesson-list"),
    detailStage: document.querySelector("#detail-stage"),
    detailTitle: document.querySelector("#detail-title"),
    detailSummary: document.querySelector("#detail-summary"),
    detailDuration: document.querySelector("#detail-duration"),
    detailHomework: document.querySelector("#detail-homework"),
    detailFocus: document.querySelector("#detail-focus"),
    detailGoals: document.querySelector("#detail-goals"),
    detailGame: document.querySelector("#detail-game"),
    detailPractice: document.querySelector("#detail-practice"),
    progressToggle: document.querySelector("#progress-toggle"),
    completedCount: document.querySelector("#completed-count"),
    progressBar: document.querySelector("#progress-bar"),
    bpmSlider: document.querySelector("#bpm-slider"),
    bpmValue: document.querySelector("#bpm-value"),
    metronomeToggle: document.querySelector("#metronome-toggle"),
    beatDots: Array.from(document.querySelectorAll(".beat-dots span")),
    noteQuestion: document.querySelector("#note-question"),
    noteDot: document.querySelector("#note-dot"),
    answerGrid: document.querySelector("#answer-grid"),
    gameFeedback: document.querySelector("#game-feedback"),
    nextNote: document.querySelector("#next-note"),
    checklist: document.querySelector("#checklist-items"),
    resetChecklist: document.querySelector("#reset-checklist")
  };

  let selectedStage = "all";
  let selectedLessonId = 1;
  let progress = loadJson(STORAGE_KEY, []);
  let checklistState = loadJson(CHECKLIST_KEY, {});
  let noteIndex = 0;
  let metronomeTimer = null;
  let audioContext = null;
  let beatIndex = 0;

  function stageFor(id) {
    return stages.find((stage) => stage.id === id);
  }

  function lessonFor(id) {
    return lessons.find((lesson) => lesson.id === id) || lessons[0];
  }

  function loadJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Local storage is optional.
    }
  }

  function isComplete(id) {
    return progress.includes(id);
  }

  function renderRoadmap() {
    const panels = stages.map((stage, index) => {
      const panel = document.createElement("article");
      panel.className = "stage-panel";
      panel.style.setProperty("--stage-color", stage.color);
      panel.style.setProperty("--stage-soft", stage.soft);
      panel.innerHTML = `
        <div class="stage-number">${index + 1}</div>
        <div>
          <h3>${stage.title}</h3>
          <p>${stage.summary}</p>
        </div>
        <small>${stage.range}</small>
      `;
      return panel;
    });

    elements.roadmap.replaceChildren(...panels);
  }

  function renderFilters() {
    stages.forEach((stage) => {
      const button = document.createElement("button");
      button.className = "filter-button";
      button.type = "button";
      button.dataset.stageFilter = stage.id;
      button.textContent = `${stage.title} ${stage.range}`;
      elements.filterRow.append(button);
    });
  }

  function renderLessons() {
    const visibleLessons = lessons.filter((lesson) => selectedStage === "all" || lesson.stage === selectedStage);
    const cards = visibleLessons.map((lesson) => {
      const stage = stageFor(lesson.stage);
      const card = document.createElement("button");
      card.type = "button";
      card.className = [
        "lesson-card",
        lesson.id === selectedLessonId ? "is-selected" : "",
        isComplete(lesson.id) ? "is-complete" : ""
      ].filter(Boolean).join(" ");
      card.dataset.lessonId = String(lesson.id);
      card.innerHTML = `
        <span class="lesson-index">${lesson.id}</span>
        <span>
          <h3>${lesson.title}</h3>
          <p>${lesson.summary}</p>
        </span>
        <span class="lesson-tag">${stage.title}</span>
      `;
      return card;
    });

    elements.lessonList.replaceChildren(...cards);
  }

  function renderLessonDetail() {
    const lesson = lessonFor(selectedLessonId);
    const stage = stageFor(lesson.stage);
    elements.detailStage.textContent = `${stage.title} · ${stage.range}`;
    elements.detailTitle.textContent = lesson.title;
    elements.detailSummary.textContent = lesson.summary;
    elements.detailDuration.textContent = "45分钟课堂";
    elements.detailHomework.textContent = "课后15分钟";
    elements.detailFocus.textContent = lesson.focus;
    elements.detailGoals.replaceChildren(...lesson.goals.map((goal) => {
      const item = document.createElement("li");
      item.textContent = goal;
      return item;
    }));
    elements.detailGame.textContent = lesson.game;
    elements.detailPractice.textContent = lesson.practice;
    elements.progressToggle.classList.toggle("is-complete", isComplete(lesson.id));
    elements.progressToggle.lastChild.textContent = isComplete(lesson.id) ? " 已完成" : " 标记完成";
    updateProgress();
  }

  function updateProgress() {
    const completed = progress.length;
    elements.completedCount.textContent = `${completed}/20`;
    elements.progressBar.style.width = `${(completed / lessons.length) * 100}%`;
  }

  function selectLesson(id) {
    selectedLessonId = id;
    renderLessons();
    renderLessonDetail();
  }

  function setStageFilter(stageId) {
    selectedStage = stageId;
    document.querySelectorAll("[data-stage-filter]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.stageFilter === stageId);
    });

    const stillVisible = lessons.some((lesson) => lesson.id === selectedLessonId && (stageId === "all" || lesson.stage === stageId));
    if (!stillVisible) {
      const first = lessons.find((lesson) => stageId === "all" || lesson.stage === stageId);
      selectedLessonId = first.id;
    }

    renderLessons();
    renderLessonDetail();
  }

  function toggleProgress() {
    if (isComplete(selectedLessonId)) {
      progress = progress.filter((id) => id !== selectedLessonId);
    } else {
      progress = progress.concat(selectedLessonId).sort((a, b) => a - b);
    }
    saveJson(STORAGE_KEY, progress);
    renderLessons();
    renderLessonDetail();
  }

  function tickSound() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = beatIndex === 0 ? 920 : 620;
    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.09);
  }

  function renderBeat() {
    elements.beatDots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === beatIndex);
    });
  }

  function stopMetronome() {
    window.clearInterval(metronomeTimer);
    metronomeTimer = null;
    elements.metronomeToggle.setAttribute("aria-label", "播放节拍器");
    elements.metronomeToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7Z" /></svg>';
  }

  function startMetronome() {
    stopMetronome();
    const interval = 60000 / Number(elements.bpmSlider.value);
    beatIndex = 0;
    renderBeat();
    tickSound();
    elements.metronomeToggle.setAttribute("aria-label", "停止节拍器");
    elements.metronomeToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h3v12H8z" /><path d="M13 6h3v12h-3z" /></svg>';
    metronomeTimer = window.setInterval(() => {
      beatIndex = (beatIndex + 1) % 4;
      renderBeat();
      tickSound();
    }, interval);
  }

  function toggleMetronome() {
    if (metronomeTimer) {
      stopMetronome();
    } else {
      startMetronome();
    }
  }

  function renderNoteQuestion() {
    const question = noteQuestions[noteIndex % noteQuestions.length];
    elements.noteQuestion.textContent = question.prompt;
    elements.noteDot.style.top = `${question.top}px`;
    elements.gameFeedback.textContent = "先猜一次，再看答案。";
    const answers = ["C", "D", "E", "F", "G", "A", "B"].sort(() => Math.random() - 0.5).slice(0, 4);
    if (!answers.includes(question.answer)) answers[Math.floor(Math.random() * answers.length)] = question.answer;
    elements.answerGrid.replaceChildren(...answers.sort().map((answer) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-button";
      button.dataset.answer = answer;
      button.textContent = answer;
      return button;
    }));
  }

  function chooseAnswer(answer, button) {
    const question = noteQuestions[noteIndex % noteQuestions.length];
    const correct = answer === question.answer;
    button.classList.add(correct ? "is-correct" : "is-wrong");
    elements.answerGrid.querySelectorAll("button").forEach((item) => {
      item.disabled = true;
      if (item.dataset.answer === question.answer) item.classList.add("is-correct");
    });
    elements.gameFeedback.textContent = correct ? "答对了，眼睛和键盘正在连线。" : `这题是 ${question.answer}，再按下一题练一次。`;
  }

  function nextNote() {
    noteIndex = (noteIndex + 1) % noteQuestions.length;
    renderNoteQuestion();
  }

  function renderChecklist() {
    const items = checklistItems.map((label, index) => {
      const item = document.createElement("label");
      item.className = "check-item";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(checklistState[index]);
      input.dataset.checkIndex = String(index);
      const text = document.createElement("span");
      text.textContent = label;
      item.append(input, text);
      return item;
    });
    elements.checklist.replaceChildren(...items);
  }

  function attachEvents() {
    elements.filterRow.addEventListener("click", (event) => {
      const button = event.target.closest("[data-stage-filter]");
      if (button) setStageFilter(button.dataset.stageFilter);
    });

    elements.lessonList.addEventListener("click", (event) => {
      const card = event.target.closest("[data-lesson-id]");
      if (card) selectLesson(Number(card.dataset.lessonId));
    });

    elements.progressToggle.addEventListener("click", toggleProgress);

    elements.bpmSlider.addEventListener("input", () => {
      elements.bpmValue.textContent = elements.bpmSlider.value;
      if (metronomeTimer) startMetronome();
    });

    elements.metronomeToggle.addEventListener("click", toggleMetronome);
    elements.nextNote.addEventListener("click", nextNote);

    elements.answerGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-answer]");
      if (button) chooseAnswer(button.dataset.answer, button);
    });

    elements.checklist.addEventListener("change", (event) => {
      const input = event.target.closest("[data-check-index]");
      if (!input) return;
      checklistState[input.dataset.checkIndex] = input.checked;
      saveJson(CHECKLIST_KEY, checklistState);
    });

    elements.resetChecklist.addEventListener("click", () => {
      checklistState = {};
      saveJson(CHECKLIST_KEY, checklistState);
      renderChecklist();
    });
  }

  renderRoadmap();
  renderFilters();
  renderLessons();
  renderLessonDetail();
  renderNoteQuestion();
  renderChecklist();
  attachEvents();
})();
