import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { configApi } from '../services/api';
import './AcademicConfig.css';

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function AcademicConfig() {
  const navigate = useNavigate();
  const [config, setConfig] = useState({ workingDays: DAY_OPTIONS, periodsPerDay: 7, breakPeriodIndices: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    configApi.get()
      .then(setConfig)
      .catch(() => setConfig({ workingDays: DAY_OPTIONS, periodsPerDay: 7, breakPeriodIndices: [] }))
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (day) => {
    setConfig(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day].sort((a, b) => DAY_OPTIONS.indexOf(a) - DAY_OPTIONS.indexOf(b))
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    configApi.update({
      workingDays: config.workingDays,
      periodsPerDay: config.periodsPerDay,
      breakPeriodIndices: config.breakPeriodIndices || []
    })
      .then((updated) => {
        setConfig(updated);
        setMessage({ type: 'success', text: 'Configuration saved successfully.' });
      })
      .catch((err) => setMessage({ type: 'error', text: err.message || 'Failed to save.' }))
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="academic-config">
      <div className="page-header">
        <button type="button" className="btn btn-secondary btn-sm back-btn" onClick={() => navigate('/')}>← Back</button>
        <div>
          <h1>Academic Configuration</h1>
          <p className="page-desc">Set working days and periods per day. Break periods will not be used for scheduling.</p>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card config-form">
        <div className="form-group">
          <label>Working Days</label>
          <div className="day-chips">
            {DAY_OPTIONS.map(day => (
              <button
                key={day}
                type="button"
                className={'chip' + (config.workingDays?.includes(day) ? ' active' : '')}
                onClick={() => toggleDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="periodsPerDay">Periods per day</label>
          <input
            id="periodsPerDay"
            type="number"
            min={1}
            max={12}
            value={config.periodsPerDay ?? 7}
            onChange={(e) => setConfig(prev => ({ ...prev, periodsPerDay: Number(e.target.value) || 7 }))}
          />
        </div>

        <div className="form-group">
          <label>Break period indices (0-based, e.g. 3 for 4th period)</label>
          <input
            type="text"
            placeholder="e.g. 3, 6"
            value={(config.breakPeriodIndices || []).join(', ')}
            onChange={(e) => {
              const val = e.target.value.replace(/\s/g, '');
              const arr = val ? val.split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n)) : [];
              setConfig(prev => ({ ...prev, breakPeriodIndices: arr }));
            }}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
}

export default AcademicConfig;
