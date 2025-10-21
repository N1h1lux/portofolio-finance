import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];
const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="recharts-pie-label-text">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const DonutChart = ({ title, data }) => {
  if (!data || data.length === 0) return (<div className="card"><h3>{title}</h3><p style={{textAlign:'center',color:'var(--text-secondary)',height:'300px',display:'flex',alignItems:'center',justifyContent:'center'}}>Données insuffisantes.</p></div>);
  
  const processedData = useMemo(() => {
    if (data.length <= 6) return data;
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    const mainData = sortedData.slice(0, 5);
    const otherValue = sortedData.slice(5).reduce((sum, item) => sum + item.value, 0);
    return [...mainData, { name: 'Autre', value: otherValue }];
  }, [data]);

  const total = processedData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="card chart-card">
      <h3>{title}</h3>
      <div className="donut-chart-wrapper">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie 
              data={processedData} 
              dataKey="value" 
              nameKey="name" 
              cx="50%" 
              cy="50%" 
              innerRadius={75}
              outerRadius={100}
              fill="#8884d8" 
              paddingAngle={5}
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {processedData.map((e, i) => (<Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />))}
            </Pie>
            <Legend 
              layout="vertical" 
              verticalAlign="middle" 
              align="right" 
              iconType="square"
              formatter={(value) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-total-value">
            {total.toLocaleString('fr-FR', {style:'currency', currency:'EUR'})} € Total
        </div>
      </div>
    </div>
  );
};

const DiversificationCharts = ({ assets }) => {
  if (!assets || assets.length === 0) return (<div className="card"><h3>Répartition</h3><p style={{textAlign:'center',color:'var(--text-secondary)',padding:'2rem 0'}}>Ajoutez des actifs pour voir les graphiques.</p></div>);
  
  const totalValue = assets.reduce((s, a) => s + (a.totalValue || 0), 0);
  
  const byAssetType = useMemo(() => {
    const data = assets.reduce((acc, asset) => {
      const value = asset.totalValue || 0;
      acc[asset.type] = (acc[asset.type] || 0) + value;
      return acc;
    }, {});
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const bySector = useMemo(() => {
    const data = assets.reduce((acc, asset) => {
      if (asset.sector) {
        const value = asset.totalValue || 0;
        acc[asset.sector] = (acc[asset.sector] || 0) + value;
      }
      return acc;
    }, {});
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const byGeography = useMemo(() => {
    const data = assets.reduce((acc, asset) => {
      if (asset.country) {
        const value = asset.totalValue || 0;
        acc[asset.country] = (acc[asset.country] || 0) + value;
      }
      return acc;
    }, {});
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [assets]);

  return (
    <div className="diversification-grid">
      <DonutChart title="Répartition par Actif" data={byAssetType} />
      <DonutChart title="Répartition par Secteur" data={bySector} />
      <DonutChart title="Répartition Géographique" data={byGeography} />
    </div>
  );
};
export default DiversificationCharts;