"use client";
import { useId, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { shiftDate } from "@/lib/football/filters";

export function SearchField({
  label,
  value,
  onChange,
  placeholder = "Search…",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="match-search">
      <Search size={17} aria-hidden="true" />
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
      />
      {value && (
        <button
          className="icon-button"
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={() => onChange("")}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="competition-filter">
      <SlidersHorizontal size={15} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterTabs<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="status-tabs" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          className={value === option.value ? "active" : ""}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs({
  label,
  tabs,
}: {
  label: string;
  tabs: readonly { id: string; label: string; content: ReactNode }[];
}) {
  const prefix = useId();
  const [selected, setSelected] = useState(tabs[0]?.id);
  const active = tabs.some((tab) => tab.id === selected)
    ? selected
    : tabs[0]?.id;
  return (
    <div className="content-tabs">
      <div className="status-tabs" role="tablist" aria-label={label}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            id={`${prefix}-${tab.id}`}
            aria-controls={`${prefix}-panel-${tab.id}`}
            aria-selected={active === tab.id}
            tabIndex={active === tab.id ? 0 : -1}
            className={active === tab.id ? "active" : ""}
            onClick={() => setSelected(tab.id)}
            onKeyDown={(event) => {
              const target =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index - 1 + tabs.length) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : null;
              if (target !== null) {
                event.preventDefault();
                setSelected(tabs[target].id);
                document
                  .getElementById(`${prefix}-${tabs[target].id}`)
                  ?.focus();
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${prefix}-panel-${tab.id}`}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`${prefix}-${tab.id}`}
          hidden={active !== tab.id}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

export function DateNavigation({
  date,
  today,
  onChange,
}: {
  date: string;
  today: string;
  onChange: (date: string) => void;
}) {
  return (
    <div className="date-strip">
      <button
        className="icon-button date-arrow"
        aria-label="Previous day"
        onClick={() => onChange(shiftDate(date, -1))}
      >
        <ChevronLeft size={18} />
      </button>
      <div className="date-options">
        {[-2, -1, 0, 1, 2].map((offset) => {
          const day = shiftDate(date, offset);
          const parsed = new Date(`${day}T12:00:00Z`);
          return (
            <button
              key={day}
              className={`date-option ${offset === 0 ? "active" : ""}`}
              aria-pressed={offset === 0}
              onClick={() => onChange(day)}
            >
              <span>
                {day === today
                  ? "Today"
                  : new Intl.DateTimeFormat("en-GB", {
                      weekday: "short",
                      timeZone: "UTC",
                    }).format(parsed)}
              </span>
              <strong>
                {new Intl.DateTimeFormat("en-GB", {
                  day: "2-digit",
                  month: "short",
                  timeZone: "UTC",
                }).format(parsed)}
              </strong>
            </button>
          );
        })}
      </div>
      <button
        className="icon-button date-arrow"
        aria-label="Next day"
        onClick={() => onChange(shiftDate(date, 1))}
      >
        <ChevronRight size={18} />
      </button>
      <label className="date-picker">
        <CalendarDays size={19} aria-hidden="true" />
        <input
          type="date"
          aria-label="Choose match date"
          value={date}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value);
          }}
        />
      </label>
    </div>
  );
}
