import { useState } from 'react';
import type { Subject } from '../lib/store';

interface Props {
  subject?: Subject;
  colors: string[];
  onSave: (name: string, color: string) => void;
  onClose: () => void;
}

export function SubjectDialog({ subject, colors, onSave, onClose }: Props) {
  const [name, setName] = useState(subject?.name ?? '');
  const [color, setColor] = useState(subject?.color ?? colors[0]);
  const valid = name.trim().length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (valid) onSave(name.trim(), color);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={subject ? 'Изменить предмет' : 'Новый предмет'}
        className="glass w-full max-w-sm rounded-2xl bg-[#0b0e1c] p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="text-lg font-semibold">{subject ? 'Изменить предмет' : 'Новый предмет'}</h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: профильная математика"
          maxLength={48}
          className="glass mt-5 min-h-[48px] w-full rounded-xl bg-transparent px-4 text-[15px] outline-none placeholder:text-[hsl(var(--fg-muted))]/60 focus:border-[#98c0ef]/50"
        />
        <div className="mt-5 flex flex-wrap gap-3" role="radiogroup" aria-label="Цвет">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={`Цвет ${c}`}
              onClick={() => setColor(c)}
              className="h-11 w-11 cursor-pointer rounded-full transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bbd7f7]/50 active:scale-90"
              style={{
                backgroundColor: c,
                boxShadow: color === c ? `0 0 0 2px #05060f, 0 0 0 4px ${c}` : undefined,
                transform: color === c ? 'scale(1.08)' : undefined,
              }}
            />
          ))}
        </div>
        <div className="mt-7 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="glass min-h-[44px] flex-1 cursor-pointer rounded-xl text-[15px] font-medium transition-colors duration-150 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#bbd7f7]/30"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="min-h-[44px] flex-1 cursor-pointer rounded-xl bg-gradient-to-b from-[#d8ecf8] to-[#98c0ef] text-[15px] font-semibold text-[#05060f] transition-all duration-150 enabled:hover:brightness-110 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bbd7f7]/50"
          >
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}
