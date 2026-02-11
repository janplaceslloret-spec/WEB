
import React from 'react';
import { supabase } from '../services/supabaseClient';

const LandingPage: React.FC = () => {
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in with Google:', error);
      alert('Error connecting to Google. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">CloudCraft</span>
        </div>
        <div>
          <button 
            onClick={handleGoogleLogin}
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Iniciar sesión
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 pt-24 pb-32 text-center relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full -z-10 opacity-50"></div>
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Despliegue Instantáneo</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent leading-tight">
          Crea tu servidor de <br className="hidden md:block" />
          Minecraft en segundos
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Potencia tu mundo con la infraestructura de Google Cloud. Automatización total, backups automáticos y rendimiento sin lag.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleGoogleLogin}
            className="group relative flex items-center gap-3 bg-white text-zinc-950 px-8 py-4 rounded-xl font-bold transition-all hover:bg-zinc-200 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Empezar con Google
          </button>
          
          <button className="px-8 py-4 rounded-xl font-semibold border border-zinc-800 text-zinc-400 hover:bg-zinc-900 transition-colors">
            Ver características
          </button>
        </div>

        {/* Floating elements simulation */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 text-left opacity-60">
          {[
            { label: 'Uptime', value: '99.9%' },
            { label: 'Latencia', value: '< 20ms' },
            { label: 'Backups', value: 'Cada 4h' },
            { label: 'Soporte', value: '24/7' }
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40">
              <div className="text-zinc-500 text-sm mb-1">{stat.label}</div>
              <div className="text-white font-bold">{stat.value}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="fixed bottom-0 w-full px-6 py-6 text-center text-zinc-600 text-sm">
        &copy; 2024 CloudCraft Infrastructure. Built with Google Cloud.
      </footer>
    </div>
  );
};

export default LandingPage;
