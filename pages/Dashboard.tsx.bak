import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface DashboardProps {
  session: Session;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Server {
  id: string;
  status_server: 'creating' | 'running' | 'stopped' | 'error' | 'deleted';
  ip: string | null;
  port: number | null;
  server_name: string | null;
  mc_version: string | null;
  server_type: string | null;
  created_at?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ session: initialSession }) => {
  const navigate = useNavigate();
  const [activeServer, setActiveServer] = useState<Server | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingServerLoading, setIsCreatingServerLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '¡Hola! Soy tu asistente de CloudCraft. ¿Qué tipo de servidor de Minecraft te gustaría desplegar hoy? (Vanilla, Paper, Forge...)' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Usamos el usuario de la sesión actual
  const user = initialSession.user;

  useEffect(() => {
    const initDashboard = async () => {
      setIsLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/', { replace: true });
        return;
      }

      // Consulta inicial de servidor activo con los nuevos campos
      const fetchActiveServer = async () => {
        const { data, error } = await supabase
          .from('mc_servers')
          .select('id, status_server, ip, port, server_name, mc_version, server_type, created_at')
          .eq('user_id', session.user.id)
          .in('status_server', ['creating', 'running'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching active server:', error);
        } else {
          setActiveServer(data as Server | null);
        }
        setIsLoading(false);
      };

      await fetchActiveServer();

      // Suscripción en tiempo real a cambios en mc_servers para este usuario
      const channel = supabase
        .channel(`mc_servers_user_${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mc_servers',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            const newServer = payload.new as Server;
            if (['creating', 'running'].includes(newServer.status_server)) {
              setActiveServer(newServer);
            } else {
              // Si el servidor actual deja de estar activo, limpiar estado
              setActiveServer((current) => (current?.id === newServer.id ? null : current));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    initDashboard();
  }, [navigate]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const response = await fetch('https://snack55-n8n1.q7pa8v.easypanel.host/webhook/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          user_id: user.id
        })
      });

      if (!response.ok) throw new Error("Fallo en la respuesta del servidor.");

      const data = await response.json();

      // Lógica crítica de creación
      if (data.status === 'creating') {
        setIsChatOpen(false);
        setIsCreatingServerLoading(true);
        
        // Pantalla de carga persistente por al menos 5 segundos
        setTimeout(() => {
          setIsCreatingServerLoading(false);
          const target = data.redirect || '/dashboard';
          // Solo navegar si el target es diferente para evitar recargas innecesarias
          if (target !== '/dashboard' && !window.location.pathname.includes(target)) {
            navigate(target);
          }
        }, 5000);
        return; 
      }

      const assistantText = data.response || data.output || data.message || "Solicitud recibida. Estoy preparando tu servidor Minecraft.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantText }]);
    } catch (err) {
      console.error("Error de red n8n:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Error de conexión con el sistema de despliegue. Por favor, inténtalo de nuevo." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'creating': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'error': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* PANTALLA DE CARGA DE CREACIÓN (OVERLAY) */}
      {isCreatingServerLoading && (
        <div className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-t-indigo-500 rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Creando tu servidor...</h2>
            <p className="text-zinc-500 text-sm">Esto tomará solo unos momentos.</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <span className="font-bold tracking-tight text-white">CloudCraft</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cuenta</span>
              <span className="text-sm font-medium text-zinc-300">{user.email}</span>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors" title="Cerrar sesión">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* SECCIÓN PRINCIPAL */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Dashboard de Servidores</h2>
              <p className="text-zinc-500 text-sm mt-1">
                {activeServer ? 'Gestiona tu instancia activa.' : 'Despliega tu infraestructura instantáneamente.'}
              </p>
            </div>
            
            <button 
              disabled={isLoading || !!activeServer}
              onClick={() => setIsChatOpen(true)}
              className="bg-white text-zinc-950 px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-all flex items-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo servidor
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-zinc-500 text-sm">Sincronizando con la infraestructura...</p>
            </div>
          ) : activeServer ? (
            /* TARJETA DE SERVIDOR ACTIVO */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="p-8 border-b border-zinc-800 bg-zinc-900/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12l4-4m-4 4l4 4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {activeServer.server_name || `Servidor ${activeServer.id.slice(0, 8)}`}
                        </h3>
                        <p className="text-zinc-500 text-xs">
                          {activeServer.server_type || 'Minecraft'} {activeServer.mc_version ? `• v${activeServer.mc_version}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className={`self-start sm:self-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1.5 ${getStatusColor(activeServer.status_server)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full bg-current ${activeServer.status_server === 'creating' ? 'animate-pulse' : ''}`}></span>
                      {activeServer.status_server === 'creating' ? 'Creando...' : 'En ejecución'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Dirección IP</span>
                      <span className="font-mono text-zinc-200">{activeServer.ip || 'Asignando...'}</span>
                    </div>
                    <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Puerto</span>
                      <span className="font-mono text-zinc-200">{activeServer.port || '---'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-8 flex items-center justify-between bg-zinc-900/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-zinc-500 font-medium">Instancia optimizada activa</span>
                  </div>
                  <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest">
                    Ver logs en vivo
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden backdrop-blur-sm">
                <div className="relative z-10">
                  <h4 className="font-bold text-white mb-2">Recursos de Instancia</h4>
                  <p className="text-zinc-500 text-sm mb-6">Configuración de alto rendimiento.</p>
                  
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-sm text-zinc-300">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      4GB RAM DDR4
                    </li>
                    <li className="flex items-center gap-3 text-sm text-zinc-300">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      CPU de 3.2GHz+
                    </li>
                    <li className="flex items-center gap-3 text-sm text-zinc-300">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      20GB SSD Almacenamiento
                    </li>
                  </ul>
                </div>
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 blur-[80px] rounded-full"></div>
              </div>
            </div>
          ) : (
            /* ESTADO VACÍO */
            <div className="bg-zinc-900/20 border-2 border-dashed border-zinc-800/50 rounded-3xl p-16 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 text-zinc-700 shadow-xl">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">No tienes servidores activos</h3>
              <p className="text-zinc-500 mt-2 max-w-sm">
                Pulsa el botón superior para desplegar tu primera instancia de Minecraft en segundos.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* CHAT DE DESPLIEGUE */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsChatOpen(false)}></div>
          
          <div className="relative w-full max-w-2xl h-[600px] max-h-full bg-zinc-950 border border-zinc-800 shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Asistente CloudCraft</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">En línea</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 rounded-tr-none' 
                      : 'bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none p-4 flex gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800 bg-zinc-950">
              <div className="flex gap-3">
                <input 
                  autoFocus
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ej: Instala un servidor Vanilla 1.21..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-zinc-600 text-white"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-indigo-600/20"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-900/50 text-center text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em]">
        CloudCraft Infrastructure &bull; Automated Deployment System
      </footer>
    </div>
  );
};

export default Dashboard;