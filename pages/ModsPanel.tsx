import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ServerMod {
  id: string;
  server_id: string;
  mod_id: string | null;
  mod_name: string;
  version: string | null;
  file_name: string | null;
  source: string;
  status: 'installing' | 'installed' | 'uninstalling' | 'error';
  error_msg: string | null;
  installed_at: string;
}

interface ModSearchResult {
  id: string;
  name: string;
  description: string;
  downloads: number;
  icon_url: string | null;
  source: 'modrinth' | 'curseforge';
  categories: string[];
  game_versions: string[];
  latest_version?: string;
}

interface ModsPanelProps {
  serverId: string;
  serverType: string | null;
  mcVersion: string | null;
}

// ─── N8N Webhook URLs ─────────────────────────────────────────────────────────
const N8N_BASE = 'https://snack55-n8n1.q7pa8v.easypanel.host/webhook';
const INSTALL_WEBHOOK   = `${N8N_BASE}/install-mod`;
const UNINSTALL_WEBHOOK = `${N8N_BASE}/uninstall-mod`;

// ─── Modrinth API (pública, sin key) ─────────────────────────────────────────
const MODRINTH_API = 'https://api.modrinth.com/v2';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loaderFromServerType(type: string | null): string {
  switch (type?.toLowerCase()) {
    case 'forge':   return 'forge';
    case 'fabric':  return 'fabric';
    case 'paper':
    case 'spigot':  return 'paper';
    default:        return 'fabric';
  }
}

function statusBadge(status: ServerMod['status']) {
  switch (status) {
    case 'installing':
      return (
        <span className="flex items-center gap-1 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          Instalando
        </span>
      );
    case 'installed':
      return (
        <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Instalado
        </span>
      );
    case 'uninstalling':
      return (
        <span className="flex items-center gap-1 text-orange-400 text-[10px] font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
          Desinstalando
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1 text-red-400 text-[10px] font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
          Error
        </span>
      );
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

const ModsPanel: React.FC<ModsPanelProps> = ({ serverId, serverType, mcVersion }) => {
  const [installedMods, setInstalledMods]   = useState<ServerMod[]>([]);
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchResults, setSearchResults]   = useState<ModSearchResult[]>([]);
  const [isSearching, setIsSearching]       = useState(false);
  const [loadingMods, setLoadingMods]       = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab]           = useState<'installed' | 'search'>('installed');
  const [initLoading, setInitLoading]       = useState(true);
  const [error, setError]                   = useState<string | null>(null);

  // ── Cargar mods instalados desde Supabase ──
  const fetchInstalledMods = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('server_mods')
      .select('*')
      .eq('server_id', serverId)
      .order('installed_at', { ascending: false });

    if (err) {
      console.error('Error cargando mods:', err);
      setError('No se pudieron cargar los mods instalados.');
    } else {
      setInstalledMods((data as ServerMod[]) || []);
    }
    setInitLoading(false);
  }, [serverId]);

  useEffect(() => {
    fetchInstalledMods();

    // Suscripción realtime
    const channel = supabase
      .channel(`server_mods_${serverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'server_mods', filter: `server_id=eq.${serverId}` },
        () => fetchInstalledMods()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [serverId, fetchInstalledMods]);

  // ── Búsqueda en Modrinth ──
  useEffect(() => {
    if (!searchQuery.trim() || activeTab !== 'search') {
      setSearchResults([]);
      return;
    }

    const delay = setTimeout(async () => {
      setIsSearching(true);
      try {
        const loader  = loaderFromServerType(serverType);
        const version = mcVersion || '';

        const facets: string[][] = [['project_type:mod']];
        if (loader && loader !== 'paper') facets.push([`categories:${loader}`]);
        if (version) facets.push([`versions:${version}`]);

        const params = new URLSearchParams({
          query: searchQuery,
          facets: JSON.stringify(facets),
          limit: '12',
        });

        const res  = await fetch(`${MODRINTH_API}/search?${params}`);
        const data = await res.json();

        const results: ModSearchResult[] = (data.hits || []).map((h: any) => ({
          id:             h.project_id,
          name:           h.title,
          description:    h.description,
          downloads:      h.downloads,
          icon_url:       h.icon_url || null,
          source:         'modrinth' as const,
          categories:     h.categories || [],
          game_versions:  h.versions  || [],
          latest_version: h.versions?.[0] || undefined,
        }));

        setSearchResults(results);
      } catch (e) {
        console.error('Error buscando mods:', e);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delay);
  }, [searchQuery, serverType, mcVersion, activeTab]);

  // ── Instalar mod ──
  const handleInstall = async (mod: ModSearchResult) => {
    setLoadingMods(prev => ({ ...prev, [mod.id]: true }));
    try {
      // Insertar en Supabase con status 'installing' de inmediato (optimistic)
      await supabase.from('server_mods').insert({
        server_id: serverId,
        mod_id:    mod.id,
        mod_name:  mod.name,
        source:    mod.source,
        status:    'installing',
      });

      // Llamar al webhook de n8n
      const res = await fetch(INSTALL_WEBHOOK, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_id:  serverId,
          mod_id:     mod.id,
          mod_name:   mod.name,
          source:     mod.source,
          mc_version: mcVersion,
          loader:     loaderFromServerType(serverType),
        }),
      });

      if (!res.ok) throw new Error(`n8n respondió ${res.status}`);
      // n8n actualizará el status a 'installed' en Supabase cuando termine
    } catch (e: any) {
      console.error('Error instalando mod:', e);
      // Marcar como error en Supabase
      await supabase
        .from('server_mods')
        .update({ status: 'error', error_msg: e.message })
        .eq('server_id', serverId)
        .eq('mod_id', mod.id);
    } finally {
      setLoadingMods(prev => ({ ...prev, [mod.id]: false }));
    }
  };

  // ── Desinstalar mod ──
  const handleUninstall = async (mod: ServerMod) => {
    setLoadingMods(prev => ({ ...prev, [mod.id]: true }));
    try {
      // Marcar como 'uninstalling' de inmediato
      await supabase
        .from('server_mods')
        .update({ status: 'uninstalling' })
        .eq('id', mod.id);

      // Llamar al webhook de n8n
      const res = await fetch(UNINSTALL_WEBHOOK, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_id: serverId,
          mod_db_id: mod.id,
          file_name: mod.file_name,
          mod_name:  mod.mod_name,
        }),
      });

      if (!res.ok) throw new Error(`n8n respondió ${res.status}`);
      // n8n borrará el registro de Supabase cuando termine
    } catch (e: any) {
      console.error('Error desinstalando mod:', e);
      await supabase
        .from('server_mods')
        .update({ status: 'error', error_msg: e.message })
        .eq('id', mod.id);
    } finally {
      setLoadingMods(prev => ({ ...prev, [mod.id]: false }));
    }
  };

  // ── Saber si un mod ya está instalado (por mod_id) ──
  const isInstalled = (modId: string) =>
    installedMods.some(m => m.mod_id === modId && m.status !== 'error');

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center text-violet-400 border border-violet-500/20">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-white">Mods</h3>
            <p className="text-zinc-500 text-xs">
              {installedMods.filter(m => m.status === 'installed').length} instalados
              {serverType && ` · ${serverType}`}
              {mcVersion  && ` ${mcVersion}`}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-950/50 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('installed')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'installed'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Instalados ({installedMods.length})
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'search'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Buscar mods
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* ── Tab: Instalados ── */}
        {activeTab === 'installed' && (
          <div>
            {initLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="text-red-400 text-sm text-center py-6">{error}</div>
            ) : installedMods.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-700">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <p className="text-zinc-500 text-sm">No hay mods instalados.</p>
                <p className="text-zinc-600 text-xs mt-1">Busca e instala mods o pídele a la IA que los instale.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {installedMods.map(mod => (
                  <li key={mod.id}
                    className="flex items-center gap-4 bg-zinc-950/40 border border-zinc-800/50 rounded-2xl p-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{mod.mod_name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {statusBadge(mod.status)}
                        {mod.version && (
                          <span className="text-[10px] text-zinc-600 font-mono">v{mod.version}</span>
                        )}
                        <span className="text-[10px] text-zinc-700 capitalize">{mod.source}</span>
                      </div>
                      {mod.status === 'error' && mod.error_msg && (
                        <p className="text-red-400 text-xs mt-1 truncate">{mod.error_msg}</p>
                      )}
                    </div>

                    {(mod.status === 'installed' || mod.status === 'error') && (
                      <button
                        onClick={() => handleUninstall(mod)}
                        disabled={loadingMods[mod.id]}
                        className="shrink-0 p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        title="Desinstalar"
                      >
                        {loadingMods[mod.id] ? (
                          <div className="w-4 h-4 border border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    )}

                    {(mod.status === 'installing' || mod.status === 'uninstalling') && (
                      <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Tab: Búsqueda ── */}
        {activeTab === 'search' && (
          <div>
            {/* Search input */}
            <div className="relative mb-5">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                {isSearching ? (
                  <div className="w-4 h-4 border border-zinc-500 border-t-violet-400 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Buscar mods para ${serverType || 'Minecraft'} ${mcVersion || ''}...`}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-zinc-600 text-white"
              />
            </div>

            {searchQuery.trim() === '' && (
              <div className="text-center py-8 text-zinc-600 text-sm">
                Escribe el nombre del mod que quieres instalar
              </div>
            )}

            {searchResults.length > 0 && (
              <ul className="space-y-3">
                {searchResults.map(mod => {
                  const installed = isInstalled(mod.id);
                  const loading   = loadingMods[mod.id];
                  return (
                    <li key={mod.id}
                      className="flex items-start gap-4 bg-zinc-950/40 border border-zinc-800/50 rounded-2xl p-4">
                      {mod.icon_url ? (
                        <img src={mod.icon_url} alt={mod.name}
                          className="w-11 h-11 rounded-xl object-cover shrink-0 border border-zinc-800" />
                      ) : (
                        <div className="w-11 h-11 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0 text-zinc-600">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white text-sm">{mod.name}</p>
                            <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{mod.description}</p>
                          </div>
                          <button
                            onClick={() => !installed && !loading && handleInstall(mod)}
                            disabled={installed || loading}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              installed
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                                : loading
                                ? 'bg-zinc-800 text-zinc-500 cursor-wait'
                                : 'bg-violet-600 text-white hover:bg-violet-500 active:scale-95'
                            }`}
                          >
                            {loading ? (
                              <div className="w-4 h-4 border border-zinc-500 border-t-violet-400 rounded-full animate-spin mx-auto"></div>
                            ) : installed ? (
                              '✓ Instalado'
                            ) : (
                              'Instalar'
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-zinc-600">
                            {mod.downloads.toLocaleString()} descargas
                          </span>
                          {mod.categories.slice(0, 2).map(c => (
                            <span key={c} className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full capitalize">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {searchQuery.trim() !== '' && !isSearching && searchResults.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-sm">
                No se encontraron mods para "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModsPanel;
