// Локальное хранилище YPT-трекера: всё в localStorage, без сервера.

export interface Subject {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface ActiveSession {
  subjectId: string;
  startedAt: number; // epoch ms
}

export interface Store {
  subjects: Subject[];
  /** "YYYY-MM-DD" -> { subjectId -> seconds } */
  days: Record<string, Record<string, number>>;
  active: ActiveSession | null;
}

const LS_KEY = 'ypt-store-v1';

export const pad = (n: number) => String(n).padStart(2, '0');

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      return {
        subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
        days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
        active: parsed.active ?? null,
      };
    }
  } catch {
    /* ignore corrupted storage */
  }
  return { subjects: [], days: {}, active: null };
}

export function saveStore(s: Store) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* storage full — ignore */
  }
}

/**
 * Переносит накопленное активной сессией время в days,
 * разбивая по полуночным границам. После вызова active.startedAt = now.
 */
export function reconcile(s: Store, now: number): Store {
  if (!s.active) return s;
  let t = s.active.startedAt;
  const sid = s.active.subjectId;
  const days = { ...s.days };
  while (t < now) {
    const d = new Date(t);
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    const end = Math.min(midnight, now);
    const key = dayKey(d);
    const sec = Math.floor((end - t) / 1000);
    if (sec > 0) {
      const day = { ...(days[key] ?? {}) };
      day[sid] = (day[sid] ?? 0) + sec;
      days[key] = day;
    }
    t = end;
  }
  return { ...s, days, active: { subjectId: sid, startedAt: now } };
}

/** Секунды предмета за дату (включая тик активной сессии, если это сегодня). */
export function subjectSeconds(s: Store, key: string, sid: string, now: number): number {
  let total = s.days[key]?.[sid] ?? 0;
  if (s.active && s.active.subjectId === sid && dayKey(new Date(s.active.startedAt)) === key) {
    total += Math.floor((now - s.active.startedAt) / 1000);
  }
  return total;
}

/** Общий итог дня по всем предметам. */
export function dayTotal(s: Store, key: string, now: number): number {
  const day = s.days[key] ?? {};
  let total = Object.values(day).reduce((a, b) => a + b, 0);
  if (s.active && dayKey(new Date(s.active.startedAt)) === key) {
    total += Math.floor((now - s.active.startedAt) / 1000);
  }
  return total;
}

/** Форматирование H:MM:SS. */
export function fmtHMS(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${pad(m)}:${pad(s)}`;
}

/** Форматирование часов для статистики: "12,5 ч" / "45 мин". */
export function fmtHours(sec: number): string {
  if (sec < 60) return sec > 0 ? '< 1 мин' : '0 мин';
  if (sec < 3600) return `${Math.floor(sec / 60)} мин`;
  const h = sec / 3600;
  return `${(Math.round(h * 10) / 10).toLocaleString('ru-RU')} ч`;
}

export const SUBJECT_COLORS = [
  '#5b9cf5', // синий
  '#e5488c', // розовый
  '#6fbf4a', // зелёный
  '#8a97a8', // серо-голубой
  '#6cc7e8', // голубой
  '#a78bfa', // фиолетовый
  '#f5a524', // янтарный
  '#f0564a', // красный
];
