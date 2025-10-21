import React from 'react';
import Assets from './Assets';
import PerformanceChart from './PerformanceChart';

const Dashboard = ({ assets, onAssetDeleted, onStockSelect }) => {
  const netWorth = assets.reduce((sum, asset) => sum + (asset.totalValue || 0), 0);
  const totalPLAmount = assets.reduce((sum, asset) => sum + (asset.plAmount || 0), 0);
  const totalPurchaseCost = assets.reduce((sum, asset) => (asset.purchasePrice && asset.quantity ? sum + (asset.purchasePrice * asset.quantity) : sum), 0);
  const totalPLPercentage = totalPurchaseCost > 0 ? (totalPLAmount / totalPurchaseCost) * 100 : 0;
  const portfolioValueYesterday = assets.reduce((sum, asset) => (asset.totalValue && typeof asset.dailyChange === 'number' ? sum + (asset.totalValue / (1 + asset.dailyChange / 100)) : sum + (asset.totalValue || 0)), 0);
  const dailyPortfolioChangePercentage = portfolioValueYesterday > 0 ? ((netWorth - portfolioValueYesterday) / portfolioValueYesterday) * 100 : 0;

  const renderKpiValue = (value, type) => {
    if (isNaN(value)) return type === 'currency' ? '0,00 €' : '0,00%';
    const isPositive = value >= 0;
    const color = isPositive ? 'var(--success-color)' : 'var(--danger-color)';
    const sign = isPositive ? '+' : '';
    if (type === 'currency') {
      return <span style={{ color }}>{sign}{value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>;
    }
    if (type === 'percent') {
      return <span style={{ color }}>{sign}{value.toFixed(2).replace('.', ',')}%</span>;
    }
    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };
  
  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="title">Patrimoine Net</div>
          <div className="value">{renderKpiValue(netWorth)}</div>
        </div>
        <div className="kpi-card">
          <div className="title">+/- Values Latentes</div>
          <div className="value">{renderKpiValue(totalPLAmount, 'currency')}</div>
        </div>
        <div className="kpi-card">
          <div className="title">Rendement Total</div>
          <div className="value">{renderKpiValue(totalPLPercentage, 'percent')}</div>
        </div>
        <div className="kpi-card">
          <div className="title">Variation du Jour</div>
          <div className="value">{renderKpiValue(dailyPortfolioChangePercentage, 'percent')}</div>
        </div>
      </div>

      <PerformanceChart totalPLAmount={totalPLAmount} />
      
      <div style={{marginTop: '1.5rem'}}>
        <Assets assets={assets} onAssetDeleted={onAssetDeleted} onStockSelect={onStockSelect} />
      </div>
    </div>
  );
};

export default Dashboard;