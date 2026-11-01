import { useMemo, useState } from 'react';
import type { Store } from "../lib/store";
import { dayTotal, fmtHours, dayKey, pad } from '../lib/store';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

interface Props {
  store: Store;
  now: number;
}

export function StatsTab({ store, now }: Props) {
  const today = new Date(now);
  const [ym, setYm] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }));

  const isCurrentMonth = ym.y === today.getFullYear() && ym.m === today.getMonth();

  const { days, monthTotal, bySubject, maxDay } = useMemo(() => {
    const prefix = `${ym.y}-${pad(ym.m + 1)}`;
    const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
    const days: { day: number; key: string; sec: number }[] = [];
    let monthTotal = 0;
    const bySubject = new Map<string, number>();
    let maxDay = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${prefix}-${pad(d)}`;
      let sec = dayTotal(store, key, now);
      // активная сессия учитывается только в «сегодня»
      if (key === dayKey(today) && store.active) {
        // dayTotal уже добавил тик, если startedAt сегодня — ничего не делаем
      }
      days.push({ day: d, key, sec });
      monthTotal += sec;
      if (sec > maxDay) maxDay = sec;
      for (const [sid, v] of Object.entries(store.days[key] ?? {})) {
        bySubject.set(sid, (bySubject.get(sid) ?? 0) + v);
      }
    }
    // тик активной сессии текущего дня — в её предмет
    if (store.active && isCurrentMonth) {
      const k = dayKey(today);
      if (k.startsWith(prefix)) {
        const live = Math.floor((now - store.active.startedAt) / 1000);
        bySubject.set(store.active.subjectId, (bySubject.get(store.active.subjectId) ?? 0) + live);
      }
    }
    return { days, monthTotal, bySubject, maxDay };
  }, [store, ym, now]);

  const shift = (delta: number) => {
    setYm(({ y, m }) => {
      const nm = m + delta;
      return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });
  };

  const todayKey = dayKey(today);
  const subjectRows = store.subjects
    .map((s) => ({ s, sec: bySubject.get(s.id) ?? 0 }))
    .filter((r) => r.sec > 0)
    .sort((a, b) => b.sec - a.sec);

  return (
    <section aria-label="Статистика" className="flex flex-col gap-6">
      {/* Переключение месяца */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          aria-label="Предыдущий месяц"
          className="glass glass-hover flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#bbd7f7]/30"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="text-center">
          <div className="text-base font-semibold">
            {MONTHS[ym.m]} {ym.y}
          </div>
          {!isCurrentMonth && (
            <button
              onClick={() => setYm({ y: today.getFullYear(), m: today.getMonth() })}
              className="mt-0.5 cursor-pointer text-xs text-[hsl(var(--fg-muted))] underline-offset-2 transition-colors hover:text-[hsl(var(--fg))] hover:underline focus-visible:outline-2 focus-visible:outline-[#bbd7f7]/30"
            >
              к текущему месяцу
            </button>
          )}
        </div>
        <button
          onClick={() => shift(1)}
          aria-label="Следующий месяц"
          className="glass glass-hover flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#bbd7f7]/30"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Итог месяца */}
      <div className="glass rounded-2xl px-6 py-5 text-center">
        <div className="num text-ice text-4xl font-semibold">{fmtHours(monthTotal)}</div>
        <div className="mt-1 text-sm text-[hsl(var(--fg-muted))]">всего за месяц</div>
      </div>

      {/* Столбики по дням */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[hsl(var(--fg-muted))]">По дням</h3>
        <div
          className="flex h-36 items-end gap-[3px]"
          role="img"
          aria-label={`График часов по дням, всего ${fmtHours(monthTotal)}`}
        >
          {days.map(({ day, key, sec }) => (
            <div
              key={key}
              className="group relative flex-1 rounded-t-sm transition-colors duration-150"
              style={{
                height: sec > 0 ? `${Math.max(4, (sec / (maxDay || 1)) * 100)}%` : '2px',
                background:
                  key === todayKey
                    ? 'linear-gradient(180deg, #d8ecf8 0%, #98c0ef 100%)'
                    : sec > 0
                      ? 'rgba(152, 192, 239, 0.45)'
                      : 'rgba(186, 215, 247, 0.10)',
              }}
              title={`${day} ${MONTHS[ym.m].toLowerCase()}: ${fmtHours(sec)}`}
            >
              <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#161a2e] px-2 py-1 text-xs opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                {day}: {fmtHours(sec)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-[hsl(var(--fg-muted))]">
          <span>1</span>
          <span>{days.length}</span>
        </div>
      </div>

      {/* По предметам */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[hsl(var(--fg-muted))]">По предметам</h3>
        {subjectRows.length === 0 ? (
          <p className="text-sm text-[hsl(var(--fg-muted))]">
            В этом месяце пока нет записей.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {subjectRows.map(({ s, sec }) => {
              const pct = monthTotal > 0 ? Math.round((sec / monthTotal) * 100) : 0;
              return (
                <li key={s.id} className="glass rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="truncate text-[15px]">{s.name}</span>
                    </div>
                    <div className="num shrink-0 text-sm text-[hsl(var(--fg))]">
                      {fmtHours(sec)}
                      <span className="ml-2 text-xs text-[hsl(var(--fg-muted))]">{pct}%</span>
                    </div>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${pct}%`, backgroundColor: s.color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
