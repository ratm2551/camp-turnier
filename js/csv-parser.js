// CSV-Import: Teilnehmerliste einlesen (Name, optional Team-Spalte).
// Erkennt Trennzeichen automatisch (Komma oder Semikolon), wie im Scout-Dashboard.

(function (root) {
  function detectDelimiter(firstLine) {
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    return semiCount > commaCount ? ";" : ",";
  }

  function normalizeHeader(h) {
    return h.trim().toLowerCase().replace(/[^a-z0-9äöü]/g, "");
  }

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { participants: [], hasTeamColumn: false, error: "Datei ist leer." };

    const delimiter = detectDelimiter(lines[0]);
    const header = lines[0].split(delimiter).map(normalizeHeader);

    const nameIdx = header.findIndex((h) => ["name", "teilnehmer", "spieler", "vorname"].includes(h));
    const teamIdx = header.findIndex((h) => ["team", "mannschaft", "gruppe"].includes(h));

    if (nameIdx === -1) {
      return { participants: [], hasTeamColumn: false, error: "Keine Spalte 'Name' gefunden. Erste Zeile muss eine Kopfzeile mit 'Name' sein." };
    }

    const participants = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter);
      const name = (cols[nameIdx] || "").trim();
      if (!name) continue;
      participants.push({
        name,
        team: teamIdx !== -1 ? (cols[teamIdx] || "").trim() : null,
      });
    }

    return { participants, hasTeamColumn: teamIdx !== -1, error: null };
  }

  // Baut Teams aus einer flachen Teilnehmerliste, wenn keine Team-Spalte vorhanden ist.
  function autoBuildTeams(participants, teamSize) {
    const shuffled = [...participants];
    const teams = [];
    for (let i = 0; i < shuffled.length; i += teamSize) {
      const members = shuffled.slice(i, i + teamSize);
      teams.push({
        id: "team_" + (teams.length + 1),
        name: "Team " + (teams.length + 1),
        players: members.map((m) => m.name),
      });
    }
    return teams;
  }

  function buildTeamsFromColumn(participants) {
    const map = new Map();
    participants.forEach((p) => {
      const key = p.team || "Ohne Team";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p.name);
    });
    let idx = 0;
    return Array.from(map.entries()).map(([teamName, players]) => {
      idx++;
      return { id: "team_" + idx, name: teamName, players };
    });
  }

  // Baut Teams ohne Namensliste, nur aus (optional nach Altersgruppe) Spieleranzahlen.
  // entries: [{ label, count }] – label leer/"" bei nur einer Gruppe ohne Altersaufteilung.
  function buildTeamsFromCounts(entries, teamSize) {
    const teams = [];
    entries.forEach((entry) => {
      const count = Math.max(0, entry.count || 0);
      if (count <= 0) return;
      const teamsInGroup = Math.max(1, Math.ceil(count / teamSize));
      for (let i = 0; i < teamsInGroup; i++) {
        const start = i * teamSize;
        const membersCount = Math.min(teamSize, count - start);
        if (membersCount <= 0) continue;
        const prefix = entry.label ? entry.label + " " : "";
        const players = Array.from({ length: membersCount }, (_, j) => `${prefix}Spieler ${start + j + 1}`);
        teams.push({
          id: "team_" + (teams.length + 1),
          name: (entries.length > 1 && entry.label ? entry.label + " – " : "") + "Team " + (i + 1),
          players,
          ageGroup: entry.label || null,
        });
      }
    });
    return teams;
  }

  const api = { parseCsv, autoBuildTeams, buildTeamsFromColumn, buildTeamsFromCounts };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CsvParser = api;
})(typeof window !== "undefined" ? window : globalThis);
