"use client";

import { useEffect, useState } from "react";
import { mutate } from "swr";
import type { FeatureKey } from "@/db/schema";
import { addCategory, addEvent, deleteCategory, saveSettings } from "@/lib/actions";
import { categoryColor, useCategoriesQuery } from "@/lib/categories";
import { useEvents, useSettings } from "@/lib/client";
import { CATEGORY_SWATCHES, DEFAULT_SETTINGS, FEATURES } from "@/lib/constants";
import { addDays, today, weekStart } from "@/lib/dates";
import { searchCities, useLocation, type CityResult } from "@/lib/location-client";
import { DEFAULT_PLACE, shortName } from "@/lib/location";
import { OWNER_NAME } from "@/lib/profile";
import { IconChevronLeft, IconClose, IconMapPin, IconPlus, IconSearch } from "./Icons";
import { toast } from "./Toast";
import { Button, Field, Segmented, Switch, cx } from "./ui";

type Step = "name" | "location" | "features" | "categories" | "timetable" | "done";

const CATEGORY_IDEAS = ["College", "Study", "Work", "Cadets", "Music", "Gaming", "Sport", "Gym", "Friends", "Creative", "Coding", "Health", "Personal", "Other"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

/**
 * First-run welcome setup. Shown full-screen the first time the dashboard is
 * opened (settings.onboarded = false). Every step saves as you go, and every
 * step can be skipped – it can all be changed later in Settings.
 */
export function Welcome() {
  const { data: settings } = useSettings();
  const s = settings ?? DEFAULT_SETTINGS;
  const steps: Step[] = ["name", "location", "features", "categories", ...(s.features.timetable ? (["timetable"] as Step[]) : []), "done"];
  const [step, setStep] = useState<Step>("name");
  const i = Math.max(0, steps.indexOf(step));
  const next = () => setStep(steps[Math.min(i + 1, steps.length - 1)]);
  const back = () => setStep(steps[Math.max(i - 1, 0)]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg pt-safe">
      <header className="mx-auto flex w-full max-w-lg items-center gap-3 px-5 pt-4">
        <button onClick={back} aria-label="Back" className={cx("press press-strong flex h-11 w-11 items-center justify-center rounded-full text-muted", i === 0 && "invisible")}>
          <IconChevronLeft />
        </button>
        <div className="flex flex-1 gap-1.5" aria-label={`Step ${i + 1} of ${steps.length}`}>
          {steps.map((x, n) => (
            <span key={x} className={cx("h-1.5 flex-1 rounded-full transition-colors", n <= i ? "bg-accent" : "bg-line")} />
          ))}
        </div>
        <span className="w-11" />
      </header>

      <main key={step} className="anim-rise mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-6">
        {step === "name" && <NameStep onNext={next} />}
        {step === "location" && <LocationStep onNext={next} />}
        {step === "features" && <FeaturesStep onNext={next} />}
        {step === "categories" && <CategoriesStep onNext={next} />}
        {step === "timetable" && <TimetableStep onNext={next} />}
        {step === "done" && <DoneStep />}
      </main>
    </div>
  );
}

function Title({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div className="mb-6">
      <p className="mb-3 text-[44px] leading-none">{emoji}</p>
      <h1 className="text-[30px] font-bold leading-tight tracking-tight">{title}</h1>
      <p className="mt-2 text-[17px] text-muted">{text}</p>
    </div>
  );
}

function Footer({ onNext, label = "Continue", disabled, skip }: { onNext: () => void; label?: string; disabled?: boolean; skip?: () => void }) {
  return (
    <div className="mt-auto space-y-2 pt-6">
      <Button size="lg" className="w-full" onClick={onNext} disabled={disabled}>
        {label}
      </Button>
      {skip && (
        <button onClick={skip} className="min-h-11 w-full text-[16px] font-medium text-muted">
          Skip for now
        </button>
      )}
    </div>
  );
}

function NameStep({ onNext }: { onNext: () => void }) {
  const { data } = useSettings();
  const [name, setName] = useState(data?.ownerName || OWNER_NAME);
  return (
    <>
      <Title emoji="👋" title="Welcome to Life" text="Let's make this dashboard yours. It only takes a minute, and you can change everything later in Settings." />
      <Field label="What should we call you?">
        <input className="field text-[19px] font-medium" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" placeholder="Your name" />
      </Field>
      <p className="mt-3 text-[15px] text-muted">
        Used for your greeting: <b className="text-text">Good morning{name.trim() ? `, ${name.trim()}` : ""}</b>
      </p>
      <Footer
        onNext={() => {
          saveSettings({ ownerName: name.trim() });
          onNext();
        }}
        disabled={!name.trim()}
      />
    </>
  );
}

function LocationStep({ onNext }: { onNext: () => void }) {
  const { place, status, allow } = useLocation();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CityResult[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return setResults(null);
    const t = setTimeout(() => searchCities(term).then(setResults).catch(() => setResults([])), 350);
    return () => clearTimeout(t);
  }, [q]);

  const usingDevice = place.source === "device" && status !== "denied";
  return (
    <>
      <Title emoji="📍" title="Where are you?" text="For local weather, sunrise and golden hour times." />
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <p className="text-[13px] font-medium text-muted">Right now we'll use</p>
        <p className="flex items-center gap-1.5 text-[20px] font-semibold">
          <IconMapPin size={20} className="text-accent" /> {status === "locating" ? "Finding you…" : picked ?? shortName(place.name)}
        </p>
        <p className="text-[14px] text-muted">{usingDevice ? "Your current location" : place.source === "fixed" ? "A fixed town" : `The default (${shortName(DEFAULT_PLACE.name)})`}</p>
      </div>

      <Button size="lg" variant="secondary" className="mt-4 w-full" onClick={() => { saveSettings({ locationMode: "current" }).then(allow); setPicked(null); }} disabled={status === "locating"}>
        <IconMapPin size={20} /> Use my current location
      </Button>
      {status === "denied" && <p className="mt-2 text-[14px] text-danger">Location is turned off for this app. You can pick a town instead.</p>}

      <p className="mb-2 mt-6 text-[14px] font-medium text-muted">…or always use a town</p>
      <label className="relative block">
        <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
        <input className="field pl-10" type="search" placeholder="Search for a town" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {results && (
        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-card">
          {results.length === 0 ? (
            <li className="p-3 text-muted">No places found</li>
          ) : (
            results.slice(0, 5).map((r) => (
              <li key={`${r.lat},${r.lon}`}>
                <button
                  className="press press-subtle flex min-h-12 w-full flex-col justify-center px-4 py-2 text-left"
                  onClick={async () => {
                    await saveSettings({ locationMode: "fixed", fixedLocation: { lat: r.lat, lon: r.lon, name: r.name } });
                    mutate("/api/weather");
                    setPicked(shortName(r.name));
                    setQ("");
                    setResults(null);
                  }}
                >
                  <span className="font-medium">{shortName(r.name)}</span>
                  <span className="text-[13px] text-muted">{r.detail}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      <Footer onNext={onNext} />
    </>
  );
}

function FeaturesStep({ onNext }: { onNext: () => void }) {
  const { data } = useSettings();
  const f = (data ?? DEFAULT_SETTINGS).features;
  return (
    <>
      <Title emoji="✨" title="What do you want on it?" text="Turn on the bits you'll use. Tasks, habits, projects, calendar and journal are always there." />
      <div className="divide-y divide-line rounded-2xl bg-card px-4 shadow-card">
        {FEATURES.map((x) => (
          <div key={x.key} className="flex min-h-16 items-center justify-between gap-3 py-2">
            <div>
              <p className="text-[16px] font-medium">{x.label}</p>
              <p className="text-[13px] text-muted">{x.description}</p>
            </div>
            <Switch label={x.label} checked={f[x.key]} onChange={(v) => saveSettings({ features: { [x.key as FeatureKey]: v } })} />
          </div>
        ))}
      </div>
      <Footer onNext={onNext} />
    </>
  );
}

function CategoriesStep({ onNext }: { onNext: () => void }) {
  const { data } = useCategoriesQuery();
  const cats = data ?? [];
  const [custom, setCustom] = useState("");
  const has = (n: string) => cats.some((c) => c.name.toLowerCase() === n.toLowerCase());
  const add = (n: string) => {
    const name = n.trim();
    if (!name || has(name)) return;
    addCategory(name, CATEGORY_SWATCHES[cats.length % CATEGORY_SWATCHES.length]);
  };
  return (
    <>
      <Title emoji="🏷️" title="Your categories" text="Tasks, events and projects are colour-coded by these. Keep the ones that fit your life." />
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <span key={c.id} className="anim-rise inline-flex min-h-11 items-center gap-2 rounded-full pl-4 pr-1.5 text-[16px] font-medium" style={{ background: categoryColor(c.name).soft }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
            {c.name}
            <button
              aria-label={`Remove ${c.name}`}
              disabled={cats.length <= 1}
              onClick={() => deleteCategory(c.id)}
              className="press press-strong flex h-8 w-8 items-center justify-center rounded-full text-muted disabled:opacity-30"
            >
              <IconClose size={15} />
            </button>
          </span>
        ))}
      </div>
      <p className="mb-2 mt-6 text-[14px] font-medium text-muted">Add some ideas</p>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_IDEAS.filter((n) => !has(n)).map((n) => (
          <button key={n} onClick={() => add(n)} className="press inline-flex min-h-10 items-center gap-1 rounded-full border-2 border-dashed border-line px-3.5 text-[15px] font-medium">
            <IconPlus size={14} /> {n}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(custom);
          setCustom("");
        }}
      >
        <input className="field" placeholder="Something else…" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={40} />
        <Button type="submit" variant="secondary" disabled={!custom.trim()} aria-label="Add category">
          <IconPlus size={20} />
        </Button>
      </form>
      <Footer onNext={onNext} />
    </>
  );
}

function TimetableStep({ onNext }: { onNext: () => void }) {
  const { data: settings } = useSettings();
  const { data: events } = useEvents();
  const { data: catsData } = useCategoriesQuery();
  const cats = (catsData ?? []).map((c) => c.name);
  const [group, setGroup] = useState(settings?.timetableGroup ?? "");
  const [d, setD] = useState({ day: 0, start: "09:00", end: "10:00", room: "", subject: "" });
  const lessons = (events ?? []).filter((e) => e.kind === "lesson");
  const monday = weekStart(today());
  const valid = d.room.trim() && d.start < d.end;

  const addLesson = () => {
    if (!valid) return;
    const category = cats.find((c) => c === "College") ?? cats.find((c) => c === "Study") ?? cats[0] ?? "Personal";
    addEvent({
      title: d.subject.trim() || "Lesson",
      location: d.room.trim().toUpperCase(),
      date: addDays(monday, d.day),
      startTime: d.start,
      endTime: d.end,
      category,
      repeat: "weekly",
      repeatUntil: null,
      excludedDates: [],
      kind: "lesson",
    });
    toast(`Added ${DAYS[d.day]} ${d.start}`);
    setD((x) => ({ ...x, room: "", subject: "", start: x.end, end: `${String(Math.min(23, Number(x.end.slice(0, 2)) + 1)).padStart(2, "0")}${x.end.slice(2)}` }));
  };

  return (
    <>
      <Title emoji="🎓" title="Your timetable" text="Add your weekly lessons and Today will count down to the next one. You can do this later on the Timetable page." />
      <Field label="Your group or class (optional)">
        <input className="field" placeholder="e.g. 2A" value={group} onChange={(e) => setGroup(e.target.value)} onBlur={() => group.trim() !== (settings?.timetableGroup ?? "") && saveSettings({ timetableGroup: group.trim() })} maxLength={30} />
      </Field>

      <div className="mt-4 space-y-3 rounded-2xl bg-card p-4 shadow-card">
        <Segmented value={d.day} onChange={(v) => setD({ ...d, day: v })} options={DAYS.map((label, n) => ({ value: n, label }))} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Starts">
            <input type="time" className="field" value={d.start} onChange={(e) => setD({ ...d, start: e.target.value })} />
          </Field>
          <Field label="Ends">
            <input type="time" className="field" value={d.end} onChange={(e) => setD({ ...d, end: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" placeholder="Room" value={d.room} onChange={(e) => setD({ ...d, room: e.target.value })} autoCapitalize="characters" />
          <input className="field" placeholder="Subject (optional)" value={d.subject} onChange={(e) => setD({ ...d, subject: e.target.value })} />
        </div>
        {d.start >= d.end && <p className="text-[14px] text-danger">The end time needs to be after the start.</p>}
        <Button variant="secondary" className="w-full" onClick={addLesson} disabled={!valid}>
          <IconPlus size={18} /> Add lesson
        </Button>
      </div>

      {lessons.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {[...lessons]
            .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""))
            .map((l) => (
              <li key={l.id} className="anim-rise flex justify-between rounded-xl bg-card px-4 py-2.5 text-[15px] shadow-card">
                <span>
                  <b>{DAYS[(new Date(l.date + "T12:00:00Z").getUTCDay() + 6) % 7]}</b> {l.startTime}–{l.endTime}
                </span>
                <span className="text-muted">
                  {l.location}
                  {l.title !== "Lesson" ? ` · ${l.title}` : ""}
                </span>
              </li>
            ))}
        </ul>
      )}
      <Footer onNext={onNext} label={lessons.length ? "Continue" : "Continue without lessons"} />
    </>
  );
}

function DoneStep() {
  const { data } = useSettings();
  const [busy, setBusy] = useState(false);
  const name = data?.ownerName;
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="anim-pop mb-4 text-[64px] leading-none">🎉</p>
        <h1 className="text-[30px] font-bold tracking-tight">You're all set{name ? `, ${name}` : ""}!</h1>
        <p className="mt-2 max-w-sm text-[17px] text-muted">
          Tip: in Safari, tap <b className="text-text">Share → Add to Home Screen</b> so it opens like an app. Everything you just chose can be changed in Settings.
        </p>
      </div>
      <Footer
        label={busy ? "Opening…" : "Open my dashboard"}
        disabled={busy}
        onNext={async () => {
          setBusy(true);
          await saveSettings({ onboarded: true });
        }}
      />
    </>
  );
}
