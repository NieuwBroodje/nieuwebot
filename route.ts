import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface FiveMPlayer {
  name: string;
  id: number;
  identifiers: string[];
  ping: number;
  endpoint?: string;
}

interface FiveMServer {
  EndPoint: string;
  Data: {
    clients: number;
    sv_maxclients: number;
    hostname: string;
    gametype: string;
    mapname: string;
    enhancedHostSupport: boolean;
    resources: string[];
    server: string;
    vars: Record<string, string>;
    players: FiveMPlayer[];
    ownerID: number;
    private: boolean;
    fallback: boolean;
    connectEndPoints: string[];
    upvotePower: number;
    burstPower: number;
    tags: string;
    iconVersion: number;
  };
}

function analyzeBots(players: FiveMPlayer[]): {
  suspiciousCount: number;
  reasons: string[];
  suspiciousPlayers: { name: string; ping: number; reasons: string[] }[];
} {
  if (!players || players.length === 0) {
    return { suspiciousCount: 0, reasons: [], suspiciousPlayers: [] };
  }

  const suspiciousPlayers: { name: string; ping: number; reasons: string[] }[] = [];
  const globalReasons: string[] = [];

  // Check ping distribution
  const pings = players.map((p) => p.ping).filter((p) => p > 0);
  const avgPing = pings.length ? pings.reduce((a, b) => a + b, 0) / pings.length : 0;
  const identicalPings = new Map<number, number>();
  pings.forEach((p) => identicalPings.set(p, (identicalPings.get(p) || 0) + 1));
  const maxIdenticalPing = Math.max(...identicalPings.values());

  if (maxIdenticalPing > players.length * 0.3 && players.length > 5) {
    globalReasons.push(`${maxIdenticalPing} spelers met identieke ping`);
  }

  // Check name patterns
  const botNamePatterns = [
    /^player\d+$/i,
    /^user\d+$/i,
    /^guest\d+$/i,
    /^[a-z]{2,4}\d{4,8}$/i,
    /^\d+$/,
    /^[A-Z][a-z]+\s[A-Z][a-z]+\d{2,}$/,
  ];

  const nameFrequency = new Map<string, number>();
  players.forEach((p) => {
    const lower = p.name.toLowerCase();
    nameFrequency.set(lower, (nameFrequency.get(lower) || 0) + 1);
  });

  players.forEach((player) => {
    const playerReasons: string[] = [];
    const lower = player.name.toLowerCase();

    // Duplicate names
    if ((nameFrequency.get(lower) || 0) > 1) {
      playerReasons.push('Dubbele naam');
    }

    // Bot-like name pattern
    if (botNamePatterns.some((pattern) => pattern.test(player.name))) {
      playerReasons.push('Bot-achtige naam');
    }

    // Zero or suspiciously perfect ping
    if (player.ping === 0) {
      playerReasons.push('Ping is 0ms');
    } else if (player.ping === avgPing && players.length > 5) {
      playerReasons.push('Identieke gemiddelde ping');
    }

    // No identifiers
    if (!player.identifiers || player.identifiers.length === 0) {
      playerReasons.push('Geen identifiers');
    }

    // Very short names
    if (player.name.length <= 2) {
      playerReasons.push('Naam te kort');
    }

    if (playerReasons.length >= 2) {
      suspiciousPlayers.push({
        name: player.name,
        ping: player.ping,
        reasons: playerReasons,
      });
    }
  });

  return {
    suspiciousCount: suspiciousPlayers.length,
    reasons: globalReasons,
    suspiciousPlayers,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Geen zoekopdracht opgegeven' }, { status: 400 });
  }

  try {
    // Search servers
    const searchUrl = `https://servers-frontend.fivem.net/api/servers/?search=${encodeURIComponent(query)}&top=10`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FiveMBotDetector/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`FiveM API fout: ${response.status}`);
    }

    const data = await response.json();
    const servers: FiveMServer[] = data.Data || [];

    const results = servers.slice(0, 10).map((server) => {
      const players = server.Data?.players || [];
      const botAnalysis = analyzeBots(players);
      const totalPlayers = server.Data?.clients || 0;
      const maxPlayers = server.Data?.sv_maxclients || 0;
      const botPercentage = totalPlayers > 0 ? Math.round((botAnalysis.suspiciousCount / totalPlayers) * 100) : 0;

      return {
        id: server.EndPoint,
        name: server.Data?.hostname || 'Onbekende server',
        players: totalPlayers,
        maxPlayers,
        gametype: server.Data?.gametype || '',
        mapname: server.Data?.mapname || '',
        tags: server.Data?.tags || '',
        suspiciousCount: botAnalysis.suspiciousCount,
        botPercentage,
        globalReasons: botAnalysis.reasons,
        suspiciousPlayers: botAnalysis.suspiciousPlayers.slice(0, 20),
        playersHidden: players.length === 0 && totalPlayers > 0,
        riskLevel:
          botPercentage >= 50 ? 'hoog' : botPercentage >= 25 ? 'gemiddeld' : botPercentage > 0 ? 'laag' : 'geen',
      };
    });

    return NextResponse.json({ servers: results, total: results.length });
  } catch (error) {
    console.error('Error fetching FiveM data:', error);
    return NextResponse.json({ error: 'Kon geen verbinding maken met de FiveM API' }, { status: 500 });
  }
}
