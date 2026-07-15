// Requires local setup (one-time, per contributor):
//   cd frontend && npm install
//   pip install -r backend/requirements-dev.txt
//
// tsc type-checks the whole frontend project (type errors aren't
// meaningfully file-scoped), so it ignores the staged file list and
// only runs when a staged file could affect it. eslint and ruff check
// only the files actually staged, for speed.
module.exports = {
  'frontend/**/*.{ts,tsx}': () => 'cd frontend && npx tsc --noEmit',
  'frontend/**/*.{ts,tsx,js,jsx}': (files) => {
    const rel = files.map((f) => JSON.stringify(f));
    return `cd frontend && npx eslint --report-unused-disable-directives ${rel.join(' ')}`;
  },
  'backend/**/*.py': (files) => {
    const rel = files.map((f) => JSON.stringify(f));
    return `python3 -m ruff check --config backend/ruff.toml ${rel.join(' ')}`;
  },
};
