import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import AssetCategoryView from './components/AssetCategoryView';
import StockDetailModal from './components/StockDetailModal';
import AddAssetModal from './components/AddAssetModal';
import AddTransactionModal from './components/AddTransactionModal';
import IndicesView from './components/IndicesView';
import ScreenerView from './components/ScreenerView';
import AnalyseView from './components/AnalyseView.jsx';
import './App.css';
import { API_BASE_URL } from './config';

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const TABS = ['Dashboard', 'Analyse', 'Actions', 'ETF', 'Crypto', 'Indices', 'Recherche +'];
  const [assets, setAssets] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [isAssetModalOpen, setAssetModalOpen] = useState(false);
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
  const [assetToAdd, setAssetToAdd] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const assetsRes = await axios.get(`${API_BASE_URL}/assets`);
      setAssets(assetsRes.data);
    } catch (error) { console.error("Erreur chargement données:", error); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssetAdded = () => { fetchData(); setAssetModalOpen(false); setAssetToAdd(null); };

  const handleAssetDeleted = async (assetId) => {
    try {
      await axios.delete(`${API_BASE_URL}/assets/${assetId}`);
      fetchData();
    }
    catch (error) { console.error("Erreur suppression:", error); }
  };

  const handleStockSelect = (symbol) => { setSelectedStock(symbol); setDetailModalOpen(true); };

  const handleAddToPortfolio = (symbol, price, longName, sector, country) => {
    const typeMapping = {'Actions': 'Action', 'Dashboard': 'Action', 'Recherche +': 'Action'};
    const type = typeMapping[activeTab] || activeTab;
    setAssetToAdd({ name: symbol, value: price, type, longName, sector, country });
    setDetailModalOpen(false);
    setAssetModalOpen(true);
  };

  const renderMainContent = () => {
    const commonProps = { assets, onAssetDeleted: handleAssetDeleted, onStockSelect: handleStockSelect };
    switch(activeTab) {
      case 'Analyse': return <AnalyseView assets={assets} />;
      case 'Actions': return <AssetCategoryView assetType="Action" {...commonProps} onAddAssetClick={() => setAssetModalOpen(true)} />;
      case 'ETF': return <AssetCategoryView assetType="ETF" {...commonProps} onAddAssetClick={() => setAssetModalOpen(true)} />;
      case 'Crypto': return <AssetCategoryView assetType="Crypto" {...commonProps} onAddAssetClick={() => setAssetModalOpen(true)} />;
      case 'Indices': return <IndicesView onIndexSelect={handleStockSelect} />;
      case 'Recherche +': return <ScreenerView onStockSelect={handleStockSelect} />;
      default: return <Dashboard 
          {...commonProps} 
          onAddAssetClick={() => setAssetModalOpen(true)} 
          onAddTransactionClick={() => setTransactionModalOpen(true)}
        />;
    }
  };

  return (
    <div className="app-container">
      <nav className="sidebar">
        <h1>Finance Track 📈</h1>
        <ul>
          {TABS.map(tab => (
            <li 
              key={tab} 
              className={activeTab === tab ? 'active' : ''} 
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </li>
          ))}
        </ul>
      </nav>
      
      <main className="main-content">
        <header className="main-header">
          <h2>{activeTab}</h2>
        </header>
        {renderMainContent()}
      </main>
      
      {isDetailModalOpen && <StockDetailModal symbol={selectedStock} onClose={() => setDetailModalOpen(false)} onAddToPortfolio={handleAddToPortfolio} />}
      {isAssetModalOpen && <AddAssetModal onClose={() => { setAssetModalOpen(false); setAssetToAdd(null); }} onAssetAdded={handleAssetAdded} initialData={assetToAdd} />}
      {isTransactionModalOpen && <AddTransactionModal onClose={() => setTransactionModalOpen(false)} onTransactionAdded={fetchData} />}
    </div>
  );
}
export default App;