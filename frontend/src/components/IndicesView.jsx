import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const indicesByRegion = {
  "Amériques": [
    { name: "S&P 500", symbol: "^GSPC" }, { name: "Dow Jones", symbol: "^DJI" }, { name: "NASDAQ Composite", symbol: "^IXIC" },
    { name: "S&P/TSX (Canada)", symbol: "^GSPTSE" }, { name: "Bovespa (Brésil)", symbol: "^BVSP" },
  ],
  "Europe": [
    { name: "CAC 40 (France)", symbol: "^FCHI" }, { name: "DAX (Allemagne)", symbol: "^GDAXI" }, { name: "FTSE 100 (R-U)", symbol: "^FTSE" },
    { name: "Euro Stoxx 50", symbol: "^STOXX50E" }, { name: "SMI (Suisse)", symbol: "^SSMI" },
  ],
  "Asie-Pacifique": [
    { name: "Nikkei 225 (Japon)", symbol: "^N225" }, { name: "Hang Seng (Hong Kong)", symbol: "^HSI" }, { name: "Shanghai Composite", symbol: "000001.SS" },
    { name: "S&P/ASX 200 (Australie)", symbol: "^AXJO" }, { name: "KOSPI (Corée du Sud)", symbol: "^KS11" },
  ]
};

const IndicesView = ({ onIndexSelect }) => {
  const [marketData, setMarketData] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const allSymbols = useMemo(() => Object.values(indicesByRegion).flat().map(i => i.symbol), []);

  useEffect(() => {
    const fetchIndexData = async () => {
      setIsLoading(true);
      try {
        const response = await axios.post(`${API_BASE_URL}/market/watchlist`, { symbols: allSymbols });
        setMarketData(new Map(response.data.map(d => [d.symbol, d])));
      } catch (error) {
        console.error("Erreur chargement des indices:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIndexData();
  }, [allSymbols]);

  // --- MODIFICATION : Utilisation du style "badge" pour la cohérence ---
  const renderChange = (change) => {
    const value = parseFloat(change);
    if (isNaN(value)) return <div className="badge neutral">-</div>;
    const isPositive = value >= 0;
    const colorClass = isPositive ? 'positive' : 'negative';
    return (
      <div className={`badge ${colorClass}`}>
        {isPositive ? '+' : ''}{value.toFixed(2)}%
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="card">
        <h3>Indices Mondiaux</h3>
        <p style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          Chargement des données de marché...
        </p>
      </div>
    );
  }

  return (
    <div className="indices-container">
      {Object.entries(indicesByRegion).map(([region, indices]) => (
        <div className="card" key={region}>
          <h3>{region}</h3>
          {/* --- MODIFICATION : Remplacement de la table par une liste --- */}
          <ul className="indices-list">
            {indices.map(index => {
              const data = marketData.get(index.symbol);
              return (
                <li key={index.symbol} className="index-item" onClick={() => onIndexSelect(index.symbol)}>
                  <span className="index-name">{index.name}</span>
                  <span className="index-price">
                    {data?.price?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? 'N/A'}
                  </span>
                  <div className="index-change">
                    {renderChange(data?.change)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default IndicesView;