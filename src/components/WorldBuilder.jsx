const SLIDERS = [
  { key: 'waterLevel', label: 'Water Level', format: v => `${Math.round(v * 100)}%` },
  { key: 'worldSize', label: 'World Size', format: v => v < 0.33 ? 'Village' : v < 0.66 ? 'Region' : 'Continent' },
  { key: 'population', label: 'Population', min: 3, max: 50, step: 1, format: v => `${v}` },
  { key: 'temperature', label: 'Temperature', format: v => v < 0.33 ? 'Cold' : v < 0.66 ? 'Temperate' : 'Hot' }
]

export default function WorldBuilder({ config, onChange, onCreate }) {
  const update = (key, value) => onChange({ ...config, [key]: parseFloat(value) })

  return (
    <aside className="builder-panel">
      <h2>World Parameters</h2>

      {SLIDERS.map(s => (
        <div className="slider-group" key={s.key}>
          <label>
            {s.label}
            <span>{s.format(config[s.key])}</span>
          </label>
          <input
            type="range"
            min={s.min ?? 0}
            max={s.max ?? 1}
            step={s.step ?? 0.01}
            value={config[s.key]}
            onChange={e => update(s.key, e.target.value)}
          />
        </div>
      ))}

      <button className="create-btn" onClick={onCreate}>
        Create World
      </button>
    </aside>
  )
}
