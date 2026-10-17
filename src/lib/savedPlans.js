// Study plans the user chose to keep, stored locally (no backend). Each plan
// carries its own checklist progress so it can be worked through later from
// the "Plans" page, independent of whichever document is currently open.
const KEY = "recap-saved-plans";

export function getSavedPlans() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function write(plans) {
  try {
    localStorage.setItem(KEY, JSON.stringify(plans));
  } catch {
    // Storage full or unavailable — saving is best-effort.
  }
  return plans;
}

export function savePlan({ fileName, minutes, energy, steps, done = [] }) {
  const plan = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName,
    minutes,
    energy,
    steps,
    done,
    savedAt: Date.now(),
  };
  write([plan, ...getSavedPlans()]);
  return plan;
}

export function updatePlanProgress(id, done) {
  return write(getSavedPlans().map((p) => (p.id === id ? { ...p, done } : p)));
}

export function deletePlan(id) {
  return write(getSavedPlans().filter((p) => p.id !== id));
}
