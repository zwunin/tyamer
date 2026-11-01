import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type Store,
  type Subject,
  loadStore,
  saveStore,
  reconcile,
  subjectSeconds,
  dayTotal,
  fmtHMS,
  dayKey,
  uid,
  SUBJECT_COLORS,
} from '../lib/store';
import { StatsTab } from '../components/StatsTab';
import { SubjectDialog } from '../components/SubjectDialog';

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function dateLabel(d: Date) {
  return `${WEEKDAYS[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}.${String(
    d.getMonth() + 1
  ).padStart(2, '0')}`;
}

type Tab = 'timer' | 'stats';

export default function Home() {
  const [store, setStore] = useState<Store>(() => reconcile(loadStore(), Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState<Tab>('timer');
  const [dialog, setDialog] = useState<{ open: boolean; subject?: Subject }>({ open: false });
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Subject | null>(null);
  const storeRef = useRef(store);
  storeRef.current = store;

  const commit = (s: Store) => {
    setStore(s);
    saveStore(s);
  };

  // Тик каждую секунду; на границе суток reconcile разбивает время по дням —
  // это и есть «обнуление в полночь»: новый день начинается с нуля.
  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      const s = storeRef.current;
      if (s.active) {
        const startKey = dayKey(new Date(s.active.startedAt));
        if (startKey !== dayKey(new Date(t))) {
          const r = reconcile({ ...s }, t);
          commit(r);
        }
      }
      setNow(t);
    };
    const iv = setInterval(tick, 1000);
    // периодический сброс на диск + при сворачивании/закрытии
    const flush = () => commit(reconcile({ ...storeRef.current }, Date.now()));
    const fl = setInterval(flush, 15000);
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
      else tick();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', flush);
    return () => {
      clearInterval(iv);
      clearInterval(fl);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', flush);
    };
  }, []);

  const todayKey = dayKey(new Date(now));
  const totalToday = dayTotal(store, todayKey, now);

  const toggle = (sid: string) => {
    const t = Date.now();
    let s = reconcile({ ...storeRef.current }, t);
    if (s.active?.subjectId === sid) {
      s = { ...s, active: null };
    } else {
      s = { ...s, active: { subjectId: sid, startedAt: t } };
    }
    commit(s);
  };

  const upsertSubject = (name: string, color: string, id?: string) => {
    const s = { ...storeRef.current };
    if (id) {
      commit({
        ...s,
        subjects: s.subjects.map((x) => (x.id === id ? { ...x, name, color } : x)),
      });
    } else {
      commit({
        ...s,
        subjects: [...s.subjects, { id: uid(), name, color, createdAt: Date.now() }],
      });
    }
  };

  const removeSubject = (subj: Subject) => {
    const s = reconcile({ ...storeRef.current }, Date.now());
    const days = Object.fromEntries(
      Object.entries(s.days).map(([k, v]) => {
        const { [subj.id]: _drop, ...rest } = v;
        void _drop;
        return [k, rest];
      })
    );
    commit({
      ...s,
      days,
      subjects: s.subjects.filter((x) => x.id !== subj.id),
      active: s.active?.subjectId === subj.id ? null : s.active,
    });
    setConfirmDelete(null);
  };

  const statsStore = useMemo(() => store, [store]);

  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--bg))] text-[hsl(var(--fg))]">
      {/* Шапка: небо + дата + общий счётчик дня */}
      <header className="relative overflow-hidden">
        <img
          src="sky.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(5,6,15,0.25) 0%, rgba(5,6,15,0.45) 55%, hsl(226 45% 4%) 100%)',
          }}
        />
        <div className="relative mx-auto flex w-full max-w-xl flex-col items-center px-4 pb-10 pt-8 md:max-w-2xl md:pt-12">
          <div className="glass rounded-full px-4 py-1.5 text-sm font-medium tracking-wide text-[hsl(var(--fg-muted))]">
            {dateLabel(new Date(now))}
          </div>
          <div
            className="num text-ice mt-6 text-[17vw] font-semibold leading-none md:text-8xl"
            aria-live="off"
          >
            {fmtHMS(totalToday)}
          </div>
          <div className="mt-3 text-sm text-[hsl(var(--fg-muted))]">всего сегодня</div>
        </div>
      </header>

      {/* Вкладки */}
      <nav className="sticky top-0 z-10 border-b border-white/[0.06] bg-[hsl(var(--bg))]/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl gap-1 px-4 md:max-w-2xl">
          {(
            [
              ['timer', 'Таймер'],
              ['stats', 'Статистика'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex-1 cursor-pointer py-3.5 text-[15px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[#bbd7f7]/30 ${
                tab === key
                  ? 'text-[hsl(var(--fg))]'
                  : 'text-[hsl(var(--fg-muted))] hover:text-[hsl(var(--fg))]/80'
              }`}
            >
              {label}
              {tab === key && (
                <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-[#d8ecf8] to-[#98c0ef]" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-xl px-4 pb-28 pt-4 md:max-w-2xl">
        {tab === 'timer' ? (
          <section aria-label="Предметы">
            {store.subjects.length === 0 ? (
              <div className="glass mt-6 rounded-2xl px-6 py-12 text-center">
                <p className="text-[hsl(var(--fg-muted))]">
                  Пока пусто. Добавь первый предмет — и просто нажми на него, когда сядешь заниматься.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {store.subjects.map((subj) => {
                  const active = store.active?.subjectId === subj.id;
                  const sec = subjectSeconds(store, todayKey, subj.id, now);
                  return (
                    <li key={subj.id} className="relative">
                      <div
                        className={`glass glass-hover flex min-h-[64px] items-center gap-4 rounded-2xl px-4 transition-colors duration-200 ${
                          active ? 'ring-1 ring-[#98c0ef]/40' : ''
                        }`}
                      >
                        <button
                          onClick={() => toggle(subj.id)}
                          aria-label={active ? `Пауза: ${subj.name}` : `Старт: ${subj.name}`}
                          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-[#bbd7f7]/30 active:scale-90"
                          style={{ backgroundColor: subj.color }}
                        >
                          {active ? (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                              <rect x="2" y="1.5" width="3.4" height="11" rx="1" fill="#05060f" />
                              <rect x="8.6" y="1.5" width="3.4" height="11" rx="1" fill="#05060f" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                              <path d="M3.5 1.8v10.4c0 .8.9 1.3 1.6.9l7.9-5.2c.6-.4.6-1.4 0-1.8L5.1.9a1 1 0 0 0-1.6.9Z" fill="#05060f" />
                            </svg>
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-medium">{subj.name}</div>
                          {active && (
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[hsl(var(--fg-muted))]">
                              <span
                                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                                style={{ backgroundColor: subj.color }}
                              />
                              идёт
                            </div>
                          )}
                        </div>
                        <div className={`num shrink-0 text-lg ${active ? 'text-ice' : 'text-[hsl(var(--fg-muted))]'}`}>
                          {fmtHMS(sec)}
                        </div>
                        <button
                          onClick={() => setMenuFor(menuFor === subj.id ? null : subj.id)}
                          aria-label={`Меню: ${subj.name}`}
                          aria-expanded={menuFor === subj.id}
                          className="flex h-11 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[hsl(var(--fg-muted))] transition-colors duration-150 hover:text-[hsl(var(--fg))] focus-visible:outline-2 focus-visible:outline-[#bbd7f7]/30"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                            <circle cx="8" cy="3" r="1.4" />
                            <circle cx="8" cy="8" r="1.4" />
                            <circle cx="8" cy="13" r="1.4" />
                          </svg>
                        </button>
                      </div>

                      {menuFor === subj.id && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setMenuFor(null)} />
                          <div className="glass absolute right-2 top-[calc(100%+4px)] z-30 w-44 overflow-hidden rounded-xl bg-[#0b0e1c] backdrop-blur-xl">
                            <button
                              onClick={() => {
                                setMenuFor(null);
                                setDialog({ open: true, subject: subj });
                              }}
                              className="block w-full cursor-pointer px-4 py-3 text-left text-[15px] transition-colors duration-150 hover:bg-white/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#bbd7f7]/30"
                            >
                              Изменить
                            </button>
                            <button
                              onClick={() => {
                                setMenuFor(null);
                                setConfirmDelete(subj);
                              }}
                              className="block w-full cursor-pointer px-4 py-3 text-left text-[15px] text-[#f0564a] transition-colors duration-150 hover:bg-white/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#bbd7f7]/30"
                            >
                              Удалить
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <button
              onClick={() => setDialog({ open: true })}
              className="mt-4 flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 text-[15px] font-medium text-[hsl(var(--fg-muted))] transition-colors duration-200 hover:border-white/25 hover:text-[hsl(var(--fg))] focus-visible:outline-2 focus-visible:outline-[#bbd7f7]/30"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Добавить предмет
            </button>
          </section>
        ) : (
          <StatsTab store={statsStore} now={now} />
        )}
      </main>

      {dialog.open && (
        <SubjectDialog
          subject={dialog.subject}
          colors={SUBJECT_COLORS}
          onClose={() => setDialog({ open: false })}
          onSave={(name, color) => {
            upsertSubject(name, color, dialog.subject?.id);
            setDialog({ open: false });
          }}
        />
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm md:items-center"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Удалить предмет"
            className="glass w-full max-w-sm rounded-2xl bg-[#0b0e1c] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[15px] leading-relaxed">
              Удалить «{confirmDelete.name}»? Вся накопленная статистика по этому предмету тоже
              будет стёрта.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="glass min-h-[44px] flex-1 cursor-pointer rounded-xl text-[15px] font-medium transition-colors duration-150 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#bbd7f7]/30"
              >
                Отмена
              </button>
              <button
                onClick={() => removeSubject(confirmDelete)}
                className="min-h-[44px] flex-1 cursor-pointer rounded-xl bg-[#f0564a] text-[15px] font-medium text-[#0b0505] transition-colors duration-150 hover:bg-[#ff6a5e] focus-visible:outline-2 focus-visible:outline-[#bbd7f7]/30"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
