import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Area, ReferenceLine } from 'recharts';
import { API_BASE_URL } from '../config';

const intervals = [ { label: '1M', value: '1mo' }, { label: '6M', value: '6mo' }, { label: 'YTD', value: 'ytd' }, { label: '1A', value: '1y' }, { label: 'Max', value: 'max' }];

const CustomTooltip = ({ active, payload, label, displayType }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const perfValue = displayType === '%' ? dataPoint.performancePct : dataPoint.pl;

    if (perfValue == null) return null;

    const value = displayType === '%' ? perfValue.toFixed(2) + '%' : perfValue.toLocaleString('fr-FR', {style:'currency', currency:'EUR'});
    const color = perfValue >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
    return (
      <div className="custom-tooltip">
        <p className="label">{new Date(label).toLocaleDateString('fr-FR', {year: 'numeric', month: 'long', day: 'numeric'})}</p>
        <p className="desc" style={{ color }}>
          Performance: <strong>{value}</strong>
        </p>
      </div>
    );
  }
  return null;
};

// Acceptez totalPLAmount comme prop
const PerformanceChart = ({ totalPLAmount }) => {
  const [data, setData] = useState([]);
  const [range, setRange] = useState('1y');
  const [displayType, setDisplayType] = useState('€'); // Par défaut sur € pour voir le problème
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/performance?range=${range}`);
        let historicalData = response.data;

        // --- DÉBUT DE LA CORRECTION ---
        // Si nous avons des données historiques et une P/L "live" valide,
        // nous corrigeons le dernier point du graphique.
        if (historicalData && historicalData.length > 0 && totalPLAmount !== undefined) {
          const lastPoint = historicalData[historicalData.length - 1];
          // On met à jour la valeur de plus-value ('pl') du dernier point
          // avec la valeur précise venant des KPIs.
          lastPoint.pl = totalPLAmount;
        }
        // --- FIN DE LA CORRECTION ---
        
        setData(historicalData);
      } catch (error) { console.error("Erreur performance:", error); } 
      finally { setIsLoading(false); }
    };
    fetchData();
  }, [range, totalPLAmount]); // On ajoute totalPLAmount aux dépendances

  if (isLoading) return <div className="card"><p>Calcul de la performance...</p></div>;
  if (!data || data.length === 0) return <div className="card"><p>Ajoutez des actifs avec une date d'achat pour voir la performance.</p></div>;

  const dataKey = displayType === '%' ? 'performancePct' : 'pl';
  const title = displayType === '%' ? 'Performance (TWR)' : 'Performance (Plus-Value)';
  
  const lastDataPoint = data.length > 0 ? data[data.length - 1] : null;
  const totalPerformance = (lastDataPoint && typeof lastDataPoint[dataKey] === 'number') ? lastDataPoint[dataKey] : 0;
  
  const perfColor = totalPerformance >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
  
  const yValues = data.map(i => i[dataKey]).filter(v => typeof v === 'number');
  
  const yMax = yValues.length > 0 ? Math.max(...yValues) : 0;
  const yMin = yValues.length > 0 ? Math.min(...yValues) : 0;

  const off = yMax > 0 && yMin < 0 ? yMax / (yMax - yMin) : (yMin >= 0 ? 1 : 0);

  return (
    <div className="card">
      <div className="performance-header">
        <h3>{title}</h3>
        <div className="chart-total-performance" style={{ color: perfColor }}>
          {totalPerformance >= 0 ? '+' : ''}
          {displayType === '%' ? totalPerformance.toFixed(2) + '%' : totalPerformance.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR'})}
          <small> ({intervals.find(i => i.value === range)?.label})</small>
        </div>
        <div className="chart-controls">
            <div className="interval-selector">
              {intervals.map(i => ( <button key={i.value} className={range === i.value ? 'active' : ''} onClick={() => setRange(i.value)}>{i.label}</button>))}
            </div>
            <div className="toggle-switch">
                <button className={displayType === '€' ? 'active' : ''} onClick={() => setDisplayType('€')}>€</button>
                <button className={displayType === '%' ? 'active' : ''} onClick={() => setDisplayType('%')}>%</button>
            </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="gradient-perf" x1="0" y1="0" x2="0" y2="1">
              <stop offset={off} stopColor={perfColor} stopOpacity={0.4}/>
              <stop offset={off} stopColor={perfColor} stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(t) => new Date(t).toLocaleDateString('fr-FR',{month:'short', year:'2-digit'})} 
            stroke="var(--text-secondary)"
            interval="preserveStartEnd" 
          />
          <YAxis orientation="left" stroke="var(--text-secondary)" tickFormatter={(t) => `${t.toLocaleString()}${displayType === '%' ? '%' : '€'}`} />
          <Tooltip content={<CustomTooltip displayType={displayType} />} />
          <ReferenceLine y={0} stroke="var(--text-secondary)" strokeDasharray="4 4" />
          <Area type="monotone" dataKey={dataKey} strokeWidth={2} stroke={perfColor} fillOpacity={1} fill="url(#gradient-perf)" name="Performance" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;