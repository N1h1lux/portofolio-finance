import React, { useState } from 'react';

const Assets = ({ assets, onAssetDeleted, onStockSelect }) => {
  const [expandedAsset, setExpandedAsset] = useState(null);

  const toggleExpand = (assetName) => {
    setExpandedAsset(expandedAsset === assetName ? null : assetName);
  };

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

  const renderPL = (plAmount, plPercentage) => {
    if (plAmount === undefined || plAmount === null || isNaN(plAmount)) {
      return (
        <div className="asset-pl">
          <span className="pl-amount">-</span>
        </div>
      );
    }
    const isPositive = plAmount >= 0;
    const colorClass = isPositive ? 'positive' : 'negative';
    const sign = isPositive ? '+' : '';

    return (
      <div className={`asset-pl ${colorClass}`}>
        <span className="pl-amount">{sign}{plAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
        <span className="pl-percent">({sign}{plPercentage.toFixed(2)}%)</span>
      </div>
    );
  };

  const groupedAssets = assets.reduce((acc, asset) => {
    (acc[asset.type] = acc[asset.type] || []).push(asset);
    return acc;
  }, {});

  return (
    <div className="assets-container">
      {assets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>Votre portefeuille est vide. Ajoutez un actif pour commencer.</p>
        </div>
      ) : (
        Object.entries(groupedAssets).map(([type, list]) => (
          <div key={type} className="asset-group">
            <h3 className="asset-group-title">{type}</h3>
            <ul className="assets-list">
              {list.map(asset => {
                const purchaseCost = asset.quantity * asset.purchasePrice;
                const plPercentage = purchaseCost > 0 ? (asset.plAmount / purchaseCost) * 100 : 0;

                return (
                  <li key={asset.name} className="asset-item">
                    <div className="asset-main-info" onClick={() => toggleExpand(asset.name)}>
                      <div className="asset-name-details">
                        <div className="asset-identity">
                          <strong>{asset.longName || asset.name}</strong>
                          <small>{asset.quantity.toLocaleString('fr-FR')} x {asset.purchasePrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} (PRU)</small>
                        </div>
                        <button className="button-details" onClick={(e) => { e.stopPropagation(); onStockSelect(asset.name); }} title="Voir les détails de l'actif">?</button>
                      </div>
                      
                      <div className="asset-total-value">
                        <strong>{(asset.totalValue || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong>
                      </div>

                      {renderPL(asset.plAmount, plPercentage)}
                      
                      <div className="asset-daily-change">
                        {renderChange(asset.dailyChange)}
                      </div>
                    </div>

                    {expandedAsset === asset.name && (
                      <div className="transactions-list-container">
                        <div className="transactions-header">
                            <span>Date Achat</span>
                            <span>Quantité</span>
                            <span>Prix Achat</span>
                            <span></span>
                        </div>
                        <ul className="transactions-list">
                          {asset.transactions.map(tx => (
                            <li key={tx.id} className="transaction-item">
                              {/* --- CORRECTION ICI --- */}
                              <span>{new Date(tx.purchaseDate).toLocaleDateString('fr-FR')}</span>
                              <span>{tx.quantity.toLocaleString('fr-FR')}</span>
                              <span>{tx.purchasePrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                              <button className="button-delete" onClick={(e) => { e.stopPropagation(); onAssetDeleted(tx.id); }} title="Supprimer la transaction">
                                <svg viewBox="0 0 448 512"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
};

export default Assets;