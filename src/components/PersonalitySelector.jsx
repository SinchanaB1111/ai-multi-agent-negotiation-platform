function PersonalitySelector({ value, onChange }) {
  const personalities = [
    {
      name: "Aggressive",
      description: "Prioritizes strong outcomes and maximum advantage.",
    },
    {
      name: "Collaborative",
      description: "Focuses on cooperation and mutual benefit.",
    },
    {
      name: "Risk-Averse",
      description: "Prefers safe decisions and reduced risk.",
    },
  ];

  return (
    <div className="personality-section">
      <div className="personality-options">
        {personalities.map((personality) => {
          const isSelected = value === personality.name;

          return (
            <button
              key={personality.name}
              type="button"
              className={`personality-option ${isSelected ? "selected" : ""}`}
              onClick={() => onChange(personality.name)}
            >
              {/* Professional Radio Indicator */}
              <span className={`professional-radio ${isSelected ? "checked" : ""}`}>
                {isSelected && <span className="radio-inner-dot"></span>}
              </span>

              <span className="personality-option-content">
                <strong>{personality.name}</strong>
                <small>{personality.description}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PersonalitySelector;