// The Key and Tempo tiles, shared by the analyze page and a saved history entry.
export default function ResultTiles({ keyName, scale, bpm }) {
  return (
    <div className="result-grid">
      <div className="tile glass">
        <span className="label">Key</span>
        <span className="value">
          {keyName} <span className="unit">{scale}</span>
        </span>
      </div>
      <div className="tile glass">
        <span className="label">Tempo</span>
        <span className="value">
          {bpm} <span className="unit">BPM</span>
        </span>
      </div>
    </div>
  );
}
