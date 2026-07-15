import { useEffect, useId, useMemo, useRef, useState } from 'react';

export type InstrumentSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type InstrumentSelectProps = {
  value: string;
  options: InstrumentSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  mode?: 'value' | 'caret';
  className?: string;
};

export function InstrumentSelect({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  mode = 'value',
  className = ''
}: InstrumentSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const selectedOption = options[selectedIndex] ?? options[0];
  const enabledIndices = useMemo(
    () => options.flatMap((option, index) => (option.disabled ? [] : [index])),
    [options]
  );

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (open) {
      setActiveIndex(selectedIndex);
    }
  }, [open, selectedIndex]);

  const chooseOption = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;

    onChange(option.value);
    setOpen(false);
  };

  const moveActive = (direction: 1 | -1) => {
    if (enabledIndices.length === 0) return;

    const currentPosition = enabledIndices.indexOf(activeIndex);
    const fallbackPosition = enabledIndices.indexOf(selectedIndex);
    const startPosition = currentPosition >= 0 ? currentPosition : Math.max(0, fallbackPosition);
    const nextPosition = (startPosition + direction + enabledIndices.length) % enabledIndices.length;
    setActiveIndex(enabledIndices[nextPosition]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(selectedIndex);
      } else {
        moveActive(event.key === 'ArrowDown' ? 1 : -1);
      }
      return;
    }

    if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(enabledIndices[0] ?? 0);
      return;
    }

    if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(enabledIndices.at(-1) ?? 0);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) {
        chooseOption(activeIndex);
      } else {
        setOpen(true);
      }
    }
  };

  const rootClassName = [
    'instrument-select',
    open ? 'is-open' : '',
    mode === 'caret' ? 'instrument-select--caret' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName} ref={rootRef}>
      <button
        type="button"
        className="instrument-select__trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        {mode === 'value' ? <span className="instrument-select__value">{selectedOption?.label}</span> : null}
        <ChevronIcon />
      </button>

      {open ? (
        <div className="instrument-select__menu" id={listboxId} role="listbox" aria-label={ariaLabel}>
          <div className="instrument-select__menu-topline" aria-hidden="true">
            <span>Select parameter</span>
            <i />
          </div>
          {options.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;

            return (
              <button
                type="button"
                id={`${listboxId}-option-${index}`}
                key={option.value}
                className={`instrument-select__option${selected ? ' is-selected' : ''}${active ? ' is-active' : ''}`}
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                tabIndex={-1}
                onClick={() => chooseOption(index)}
                onPointerEnter={() => {
                  if (!option.disabled) setActiveIndex(index);
                }}
              >
                <span className="instrument-select__option-light" aria-hidden="true" />
                <span>{option.label}</span>
                <span className="instrument-select__option-mark" aria-hidden="true">
                  {selected ? '●' : `${String(index + 1).padStart(2, '0')}`}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg className="instrument-select__chevron" viewBox="0 0 16 16" aria-hidden="true">
      <path d="m3.5 6 4.5 4 4.5-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
