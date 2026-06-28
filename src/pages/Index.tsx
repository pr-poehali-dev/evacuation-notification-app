import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const FLOOR_PLAN =
  'https://cdn.poehali.dev/projects/fef38da0-aab8-4361-b32b-4f75467b4a32/files/9db68242-38ed-429b-b150-6142209fcc89.jpg';

const signals = [
  {
    code: 'SIG-01',
    name: 'Непрерывный сигнал',
    pattern: 'Длинный гудок без пауз',
    meaning: 'Полная эвакуация здания. Немедленно покиньте помещение.',
    level: 'danger',
    icon: 'Siren',
  },
  {
    code: 'SIG-02',
    name: 'Прерывистый сигнал',
    pattern: '2 сек звук / 1 сек пауза',
    meaning: 'Внимание, угроза. Готовьтесь к эвакуации, ждите указаний.',
    level: 'signal',
    icon: 'AlertTriangle',
  },
  {
    code: 'SIG-03',
    name: 'Короткие импульсы',
    pattern: '5 коротких сигналов',
    meaning: 'Локальная тревога. Эвакуация одного сектора или этажа.',
    level: 'signal',
    icon: 'BellRing',
  },
  {
    code: 'SIG-04',
    name: 'Отбой',
    pattern: 'Голосовое сообщение «Отбой»',
    meaning: 'Угроза устранена. Возвращение в помещения разрешено.',
    level: 'safe',
    icon: 'CircleCheck',
  },
];

const steps = [
  { t: 'Сохраняйте спокойствие', d: 'Не поддавайтесь панике. Прекратите работу и отключите оборудование.' },
  { t: 'Определите сигнал', d: 'Сверьте звук с таблицей сигналов и оцените тип угрозы.' },
  { t: 'Двигайтесь к выходу', d: 'Используйте ближайший эвакуационный выход. Не пользуйтесь лифтом.' },
  { t: 'Помогите рядом', d: 'Поддержите тех, кому нужна помощь. Двигайтесь организованно.' },
  { t: 'Точка сбора', d: 'Соберитесь на безопасной площадке и дождитесь переклички.' },
];

const contacts = [
  { name: 'Единая служба спасения', phone: '112', icon: 'Phone', tag: 'Экстренно' },
  { name: 'Пожарная охрана', phone: '101', icon: 'Flame', tag: 'МЧС' },
  { name: 'Служба безопасности', phone: '+7 (495) 000-00-00', icon: 'ShieldCheck', tag: 'Здание' },
  { name: 'Дежурный администратор', phone: '+7 (495) 000-00-01', icon: 'UserCog', tag: 'Объект' },
];

const exits = [
  { id: 'A', label: 'Главный выход', floor: '1 этаж · холл', dist: '40 м', status: 'open' },
  { id: 'B', label: 'Запасной выход', floor: '1 этаж · восток', dist: '25 м', status: 'open' },
  { id: 'C', label: 'Лестница №2', floor: 'все этажи', dist: '15 м', status: 'open' },
  { id: 'D', label: 'Пожарный выход', floor: '2 этаж · север', dist: '60 м', status: 'blocked' },
];

const levelColor: Record<string, string> = {
  danger: 'text-danger border-danger/40',
  signal: 'text-signal border-signal/40',
  safe: 'text-safe border-safe/40',
};

const Index = () => {
  const [time, setTime] = useState(new Date());
  const [alarm, setAlarm] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!alarm) return;
    const t = setTimeout(() => setAlarm(false), 8000);
    return () => clearTimeout(t);
  }, [alarm]);

  const clock = time.toLocaleTimeString('ru-RU');

  return (
    <div className={`min-h-screen relative ${alarm ? 'animate-alarm-flash' : ''}`}>
      <div className="absolute inset-0 grid-texture opacity-[0.35] pointer-events-none" />

      {/* push-уведомление */}
      {alarm && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-slide-down">
          <div className="bg-danger text-white rounded-lg shadow-2xl border border-white/20 p-4 flex gap-3 items-start">
            <div className="mt-0.5 animate-pulse">
              <Icon name="Siren" size={26} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest opacity-80 font-mono">
                <span>Push · Система оповещения</span>
              </div>
              <p className="font-display text-lg font-600 leading-tight mt-0.5">ТРЕВОГА · ЭВАКУАЦИЯ</p>
              <p className="text-sm text-white/90 mt-1">
                Сработал сигнал SIG-01. Немедленно покиньте здание через ближайший выход.
              </p>
            </div>
            <button onClick={() => setAlarm(false)} className="opacity-70 hover:opacity-100">
              <Icon name="X" size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 container max-w-6xl py-8 md:py-12">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-md bg-signal flex items-center justify-center text-signal-foreground">
              <Icon name="ShieldAlert" size={24} />
            </div>
            <div>
              <h1 className="font-display text-xl md:text-2xl font-600 tracking-wide uppercase leading-none">
                EVAC<span className="text-signal">·</span>SYSTEM
              </h1>
              <p className="text-xs text-muted-foreground font-mono mt-1">Система оповещения об эвакуации</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-mono text-lg leading-none text-foreground">{clock}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Объект №1 · Москва</p>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-safe animate-pulse" />
              <span className="text-xs font-mono text-safe">ONLINE</span>
            </div>
          </div>
        </header>

        {/* STATUS BAR */}
        <section
          className="mt-6 rounded-lg border border-border bg-card overflow-hidden animate-fade-in"
          style={{ animationDelay: '80ms' }}
        >
          <div className="hazard-stripes h-1.5 w-full opacity-60" />
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
            {[
              { l: 'Статус системы', v: alarm ? 'ТРЕВОГА' : 'Норма', c: alarm ? 'text-danger' : 'text-safe', i: 'Activity' },
              { l: 'Датчики', v: '128 / 128', c: 'text-foreground', i: 'Radar' },
              { l: 'Выходы свободны', v: '3 из 4', c: 'text-signal', i: 'DoorOpen' },
              { l: 'Готовность', v: '98%', c: 'text-foreground', i: 'BatteryFull' },
            ].map((s) => (
              <div key={s.l} className="p-4 flex items-center gap-3">
                <Icon name={s.i} size={20} className="text-muted-foreground" />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.l}</p>
                  <p className={`font-display text-lg font-600 ${s.c}`}>{s.v}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ALARM TRIGGER */}
        <section
          className="mt-6 rounded-lg border border-signal/40 bg-card p-5 flex flex-col sm:flex-row items-center gap-4 animate-fade-in"
          style={{ animationDelay: '160ms' }}
        >
          <div className="flex-1 text-center sm:text-left">
            <p className="font-display text-lg font-600 uppercase tracking-wide">Тестовое оповещение</p>
            <p className="text-sm text-muted-foreground">
              Запустите симуляцию push-уведомления, чтобы проверить готовность персонала.
            </p>
          </div>
          <button
            onClick={() => setAlarm(true)}
            className="animate-pulse-ring bg-signal text-signal-foreground font-display font-600 uppercase tracking-wider px-6 py-3 rounded-md hover:brightness-110 transition flex items-center gap-2"
          >
            <Icon name="Siren" size={18} />
            Запустить сигнал
          </button>
        </section>

        {/* SIGNALS */}
        <section className="mt-10 animate-fade-in" style={{ animationDelay: '220ms' }}>
          <h2 className="font-display text-2xl font-600 uppercase tracking-wide flex items-center gap-2">
            <Icon name="AudioLines" className="text-signal" size={22} /> Типы сигналов
          </h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            {signals.map((s) => (
              <div
                key={s.code}
                className={`rounded-lg border bg-card p-5 ${levelColor[s.level]} border-border hover:border-signal/40 transition`}
              >
                <div className="flex items-start justify-between">
                  <Icon name={s.icon} size={26} className={levelColor[s.level].split(' ')[0]} />
                  <span className="font-mono text-xs text-muted-foreground">{s.code}</span>
                </div>
                <h3 className="font-display text-lg font-600 mt-3 text-foreground">{s.name}</h3>
                <p className="text-xs font-mono text-muted-foreground mt-1">{s.pattern}</p>
                <p className="text-sm text-foreground/80 mt-2">{s.meaning}</p>
              </div>
            ))}
          </div>
        </section>

        {/* STEPS */}
        <section className="mt-10 animate-fade-in" style={{ animationDelay: '280ms' }}>
          <h2 className="font-display text-2xl font-600 uppercase tracking-wide flex items-center gap-2">
            <Icon name="ListOrdered" className="text-signal" size={22} /> Порядок действий
          </h2>
          <div className="mt-4 space-y-px rounded-lg overflow-hidden border border-border">
            {steps.map((s, i) => (
              <div key={s.t} className="flex gap-4 bg-card p-4 hover:bg-secondary transition">
                <div className="font-display text-2xl font-700 text-signal w-10 shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <p className="font-display font-600 uppercase tracking-wide text-foreground">{s.t}</p>
                  <p className="text-sm text-muted-foreground">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* MAP + EXITS */}
        <section className="mt-10 grid lg:grid-cols-5 gap-6 animate-fade-in" style={{ animationDelay: '340ms' }}>
          <div className="lg:col-span-3">
            <h2 className="font-display text-2xl font-600 uppercase tracking-wide flex items-center gap-2">
              <Icon name="Map" className="text-signal" size={22} /> Карта эвакуации
            </h2>
            <div className="mt-4 rounded-lg border border-border overflow-hidden bg-card relative">
              <img src={FLOOR_PLAN} alt="План эвакуации" className="w-full object-cover aspect-video" />
              <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur border border-border rounded px-3 py-1.5 text-xs font-mono flex gap-3">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-signal" /> Маршрут</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-safe" /> Выход</span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl font-600 uppercase tracking-wide flex items-center gap-2">
              <Icon name="DoorOpen" className="text-signal" size={22} /> Выходы
            </h2>
            <div className="mt-4 space-y-3">
              {exits.map((e) => (
                <div key={e.id} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-md flex items-center justify-center font-display font-700 ${
                      e.status === 'open' ? 'bg-safe/15 text-safe' : 'bg-danger/15 text-danger'
                    }`}
                  >
                    {e.id}
                  </div>
                  <div className="flex-1">
                    <p className="font-600 text-sm text-foreground">{e.label}</p>
                    <p className="text-xs text-muted-foreground">{e.floor}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-foreground">{e.dist}</p>
                    <p className={`text-[11px] uppercase ${e.status === 'open' ? 'text-safe' : 'text-danger'}`}>
                      {e.status === 'open' ? 'Открыт' : 'Закрыт'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACTS */}
        <section className="mt-10 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <h2 className="font-display text-2xl font-600 uppercase tracking-wide flex items-center gap-2">
            <Icon name="PhoneCall" className="text-signal" size={22} /> Экстренные контакты
          </h2>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contacts.map((c) => (
              <a
                key={c.name}
                href={`tel:${c.phone.replace(/[^+\d]/g, '')}`}
                className="rounded-lg border border-border bg-card p-5 hover:border-signal/40 hover:bg-secondary transition group"
              >
                <div className="flex items-center justify-between">
                  <Icon name={c.icon} size={24} className="text-signal" />
                  <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
                    {c.tag}
                  </span>
                </div>
                <p className="font-600 text-sm mt-3 text-foreground">{c.name}</p>
                <p className="font-display text-2xl font-600 text-foreground mt-1 group-hover:text-signal transition">
                  {c.phone}
                </p>
              </a>
            ))}
          </div>
        </section>

        <footer className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground font-mono">
          <span>EVAC·SYSTEM · v1.0</span>
          <span>Соответствует требованиям пожарной безопасности · ФЗ-123</span>
        </footer>
      </div>
    </div>
  );
};

export default Index;
