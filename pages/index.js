import { useState, useRef } from 'react';
import Head from 'next/head';
import '../styles/global.css';

export default function Home() {
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [active, setActive] = useState([]);
  const [invalid, setInvalid] = useState([]);
  const fileRef = useRef();

  function parseKeys(text) {
    return text.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(s => s.replace(/,$/, ''));
  }

  async function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    const txt = await f.text();
    setInput(txt);
  }

  async function runCheck() {
    const keys = parseKeys(input);
    if (!keys.length) return alert('Masukkan minimal satu API key.');
    setRunning(true);
    setProgress({ done: 0, total: keys.length });
    setActive([]);
    setInvalid([]);

    // send to server which does concurrent validation
    try {
      const r = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys, provider, concurrency: 10 })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Unknown error');
      setActive(j.active || []);
      setInvalid(j.invalid || []);
      setProgress({ done: (j.active||[]).length + (j.invalid||[]).length, total: keys.length });
    } catch (e) {
      alert('Error: ' + e.message);
    }

    setRunning(false);
  }

  function downloadList(list, filename) {
    const blob = new Blob([list.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container">
      <Head>
        <title>Bulk API Key Checker</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      <header className="hero">
        <h1>Bulk API Key Checker</h1>
        <p>Periksa banyak API key sekaligus (Gemini / OpenAI). Unduh hasil sebagai .txt.</p>
      </header>

      <main>
        <section className="card">
          <label className="label">Paste atau upload file API keys (1 per baris)</label>
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={10} />
          <div className="row">
            <input type="file" accept=".txt" onChange={handleFile} ref={fileRef} />
            <select value={provider} onChange={e => setProvider(e.target.value)}>
              <option value="gemini">Gemini / Google Generative</option>
              <option value="openai">OpenAI</option>
            </select>
            <button className="btn primary" onClick={runCheck} disabled={running}>Start Check</button>
          </div>
        </section>

        <section className="card results">
          <div className="row between">
            <div>Progress: {progress.done}/{progress.total}</div>
            <div>
              <button className="btn" onClick={() => downloadList(active, 'aktif.txt')} disabled={!active.length}>Download Aktif</button>
              <button className="btn danger" onClick={() => downloadList(invalid, 'invalid.txt')} disabled={!invalid.length}>Download Invalid</button>
            </div>
          </div>

          <div className="columns">
            <div>
              <h3>Aktif ({active.length})</h3>
              <pre className="list">{active.join('\n') || '—'}</pre>
            </div>
            <div>
              <h3>Invalid ({invalid.length})</h3>
              <pre className="list">{invalid.join('\n') || '—'}</pre>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">Simple bulk checker • Deploy to Vercel</footer>
    </div>
  );
}
