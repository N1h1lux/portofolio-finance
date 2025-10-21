import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const MarketWatchlist = ({ onStockSelect }) => {
  const [watchlist, setWatchlist] = useState(() => JSON.parse(localStorage.getItem('financeTrackWatchlist')) || ['AAPL', 'TTE.PA', 'BTC-EUR']);
  const [marketData, setMarketData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => { localStorage.setItem('financeTrackWatchlist', JSON.stringify(watchlist)); }, [watchlist]);

  const fetchWatchlistData = useCallback(async () => {
    setIsLoading(true);
    if (watchlist.length === 0) {
      setIsLoading(false);
      setMarketData([]);
      return;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/market/watchlist`, { symbols: watchlist });
      setMarketData(response.data);
    } catch (error) {
      console.error("Erreur watchlist:", error);
      setMarketData(watchlist.map(s => ({ symbol: s, price: 'Erreur', change: 0, currency: ''})));
    } finally {
      setIsLoading(false);
    }
  }, [watchlist]);

  useEffect(() => {
    fetchWatchlistData();
    const interval = setInterval(fetchWatchlistData, 60000);
    return () => clearInterval(interval);
  }, [fetchWatchlistData]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const res = await axios.get(`${API_BASE_URL}/market/search?q=${searchTerm.trim()}`);
      setSearchResults(res.data);
    } catch (error) {
      console.error("Erreur recherche watchlist:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const addToWatchlist = (symbol) => {
    if (!watchlist.includes(symbol)) {
      setWatchlist(p => [...p, symbol]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const renderChange = (change) => {
    const value = parseFloat(change);
    if (isNaN(value)) return <span>-</span>;
    const color = value >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
    return <span style={{ color, fontWeight: 'bold' }}>{value >= 0 ? '+' : ''}{value.toFixed(2)}%</span>;
  };

  return (
    <div className="card">
      <h3>Watchlist</h3>
      <form onSubmit={handleSearch} className="search-form">
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Ajouter un symbole..." />
        <button type="submit" disabled={isSearching}>{isSearching ? '...' : 'Rechercher'}</button>
      </form>
      {searchResults.length > 0 && <ul className="search-results-list">{searchResults.map(result => (
        <li key={result.symbol}>
          <div onClick={() => onStockSelect(result.symbol)} style={{cursor: 'pointer', flexGrow: 1}}><strong>{result.symbol}</strong><span>{result.name}</span></div>
          <button onClick={() => addToWatchlist(result.symbol)}>+</button>
        </li>
      ))}</ul>}
      {isLoading ? <p>Chargement...</p> : <ul className="watchlist">{marketData.map(item => (
        <li key={item.symbol}>
          <span onClick={() => onStockSelect(item.symbol)} style={{cursor: 'pointer'}}>{item.symbol}</span>
          <span className="price">{typeof item.price === 'number' ? item.price.toLocaleString('fr-FR', {style:'currency', currency: item.currency || 'USD'}) : 'N/A'}</span>
          <span>{renderChange(item.change)}</span>
          <button onClick={() => setWatchlist(p => p.filter(s => s !== item.symbol))} className="button-delete">×</button>
        </li>
      ))}</ul>}
    </div>
  );
};

export default MarketWatchlist;