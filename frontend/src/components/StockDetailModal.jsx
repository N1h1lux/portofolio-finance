import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, Legend, ComposedChart } from 'recharts';
import { API_BASE_URL } from '../config';

const intervals = [ { label: '1J', value: '1d' }, { label: '5J', value: '5d' }, { label: '1M', value: '1mo' }, { label: '6M', value: '6mo' }, { label: 'YTD', value: 'ytd' }, { label: '1A', value: '1y' }, { label: '5A', value: '5y' }, { label: 'Max', value: 'max' }];

const DetailTooltip = ({ active, payload, label, currency, startPrice }) => {
  if (active && payload && payload.length) {
    const currentPrice = payload[0].value;
    const performance = startPrice > 0 ? ((currentPrice - startPrice) / startPrice) * 100 : 0;
    const perfColor = performance >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
    return (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        <p className="desc">Prix: <strong>{currentPrice.toLocaleString('fr-FR', { style: 'currency', currency: currency || 'USD' })}</strong></p>
        <p className="desc" style={{ color: perfColor }}>Variation: <strong>{performance.toFixed(2)}%</strong></p>
      </div>
    );
  }
  return null;
};

const FinancialsTooltip = ({ active, payload, label, currency }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{label}</p>
          <p style={{ color: '#8884d8' }}>Chiffre d'affaires: <strong>{payload[0].value.toLocaleString('fr-FR', {style:'currency', currency})}</strong></p>
          <p style={{ color: '#ffc658' }}>Bénéfices: <strong>{payload[1].value.toLocaleString('fr-FR', {style:'currency', currency})}</strong></p>
        </div>
      );
    }
    return null;
};

const InfoTooltip = ({ text }) => (
    <div className="info-tooltip">
        i
        <span className="info-tooltip-text">{text}</span>
    </div>
);

const ScoreBar = ({ label, score, tooltipText }) => {
    const getScoreColor = (s) => {
        if (s < 40) return 'var(--danger-color)';
        if (s < 70) return 'var(--warning-color)';
        return 'var(--success-color)';
    };
    const barColor = getScoreColor(score);
    return (
        <div className="score-item">
            <div className="score-label">
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span>{label}</span>
                    <InfoTooltip text={tooltipText} />
                </div>
                {/* CORRECTION : Couleur appliquée au score */}
                <strong style={{ color: barColor }}>{score} / 100</strong>
            </div>
            <div className="score-bar">
                {/* CORRECTION : Couleur appliquée à la barre */}
                <div className="score-bar-fill" style={{ width: `${score}%`, backgroundColor: barColor }}></div>
            </div>
        </div>
    );
};

const StockDetailModal = ({ symbol, onClose, onAddToPortfolio }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInterval, setSelectedInterval] = useState('1y');
  const [activeTab, setActiveTab] = useState('Résumé');
  const [financialsPeriod, setFinancialsPeriod] = useState('annual');
  const [displayCurrency, setDisplayCurrency] = useState('EUR');

  useEffect(() => {
    const fetchData = async () => {
      if (!symbol) return;
      setIsLoading(true); setError('');
      try {
        const response = await axios.get(`${API_BASE_URL}/market/stock/${symbol}?range=${selectedInterval}`);
        setData(response.data);
        setDisplayCurrency('EUR');
      } catch (err) { console.error("Erreur détails:", err); setError(`Impossible de charger les données pour ${symbol}.`); } 
      finally { setIsLoading(false); }
    };
    fetchData();
  }, [symbol, selectedInterval]);

  const formatLargeNumber = (num) => {
    if (num === null || typeof num === 'undefined' || isNaN(num)) return 'N/A';
    if (Math.abs(num) > 1e12) return `${(num / 1e12).toFixed(2)} T`;
    if (Math.abs(num) > 1e9) return `${(num / 1e9).toFixed(2)} Mds`;
    if (Math.abs(num) > 1e6) return `${(num / 1e6).toFixed(2)} M`;
    return num.toLocaleString();
  };
  
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('fr-FR') : 'N/A';

  const renderRecommendation = (reco) => {
    if (!reco) return <p>Données non disponibles</p>;
    const total = reco.strongBuy + reco.buy + reco.hold + reco.sell + reco.strongSell;
    if (total === 0) return <p>Données non disponibles</p>;
    const buyPercent = ((reco.strongBuy + reco.buy) / total) * 100;
    const holdPercent = (reco.hold / total) * 100;
    const sellPercent = ((reco.sell + reco.strongSell) / total) * 100;
    return (
        <div className="reco-bar-container">
            <div className="reco-bar">
                <div className="reco-buy" style={{width: `${buyPercent}%`}} title={`Achat: ${buyPercent.toFixed(0)}%`}></div>
                <div className="reco-hold" style={{width: `${holdPercent}%`}} title={`Conserver: ${holdPercent.toFixed(0)}%`}></div>
                <div className="reco-sell" style={{width: `${sellPercent}%`}} title={`Vente: ${sellPercent.toFixed(0)}%`}></div>
            </div>
        </div>
    );
  };
  
  const financialData = financialsPeriod === 'annual' ? data?.financials?.annual : data?.financials?.quarterly;
  const financialDataKey = financialsPeriod === 'annual' ? 'year' : 'quarter';

  const memoizedChartData = useMemo(() => {
    if (!data?.chart) return [];
    if (displayCurrency === 'EUR' && data.price.rate && data.price.rate !== 1) {
      return data.chart.map(point => ({ ...point, price: point.price / data.price.rate }));
    }
    return data.chart;
  }, [data?.chart, displayCurrency, data?.price.rate]);

  const chartData = memoizedChartData;
  const startPrice = chartData.length > 0 ? chartData[0].price : 0;
  const endPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0;
  const totalPerformance = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
  const perfColor = totalPerformance >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
  const chartCurrencyCode = displayCurrency === 'EUR' ? 'EUR' : (data?.price?.originalCurrency || 'USD');
  
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content stock-detail-modal" onClick={e => e.stopPropagation()}>
        {isLoading && <p>Chargement...</p>}
        {!isLoading && error && <p style={{ color: 'var(--danger-color)' }}>{error}</p>}
        {!isLoading && !error && data && (
          <>
            <header className="modal-header">
              <div>
                <h2>{data.price?.longName ?? symbol} ({symbol})</h2>
                <div className="main-info">
                    <span className="current-price">
                        {(displayCurrency === 'EUR' ? data.price?.regularMarketPrice : data.price?.originalMarketPrice)?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {' '}{displayCurrency}
                    </span>
                    {onAddToPortfolio && <button className="add-portfolio-btn" onClick={() => onAddToPortfolio(symbol, data.price?.originalMarketPrice, data.price?.longName, data.profile?.sector, data.profile?.country)}>+ Ajouter</button>}
                </div>
              </div>
              <button onClick={onClose} className="close-button">×</button>
            </header>
            
            {data.price.originalCurrency && data.price.originalCurrency !== 'EUR' && (
              <div className="currency-toggle">
                  <div className="toggle-switch">
                      <button className={displayCurrency === 'EUR' ? 'active' : ''} onClick={() => setDisplayCurrency('EUR')}>EUR</button>
                      <button className={displayCurrency === data.price.originalCurrency ? 'active' : ''} onClick={() => setDisplayCurrency(data.price.originalCurrency)}>{data.price.originalCurrency}</button>
                  </div>
              </div>
            )}

            <div className="modal-tabs">
              <button className={`modal-tab ${activeTab === 'Résumé' ? 'active' : ''}`} onClick={() => setActiveTab('Résumé')}>Résumé</button>
              <button className={`modal-tab ${activeTab === 'Finances' ? 'active' : ''}`} onClick={() => setActiveTab('Finances')}>Éléments financiers</button>
              <button className={`modal-tab ${activeTab === 'Analyse' ? 'active' : ''}`} onClick={() => setActiveTab('Analyse')}>Analyse Quantitative</button>
            </div>

            {activeTab === 'Résumé' && (
              <div>
                <div className="interval-selector">
                  {intervals.map(i => (<button key={i.value} className={selectedInterval === i.value ? 'active' : ''} onClick={() => setSelectedInterval(i.value)}>{i.label}</button>))}
                </div>
                <div className="chart-container">
                  {(chartData && chartData.length > 0) ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                        <YAxis domain={['dataMin', 'dataMax']} tickFormatter={(price) => price.toLocaleString('fr-FR')} stroke="var(--text-secondary)" />
                        <Tooltip content={<DetailTooltip currency={chartCurrencyCode} startPrice={startPrice} />} />
                        {/* CORRECTION : La ligne du graphique est maintenant visible */}
                        <Line type="monotone" dataKey="price" stroke={perfColor} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p>Graphique non disponible.</p>}
                </div>
                <div className="stats-grid-large">
                  <div><span>Capitalisation</span><strong>{formatLargeNumber(data.summary?.marketCap)}</strong></div>
                  <div><span>Ratio C/B</span><strong>{data.summary?.trailingPE?.toFixed(2) ?? 'N/A'}</strong></div>
                  <div><span>Ratio C/CA</span><strong>{data.summary?.priceToSalesTrailing12Months?.toFixed(2) ?? 'N/A'}</strong></div>
                  <div><span>BPA</span><strong>{data.summary?.trailingEps?.toFixed(2) ?? 'N/A'}</strong></div>
                </div>
                {data.profile?.longBusinessSummary && <p className="description">{data.profile.longBusinessSummary}</p>}
              </div>
            )}

            {activeTab === 'Finances' && ( 
              <div className="financials-container">
                <div className="financials-card">
                  <h3>Avis des Analystes</h3>
                  {renderRecommendation(data.recommendations)}
                </div>
                <div className="financials-card">
                  <h3>Chiffre d'Affaires / Bénéfices</h3>
                  <div className="toggle-switch" style={{marginBottom: '1rem'}}>
                    <button className={financialsPeriod === 'annual' ? 'active' : ''} onClick={() => setFinancialsPeriod('annual')}>Annuel</button>
                    <button className={financialsPeriod === 'quarterly' ? 'active' : ''} onClick={() => setFinancialsPeriod('quarterly')}>Trimestriel</button>
                  </div>
                  {(financialData && financialData.length > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={financialData}>
                          <XAxis dataKey={financialDataKey} tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                          <YAxis tickFormatter={(val) => formatLargeNumber(val)} stroke="var(--text-secondary)" />
                          <Tooltip content={<FinancialsTooltip currency={displayCurrency} />} />
                          <Legend />
                          <Bar dataKey="revenue" fill="#8884d8" name="Chiffre d'affaires" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="earnings" fill="#ffc658" name="Bénéfices" radius={[4, 4, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : <p>Données financières non disponibles.</p>}
                </div>
              </div>
            )}

            {activeTab === 'Analyse' && (
              <div className="score-analysis-container">
                  {data.scores ? (
                      <>
                          <div className="global-score-display">
                              <h3>Score Global</h3>
                              <span>{data.scores.globalScore}</span>
                              <p>Moyenne pondérée des piliers d'investissement.</p>
                          </div>
                          <div className="score-bar-list">
                              <ScoreBar label="Score de Valeur" score={data.scores.valueScore} tooltipText="Note la sous-évaluation d'une action (P/E faible). Ignoré pour les sociétés financières." />
                              <ScoreBar label="Score de Qualité" score={data.scores.qualityScore} tooltipText="Mesure la rentabilité (Marge ou ROE)." />
                              <ScoreBar label="Score de Croissance" score={data.scores.growthScore} tooltipText="Évalue la croissance future attendue des bénéfices." />
                              <ScoreBar label="Score de Dividende" score={data.scores.dividendScore} tooltipText="Note le rendement du dividende." />
                          </div>
                      </>
                  ) : ( <p>Les scores ne sont pas disponibles pour cet actif.</p> )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
export default StockDetailModal;