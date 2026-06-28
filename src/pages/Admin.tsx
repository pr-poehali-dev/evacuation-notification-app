import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const URL_AUTH = 'https://functions.poehali.dev/d0a9011f-4bcb-406e-afc6-8428acb42c78';
const URL_ALARM = 'https://functions.poehali.dev/95f23561-d097-4f8f-a8b0-bfda497fd88c';

type Signal = {
  code: string;
  name: string;
  pattern: string;
  meaning: string;
  level: 'danger' | 'signal' | 'safe';
  icon: string;
  enabled: boolean;
};

const defaultSignals: Signal[] = [
  { code: 'SIG-01', name: 'Непрерывный сигнал', pattern: 'Длинный гудок без пауз', meaning: 'Полная эвакуация здания. Немедленно покиньте помещение.', level: 'danger', icon: 'Siren', enabled: true },
  { code: 'SIG-02', name: 'Прерывистый сигнал', pattern: '2 сек звук / 1 сек пауза', meaning: 'Внимание, угроза. Готовьтесь к эвакуации, ждите указаний.', level: 'signal', icon: 'AlertTriangle', enabled: true },
  { code: 'SIG-03', name: 'Короткие импульсы', pattern: '5 коротких сигналов', meaning: 'Локальная тревога. Эвакуация одного сектора или этажа.', level: 'signal', icon: 'BellRing', enabled: true },
  { code: 'SIG-04', name: 'Отбой', pattern: 'Голосовое сообщение «Отбой»', meaning: 'Угроза устранена. Возвращение в помещения разрешено.', level: 'safe', icon: 'CircleCheck', enabled: true },
];

const levelColor: Record<string, string> = {
  danger: 'text-danger',
  signal: 'text-signal',
  safe: 'text-safe',
};

const levelBg: Record<string, string> = {
  danger: 'bg-danger/10 border-danger/30',
  signal: 'bg-signal/10 border-signal/30',
  safe: 'bg-safe/10 border-safe/30',
};

type AlarmStatus = 'idle' | 'sending' | 'sent' | 'error';

const Admin = () => {
  const navigate = useNavigate();
  const [signals, setSignals] = useState<Signal[]>(defaultSignals);
  const [selectedSignal, setSelectedSignal] = useState<Signal>(defaultSignals[0]);
  const [customMessage, setCustomMessage] = useState('');
  const [alarmStatus, setAlarmStatus] = useState<AlarmStatus>('idle');
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Signal>>({});

  const token = sessionStorage.getItem('admin_token') || '';

  // Проверяем токен при входе
  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    fetch(URL_AUTH, { headers: { 'X-Admin-Token': token } })
      .then(r => r.json())
      .then(d => { if (!d.valid) navigate('/admin/login'); })
      .catch(() => navigate('/admin/login'));
  }, [token, navigate]);

  const logout = () => {
    sessionStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const sendAlarm = useCallback(async () => {
    setAlarmStatus('sending');
    setConfirmOpen(false);
    try {
      const message = customMessage.trim() || selectedSignal.meaning;
      const res = await fetch(URL_ALARM, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ signal_code: selectedSignal.code, message }),
      });
      const data = await res.json();
      if (res.ok) {
        setSentCount(data.sent ?? 0);
        setAlarmStatus('sent');
      } else {
        setAlarmStatus('error');
      }
    } catch {
      setAlarmStatus('error');
    }
    setTimeout(() => { setAlarmStatus('idle'); setSentCount(null); }, 8000);
  }, [selectedSignal, customMessage, token]);

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditDraft({ ...signals[idx] });
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    setSignals(prev => prev.map((s, i) => i === editingIdx ? { ...s, ...editDraft } as Signal : s));
    if (signals[editingIdx].code === selectedSignal.code) {
      setSelectedSignal({ ...signals[editingIdx], ...editDraft } as Signal);
    }
    setEditingIdx(null);
  };

  const toggleSignal = (idx: number) => {
    setSignals(prev => prev.map((s, i) => i === idx ? { ...s, enabled: !s.enabled } : s));
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 grid-texture opacity-[0.35] pointer-events-none" />

      <div className="relative z-10 container max-w-5xl py-8">

        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-border pb-5 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-signal flex items-center justify-center text-signal-foreground">
              <Icon name="ShieldAlert" size={20} />
            </div>
            <div>
              <h1 className="font-display text-xl font-600 tracking-wide uppercase leading-none">
                EVAC<span className="text-signal">·</span>SYSTEM
              </h1>
              <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
                Панель администратора
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1.5 border border-border rounded-md px-3 py-2">
              <Icon name="LayoutDashboard" size={14} /> Главная
            </a>
            <button onClick={logout} className="text-xs text-muted-foreground hover:text-danger transition flex items-center gap-1.5 border border-border rounded-md px-3 py-2">
              <Icon name="LogOut" size={14} /> Выйти
            </button>
          </div>
        </header>

        <div className="mt-8 grid lg:grid-cols-5 gap-6">

          {/* LEFT: Сигналы */}
          <div className="lg:col-span-3 space-y-5">
            <div className="flex items-center gap-2">
              <Icon name="AudioLines" size={20} className="text-signal" />
              <h2 className="font-display text-xl font-600 uppercase tracking-wide">Типы сигналов</h2>
            </div>

            <div className="space-y-3">
              {signals.map((s, idx) => (
                <div
                  key={s.code}
                  className={`rounded-lg border bg-card transition ${
                    selectedSignal.code === s.code && s.enabled
                      ? levelBg[s.level]
                      : 'border-border'
                  } ${!s.enabled ? 'opacity-50' : ''}`}
                >
                  {editingIdx === idx ? (
                    /* Редактирование */
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">Название</label>
                          <input
                            className="mt-1 w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-signal"
                            value={editDraft.name || ''}
                            onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">Паттерн звука</label>
                          <input
                            className="mt-1 w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-signal"
                            value={editDraft.pattern || ''}
                            onChange={e => setEditDraft(d => ({ ...d, pattern: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">Описание действий</label>
                        <textarea
                          className="mt-1 w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground outline-none focus:border-signal resize-none"
                          rows={2}
                          value={editDraft.meaning || ''}
                          onChange={e => setEditDraft(d => ({ ...d, meaning: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="bg-signal text-signal-foreground text-xs font-display font-600 uppercase px-4 py-2 rounded-md hover:brightness-110 transition flex items-center gap-1.5">
                          <Icon name="Check" size={14} /> Сохранить
                        </button>
                        <button onClick={() => setEditingIdx(null)} className="text-xs text-muted-foreground border border-border px-4 py-2 rounded-md hover:text-foreground transition">
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Просмотр */
                    <div
                      className="p-4 flex gap-3 cursor-pointer"
                      onClick={() => s.enabled && setSelectedSignal(s)}
                    >
                      <Icon name={s.icon} size={24} className={`shrink-0 mt-0.5 ${levelColor[s.level]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-600 text-sm uppercase tracking-wide text-foreground">{s.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{s.code}</span>
                          {selectedSignal.code === s.code && s.enabled && (
                            <span className="text-[10px] bg-signal/20 text-signal font-mono px-1.5 py-0.5 rounded">выбран</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.pattern}</p>
                        <p className="text-sm text-foreground/70 mt-1">{s.meaning}</p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => startEdit(idx)}
                          className="h-8 w-8 flex items-center justify-center border border-border rounded-md text-muted-foreground hover:text-signal hover:border-signal/50 transition"
                          title="Редактировать"
                        >
                          <Icon name="Pencil" size={14} />
                        </button>
                        <button
                          onClick={() => toggleSignal(idx)}
                          className={`h-8 w-8 flex items-center justify-center border rounded-md transition ${s.enabled ? 'border-border text-muted-foreground hover:text-danger hover:border-danger/50' : 'border-safe/40 text-safe'}`}
                          title={s.enabled ? 'Отключить' : 'Включить'}
                        >
                          <Icon name={s.enabled ? 'EyeOff' : 'Eye'} size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Запуск тревоги */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-2">
              <Icon name="Siren" size={20} className="text-danger" />
              <h2 className="font-display text-xl font-600 uppercase tracking-wide">Запуск тревоги</h2>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              {/* Выбранный сигнал */}
              <div className={`rounded-md border p-3 ${levelBg[selectedSignal.level]}`}>
                <div className="flex items-center gap-2">
                  <Icon name={selectedSignal.icon} size={18} className={levelColor[selectedSignal.level]} />
                  <span className="font-display font-600 uppercase text-sm">{selectedSignal.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{selectedSignal.code} · {selectedSignal.pattern}</p>
              </div>

              {/* Кастомное сообщение */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
                  Текст оповещения
                </label>
                <textarea
                  className="mt-1.5 w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground outline-none focus:border-signal resize-none"
                  rows={3}
                  placeholder={selectedSignal.meaning}
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Оставьте пустым — отправится стандартное описание</p>
              </div>

              {/* Статус */}
              {alarmStatus === 'sent' && (
                <div className="flex items-center gap-2 text-safe text-sm animate-fade-in">
                  <Icon name="CircleCheck" size={16} />
                  Тревога отправлена · {sentCount} устройств
                </div>
              )}
              {alarmStatus === 'error' && (
                <div className="flex items-center gap-2 text-danger text-sm animate-fade-in">
                  <Icon name="CircleX" size={16} />
                  Ошибка. Проверьте соединение.
                </div>
              )}

              {/* Кнопка */}
              {!confirmOpen ? (
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={alarmStatus === 'sending'}
                  className="w-full py-3 bg-danger text-white font-display font-600 uppercase tracking-wider rounded-md hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {alarmStatus === 'sending'
                    ? <><Icon name="Loader" size={16} className="animate-spin" /> Отправка…</>
                    : <><Icon name="Siren" size={16} /> Запустить {selectedSignal.code}</>
                  }
                </button>
              ) : (
                <div className="border border-danger/40 rounded-md p-4 space-y-3 animate-fade-in">
                  <p className="text-sm font-600 text-foreground flex items-center gap-1.5">
                    <Icon name="TriangleAlert" size={16} className="text-danger" />
                    Подтвердите запуск тревоги
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Push-уведомление уйдёт на все подписанные устройства. Это действие нельзя отменить.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={sendAlarm}
                      className="flex-1 py-2.5 bg-danger text-white font-display font-600 uppercase text-sm rounded-md hover:brightness-110 transition flex items-center justify-center gap-2"
                    >
                      <Icon name="Zap" size={15} /> Подтвердить
                    </button>
                    <button
                      onClick={() => setConfirmOpen(false)}
                      className="flex-1 py-2.5 border border-border text-muted-foreground hover:text-foreground text-sm rounded-md transition"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Подсказка */}
            <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground space-y-1.5">
              <p className="flex items-center gap-1.5 font-600 text-foreground">
                <Icon name="Info" size={14} className="text-signal" /> Как использовать
              </p>
              <p>Выберите тип сигнала слева → при необходимости укажите свой текст → нажмите «Запустить».</p>
              <p>Иконка <Icon name="Pencil" size={12} className="inline" /> — редактировать описание сигнала.</p>
              <p>Иконка <Icon name="EyeOff" size={12} className="inline" /> — скрыть сигнал с главной страницы.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
