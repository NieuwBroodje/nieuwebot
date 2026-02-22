'use client';

import { useState, KeyboardEvent } from 'react';

interface SuspiciousPlayer {
  name: string;
  ping: number;
  reasons: string[];
}

interface ServerResult {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  gametype: string;
  mapname: string;
  tags: string;
  suspiciousCount: number;
  botPercentage: number;
  globalReasons: string[];
  suspiciousPlayers: SuspiciousPlayer[];
  playersHidden: boolean;
  riskLevel: 'hoog' | 'gemiddeld' | 'laag' | 'geen';
}

function ServerCard({ server, index }: { server: ServerResult; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const riskLabels: Record<string, string> = {
    hoog: 'HOOG RISICO',
    gemiddeld: 'GEMIDDELD',
    laag: 'LAAG RISICO',
    geen: 'SCHOON',
  };

  const fillClass = server.botPercentage >= 50 ? 'danger' : server.botPercentage >= 25 ? 'warn' : server.botPercentage > 0 ? 'safe' : 'neutral';

  return (
    <div
      className={`server-card risk-${server.riskLevel}`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="server-header" onClick={() => setExpanded(!expanded)}>
        <span className={`risk-badge ${server.riskLevel}`}>{riskLabels[server.riskLevel]}</span>

        <div className="server-info">
          <div className="server-name">{server.name}</div>
          <div className="server-meta">
            <span>{server.gametype || 'Roleplay'}</span>
            {server.mapname && <span>{server.mapname}</span>}
          </div>
        </div>

        <div className="server-stats">
          <div className="stat-item">
            <div className="stat-label">Spelers</div>
            <div className="stat-value neutral">
              {server.players}/{server.maxPlayers}
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Verdacht</div>
            <div className={`stat-value ${fillClass}`}>{server.suspiciousCount}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Bot %</div>
            <div className={`stat-value ${fillClass}`}>{server.botPercentage}%</div>
          </div>
        </div>

        <span className={`expand-icon ${expanded ? 'open' : ''}`}>▼</span>
      </div>

      {expanded && (
        <div className="server-details">
          <div className="details-grid">
            <div className="detail-section">
              <h3>Bot Analyse</h3>

              <div className="progress-wrap">
                <div className="progress-label">
                  <span>Verdachte spelers</span>
                  <span>{server.suspiciousCount} / {server.players}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${fillClass}`}
                    style={{ width: `${server.botPercentage}%` }}
                  />
                </div>
              </div>

              {server.globalReasons.length > 0 && (
                <>
                  <div style={{ marginBottom: 8, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                    GLOBALE SIGNALEN
                  </div>
                  <div className="reason-tags">
                    {server.globalReasons.map((r, i) => (
                      <span key={i} className="reason-tag">{r}</span>
                    ))}
                  </div>
                </>
              )}

              {server.playersHidden && (
                <div className="hidden-notice" style={{ marginTop: 16 }}>
                  ⚠️ Spelerslijst verborgen door server
                </div>
              )}

              {!server.playersHidden && server.suspiciousCount === 0 && server.players > 0 && (
                <div style={{ marginTop: 12, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent3)' }}>
                  ✓ Geen verdachte patronen gevonden
                </div>
              )}
            </div>

            <div className="detail-section">
              <h3>Server Info</h3>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 2, color: 'var(--text-dim)' }}>
                <div><span style={{ color: 'var(--text-dim)' }}>ID: </span><span style={{ color: 'var(--text)' }}>{server.id}</span></div>
                <div><span style={{ color: 'var(--text-dim)' }}>Gametype: </span><span style={{ color: 'var(--text)' }}>{server.gametype || '—'}</span></div>
                <div><span style={{ color: 'var(--text-dim)' }}>Map: </span><span style={{ color: 'var(--text)' }}>{server.mapname || '—'}</span></div>
                {server.tags && (
                  <div><span style={{ color: 'var(--text-dim)' }}>Tags: </span><span style={{ color: 'var(--text)' }}>{server.tags.split(',').slice(0, 5).join(', ')}</span></div>
                )}
              </div>
            </div>
          </div>

          {server.suspiciousPlayers.length > 0 && (
            <div className="detail-section">
              <h3>Verdachte Spelers ({server.suspiciousPlayers.length})</h3>
              <table className="players-table">
                <thead>
                  <tr>
                    <th>Naam</th>
                    <th>Ping</th>
                    <th>Redenen</th>
                  </tr>
                </thead>
                <tbody>
                  {server.suspiciousPlayers.map((p, i) => (
                    <tr key={i}>
                      <td>{p.name}</td>
                      <td>{p.ping}ms</td>
                      <td>
                        <div className="player-reasons">
                          {p.reasons.map((r, j) => (
                            <span key={j} className="player-reason">{r}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ServerResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchedQuery, setSearchedQuery] = useState('');

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setSearchedQuery(query.trim());

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Onbekende fout');
      }

      setResults(data.servers);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Onbekende fout';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') search();
  };

  const topBotServer = results?.reduce((a, b) => (a.botPercentage > b.botPercentage ? a : b), results[0]);

  return (
    <main className="page">
      <header className="header">
        <div className="logo-tag">FiveM Intelligence System</div>
        <h1>BOT <span>DETECTOR</span></h1>
        <p className="subtitle">// Detecteer verdachte bots in FiveM servers via de cfx.re API</p>
      </header>

      <div className="search-wrap">
        <div className="search-box">
          <span className="search-icon">&gt;_</span>
          <input
            className="search-input"
            type="text"
            placeholder="Zoek een server... (bijv. Breda Roleplay)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
          <button className="search-btn" onClick={search} disabled={loading || !query.trim()}>
            {loading ? 'Scannen...' : 'Scan'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <div>Verbinding maken met cfx.re API...</div>
        </div>
      )}

      {error && (
        <div className="error-msg">⚠ FOUT: {error}</div>
      )}

      {results !== null && !loading && (
        <>
          <div className="results-meta">
            <span>
              <span className="results-count">{results.length}</span> servers gevonden voor &quot;{searchedQuery}&quot;
            </span>
            {topBotServer && topBotServer.botPercentage > 0 && (
              <span>Hoogste risico: <span style={{ color: 'var(--accent2)' }}>{topBotServer.botPercentage}%</span></span>
            )}
          </div>

          {results.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◈</div>
              <div>Geen servers gevonden</div>
            </div>
          ) : (
            results.map((server, i) => (
              <ServerCard key={server.id} server={server} index={i} />
            ))
          )}
        </>
      )}

      {results === null && !loading && (
        <div className="empty-state">
          <div className="empty-icon">◈</div>
          <div>Voer een servernaam in om te beginnen</div>
          <div style={{ marginTop: 8, fontSize: 11 }}>Bijv: &quot;Breda Roleplay&quot;, &quot;Amsterdam&quot;, &quot;Dutch&quot;</div>
        </div>
      )}

      <footer className="footer">
        <p>FiveM Bot Detector — data via cfx.re public API — niet 100% accuraat</p>
      </footer>
    </main>
  );
}
