import React, { useMemo, useState } from 'react'; // CORRECTION : useState a été ajouté
import axios from 'axios';
import Assets from './Assets';

const AssetCategoryView = ({ assetType, assets, onAssetDeleted, onStockSelect }) => {
  const filteredAssets = useMemo(() => assets.filter(asset => asset.type === assetType), [assets, assetType]);

  const categoryTotalValue = filteredAssets.reduce((sum, asset) => sum + (asset.totalValue || 0), 0);
  const categoryPLAmount = filteredAssets.reduce((sum, asset) => sum + (asset.plAmount || 0), 0);
  const categoryPurchaseCost = filteredAssets.reduce((sum, asset) => {
    if (asset.purchasePrice && asset.quantity) {
      return sum + (asset.purchasePrice * asset.quantity);
    }
    return sum;
  }, 0);
  const categoryPLPercentage = categoryPurchaseCost > 0 ? (categoryPLAmount / categoryPurchaseCost) * 100 : 0;

  const renderKpiValue = (value, type) => {
    if (isNaN(value)) return type === 'currency' ? '0,00 €' : '0,00%';
    const isPositive = value >= 0;
    const color = value === 0 ? 'var(--text-primary)' : (isPositive ? 'var(--success-color)' : 'var(--danger-color)');
    const sign = isPositive ? '+' : '';
    if (type === 'currency') {
      return <span style={{ color }}>{sign}{value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>;
    }
    if (type === 'percent') {
      return <span style={{ color }}>{sign}{value.toFixed(2).replace('.', ',')}%</span>;
    }
    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const res = await axios.get(`${API_BASE_URL}/market/search?q=${searchTerm.trim()}`);
      setSearchResults(res.data);
    } catch (error) { console.error("Erreur recherche:", error); } 
    finally { setIsSearching(false); }
  };
  
  return (
    <div>
      <div className="kpi-grid" style={{marginBottom: '2rem'}}>
        <div className="kpi-card">
          <div className="title">Valeur Totale ({assetType})</div>
          <div className="value">{renderKpiValue(categoryTotalValue)}</div>
        </div>
        <div className="kpi-card">
          <div className="title">+/- Values Latentes</div>
          <div className="value">{renderKpiValue(categoryPLAmount, 'currency')}</div>
        </div>
        <div className="kpi-card">
          <div className="title">Rendement Total</div>
          <div className="value">{renderKpiValue(categoryPLPercentage, 'percent')}</div>
        </div>
      </div>

      <div className="card search-card">
        <form onSubmit={handleSearch} className="search-form">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={`Rechercher un ${assetType}...`} />
          <button type="submit" disabled={isSearching}>{isSearching ? '...' : 'Rechercher'}</button>
        </form>
        {isSearching && <p>Recherche...</p>}
        {searchResults.length > 0 && (
          <ul className="search-results-list">
            {searchResults.map(result => (
              <li key={result.symbol} onClick={() => onStockSelect(result.symbol)} style={{ cursor: 'pointer' }}>
                <div className="result-info">
                  <strong>{result.symbol}</strong>
                  <span>{result.name}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Assets assets={filteredAssets} onAssetDeleted={onAssetDeleted} onStockSelect={onStockSelect} />
    </div>
  );
};

export default AssetCategoryView;