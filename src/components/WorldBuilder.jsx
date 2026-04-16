const SLIDERS = [
  {
    key: 'waterLevel',
    label: 'Water Level',
    min: 0, max: 1, step: 0.01,
    format: v => `${Math.round(v * 100)}%`,
    hint: v => v < 0.3 ? 'Dry lands' : v < 0.5 ? 'Balanced' : v < 0.7 ? 'Island chains' : 'Deep oceans'
  },
  {
    key: 'worldSize',
    label: 'World Scale',
    min: 0, max: 1, step: 0.01,
    format: v => v < 0.33 ? 'Village' : v < 0.66 ? 'Region' : 'Continent',
    hint: v => v < 0.33 ? 'Flat, gentle hills' : v < 0.66 ? 'Mixed terrain' : 'Tall mountains'
  },
  {
    key: 'population',
    label: 'Population',
    min: 100, max: 200, step: 1,
    format: v => `${Math.round(v)} souls`,
    hint: v => v < 120 ? 'Small community' : v < 150 ? 'Busy village' : v < 180 ? 'Thriving town' : 'Crowded city'
  },
  {
    key: 'temperature',
    label: 'Climate',
    min: 0, max: 1, step: 0.01,
    format: v => v < 0.33 ? 'Cold' : v < 0.66 ? 'Temperate' : 'Hot',
    hint: v => v < 0.33 ? 'Tundra & snow' : v < 0.66 ? 'Forests & meadows' : 'Deserts & jungles'
  }
]

export default function WorldBuilder({ config, onChange, onCreate }) {
  const update = (key, value) => onChange({ ...config, [key]: parseFloat(value) })

  return (
    <aside className="builder-panel">
      <h2>World Parameters</h2>
      <p className="builder-sub">Every setting shapes the world in real time.</p>

      {SLIDERS.map(s => (
        <div className="slider-group" key={s.key}>
          <label>
            {s.label}
            <span>{s.format(config[s.key])}</span>
          </label>
          <input
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={config[s.key]}
            onChange={e => update(s.key, e.target.value)}
          />
          <div className="slider-hint">{s.hint(config[s.key])}</div>
        </div>
      ))}

      <div className="builder-info">
        <div className="info-row">
          <span>NPCs</span><span>{Math.round(config.population)} unique inhabitants</span>
        </div>
        <div className="info-row">
          <span>Villages</span><span>9 settlements</span>
        </div>
        <div className="info-row">
          <span>AI Chat</span><span className="info-green">Ready</span>
        </div>
      </div>

      <button className="create-btn" onClick={onCreate}>
        Create World
      </button>
    </aside>
  )
}
