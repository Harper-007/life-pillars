/* =========================================================
   职业计划 · 可视化路线图页面
   ========================================================= */

(function(){
  'use strict';
  const C = PillarCore;

  // ===== 添加新Tab =====
  function addRoadmapTab() {
    const tabs = document.querySelector('.tabs');
    if (!tabs || document.querySelector('.tab[data-page="roadmap"]')) return;

    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.dataset.page = 'roadmap';
    tab.innerHTML = '<span class="ico">🗺️</span>计划';
    tabs.insertBefore(tab, tabs.children[2]); // 插在"运动"前面
  }

  // ===== 添加新Page =====
  function addRoadmapPage() {
    if (document.getElementById('page-roadmap')) return;

    const page = document.createElement('section');
    page.id = 'page-roadmap';
    page.className = 'page';
    page.innerHTML = `
      <div class="topbar">
        <div>
          <div class="hello">职业<span>路线图</span></div>
          <div class="date-txt" id="roadmapSubtitle">AI项目+八股+算法 · 12周整合计划</div>
        </div>
        <div class="streak-badge" id="roadmapWeekBadge" style="background:linear-gradient(135deg,#7c6cff,#a78bfa);">
          第 <b id="roadmapCurrentWeek">-</b> 周
        </div>
      </div>

      <!-- 总览卡片 -->
      <div class="roadmap-hero">
        <div class="roadmap-hero-ring">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#2b2e4d" stroke-width="10"/>
            <circle id="roadmapProgressRing" cx="60" cy="60" r="52" fill="none" stroke="url(#roadmapGrad)"
              stroke-width="10" stroke-linecap="round"
              stroke-dasharray="326.7" stroke-dashoffset="326.7"
              transform="rotate(-90 60 60)" style="transition:stroke-dashoffset 1s ease;"/>
            <defs>
              <linearGradient id="roadmapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#7c6cff"/>
                <stop offset="100%" stop-color="#22d3ee"/>
              </linearGradient>
            </defs>
          </svg>
          <div class="roadmap-hero-txt">
            <b id="roadmapProgressPct">0%</b>
            <i>总进度</i>
          </div>
        </div>
        <div class="roadmap-hero-info">
          <h3 id="roadmapPhaseTitle">准备中</h3>
          <p id="roadmapPhaseDesc">点击下方周次查看每日任务</p>
          <div class="roadmap-stats">
            <div class="roadmap-stat">
              <span class="roadmap-stat-num" id="roadmapDaysDone">0</span>
              <span class="roadmap-stat-label">已执行天数</span>
            </div>
            <div class="roadmap-stat">
              <span class="roadmap-stat-num" id="roadmapTasksDone">0</span>
              <span class="roadmap-stat-label">已完成任务</span>
            </div>
            <div class="roadmap-stat">
              <span class="roadmap-stat-num" id="roadmapTotalTasks">0</span>
              <span class="roadmap-stat-label">总任务数</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 甘特图 -->
      <div class="sec-title"><h2>📊 三轨并行路线图</h2><span class="sub">12周 · 三条主线同步推进</span></div>
      <div class="gantt-container" id="ganttContainer">
        <div class="gantt-header">
          <div class="gantt-track-label"></div>
          <div class="gantt-week-header" id="ganttWeekHeader"></div>
        </div>
        <div class="gantt-tracks" id="ganttTracks"></div>
        <div class="gantt-today-line" id="ganttTodayLine" style="display:none;"></div>
      </div>

      <!-- 里程碑 -->
      <div class="sec-title"><h2>🏆 关键里程碑</h2><span class="sub">每个阶段的验收标准</span></div>
      <div class="milestones" id="milestonesList"></div>

      <!-- 周详情 -->
      <div class="sec-title"><h2>📅 本周任务详情</h2><span class="sub" id="weekDetailSub">选择一周查看每日任务</span></div>
      <div class="week-detail" id="weekDetail">
        <p class="muted">点击上方甘特图中的任意一周，查看该周的每日任务安排。</p>
      </div>

      <!-- 三条线分工说明 -->
      <div class="sec-title"><h2>🤝 协作分工</h2><span class="sub">谁负责什么</span></div>
      <div class="collab-grid">
        <div class="collab-card">
          <div class="collab-ico">🤖</div>
          <h4>ChatGPT</h4>
          <p>规划制定、项目架构、实验设计、简历包装、八股深度讲解</p>
        </div>
        <div class="collab-card">
          <div class="collab-ico">🫘</div>
          <h4>豆包</h4>
          <p>算法带练、代码调试、具体实现、八股记忆陪练、面试模拟</p>
        </div>
        <div class="collab-card">
          <div class="collab-ico">👤</div>
          <h4>你</h4>
          <p>执行任务、记录产出、复盘调整、保持节奏</p>
        </div>
      </div>

      <div style="height:30px;"></div>
    `;

    // 插入到看板页面前
    const boardPage = document.getElementById('page-board');
    if (boardPage && boardPage.parentNode) {
      boardPage.parentNode.insertBefore(page, boardPage);
    } else {
      document.querySelector('.wrap').appendChild(page);
    }
  }

  // ===== 渲染甘特图 =====
  function renderGantt() {
    const roadmap = CAREER_ROADMAP;
    const today = todayStrRoadmap();
    const currentWeek = getCurrentWeek(today, roadmap.startDate);

    // 周标题
    const weekHeader = document.getElementById('ganttWeekHeader');
    let weekHTML = '';
    for (let w = 0; w < roadmap.totalWeeks; w++) {
      const weekStart = C.shift(roadmap.startDate, w * 7);
      const isCurrent = w === currentWeek;
      const isPast = w < currentWeek;
      weekHTML += `<div class="gantt-week ${isPast?'past':''} ${isCurrent?'current':''}" data-week="${w}" onclick="selectRoadmapWeek(${w})">
        <span class="gantt-week-num">W${w+1}</span>
        <span class="gantt-week-date">${weekStart.slice(5)}</span>
      </div>`;
    }
    weekHeader.innerHTML = weekHTML;

    // 三条轨道
    const tracksEl = document.getElementById('ganttTracks');
    let tracksHTML = '';
    for (const track of roadmap.tracks) {
      tracksHTML += `<div class="gantt-track-row">
        <div class="gantt-track-label">
          <span class="gantt-track-ico">${track.icon}</span>
          <span>${track.name}</span>
        </div>
        <div class="gantt-track-bars">
          ${track.phases.map(phase => {
            const left = (phase.start / roadmap.totalWeeks) * 100;
            const width = ((phase.end - phase.start + 1) / roadmap.totalWeeks) * 100;
            const isDone = phase.end < currentWeek;
            const isCurrent = phase.start <= currentWeek && phase.end >= currentWeek;
            return `<div class="gantt-bar ${isDone?'done':''} ${isCurrent?'active':''}"
              style="left:${left}%;width:${width}%;background:${track.color};"
              title="${phase.name}: ${phase.desc}">
              <span class="gantt-bar-name">${phase.name}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }
    tracksEl.innerHTML = tracksHTML;

    // 今天的线
    const todayLine = document.getElementById('ganttTodayLine');
    if (today >= roadmap.startDate && today <= roadmap.endDate) {
      const totalDays = Math.round((new Date(roadmap.endDate) - new Date(roadmap.startDate)) / 86400000) + 1;
      const dayIndex = Math.round((new Date(today) - new Date(roadmap.startDate)) / 86400000);
      const pct = (dayIndex / totalDays) * 100;
      todayLine.style.display = 'block';
      todayLine.style.left = `calc(${pct}% + 60px)`;
    }

    // 更新当前周徽章
    const badge = document.getElementById('roadmapWeekBadge');
    const weekNum = document.getElementById('roadmapCurrentWeek');
    if (currentWeek >= 0 && currentWeek < roadmap.totalWeeks) {
      weekNum.textContent = currentWeek + 1;
    } else if (currentWeek < 0) {
      weekNum.textContent = '未开始';
    } else {
      weekNum.textContent = '已完成';
    }
  }

  // ===== 渲染里程碑 =====
  function renderMilestones() {
    const roadmap = CAREER_ROADMAP;
    const today = todayStrRoadmap();
    const currentWeek = getCurrentWeek(today, roadmap.startDate);
    const list = document.getElementById('milestonesList');

    list.innerHTML = roadmap.milestones.map(m => {
      const weekIndex = m.week - 1;
      const isDone = weekIndex < currentWeek;
      const isCurrent = weekIndex === currentWeek;
      return `<div class="milestone-item ${isDone?'done':''} ${isCurrent?'active':''}">
        <div class="milestone-dot" style="background:${m.color};"></div>
        <div class="milestone-info">
          <h4>${m.name} <small>第${m.week}周</small></h4>
          <p>${m.desc}</p>
        </div>
        <div class="milestone-status">${isDone?'✓ 已达成':isCurrent?'进行中':'待达成'}</div>
      </div>`;
    }).join('');
  }

  // ===== 选择某周，显示每日任务 =====
  function selectRoadmapWeek(weekNum) {
    const roadmap = CAREER_ROADMAP;
    const weekStart = C.shift(roadmap.startDate, weekNum * 7);
    const today = todayStrRoadmap();

    document.getElementById('weekDetailSub').textContent =
      `第 ${weekNum + 1} 周 · ${weekStart} 起`;

    const dayNames = ['周日','周一','周二','周三','周四','周五','周六'];
    let html = '';

    for (let d = 0; d < 7; d++) {
      const day = C.shift(weekStart, d);
      const tasks = CAREER_ROADMAP_DAILY[day] || [];
      const isToday = day === today;
      const isPast = day < today;

      // 检查完成状态
      const dayChecks = getDayChecksRoadmap(day);
      const doneCount = tasks.filter(t => {
        const id = getTaskIdRoadmap(day, t);
        return dayChecks[id];
      }).length;

      html += `<div class="day-task-card ${isToday?'today':''} ${isPast?'past':''}">
        <div class="day-task-header">
          <span class="day-name">${dayNames[new Date(day + 'T12:00:00Z').getUTCDay()]}</span>
          <span class="day-date">${day.slice(5)}</span>
          <span class="day-progress">${doneCount}/${tasks.length}</span>
        </div>
        <div class="day-task-list">
          ${tasks.length ? tasks.map((t, i) => {
            const id = getTaskIdRoadmap(day, t);
            const checked = dayChecks[id] ? 'checked' : '';
            return `<label class="roadmap-task ${checked?'done':''}">
              <input type="checkbox" ${checked} onchange="toggleRoadmapTask('${day}','${i}',this.checked)">
              <span>${t}</span>
            </label>`;
          }).join('') : '<p class="muted" style="margin:0;padding:8px 0;">本日无计划任务</p>'}
        </div>
      </div>`;
    }

    document.getElementById('weekDetail').innerHTML = html;
    updateRoadmapProgress();
  }

  // ===== 任务勾选 =====
  function getTaskIdRoadmap(day, taskText) {
    return getCareerRoadmapTaskId(day, taskText);
  }

  function getDayChecksRoadmap(day) {
    if (typeof S !== 'undefined' && S.checks) return S.checks[day] || {};
    return {};
  }

  function toggleRoadmapTask(day, idx, checked) {
    const tasks = CAREER_ROADMAP_DAILY[day] || [];
    const task = tasks[idx];
    if (!task || typeof S === 'undefined') return;

    const id = getTaskIdRoadmap(day, task);
    S.checks = S.checks || {};
    S.checks[day] = S.checks[day] || {};
    S.checks[day][id] = checked;

    // 同时记录到 activities
    S.activities = S.activities || {};
    S.activities[day] = S.activities[day] || [];
    const activityId = 'roadmap-' + day + '-' + idx;
    if (checked) {
      const title = task.replace(/【.*?】/, '').trim().slice(0, 50);
      if (!S.activities[day].some(a => a.id === activityId)) {
        S.activities[day].push({
          id: activityId,
          title,
          minutes: 30,
          area: '职业',
          outcome: '来自12周计划'
        });
      }
    } else {
      S.activities[day] = S.activities[day].filter(a => a.id !== activityId);
    }

    if (typeof save === 'function') save();
    if (day === todayStrRoadmap() && typeof renderToday === 'function') renderToday();
    selectRoadmapWeek(getCurrentWeek(day, CAREER_ROADMAP.startDate));
  }

  // ===== 计算总进度 =====
  function updateRoadmapProgress() {
    const roadmap = CAREER_ROADMAP;
    const today = todayStrRoadmap();
    let totalTasks = 0;
    let doneTasks = 0;
    let daysDone = 0;

    for (const [day, tasks] of Object.entries(CAREER_ROADMAP_DAILY)) {
      if (day > today) continue; // 只统计到今天为止
      totalTasks += tasks.length;
      const checks = getDayChecksRoadmap(day);
      let dayDone = 0;
      for (const t of tasks) {
        const id = getTaskIdRoadmap(day, t);
        if (checks[id]) { dayDone++; doneTasks++; }
      }
      if (dayDone > 0) daysDone++;
    }

    // 总任务数（所有12周）
    let allTasks = 0;
    for (const tasks of Object.values(CAREER_ROADMAP_DAILY)) {
      allTasks += tasks.length;
    }

    const pct = totalTasks > 0 ? Math.round((doneTasks / allTasks) * 100) : 0;
    const ring = document.getElementById('roadmapProgressRing');
    const circumference = 2 * Math.PI * 52;
    if (ring) {
      ring.style.strokeDashoffset = circumference * (1 - pct / 100);
    }
    const pctEl = document.getElementById('roadmapProgressPct');
    if (pctEl) pctEl.textContent = pct + '%';

    const daysDoneEl = document.getElementById('roadmapDaysDone');
    if (daysDoneEl) daysDoneEl.textContent = daysDone;
    const tasksDoneEl = document.getElementById('roadmapTasksDone');
    if (tasksDoneEl) tasksDoneEl.textContent = doneTasks;
    const totalEl = document.getElementById('roadmapTotalTasks');
    if (totalEl) totalEl.textContent = allTasks;

    // 当前阶段
    const currentWeek = getCurrentWeek(today, roadmap.startDate);
    const currentPhase = roadmap.tracks[0].phases.find(p => p.start <= currentWeek && p.end >= currentWeek);
    const phaseTitle = document.getElementById('roadmapPhaseTitle');
    const phaseDesc = document.getElementById('roadmapPhaseDesc');
    if (currentPhase && phaseTitle) {
      phaseTitle.textContent = '当前阶段：' + currentPhase.name;
      phaseDesc.textContent = currentPhase.desc;
    } else if (currentWeek < 0 && phaseTitle) {
      phaseTitle.textContent = '计划未开始';
      phaseDesc.textContent = roadmap.startDate + ' 开始，加油！';
    } else if (phaseTitle) {
      phaseTitle.textContent = '计划已完成 🎉';
      phaseDesc.textContent = '12周全部完成，看看下一个目标是什么';
    }
  }

  // ===== 工具函数 =====
  function todayStrRoadmap() {
    if (typeof todayStr === 'function') return todayStr();
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }

  function getCurrentWeek(today, startDate) {
    if (today < startDate) return -1;
    const diff = Math.round((new Date(today) - new Date(startDate)) / 86400000);
    return Math.floor(diff / 7);
  }

  // ===== 样式注入 =====
  function injectStyles() {
    if (document.getElementById('roadmap-styles')) return;
    const style = document.createElement('style');
    style.id = 'roadmap-styles';
    style.textContent = `
      .roadmap-hero{
        margin-top:16px;background:linear-gradient(145deg,var(--card) 0%,var(--bg2) 100%);
        border:1px solid var(--line);border-radius:24px;padding:20px;
        display:flex;align-items:center;gap:20px;
        box-shadow:0 10px 34px rgba(0,0,0,.3);
      }
      .roadmap-hero-ring{position:relative;width:120px;height:120px;flex:0 0 auto;}
      .roadmap-hero-txt{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
      .roadmap-hero-txt b{font-size:28px;font-weight:800;line-height:1;}
      .roadmap-hero-txt i{font-style:normal;font-size:11px;color:var(--txt2);margin-top:4px;}
      .roadmap-hero-info{flex:1;min-width:0;}
      .roadmap-hero-info h3{margin:0 0 6px;font-size:17px;font-weight:700;}
      .roadmap-hero-info p{margin:0;font-size:13px;color:var(--txt2);}
      .roadmap-stats{display:flex;gap:16px;margin-top:14px;}
      .roadmap-stat{display:flex;flex-direction:column;align-items:flex-start;}
      .roadmap-stat-num{font-size:20px;font-weight:800;background:linear-gradient(90deg,var(--accent2),var(--cyan));-webkit-background-clip:text;background-clip:text;color:transparent;}
      .roadmap-stat-label{font-size:11px;color:var(--txt3);}

      .gantt-container{
        background:var(--card);border:1px solid var(--line);border-radius:18px;
        padding:16px;overflow-x:auto;position:relative;
      }
      .gantt-header,.gantt-track-row{display:flex;align-items:stretch;}
      .gantt-track-label{
        width:60px;flex:0 0 auto;display:flex;align-items:center;gap:6px;
        font-size:12px;font-weight:600;color:var(--txt2);
        padding:8px 8px 8px 0;
      }
      .gantt-track-ico{font-size:16px;}
      .gantt-week-header{
        flex:1;display:grid;grid-template-columns:repeat(12,1fr);gap:2px;min-width:500px;
      }
      .gantt-week{
        display:flex;flex-direction:column;align-items:center;gap:2px;
        padding:6px 2px;border-radius:6px;cursor:pointer;transition:.2s;
        font-size:10px;color:var(--txt3);
      }
      .gantt-week:hover{background:#2b2e4d;}
      .gantt-week.current{background:rgba(124,108,255,.2);color:var(--accent2);}
      .gantt-week.past{opacity:.5;}
      .gantt-week-num{font-weight:700;font-size:11px;}
      .gantt-week-date{font-size:9px;opacity:.7;}

      .gantt-tracks{margin-top:8px;}
      .gantt-track-row{margin-bottom:10px;}
      .gantt-track-bars{
        flex:1;position:relative;height:36px;background:#16172b;border-radius:8px;
        min-width:500px;
      }
      .gantt-bar{
        position:absolute;top:5px;height:26px;border-radius:6px;
        display:flex;align-items:center;justify-content:center;
        font-size:10px;font-weight:600;color:#fff;white-space:nowrap;
        overflow:hidden;padding:0 6px;cursor:pointer;transition:.2s;
        opacity:.7;
      }
      .gantt-bar:hover{opacity:1;transform:scaleY(1.05);}
      .gantt-bar.done{opacity:.4;}
      .gantt-bar.active{opacity:1;box-shadow:0 0 12px currentColor;}
      .gantt-bar-name{overflow:hidden;text-overflow:ellipsis;}

      .gantt-today-line{
        position:absolute;top:16px;bottom:16px;width:2px;
        background:linear-gradient(to bottom,#ff6b9d,#ffd166);
        z-index:5;pointer-events:none;
        box-shadow:0 0 8px rgba(255,107,157,.6);
      }

      .milestones{display:flex;flex-direction:column;gap:10px;}
      .milestone-item{
        display:flex;align-items:center;gap:12px;
        background:var(--card);border:1px solid var(--line);border-radius:14px;
        padding:12px 16px;transition:.2s;
      }
      .milestone-item.done{opacity:.6;}
      .milestone-item.active{border-color:var(--accent);box-shadow:0 0 0 1px rgba(124,108,255,.3) inset;}
      .milestone-dot{
        width:12px;height:12px;border-radius:50%;flex:0 0 auto;
        box-shadow:0 0 10px currentColor;
      }
      .milestone-info{flex:1;min-width:0;}
      .milestone-info h4{margin:0;font-size:14px;font-weight:600;}
      .milestone-info h4 small{font-size:11px;color:var(--txt3);font-weight:400;margin-left:6px;}
      .milestone-info p{margin:2px 0 0;font-size:12px;color:var(--txt2);}
      .milestone-status{font-size:11px;padding:3px 10px;border-radius:999px;background:#2b2e4d;color:var(--txt2);font-weight:600;}
      .milestone-item.done .milestone-status{background:rgba(61,220,151,.15);color:var(--green);}
      .milestone-item.active .milestone-status{background:rgba(124,108,255,.2);color:var(--accent2);}

      .week-detail{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;}
      .day-task-card{
        background:var(--card);border:1px solid var(--line);border-radius:14px;
        padding:12px;transition:.2s;
      }
      .day-task-card.today{border-color:var(--accent);box-shadow:0 0 0 1px rgba(124,108,255,.3) inset;}
      .day-task-card.past{opacity:.7;}
      .day-task-header{
        display:flex;align-items:center;gap:8px;margin-bottom:10px;
        padding-bottom:8px;border-bottom:1px solid var(--line);
      }
      .day-name{font-weight:700;font-size:13px;}
      .day-date{font-size:11px;color:var(--txt3);}
      .day-progress{margin-left:auto;font-size:11px;color:var(--txt2);font-weight:600;}
      .roadmap-task{
        display:flex;align-items:flex-start;gap:8px;
        padding:6px 0;font-size:12px;line-height:1.4;cursor:pointer;
      }
      .roadmap-task input{margin-top:2px;}
      .roadmap-task.done span{text-decoration:line-through;color:var(--txt3);opacity:.6;}

      .collab-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
      .collab-card{
        background:var(--card);border:1px solid var(--line);border-radius:14px;
        padding:14px;text-align:center;
      }
      .collab-ico{font-size:28px;margin-bottom:6px;}
      .collab-card h4{margin:0 0 4px;font-size:14px;}
      .collab-card p{margin:0;font-size:11px;color:var(--txt2);line-height:1.5;}

      @media(max-width:500px){
        .roadmap-hero{flex-direction:column;text-align:center;}
        .roadmap-stats{justify-content:center;}
        .collab-grid{grid-template-columns:1fr;}
        .week-detail{grid-template-columns:1fr;}
      }
    `;
    document.head.appendChild(style);
  }

  // ===== 初始化 =====
  function initRoadmap() {
    if (typeof PillarCore === 'undefined') {
      setTimeout(initRoadmap, 100);
      return;
    }

    injectStyles();
    addRoadmapTab();
    addRoadmapPage();

    // 渲染内容
    renderGantt();
    renderMilestones();

    // 默认选中当前周
    const currentWeek = getCurrentWeek(todayStrRoadmap(), CAREER_ROADMAP.startDate);
    const showWeek = Math.max(0, Math.min(currentWeek, CAREER_ROADMAP.totalWeeks - 1));
    selectRoadmapWeek(showWeek);

    // 监听tab切换
    document.addEventListener('click', function(e) {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      const page = tab.dataset.page;
      if (page === 'roadmap') {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        const roadPage = document.getElementById('page-roadmap');
        if (roadPage) roadPage.classList.add('active');
        tab.classList.add('active');
        // 刷新进度
        updateRoadmapProgress();
        renderGantt();
      }
    });
  }

  // 暴露全局函数
  window.selectRoadmapWeek = selectRoadmapWeek;
  window.toggleRoadmapTask = toggleRoadmapTask;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRoadmap);
  } else {
    initRoadmap();
  }
})();
