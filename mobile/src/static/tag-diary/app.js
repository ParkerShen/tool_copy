/* ═══════════════════════════════════════════════════════════
   标签日记 — Tag Diary
   Local-first · localStorage · DeepSeek
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ────────────────────────────── Constants ────────────────────────────── */
const DATA_KEY = 'tag-diary:data:v1';
const SETTINGS_KEY = 'tag-diary:settings:v1';
const APP_VERSION = 1;

const DEFAULT_TAGS = [
  { emoji: '💼', name: '工作', color: '#00d4ff' },
  { emoji: '📚', name: '学习', color: '#a78bfa' },
  { emoji: '🏃', name: '运动', color: '#00ff88' },
  { emoji: '📖', name: '阅读', color: '#ffd93d' },
  { emoji: '☕', name: '生活', color: '#ff9f43' },
  { emoji: '💬', name: '社交', color: '#ff4757' },
  { emoji: '🎮', name: '娱乐', color: '#38bdf8' },
  { emoji: '🌙', name: '休息', color: '#94a3b8' },
];

const PALETTE = [
  '#00d4ff', '#00ff88', '#ffd93d', '#a78bfa', '#ff4757',
  '#ff9f43', '#38bdf8', '#f472b6', '#94a3b8', '#facc15',
];

const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'deepseek-chat',
  baseUrl: 'https://api.deepseek.com',
};

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const TIMELINE_GROUPS = [
  { key: 'dawn', label: '凌晨', from: 0, to: 6 },
  { key: 'morning', label: '上午', from: 6, to: 12 },
  { key: 'afternoon', label: '下午', from: 12, to: 18 },
  { key: 'evening', label: '晚上', from: 18, to: 24 },
];

const SYSTEM_PROMPT = `你是一位擅长写日记的中文作者。你会收到某一天的活动记录（标签、时间、备注），请把它们整理成一篇自然、真诚、有画面感的中文日记。

写作要求：
1. 用第一人称，按时间顺序叙述，但不要机械地罗列记录。
2. 把标签自然融入叙述，体现活动的主题，不要生硬地堆砌标签名。
3. 只使用给出的信息，绝对不要编造人物、地点、对话或事件。信息少时写得简洁克制，不要强行扩写。
4. 可以写一点感受和思考，但不要过度抒情、不要说教，也不要使用空洞的排比句。
5. 输出 Markdown：第一行是一级标题（例如「# 10月18日 · 周日」），正文 2–4 个自然段，可加一个简短的小节标题。
6. 篇幅约 400–700 个汉字。直接输出日记正文，不要任何解释、前言或代码块围栏。`;

/* ────────────────────────────── Utilities ────────────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const pad2 = (n) => String(n).padStart(2, '0');

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function todayISO() {
  return toISO(new Date());
}

function parseISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function isISODate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(parseISO(value).getTime());
}

function shiftISO(iso, days) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

function firstOfMonth(iso) {
  const d = parseISO(iso);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function nowTime() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function weekdayCN(iso) {
  return WEEKDAYS[parseISO(iso).getDay()];
}

function fmtDateShort(iso) {
  const d = parseISO(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function fmtDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function uid(prefix) {
  return `${prefix || 'td'}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeColor(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || '')) ? String(value).toLowerCase() : (fallback || '#00d4ff');
}

function hexToRgba(hex, alpha) {
  const value = normalizeColor(hex);
  const r = parseInt(value.slice(1, 3), 16);
  const g = parseInt(value.slice(3, 5), 16);
  const b = parseInt(value.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeTime(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || '').trim());
  if (!match) return '';
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return '';
  return `${pad2(h)}:${pad2(m)}`;
}

function minutesOf(time) {
  const [h, m] = String(time || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
}

function countChars(text) {
  return Array.from(String(text || '').replace(/\s/g, '')).length;
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageBytes(obj) {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return JSON.stringify(obj).length;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function downloadBlob(filename, text, type) {
  const blob = new Blob([text], { type: type || 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* Minimal, safe Markdown renderer for diary preview */
function inlineMarkdown(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return out;
}

function renderMarkdown(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let paragraph = [];
  let listType = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${paragraph.map(inlineMarkdown).join('<br>')}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(?:---+|___+|\*\*\*+)$/.test(trimmed)) {
      flushParagraph();
      closeList();
      html.push('<hr>');
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${inlineMarkdown(trimmed.replace(/^>\s?/, ''))}</blockquote>`);
      continue;
    }

    const ul = /^[-*+]\s+(.*)$/.exec(trimmed);
    const ol = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (ul || ol) {
      flushParagraph();
      const wanted = ul ? 'ul' : 'ol';
      if (listType !== wanted) {
        closeList();
        listType = wanted;
        html.push(`<${wanted}>`);
      }
      html.push(`<li>${inlineMarkdown((ul || ol)[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();
  return html.join('');
}

/* ────────────────────────────── Storage / data ────────────────────────────── */
function makeTag(source) {
  return {
    id: source.id || uid('tag'),
    name: String(source.name || '未命名').slice(0, 12),
    emoji: String(source.emoji || '✦').slice(0, 4),
    color: normalizeColor(source.color),
    createdAt: source.createdAt || new Date().toISOString(),
  };
}

function createInitialData() {
  return {
    version: APP_VERSION,
    tags: DEFAULT_TAGS.map((tag, index) => makeTag({
      ...tag,
      id: `tag_default_${index + 1}`,
      createdAt: new Date().toISOString(),
    })),
    archivedTags: [],
    activities: [],
    diaries: {},
  };
}

function normalizeData(raw) {
  if (!raw || typeof raw !== 'object') return createInitialData();
  const data = {
    version: APP_VERSION,
    tags: [],
    archivedTags: [],
    activities: [],
    diaries: {},
  };

  const seenTagIds = new Set();
  const readTags = (list, archived) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const tag = makeTag(item);
      if (!archived && seenTagIds.has(tag.id)) continue;
      seenTagIds.add(tag.id);
      if (archived) tag.archivedAt = item.archivedAt || new Date().toISOString();
      (archived ? data.archivedTags : data.tags).push(tag);
    }
  };
  readTags(raw.tags, false);
  readTags(raw.archivedTags, true);

  if (Array.isArray(raw.activities)) {
    for (const item of raw.activities) {
      if (!item || typeof item !== 'object') continue;
      if (!isISODate(item.date)) continue;
      const time = normalizeTime(item.time) || '12:00';
      data.activities.push({
        id: item.id || uid('act'),
        date: item.date,
        time,
        tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 12) : [],
        note: String(item.note || '').slice(0, 500),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
      });
    }
  }

  if (raw.diaries && typeof raw.diaries === 'object') {
    for (const [date, diary] of Object.entries(raw.diaries)) {
      if (!isISODate(date) || !diary || typeof diary !== 'object') continue;
      const content = typeof diary.content === 'string' ? diary.content : '';
      const draft = typeof diary.draft === 'string' ? diary.draft : undefined;
      if (!content.trim() && !(draft && draft.trim())) continue;
      data.diaries[date] = {
        content,
        ...(draft !== undefined ? { draft } : {}),
        generatedAt: diary.generatedAt || '',
        updatedAt: diary.updatedAt || '',
        model: diary.model || '',
        ...(typeof diary.signature === 'string' ? { signature: diary.signature } : {}),
      };
    }
  }

  return data;
}

function normalizeSettings(raw) {
  return {
    apiKey: typeof raw?.apiKey === 'string' ? raw.apiKey.trim() : '',
    model: typeof raw?.model === 'string' && raw.model.trim() ? raw.model.trim() : DEFAULT_SETTINGS.model,
    baseUrl: typeof raw?.baseUrl === 'string' && raw.baseUrl.trim() ? raw.baseUrl.trim() : DEFAULT_SETTINGS.baseUrl,
  };
}

function loadData() {
  const text = safeGetItem(DATA_KEY);
  if (!text) return createInitialData();
  try {
    return normalizeData(JSON.parse(text));
  } catch {
    return createInitialData();
  }
}

function loadSettings() {
  const text = safeGetItem(SETTINGS_KEY);
  if (!text) return { ...DEFAULT_SETTINGS };
  try {
    return normalizeSettings(JSON.parse(text));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/* ────────────────────────────── State ────────────────────────────── */
const initialDate = todayISO();

const state = {
  data: loadData(),
  settings: loadSettings(),
  selectedDate: initialDate,
  selectedTags: new Set(),
  editingActivityId: null,
  calCursor: firstOfMonth(initialDate),
  diaryMode: 'preview',
  generating: false,
  timedOut: false,
  abortController: null,
  progressTimer: null,
  persistTimer: null,
  storageWarned: false,
};

/* ────────────────────────────── Data helpers ────────────────────────────── */
function persistData() {
  if (state.persistTimer) {
    clearTimeout(state.persistTimer);
    state.persistTimer = null;
  }
  const ok = safeSetItem(DATA_KEY, JSON.stringify(state.data));
  if (ok) {
    state.storageWarned = false;
  } else if (!state.storageWarned) {
    state.storageWarned = true;
    toast('本地存储写入失败：空间可能已满，请先导出备份', 'error');
  }
  updateStorageIndicator(ok);
  return ok;
}

function persistDataSoon() {
  if (state.persistTimer) clearTimeout(state.persistTimer);
  state.persistTimer = setTimeout(() => {
    state.persistTimer = null;
    persistData();
  }, 260);
}

function persistSettings() {
  return safeSetItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function updateStorageIndicator(ok) {
  const dot = $('#storageDot');
  const label = $('#storageState');
  if (!dot || !label) return;
  if (ok === false || state.storageWarned) {
    dot.classList.add('bad');
    label.textContent = '本地存储不可用';
  } else {
    dot.classList.remove('bad');
    label.textContent = '本地存储 · 自动保存';
  }
}

function activitiesFor(date) {
  return state.data.activities
    .filter((activity) => activity.date === date)
    .sort((a, b) => {
      const diff = minutesOf(a.time) - minutesOf(b.time);
      if (diff !== 0) return diff;
      return String(a.createdAt).localeCompare(String(b.createdAt));
    });
}

function findTag(id) {
  return state.data.tags.find((tag) => tag.id === id)
    || state.data.archivedTags.find((tag) => tag.id === id)
    || null;
}

function tagName(id) {
  const tag = findTag(id);
  return tag ? tag.name : '未知标签';
}

function tagMeta(id) {
  const tag = findTag(id);
  if (tag) {
    return {
      id,
      name: tag.name,
      emoji: tag.emoji || '',
      color: normalizeColor(tag.color),
      archived: state.data.archivedTags.some((item) => item.id === id),
    };
  }
  return { id, name: '未知标签', emoji: '', color: '#5a6370', archived: true };
}

function usageCount(tagId) {
  return state.data.activities.filter((activity) => activity.tags.includes(tagId)).length;
}

function daySignature(date) {
  const list = activitiesFor(date);
  return JSON.stringify(list.map((activity) => [
    activity.id,
    activity.time,
    [...activity.tags].sort().map((id) => tagMeta(id).name).join('|'),
    activity.note,
  ]));
}

function getDiary(date) {
  return state.data.diaries[date] || null;
}

function ensureDiary(date) {
  if (!state.data.diaries[date]) {
    state.data.diaries[date] = {
      content: '',
      generatedAt: '',
      updatedAt: '',
      model: '',
    };
  }
  return state.data.diaries[date];
}

function diaryText(diary) {
  if (!diary) return '';
  if (typeof diary.draft === 'string') return diary.draft;
  return diary.content || '';
}

function diaryIsDirty(diary) {
  return !!diary
    && typeof diary.draft === 'string'
    && diary.draft !== (diary.content || '');
}

function diaryHasText(diary) {
  return diaryText(diary).trim().length > 0;
}

function diaryIsStale(diary, date) {
  if (!diary || !diaryHasText(diary)) return false;
  if (typeof diary.signature !== 'string' || !diary.signature) return false;
  return diary.signature !== daySignature(date);
}

/* ────────────────────────────── Toast ────────────────────────────── */
let toastTimer = null;
function toast(message, type) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.className = `toast show ${type || 'info'}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, type === 'error' ? 5200 : 3200);
}

/* ────────────────────────────── Rendering ────────────────────────────── */
function renderAll() {
  renderHeader();
  renderTagPicker();
  renderTimeline();
  renderStats();
  renderCalendar();
  renderDiary();
  updateArchiveCount();
  syncComposer();
}

function renderHeader() {
  const date = parseISO(state.selectedDate);
  const dateMain = $('#dateTitleText');
  if (dateMain) dateMain.textContent = `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
  const week = $('#dateWeekday');
  if (week) week.textContent = weekdayCN(state.selectedDate);
  const input = $('#dateInput');
  if (input) input.value = state.selectedDate;
  const todayChip = $('#todayChip');
  if (todayChip) todayChip.classList.toggle('hidden', state.selectedDate === todayISO());
}

function tagPickerButton(tag) {
  const selected = state.selectedTags.has(tag.id);
  return `<button type="button" class="tag-pick${selected ? ' selected' : ''}"
    data-tag-id="${escapeHtml(tag.id)}"
    aria-pressed="${selected ? 'true' : 'false'}"
    style="--tag-color:${tag.color};--tag-bg:${hexToRgba(tag.color, 0.14)}">
    <span class="tag-dot"></span>
    <span class="tag-emoji">${escapeHtml(tag.emoji || '✦')}</span>
    <span>${escapeHtml(tag.name)}</span>
  </button>`;
}

function renderTagPicker() {
  const picker = $('#tagPicker');
  if (!picker) return;
  if (!state.data.tags.length) {
    picker.innerHTML = `<div class="tag-picker-empty">
      <span>还没有标签，先创建第一个标签。</span>
      <button type="button" class="mini-btn accent" data-empty-add>新建标签</button>
    </div>`;
    return;
  }
  picker.innerHTML = state.data.tags.map(tagPickerButton).join('');
}

function renderComposerSelection() {
  const count = state.selectedTags.size;
  const el = $('#selectionCount');
  if (el) {
    el.textContent = count ? `${count} 个标签已选` : '至少选择 1 个标签';
    el.classList.toggle('on', count > 0);
  }
}

function syncComposer() {
  const editing = !!state.editingActivityId;
  const label = $('#saveActivityLabel');
  if (label) label.textContent = editing ? '更新活动' : '保存活动';
  const cancel = $('#cancelEditBtn');
  if (cancel) cancel.classList.toggle('hidden', !editing);
  const hint = $('#editModeHint');
  if (hint) hint.textContent = editing ? '正在编辑已保存的活动' : '';
  renderComposerSelection();
}

function tagChips(ids) {
  if (!ids.length) return '<span class="tag-chip-sm archived">无标签</span>';
  return ids.map((id) => {
    const tag = tagMeta(id);
    return `<span class="tag-chip-sm${tag.archived ? ' archived' : ''}" style="--tag-color:${tag.color}">
      ${tag.emoji ? `${escapeHtml(tag.emoji)} ` : ''}${escapeHtml(tag.name)}
    </span>`;
  }).join('');
}

function activityCard(activity) {
  const tags = activity.tags.map(tagMeta);
  const primary = tags[0] || { color: '#5a6370' };
  const note = activity.note
    ? `<p class="activity-note">${escapeHtml(activity.note)}</p>`
    : '';
  return `<article class="activity" data-activity-id="${escapeHtml(activity.id)}" style="--tag-color:${primary.color}">
    <div class="activity-time">${escapeHtml(activity.time)}</div>
    <div class="activity-body">
      <div class="activity-tags">${tagChips(activity.tags)}</div>
      ${note}
    </div>
    <div class="activity-actions">
      <button type="button" class="icon-btn" data-action="edit" title="编辑活动" aria-label="编辑活动">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
      </button>
      <button type="button" class="icon-btn danger" data-action="delete" title="删除活动" aria-label="删除活动">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></svg>
      </button>
    </div>
  </article>`;
}

function renderTimeline() {
  const wrap = $('#timeline');
  if (!wrap) return;
  const activities = activitiesFor(state.selectedDate);
  const countEl = $('#timelineCount');
  if (countEl) countEl.textContent = activities.length ? `${activities.length} 条记录` : '';

  if (!activities.length) {
    wrap.innerHTML = `<div class="timeline-empty">
      <div class="empty-glyph">[ · · · ]</div>
      <p>这一天还没有活动记录。</p>
      <p>选一个标签，写下此刻正在做的事。</p>
    </div>`;
    return;
  }

  const groups = new Map(TIMELINE_GROUPS.map((group) => [group.key, []]));
  for (const activity of activities) {
    const hour = Number(activity.time.slice(0, 2));
    const group = TIMELINE_GROUPS.find((item) => hour >= item.from && hour < item.to) || TIMELINE_GROUPS[3];
    groups.get(group.key).push(activity);
  }

  wrap.innerHTML = TIMELINE_GROUPS.map((group) => {
    const list = groups.get(group.key);
    if (!list.length) return '';
    return `<div class="timeline-group">
      <div class="group-label"><span>${group.label}</span><span class="group-count">${pad2(list.length)}</span></div>
      ${list.map(activityCard).join('')}
    </div>`;
  }).join('');
}

function renderStats() {
  const activities = activitiesFor(state.selectedDate);
  const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
  };
  setText('#statActivities', String(activities.length));

  const counts = new Map();
  for (const activity of activities) {
    for (const id of activity.tags) counts.set(id, (counts.get(id) || 0) + 1);
  }
  setText('#statTags', String(counts.size));
  setText('#dayCounter', `${activities.length} ${activities.length === 1 ? 'entry' : 'entries'}`);

  if (activities.length) {
    const first = activities[0].time;
    const last = activities[activities.length - 1].time;
    setText('#statRange', first === last ? first : `${first}–${last}`);
  } else {
    setText('#statRange', '—');
  }

  const holder = $('#dayTagStats');
  if (!holder) return;
  if (!counts.size) {
    holder.innerHTML = '<div class="tag-stats-empty">// 暂无标签使用</div>';
    return;
  }
  const list = [...counts.entries()]
    .map(([id, count]) => ({ ...tagMeta(id), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
  const max = list[0].count;
  holder.innerHTML = list.slice(0, 6).map((tag) => `<div class="tag-stat">
    <span class="tag-stat-name" title="${escapeHtml(tag.name)}">${escapeHtml(tag.name)}</span>
    <span class="tag-stat-bar"><i style="width:${Math.max(10, Math.round((tag.count / max) * 100))}%;--tag-color:${tag.color}"></i></span>
    <span class="tag-stat-count">${tag.count}</span>
  </div>`).join('');
}

function activityColorsByDate() {
  const map = new Map();
  for (const activity of state.data.activities) {
    if (!map.has(activity.date)) map.set(activity.date, []);
    const colors = map.get(activity.date);
    for (const id of activity.tags) {
      const color = tagMeta(id).color;
      if (!colors.includes(color) && colors.length < 3) colors.push(color);
    }
  }
  return map;
}

function renderCalendar() {
  const grid = $('#calendarGrid');
  if (!grid) return;
  const year = state.calCursor.getFullYear();
  const month = state.calCursor.getMonth();
  const title = $('#calTitle');
  if (title) title.textContent = `${year} 年 ${month + 1} 月`;

  const first = new Date(year, month, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);
  const colorsByDate = activityColorsByDate();
  const diaryDates = new Set(savedDiaries().map(([date]) => date));
  const today = todayISO();

  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = toISO(d);
    const outside = d.getMonth() !== month;
    const colors = colorsByDate.get(iso) || [];
    const classes = ['cal-day'];
    if (outside) classes.push('out');
    if (iso === today) classes.push('today');
    if (iso === state.selectedDate) classes.push('selected');
    const hasDiary = diaryDates.has(iso);
    const diaryDot = hasDiary ? '<i class="dot diary-dot" style="--dot-color:var(--green)"></i>' : '';
    const dots = diaryDot + colors.map((color) => `<i class="dot" style="--dot-color:${color}"></i>`).join('');
    const label = `${iso} ${weekdayCN(iso)}${hasDiary ? ' · 有日志' : ''}`;
    cells.push(`<button type="button" class="${classes.join(' ')}" data-date="${iso}"
      role="gridcell" aria-label="${label}"${iso === state.selectedDate ? ' aria-selected="true"' : ''}>
      <span>${d.getDate()}</span>
      ${(colors.length || hasDiary) ? `<span class="dot-row">${dots}</span>` : ''}
    </button>`);
  }
  grid.innerHTML = cells.join('');
}

function generateButtonLabel(hasText) {
  if (hasText) return '重新生成日志';
  return state.selectedDate === todayISO()
    ? 'AI 生成今日日志'
    : `AI 生成 ${fmtDateShort(state.selectedDate)} 日志`;
}

function renderDiary() {
  const diary = getDiary(state.selectedDate);
  const text = diaryText(diary);
  const hasText = text.trim().length > 0;
  const dirty = diaryIsDirty(diary);
  const saved = !!diary && (diary.content || '').trim().length > 0;

  const empty = $('#diaryEmpty');
  const modeBar = $('#diaryModeBar');
  const preview = $('#diaryPreview');
  const editorWrap = $('#diaryEditorWrap');
  const editor = $('#diaryEditor');
  const dirtyBanner = $('#diaryDirtyBanner');
  const copyBtn = $('#copyDiaryBtn');
  const stale = $('#diaryStale');

  const showEditor = state.diaryMode === 'edit';
  if (empty) empty.classList.toggle('hidden', hasText || dirty || showEditor);
  if (modeBar) modeBar.classList.toggle('hidden', !hasText && !dirty && !showEditor);
  if (copyBtn) copyBtn.classList.toggle('hidden', !hasText);

  const tabs = $$('.diary-tabs button');
  tabs.forEach((button) => {
    const active = button.dataset.mode === state.diaryMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  if (editor) editor.value = text;

  if (preview) {
    preview.classList.toggle('hidden', showEditor || !hasText);
    if (!showEditor && hasText) preview.innerHTML = renderMarkdown(text);
  }
  if (editorWrap) editorWrap.classList.toggle('hidden', !showEditor);
  if (dirtyBanner) dirtyBanner.classList.toggle('hidden', !dirty || showEditor);

  const wordCount = $('#diaryWordCount');
  if (wordCount) wordCount.textContent = hasText ? `${countChars(text)} 字` : '';

  const status = $('#aiStatus');
  if (status) {
    let label = '未生成';
    let cls = 'is-empty';
    if (hasText && dirty) {
      label = '草稿';
      cls = 'is-draft';
    } else if (saved) {
      label = '已保存';
      cls = 'is-saved';
    } else if (hasText) {
      label = '草稿';
      cls = 'is-draft';
    }
    status.textContent = label;
    status.className = `badge ${cls}`;
  }

  const model = $('#aiModelLabel');
  if (model) model.textContent = (diary && diary.model) || state.settings.model;
  const updated = $('#aiUpdated');
  if (updated) {
    if (diary && diary.updatedAt) updated.textContent = `已保存 ${fmtDateTime(diary.updatedAt)}`;
    else if (diary && diary.generatedAt) updated.textContent = `生成 ${fmtDateTime(diary.generatedAt)}`;
    else updated.textContent = '';
  }

  const dirtyHint = $('#diaryDirtyHint');
  if (dirtyHint) {
    dirtyHint.textContent = dirty ? '未保存 · 已自动暂存' : (saved ? '已保存' : '');
    dirtyHint.classList.toggle('on', dirty);
  }

  const genLabel = $('#generateLabel');
  if (genLabel && !state.generating) genLabel.textContent = generateButtonLabel(hasText || saved);
  const title = $('#diaryTitle');
  if (title) title.textContent = state.selectedDate === todayISO() ? '今日日志' : `${fmtDateShort(state.selectedDate)} 日志`;

  if (stale) stale.classList.toggle('hidden', !diaryIsStale(diary, state.selectedDate));
}

/* ────────────────────────────── Diary archive ────────────────────────────── */
function savedDiaries() {
  if (!state.data.diaries) return [];
  return Object.entries(state.data.diaries)
    .filter(([, diary]) => diary && String(diary.content || '').trim())
    .sort((a, b) => b[0].localeCompare(a[0]));
}

function diaryTitleText(diary) {
  const line = String((diary && diary.content) || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find(Boolean) || '';
  return line.replace(/^#{1,6}\s+/, '').replace(/^[-*+]\s+/, '').trim() || '未命名日志';
}

function updateArchiveCount() {
  const el = $('#archiveCount');
  if (!el) return;
  const count = savedDiaries().length;
  el.textContent = String(count);
  el.classList.toggle('on', count > 0);
}

function renderArchive() {
  const list = $('#archiveList');
  if (!list) return;
  const entries = savedDiaries();
  if (!entries.length) {
    list.innerHTML = '<div class="archive-empty"><strong>还没有保存的日志</strong>记录几条活动，再让 AI 写一篇，或者手动写一篇。</div>';
    return;
  }
  list.innerHTML = entries.map(([date, diary]) => {
    const title = escapeHtml(diaryTitleText(diary));
    const meta = diary.updatedAt ? `已保存 ${escapeHtml(fmtDateTime(diary.updatedAt))}` : '';
    return `<button type="button" class="archive-item" data-archive-date="${date}">
      <span class="archive-date">${date.replaceAll('-', '.')} · ${weekdayCN(date)}</span>
      <span class="archive-title">${title}</span>
      <span class="archive-meta">${countChars(diary.content)} 字${meta ? ` · ${meta}` : ''}</span>
    </button>`;
  }).join('');
}

function openArchive() {
  renderArchive();
  openModal('archiveModal');
}

function updateDiaryIndicators() {
  const diary = getDiary(state.selectedDate);
  const text = diaryText(diary);
  const hasText = text.trim().length > 0;
  const dirty = diaryIsDirty(diary);
  const saved = !!diary && (diary.content || '').trim().length > 0;

  const status = $('#aiStatus');
  if (status) {
    const label = dirty || (hasText && !saved) ? '草稿' : (saved ? '已保存' : '未生成');
    status.textContent = label;
    status.className = `badge ${label === '已保存' ? 'is-saved' : label === '草稿' ? 'is-draft' : 'is-empty'}`;
  }
  const dirtyHint = $('#diaryDirtyHint');
  if (dirtyHint) {
    dirtyHint.textContent = dirty ? '未保存 · 已自动暂存' : (saved ? '已保存' : '');
    dirtyHint.classList.toggle('on', dirty);
  }
  const wordCount = $('#diaryWordCount');
  if (wordCount) wordCount.textContent = hasText ? `${countChars(text)} 字` : '';
  const modeBar = $('#diaryModeBar');
  if (modeBar) modeBar.classList.toggle('hidden', !hasText && !dirty && state.diaryMode !== 'edit');
  const copyBtn = $('#copyDiaryBtn');
  if (copyBtn) copyBtn.classList.toggle('hidden', !hasText);
  const genLabel = $('#generateLabel');
  if (genLabel && !state.generating) genLabel.textContent = generateButtonLabel(hasText || saved);
  const title = $('#diaryTitle');
  if (title) title.textContent = state.selectedDate === todayISO() ? '今日日志' : `${fmtDateShort(state.selectedDate)} 日志`;
  const stale = $('#diaryStale');
  if (stale) stale.classList.toggle('hidden', !diaryIsStale(diary, state.selectedDate));
}

/* ────────────────────────────── Composer actions ────────────────────────────── */
function toggleTag(tagId) {
  if (!state.data.tags.some((tag) => tag.id === tagId)) return;
  if (state.selectedTags.has(tagId)) state.selectedTags.delete(tagId);
  else state.selectedTags.add(tagId);
  renderTagPicker();
  renderComposerSelection();
}

function resetComposer(options) {
  state.selectedTags.clear();
  state.editingActivityId = null;
  const note = $('#activityNote');
  if (note) note.value = '';
  const count = $('#noteCount');
  if (count) count.textContent = '0 / 300';
  const time = $('#activityTime');
  if (time) time.value = nowTime();
  if (!options || !options.keepTime) {
    if (time) time.value = nowTime();
  }
  renderTagPicker();
  syncComposer();
}

function cancelEdit() {
  if (!state.editingActivityId) return;
  resetComposer();
}

function saveActivity() {
  if (!state.data.tags.length) {
    toast('请先创建并选择至少一个标签', 'error');
    openTagsModal();
    return;
  }
  if (!state.selectedTags.size) {
    toast('请先选择至少一个标签', 'error');
    return;
  }

  const time = normalizeTime($('#activityTime').value) || nowTime();
  const note = $('#activityNote').value.trim().slice(0, 300);

  if (state.editingActivityId) {
    const activity = state.data.activities.find((item) => item.id === state.editingActivityId);
    if (!activity) {
      toast('这条活动已经不存在了', 'error');
      resetComposer();
      renderAll();
      return;
    }
    activity.time = time;
    activity.tags = [...state.selectedTags];
    activity.note = note;
    activity.updatedAt = new Date().toISOString();
    persistData();
    resetComposer();
    renderAll();
    toast('活动已更新', 'success');
    return;
  }

  state.data.activities.push({
    id: uid('act'),
    date: state.selectedDate,
    time,
    tags: [...state.selectedTags],
    note,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  persistData();
  resetComposer();
  renderAll();
  toast('活动已保存', 'success');
}

function startEditActivity(id) {
  const activity = state.data.activities.find((item) => item.id === id);
  if (!activity) return;
  state.editingActivityId = id;
  state.selectedTags = new Set(activity.tags.filter((tagId) => state.data.tags.some((tag) => tag.id === tagId)));
  const time = $('#activityTime');
  if (time) time.value = activity.time;
  const note = $('#activityNote');
  if (note) note.value = activity.note || '';
  const count = $('#noteCount');
  if (count) count.textContent = `${note ? note.value.length : 0} / 300`;
  renderTagPicker();
  syncComposer();
  const composer = $('#composer');
  if (composer) {
    composer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      const rect = composer.getBoundingClientRect();
      if (rect.top < 68) window.scrollBy({ top: rect.top - 68, behavior: 'smooth' });
    }, 260);
  }
}

function deleteActivity(id) {
  const activity = state.data.activities.find((item) => item.id === id);
  if (!activity) return;
  const preview = activity.note ? `“${activity.note.slice(0, 28)}${activity.note.length > 28 ? '…' : ''}”` : activity.tags.map(tagName).join('、');
  if (!window.confirm(`删除 ${activity.time} 的这条活动？\n${preview}`)) return;
  state.data.activities = state.data.activities.filter((item) => item.id !== id);
  if (state.editingActivityId === id) resetComposer();
  persistData();
  renderAll();
  toast('活动已删除', 'info');
}

/* ────────────────────────────── Date navigation ────────────────────────────── */
function closeMobilePanels() {
  const sidebar = $('.sidebar');
  if (!sidebar || !sidebar.classList.contains('mobile-open')) return;
  sidebar.classList.remove('mobile-open');
  const button = $('#mobilePanelsBtn');
  if (button) button.textContent = '日历 / 概览';
}

function selectDate(iso) {
  if (!isISODate(iso)) return;
  closeMobilePanels();
  if (iso === state.selectedDate) return;
  state.selectedDate = iso;
  state.calCursor = firstOfMonth(iso);
  state.diaryMode = 'preview';
  state.selectedTags.clear();
  state.editingActivityId = null;
  const note = $('#activityNote');
  if (note) note.value = '';
  const time = $('#activityTime');
  if (time) time.value = nowTime();
  renderAll();
}

/* ────────────────────────────── Diary actions ────────────────────────────── */
function switchDiaryMode(mode) {
  state.diaryMode = mode === 'edit' ? 'edit' : 'preview';
  renderDiary();
}

function startManualDiary() {
  const diary = ensureDiary(state.selectedDate);
  if (typeof diary.draft !== 'string') diary.draft = diary.content || '';
  state.diaryMode = 'edit';
  renderDiary();
  const editor = $('#diaryEditor');
  if (editor) {
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
  }
}

function onDiaryInput() {
  const editor = $('#diaryEditor');
  if (!editor) return;
  const value = editor.value;
  const diary = ensureDiary(state.selectedDate);
  diary.draft = value;
  persistDataSoon();
  updateDiaryIndicators();
}

function saveDiary() {
  const editor = $('#diaryEditor');
  if (!editor) return;
  const content = editor.value.trim();
  if (!content) {
    toast('日志内容为空，无法保存', 'error');
    return;
  }
  const diary = ensureDiary(state.selectedDate);
  diary.content = content;
  delete diary.draft;
  diary.updatedAt = new Date().toISOString();
  diary.signature = daySignature(state.selectedDate);
  persistData();
  state.diaryMode = 'preview';
  renderDiary();
  renderStats();
  renderCalendar();
  updateArchiveCount();
  toast('日志已保存', 'success');
}

function deleteDiary() {
  const diary = getDiary(state.selectedDate);
  if (!diary) return;
  if (!window.confirm('删除这一天的日志？\n删除后无法恢复。')) return;
  delete state.data.diaries[state.selectedDate];
  persistData();
  state.diaryMode = 'preview';
  renderDiary();
  renderCalendar();
  updateArchiveCount();
  toast('日志已删除', 'info');
}

function discardDiaryChanges() {
  const diary = getDiary(state.selectedDate);
  if (!diary) return;
  if (diaryIsDirty(diary) && !window.confirm('放弃未保存的修改？')) return;
  if ((diary.content || '').trim()) {
    delete diary.draft;
  } else {
    delete state.data.diaries[state.selectedDate];
  }
  persistData();
  state.diaryMode = 'preview';
  renderDiary();
  toast('已还原', 'info');
}

function copyDiary() {
  const diary = getDiary(state.selectedDate);
  const text = diaryText(diary).trim();
  if (!text) return;
  const done = () => toast('日志已复制到剪贴板', 'success');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const temp = document.createElement('textarea');
  temp.value = text;
  temp.style.position = 'fixed';
  temp.style.opacity = '0';
  document.body.appendChild(temp);
  temp.select();
  try {
    document.execCommand('copy');
    done();
  } catch {
    toast('复制失败，请手动选择文本', 'error');
  }
  temp.remove();
}

/* ────────────────────────────── DeepSeek ────────────────────────────── */
function chatEndpoint(baseUrl) {
  let base = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) base = DEFAULT_SETTINGS.baseUrl;
  if (/\/chat\/completions$/i.test(base)) return base;
  return `${base}/chat/completions`;
}

function modelsEndpoint(baseUrl) {
  let base = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) base = DEFAULT_SETTINGS.baseUrl;
  base = base.replace(/\/chat\/completions$/i, '');
  return `${base}/models`;
}

function buildPrompt(date, activities) {
  const tagSet = new Set();
  for (const activity of activities) {
    for (const id of activity.tags) tagSet.add(tagName(id));
  }
  const tagList = [...tagSet];
  const lines = activities.map((activity) => {
    const tags = activity.tags.map((id) => `[${tagName(id)}]`).join('');
    return `- ${activity.time} ${tags} ${activity.note || '（无备注）'}`;
  });
  const user = [
    `日期：${date} ${weekdayCN(date)}`,
    `当天共 ${activities.length} 条活动，涉及标签：${tagList.join('、') || '无'}`,
    '',
    '活动记录：',
    ...lines,
  ].join('\n');
  return { system: SYSTEM_PROMPT, user };
}

async function readApiError(response) {
  let body = '';
  try {
    body = await response.text();
  } catch {
    return '';
  }
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message || parsed?.message || body;
  } catch {
    return body.slice(0, 300);
  }
}

function apiErrorMessage(status, detail) {
  const suffix = detail ? `：${String(detail).slice(0, 180)}` : '';
  if (status === 401) return `API Key 无效或已过期，请在设置中检查${suffix}`;
  if (status === 402) return 'DeepSeek 账户余额不足，请充值后重试';
  if (status === 403) return `没有访问权限${suffix}`;
  if (status === 404) return `接口地址不存在，请检查“API 地址”设置${suffix}`;
  if (status === 429) return '请求过于频繁或达到限额，请稍后再试';
  if (status >= 500) return `DeepSeek 服务暂时不可用（${status}），请稍后重试`;
  return `请求失败（${status}）${suffix}`;
}

function setProgressVisible(visible) {
  const progress = $('#aiProgress');
  if (progress) progress.classList.toggle('hidden', !visible);
}

function startProgress() {
  const start = Date.now();
  const phases = [
    '正在读取当天的活动记录…',
    'DeepSeek 正在组织这一天的叙事…',
    '正在把标签与备注织成文字…',
    '快好了，正在润色…',
  ];
  setProgressVisible(true);
  const tick = () => {
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const phase = phases[Math.min(phases.length - 1, Math.floor(elapsed / 7))];
    const el = $('#aiProgressText');
    if (el) el.textContent = `${phase} ${elapsed}s`;
  };
  tick();
  state.progressTimer = setInterval(tick, 1000);
}

function stopProgress() {
  if (state.progressTimer) {
    clearInterval(state.progressTimer);
    state.progressTimer = null;
  }
  setProgressVisible(false);
}

function setGenerating(on) {
  state.generating = on;
  const button = $('#generateBtn');
  const label = $('#generateLabel');
  if (button) {
    button.classList.toggle('stopping', on);
    button.disabled = false;
  }
  if (label) label.textContent = on ? '停止生成' : 'AI 生成今日日志';
  if (!on) {
    stopProgress();
    renderDiary();
  }
}

async function generateDiary() {
  if (state.generating) {
    state.timedOut = false;
    if (state.abortController) state.abortController.abort();
    return;
  }

  const date = state.selectedDate;
  const activities = activitiesFor(date);
  if (!activities.length) {
    toast('当天还没有活动记录，先记录几条再生成', 'error');
    return;
  }
  if (!state.settings.apiKey) {
    openSettingsModal();
    setTimeout(() => {
      const keyInput = $('#apiKeyInput');
      if (keyInput) keyInput.focus();
    }, 120);
    toast('请先在设置中填写 DeepSeek API Key', 'error');
    return;
  }

  const existing = getDiary(date);
  if (existing && diaryHasText(existing) && !window.confirm('将用新生成的内容覆盖当前的日志草稿，继续？')) {
    return;
  }

  const { system, user } = buildPrompt(date, activities);
  const controller = new AbortController();
  state.abortController = controller;
  state.timedOut = false;
  setGenerating(true);
  startProgress();

  let timeoutId = null;
  timeoutId = setTimeout(() => {
    state.timedOut = true;
    controller.abort();
  }, 120000);

  try {
    const response = await fetch(chatEndpoint(state.settings.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.settings.apiKey}`,
      },
      body: JSON.stringify({
        model: state.settings.model || DEFAULT_SETTINGS.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.8,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await readApiError(response);
      throw new Error(apiErrorMessage(response.status, detail));
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('DeepSeek 返回了空内容，请重试');
    }

    const diary = ensureDiary(date);
    diary.draft = content.trim();
    diary.generatedAt = new Date().toISOString();
    diary.model = state.settings.model || DEFAULT_SETTINGS.model;
    diary.signature = daySignature(date);
    persistData();
    state.diaryMode = 'edit';
    setGenerating(false);
    toast('生成完成，请检查并保存', 'success');
  } catch (error) {
    const aborted = error && error.name === 'AbortError';
    if (aborted && state.timedOut) {
      toast('生成超时（120 秒），请检查网络后重试', 'error');
    } else if (aborted) {
      toast('已停止生成', 'info');
    } else if (error instanceof TypeError) {
      toast('网络请求失败：请检查网络/代理，或确认 API 地址允许浏览器跨域访问', 'error');
    } else {
      toast(error?.message || '生成失败，请稍后重试', 'error');
    }
    setGenerating(false);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    state.abortController = null;
    state.timedOut = false;
  }
}

/* ────────────────────────────── Settings modal ────────────────────────────── */
function openModal(id) {
  $$('.modal-mask').forEach((mask) => {
    if (mask.id !== id) mask.classList.add('hidden');
  });
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
  if (!$$('.modal-mask').some((mask) => !mask.classList.contains('hidden'))) {
    document.body.style.overflow = '';
  }
}

function closeAllModals() {
  $$('.modal-mask').forEach((mask) => mask.classList.add('hidden'));
  document.body.style.overflow = '';
}

function renderStorageInfo() {
  const el = $('#storageInfo');
  if (!el) return;
  const bytes = storageBytes(state.data) + storageBytes(state.settings);
  const diaryCount = state.data.diaries ? Object.keys(state.data.diaries).length : 0;
  const warning = bytes > 4.5 * 1024 * 1024 ? ' · 接近浏览器上限，建议备份' : '';
  el.textContent = `${formatBytes(bytes)} · ${state.data.activities.length} 条活动 · ${diaryCount} 篇日志${warning}`;
}

function openSettingsModal() {
  const keyInput = $('#apiKeyInput');
  const modelInput = $('#modelInput');
  const baseInput = $('#baseUrlInput');
  if (keyInput) {
    keyInput.value = state.settings.apiKey;
    keyInput.type = 'password';
  }
  const toggle = $('#toggleKeyBtn');
  if (toggle) toggle.textContent = '显示';
  if (modelInput) modelInput.value = state.settings.model;
  if (baseInput) baseInput.value = state.settings.baseUrl;
  const status = $('#testApiStatus');
  if (status) {
    status.textContent = '';
    status.className = 'test-status';
  }
  renderStorageInfo();
  openModal('settingsModal');
}

function saveSettings() {
  const key = $('#apiKeyInput')?.value.trim() || '';
  const model = $('#modelInput')?.value.trim() || DEFAULT_SETTINGS.model;
  let baseUrl = $('#baseUrlInput')?.value.trim() || DEFAULT_SETTINGS.baseUrl;
  if (!/^https?:\/\//i.test(baseUrl)) {
    toast('API 地址需要以 http:// 或 https:// 开头', 'error');
    return;
  }
  baseUrl = baseUrl.replace(/\/+$/, '');
  state.settings = { apiKey: key, model, baseUrl };
  const ok = persistSettings();
  if (!ok) toast('设置保存失败：浏览器存储不可用', 'error');
  else toast('设置已保存', 'success');
  closeModal('settingsModal');
  renderDiary();
}

async function testApiConnection() {
  const key = $('#apiKeyInput')?.value.trim() || '';
  const baseUrl = $('#baseUrlInput')?.value.trim() || DEFAULT_SETTINGS.baseUrl;
  const status = $('#testApiStatus');
  const button = $('#testApiBtn');
  if (!key) {
    if (status) {
      status.textContent = '请先填写 API Key';
      status.className = 'test-status bad';
    }
    return;
  }
  if (button) {
    button.disabled = true;
    button.textContent = '测试中…';
  }
  if (status) {
    status.textContent = '';
    status.className = 'test-status';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(modelsEndpoint(baseUrl), {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await readApiError(response);
      throw new Error(apiErrorMessage(response.status, detail));
    }
    let count = '';
    try {
      const payload = await response.json();
      if (Array.isArray(payload?.data)) count = ` · ${payload.data.length} 个模型`;
    } catch { /* models response shape is optional */ }
    if (status) {
      status.textContent = `连接成功${count}`;
      status.className = 'test-status ok';
    }
  } catch (error) {
    let message = error?.message || '连接失败';
    if (error?.name === 'AbortError') message = '连接超时，请检查网络或 API 地址';
    else if (error instanceof TypeError) message = '网络请求失败：可能是网络/代理问题，或该地址不允许浏览器跨域';
    if (status) {
      status.textContent = message;
      status.className = 'test-status bad';
    }
  } finally {
    clearTimeout(timeout);
    if (button) {
      button.disabled = false;
      button.textContent = '测试连接';
    }
  }
}

/* ────────────────────────────── Tags modal ────────────────────────────── */
function renderPalette() {
  const palette = $('#newTagPalette');
  if (!palette) return;
  const current = normalizeColor($('#newTagColor')?.value || PALETTE[0]);
  palette.innerHTML = PALETTE.map((color) => `<button type="button"
    class="${color === current ? 'active' : ''}" data-color="${color}"
    aria-label="选择颜色 ${color}" style="--swatch:${color}"></button>`).join('');
}

function renderTagsModal() {
  const list = $('#tagManageList');
  if (!list) return;

  if (!state.data.tags.length) {
    list.innerHTML = '<p class="modal-desc">还没有标签，在下面创建第一个。</p>';
  } else {
    list.innerHTML = state.data.tags.map((tag) => `<div class="tag-manage-row" data-tag-id="${escapeHtml(tag.id)}">
      <input class="input input-emoji" data-field="emoji" type="text" value="${escapeHtml(tag.emoji || '✦')}" maxlength="4" aria-label="图标">
      <input class="input" data-field="name" type="text" value="${escapeHtml(tag.name)}" maxlength="12" aria-label="标签名称">
      <span class="tag-usage">${usageCount(tag.id)} 次</span>
      <input class="color-input" data-field="color" type="color" value="${tag.color}" aria-label="标签颜色">
      <button class="icon-btn danger" data-tag-action="delete" title="删除标签" aria-label="删除标签">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></svg>
      </button>
    </div>`).join('');
  }

  const archivedSection = $('#archivedSection');
  const archivedList = $('#archivedList');
  if (archivedSection && archivedList) {
    const archived = state.data.archivedTags;
    archivedSection.classList.toggle('hidden', !archived.length);
    archivedList.innerHTML = archived.map((tag) => `<span class="archived-item" style="--tag-color:${tag.color}">
      <i class="tag-dot"></i>
      ${escapeHtml(tag.name)}
      <button type="button" data-restore-id="${escapeHtml(tag.id)}">恢复</button>
    </span>`).join('');
  }
  renderPalette();
}

function openTagsModal() {
  renderTagsModal();
  openModal('tagsModal');
}

function addTag() {
  const nameInput = $('#newTagName');
  const emojiInput = $('#newTagEmoji');
  const colorInput = $('#newTagColor');
  const name = nameInput?.value.trim() || '';
  if (!name) {
    toast('请输入标签名称', 'error');
    nameInput?.focus();
    return;
  }
  if (state.data.tags.some((tag) => tag.name === name)) {
    toast('已经有同名标签了', 'error');
    return;
  }
  state.data.tags.push(makeTag({
    name,
    emoji: (emojiInput?.value.trim() || '✦').slice(0, 4),
    color: normalizeColor(colorInput?.value || PALETTE[0]),
  }));
  persistData();
  if (nameInput) nameInput.value = '';
  renderTagsModal();
  renderTagPicker();
  renderTimeline();
  renderStats();
  renderCalendar();
  renderDiary();
  toast(`标签「${name}」已创建`, 'success');
  nameInput?.focus();
}

function deleteTag(tagId) {
  const tag = state.data.tags.find((item) => item.id === tagId);
  if (!tag) return;
  if (!window.confirm(`删除标签「${tag.name}」？\n历史活动中的标签名会保留为灰色存档。`)) return;
  state.data.tags = state.data.tags.filter((item) => item.id !== tagId);
  state.data.archivedTags.push({ ...tag, archivedAt: new Date().toISOString() });
  state.selectedTags.delete(tagId);
  persistData();
  renderTagsModal();
  renderTagPicker();
  renderTimeline();
  renderStats();
  renderCalendar();
  renderDiary();
  toast(`标签「${tag.name}」已归档`, 'info');
}

function restoreTag(tagId) {
  const index = state.data.archivedTags.findIndex((item) => item.id === tagId);
  if (index < 0) return;
  const tag = state.data.archivedTags[index];
  if (state.data.tags.some((item) => item.name === tag.name)) {
    toast('已有同名标签，无法恢复', 'error');
    return;
  }
  state.data.archivedTags.splice(index, 1);
  delete tag.archivedAt;
  state.data.tags.push(tag);
  persistData();
  renderTagsModal();
  renderTagPicker();
  renderTimeline();
  renderStats();
  renderCalendar();
  toast(`标签「${tag.name}」已恢复`, 'success');
}

/* ────────────────────────────── Import / export ────────────────────────────── */
function exportBackup() {
  const payload = {
    app: 'tag-diary',
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: state.data,
  };
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
  downloadBlob(`tag-diary-backup-${stamp}.json`, JSON.stringify(payload, null, 2));
  toast('备份已导出（不包含 API Key）', 'success');
}

function triggerImport() {
  const input = $('#importFile');
  if (input) {
    input.value = '';
    input.click();
  }
}

async function handleImportFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const raw = parsed && parsed.data ? parsed.data : parsed;
    if (!raw || !Array.isArray(raw.tags) || !Array.isArray(raw.activities) || typeof raw.diaries !== 'object' || raw.diaries === null || Array.isArray(raw.diaries)) {
      throw new Error('文件格式不正确，需要由「标签日记」导出的备份 JSON');
    }
    if (!window.confirm(`导入备份将替换当前的标签、活动和日志。\n备份包含 ${raw.activities.length} 条活动。\n\n确定继续吗？`)) return;
    state.data = normalizeData(raw);
    state.selectedDate = todayISO();
    state.calCursor = firstOfMonth(state.selectedDate);
    state.selectedTags.clear();
    state.editingActivityId = null;
    state.diaryMode = 'preview';
    persistData();
    renderAll();
    closeAllModals();
    toast(`备份已导入：${state.data.activities.length} 条活动`, 'success');
  } catch (error) {
    toast(error?.message || '导入失败，文件可能已损坏', 'error');
  } finally {
    event.target.value = '';
  }
}

function clearAllData() {
  if (!window.confirm('确定清空全部标签、活动和日志吗？\n此操作不可恢复，建议先导出备份。')) return;
  const answer = window.prompt('请输入「清空」两个字以确认：');
  if (answer !== '清空') {
    toast('已取消', 'info');
    return;
  }
  state.data = createInitialData();
  state.selectedDate = todayISO();
  state.calCursor = firstOfMonth(state.selectedDate);
  state.selectedTags.clear();
  state.editingActivityId = null;
  state.diaryMode = 'preview';
  persistData();
  renderAll();
  closeAllModals();
  toast('数据已清空', 'info');
}

/* ────────────────────────────── Events ────────────────────────────── */
let activateTab = null;

function setupTabs() {
  const nav = $('.bottom-nav');
  const panels = $$('[data-panel]');
  if (!nav || !panels.length) return;

  const buttons = $$('.nav-item', nav);
  activateTab = (tab, options = {}) => {
    buttons.forEach((button) => {
      const on = button.dataset.tab === tab;
      button.classList.toggle('active', on);
      button.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach((panel) => {
      panel.classList.toggle('tab-active', panel.dataset.panel === tab);
    });
    if (options.scroll !== false) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  nav.addEventListener('click', (event) => {
    const button = event.target.closest('.nav-item');
    if (button) activateTab(button.dataset.tab);
  });

  const initial = buttons.find((button) => button.classList.contains('active'))?.dataset.tab || 'record';
  activateTab(initial, { scroll: false });
}

function bindEvents() {
  /* tag picker */
  $('#tagPicker')?.addEventListener('click', (event) => {
    const add = event.target.closest('[data-empty-add]');
    if (add) {
      openTagsModal();
      return;
    }
    const button = event.target.closest('[data-tag-id]');
    if (button) toggleTag(button.dataset.tagId);
  });
  $('#addTagInline')?.addEventListener('click', openTagsModal);
  $('#manageTagsBtn')?.addEventListener('click', openTagsModal);
  $('#archiveBtn')?.addEventListener('click', openArchive);
  $('#archiveList')?.addEventListener('click', (event) => {
    const item = event.target.closest('[data-archive-date]');
    if (!item) return;
    const date = item.dataset.archiveDate;
    closeModal('archiveModal');
    selectDate(date);
    activateTab?.('diary');
  });

  /* composer */
  $('#saveActivityBtn')?.addEventListener('click', saveActivity);
  $('#cancelEditBtn')?.addEventListener('click', () => {
    resetComposer();
    renderTagPicker();
  });
  $('#nowBtn')?.addEventListener('click', () => {
    const time = $('#activityTime');
    if (time) time.value = nowTime();
  });
  $('#activityNote')?.addEventListener('input', () => {
    const note = $('#activityNote');
    const count = $('#noteCount');
    if (note && count) count.textContent = `${note.value.length} / 300`;
  });
  $('#activityNote')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      saveActivity();
    }
  });

  /* timeline */
  $('#timeline')?.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]');
    if (!action) return;
    const card = action.closest('[data-activity-id]');
    if (!card) return;
    if (action.dataset.action === 'edit') startEditActivity(card.dataset.activityId);
    if (action.dataset.action === 'delete') deleteActivity(card.dataset.activityId);
  });

  /* date navigation */
  $('#prevDay')?.addEventListener('click', () => selectDate(shiftISO(state.selectedDate, -1)));
  $('#nextDay')?.addEventListener('click', () => selectDate(shiftISO(state.selectedDate, 1)));
  $('#todayBtn')?.addEventListener('click', () => selectDate(todayISO()));
  $('#todayChip')?.addEventListener('click', () => selectDate(todayISO()));
  $('#dateInput')?.addEventListener('change', (event) => selectDate(event.target.value));
  $('#mobilePanelsBtn')?.addEventListener('click', () => {
    const sidebar = $('.sidebar');
    if (!sidebar) return;
    const open = sidebar.classList.toggle('mobile-open');
    const button = $('#mobilePanelsBtn');
    if (button) button.textContent = open ? '收起面板' : '日历 / 概览';
    if (open) window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* calendar */
  $('#calPrev')?.addEventListener('click', () => {
    state.calCursor = new Date(state.calCursor.getFullYear(), state.calCursor.getMonth() - 1, 1);
    renderCalendar();
  });
  $('#calNext')?.addEventListener('click', () => {
    state.calCursor = new Date(state.calCursor.getFullYear(), state.calCursor.getMonth() + 1, 1);
    renderCalendar();
  });
  $('#calendarGrid')?.addEventListener('click', (event) => {
    const cell = event.target.closest('[data-date]');
    if (cell) selectDate(cell.dataset.date);
  });

  /* diary */
  $('#generateBtn')?.addEventListener('click', generateDiary);
  $('#staleRegenerateBtn')?.addEventListener('click', generateDiary);
  $('#manualDiaryBtn')?.addEventListener('click', startManualDiary);
  $('#saveDiaryBtn')?.addEventListener('click', saveDiary);
  $('#bannerSaveBtn')?.addEventListener('click', saveDiary);
  $('#bannerEditBtn')?.addEventListener('click', () => switchDiaryMode('edit'));
  $('#discardDiaryBtn')?.addEventListener('click', discardDiaryChanges);
  $('#deleteDiaryBtn')?.addEventListener('click', deleteDiary);
  $('#copyDiaryBtn')?.addEventListener('click', copyDiary);
  $('#diaryEditor')?.addEventListener('input', onDiaryInput);
  $('#diaryEditor')?.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && (event.key === 's' || event.key === 'Enter')) {
      event.preventDefault();
      saveDiary();
    }
  });
  $('.diary-tabs')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-mode]');
    if (button) switchDiaryMode(button.dataset.mode);
  });

  /* settings */
  $('#settingsBtn')?.addEventListener('click', openSettingsModal);
  $('#saveSettingsBtn')?.addEventListener('click', saveSettings);
  $('#testApiBtn')?.addEventListener('click', testApiConnection);
  $('#toggleKeyBtn')?.addEventListener('click', () => {
    const input = $('#apiKeyInput');
    const button = $('#toggleKeyBtn');
    if (!input || !button) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.textContent = show ? '隐藏' : '显示';
  });
  $('#clearKeyBtn')?.addEventListener('click', () => {
    const input = $('#apiKeyInput');
    if (input) input.value = '';
    const status = $('#testApiStatus');
    if (status) status.textContent = '保存设置后生效';
  });
  $('#exportBtn')?.addEventListener('click', exportBackup);
  $('#exportBtnSide')?.addEventListener('click', exportBackup);
  $('#importBtn')?.addEventListener('click', triggerImport);
  $('#importBtnSide')?.addEventListener('click', triggerImport);
  $('#clearDataBtn')?.addEventListener('click', clearAllData);
  $('#importFile')?.addEventListener('change', handleImportFile);

  /* tags modal */
  $('#addTagBtn')?.addEventListener('click', addTag);
  $('#newTagName')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') addTag();
  });
  $('#newTagPalette')?.addEventListener('click', (event) => {
    const swatch = event.target.closest('[data-color]');
    if (!swatch) return;
    const input = $('#newTagColor');
    if (input) input.value = swatch.dataset.color;
    renderPalette();
  });
  $('#tagManageList')?.addEventListener('click', (event) => {
    const del = event.target.closest('[data-tag-action="delete"]');
    if (!del) return;
    const row = del.closest('[data-tag-id]');
    if (row) deleteTag(row.dataset.tagId);
  });
  $('#tagManageList')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('input[data-field]')) {
      event.preventDefault();
      event.target.blur();
    }
  });
  $('#tagManageList')?.addEventListener('change', (event) => {
    const row = event.target.closest('[data-tag-id]');
    if (!row) return;
    const tag = state.data.tags.find((item) => item.id === row.dataset.tagId);
    if (!tag) return;
    const field = event.target.dataset.field;
    if (!field) return;
    let value = event.target.value;
    if (field === 'name') {
      value = value.trim();
      if (!value) {
        toast('标签名称不能为空', 'error');
        renderTagsModal();
        return;
      }
      if (state.data.tags.some((item) => item.id !== tag.id && item.name === value)) {
        toast('已经有同名标签了', 'error');
        renderTagsModal();
        return;
      }
      tag.name = value;
    } else if (field === 'emoji') {
      tag.emoji = String(value).trim().slice(0, 4) || '✦';
    } else if (field === 'color') {
      tag.color = normalizeColor(value, tag.color);
    }
    persistData();
    renderTagPicker();
    renderTimeline();
    renderStats();
    renderCalendar();
    renderDiary();
  });
  $('#archivedList')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-restore-id]');
    if (button) restoreTag(button.dataset.restoreId);
  });

  /* modals close */
  $$('[data-close]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.close === 'settings') closeModal('settingsModal');
      if (button.dataset.close === 'tags') closeModal('tagsModal');
      if (button.dataset.close === 'archive') closeModal('archiveModal');
    });
  });
  $$('.modal-mask').forEach((mask) => {
    mask.addEventListener('click', (event) => {
      if (event.target === mask) closeModal(mask.id);
    });
  });

  /* shortcuts */
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const visible = $$('.modal-mask').find((mask) => !mask.classList.contains('hidden'));
      if (visible) closeModal(visible.id);
    }
  });

  /* flush pending draft when page closes */
  window.addEventListener('beforeunload', () => {
    if (state.persistTimer) persistData();
  });
}

/* ────────────────────────────── Init ────────────────────────────── */
function setupBackToApp() {
  let from = '';
  try {
    from = new URLSearchParams(window.location.search).get('from') || '';
  } catch {
    return;
  }
  if (from !== 'mobile') return;
  const button = $('#backToAppBtn');
  if (!button) return;
  button.classList.remove('hidden');
  button.addEventListener('click', () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/';
  });
}

function init() {
  bindEvents();
  setupTabs();
  setupBackToApp();

  const diary = getDiary(state.selectedDate);
  if (diaryIsDirty(diary)) state.diaryMode = 'edit';

  const time = $('#activityTime');
  if (time) time.value = nowTime();

  renderAll();
  renderPalette();
  updateStorageIndicator(true);
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

init();
