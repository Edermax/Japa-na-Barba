const ENTRY_PATTERN = /### (\d{4}-\d{2}-\d{2}) — aprovado[\s\S]*?Clientes simulados: (\d+)[\s\S]*?Reservas criadas\/canceladas: (\d+)\/(\d+)[\s\S]*?Isolamento entre clientes: (\w+)[\s\S]*?Limpeza: (\w+)[\s\S]*?Requisições medidas: (\d+)[\s\S]*?p95: (\d+) ms/;

function parseDiaryComment(body) {
  const match = String(body ?? "").match(ENTRY_PATTERN);
  if (!match) return null;
  return {
    date: match[1],
    clients: Number(match[2]),
    created: Number(match[3]),
    cancelled: Number(match[4]),
    isolation: match[5],
    cleanup: match[6],
    requests: Number(match[7]),
    p95Ms: Number(match[8])
  };
}

function summarizePilotEntries(entries, { expectedDays = 14, openIncidents = 0 } = {}) {
  const byDate = new Map();
  for (const entry of entries.filter(Boolean)) byDate.set(entry.date, entry);
  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const unsafeDays = days.filter((entry) =>
    entry.created !== entry.cancelled || entry.isolation !== "passed" || entry.cleanup !== "passed"
  );
  const totalCreated = days.reduce((sum, entry) => sum + entry.created, 0);
  const totalCancelled = days.reduce((sum, entry) => sum + entry.cancelled, 0);
  const maxP95Ms = days.length ? Math.max(...days.map((entry) => entry.p95Ms)) : 0;
  const approved = days.length === expectedDays && unsafeDays.length === 0 && openIncidents === 0;
  return {
    approved,
    uniqueDays: days.length,
    expectedDays,
    totalCreated,
    totalCancelled,
    maxP95Ms,
    unsafeDays: unsafeDays.map((entry) => entry.date),
    openIncidents
  };
}

module.exports = { parseDiaryComment, summarizePilotEntries };
