import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const URL_AUTH = 'https://functions.poehali.dev/d0a9011f-4bcb-406e-afc6-8428acb42c78';

const AdminLogin = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDigit = (d: string) => {
    if (pin.length >= 6) return;
    setPin((p) => p + d);
    setError('');
  };

  const handleDelete = () => setPin((p) => p.slice(0, -1));

  const handleSubmit = async () => {
    if (!pin) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(URL_AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem('admin_token', data.token);
        navigate('/admin');
      } else {
        setError('Неверный пин-код');
        setPin('');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative">
      <div className="absolute inset-0 grid-texture opacity-[0.35] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xs flex flex-col items-center gap-8 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-md bg-signal flex items-center justify-center text-signal-foreground">
            <Icon name="ShieldAlert" size={28} />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-600 tracking-wide uppercase">
              EVAC<span className="text-signal">·</span>SYSTEM
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-1 uppercase tracking-wider">
              Вход для администратора
            </p>
          </div>
        </div>

        {/* Pin dots */}
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-full border-2 transition-all duration-200 ${
                i < pin.length
                  ? 'bg-signal border-signal scale-110'
                  : 'border-border bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Error */}
        <div className="h-5">
          {error && (
            <p className="text-danger text-sm font-mono flex items-center gap-1.5 animate-fade-in">
              <Icon name="AlertCircle" size={14} /> {error}
            </p>
          )}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />;
            if (d === 'del') return (
              <button
                key={i}
                onClick={handleDelete}
                disabled={!pin || loading}
                className="h-16 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-signal/50 transition flex items-center justify-center disabled:opacity-30"
              >
                <Icon name="Delete" size={20} />
              </button>
            );
            return (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                disabled={loading}
                className="h-16 rounded-lg border border-border bg-card font-display text-2xl font-600 text-foreground hover:border-signal/60 hover:bg-secondary transition active:scale-95 disabled:opacity-30"
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Enter */}
        <button
          onClick={handleSubmit}
          disabled={!pin || loading}
          className="w-full h-13 py-3 bg-signal text-signal-foreground font-display font-600 uppercase tracking-wider rounded-lg hover:brightness-110 transition disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading
            ? <><Icon name="Loader" size={18} className="animate-spin" /> Проверка…</>
            : <><Icon name="LogIn" size={18} /> Войти</>
          }
        </button>

        <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1">
          <Icon name="ArrowLeft" size={13} /> Вернуться на главную
        </a>
      </div>
    </div>
  );
};

export default AdminLogin;
