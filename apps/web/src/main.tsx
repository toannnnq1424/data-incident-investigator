import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="shell">
      <p className="eyebrow">Deterministic demo + DataHub adapter</p>
      <h1>Data Incident Investigator</h1>
      <p className="lede">
        Investigate suspicious data changes through metadata, lineage, evidence, and ranked
        root-cause hypotheses.
      </p>
      <section aria-labelledby="foundation-status">
        <h2 id="foundation-status">Foundation ready</h2>
        <p>The first incident submission vertical slice is the next delivery checkpoint.</p>
      </section>
    </main>
  );
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('Application root element is missing.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
