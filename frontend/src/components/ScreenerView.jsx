import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const SECTOR_OPTIONS = ["Technology", "Healthcare", "Financial Services", "Consumer Cyclical", "Industrials", "Energy", "Consumer Defensive", "Utilities", "Real Estate", "Communication Services", "Basic Materials"];
const INDEX_OPTIONS = {
    '^GSPC': "S&P 500 (USA)",
    '^IXIC': "NASDAQ Composite (USA)",
    '^FCHI': "CAC 40 (France)",
    '^GDAXI': "DAX 40 (Allemagne)"
};
const PERFORMANCE_RANGES = { 'ytd': "Depuis le 1er Janvier", '1y': "Sur 1 an", '6mo': "Sur 6 mois" };

const initialFilters = {
    index: '^GSPC',
    sector: '',
    dividendYieldMin: '',
    analystBuyMin: '',
    performanceRange: 'ytd',
    performanceMin: '',
    performanceMax: '',
    globalScoreMin: '',
    valueScoreMin: '',
    qualityScoreMin: '',
};

const ITEMS_PER_PAGE = 50; // Nombre de résultats par page

const ScreenerView = ({ onStockSelect }) => {
    const [filters, setFilters] = useState(initialFilters);
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'globalScore', order: 'desc' });
    // --- AJOUT : State pour la pagination ---
    const [currentPage, setCurrentPage] = useState(1);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const resetFilters = () => {
        setFilters(initialFilters);
        setResults([]);
        setCurrentPage(1); // Reset page
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setResults([]);
        setCurrentPage(1); // Reset page on new search
        
        const numericFilters = {
            dividendYieldMin: filters.dividendYieldMin === '' ? null : parseFloat(filters.dividendYieldMin),
            analystBuyMin: filters.analystBuyMin === '' ? null : parseFloat(filters.analystBuyMin),
            performanceMin: filters.performanceMin === '' ? null : parseFloat(filters.performanceMin),
            performanceMax: filters.performanceMax === '' ? null : parseFloat(filters.performanceMax),
            globalScoreMin: filters.globalScoreMin === '' ? null : parseFloat(filters.globalScoreMin),
            valueScoreMin: filters.valueScoreMin === '' ? null : parseFloat(filters.valueScoreMin),
            qualityScoreMin: filters.qualityScoreMin === '' ? null : parseFloat(filters.qualityScoreMin),
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/market/screener`, { ...filters, ...numericFilters });
            setResults(response.data);
        } catch (err) {
            setError("Une erreur est survenue lors de la recherche. Veuillez réessayer.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const sortedResults = useMemo(() => {
        if (results.length === 0) return [];
        let sortableResults = [...results];

        sortableResults.sort((a, b) => {
            let aValue, bValue;
            switch (sortConfig.key) {
                case 'globalScore': aValue = a.scores.globalScore; bValue = b.scores.globalScore; break;
                case 'qualityScore': aValue = a.scores.qualityScore; bValue = b.scores.qualityScore; break;
                case 'valueScore': aValue = a.scores.valueScore; bValue = b.scores.valueScore; break;
                case 'dividendYield': aValue = a.summary.dividendYield || 0; bValue = b.summary.dividendYield || 0; break;
                default: return 0;
            }
            if (aValue < bValue) return sortConfig.order === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.order === 'asc' ? 1 : -1;
            return 0;
        });

        return sortableResults;
    }, [results, sortConfig]);

    const handleSort = (key) => {
        let order = 'desc';
        if (sortConfig.key === key && sortConfig.order === 'desc') {
            order = 'asc';
        }
        setSortConfig({ key, order });
    };
    
    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.order === 'desc' ? '▼' : '▲';
    };

    // --- AJOUT : Logique pour découper les résultats par page ---
    const paginatedResults = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedResults.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, sortedResults]);

    const totalPages = Math.ceil(sortedResults.length / ITEMS_PER_PAGE);

    return (
        <div>
            {/* ... (Formulaire de filtres inchangé) ... */}
            <div className="card" style={{marginBottom: '1.5rem'}}>
                <h3>Filtres de Recherche</h3>
                <form onSubmit={handleSubmit} className="screener-filters-form">
                    <div className="filter-group">
                        <label>Univers de Recherche</label>
                        <select name="index" value={filters.index} onChange={handleFilterChange}>
                            {Object.entries(INDEX_OPTIONS).map(([symbol, name]) => <option key={symbol} value={symbol}>{name}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Secteur</label>
                        <select name="sector" value={filters.sector} onChange={handleFilterChange}>
                            <option value="">Tous les Secteurs</option>
                            {SECTOR_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Dividende (%) Min</label>
                        <input type="number" name="dividendYieldMin" placeholder="Ex: 2" value={filters.dividendYieldMin} onChange={handleFilterChange} />
                    </div>
                    <div className="filter-group">
                        <label>Avis d'Achat (%) Min</label>
                        <input type="number" name="analystBuyMin" placeholder="Ex: 75" value={filters.analystBuyMin} onChange={handleFilterChange} />
                    </div>
                    <div className="filter-group">
                        <label>Score Global Min</label>
                        <input type="number" name="globalScoreMin" placeholder="Ex: 70" value={filters.globalScoreMin} onChange={handleFilterChange} min="0" max="100"/>
                    </div>
                    <div className="filter-group">
                        <label>Score Qualité Min</label>
                        <input type="number" name="qualityScoreMin" placeholder="Ex: 60" value={filters.qualityScoreMin} onChange={handleFilterChange} min="0" max="100"/>
                    </div>
                    <div className="filter-group">
                        <label>Score Valeur Min</label>
                        <input type="number" name="valueScoreMin" placeholder="Ex: 60" value={filters.valueScoreMin} onChange={handleFilterChange} min="0" max="100"/>
                    </div>
                     <div className="filter-group">
                        <label>Performance</label>
                        <select name="performanceRange" value={filters.performanceRange} onChange={handleFilterChange}>
                            {Object.entries(PERFORMANCE_RANGES).map(([range, name]) => <option key={range} value={range}>{name}</option>)}
                        </select>
                        <div className="input-range">
                            <input type="number" name="performanceMin" placeholder="Min %" value={filters.performanceMin} onChange={handleFilterChange} />
                            <input type="number" name="performanceMax" placeholder="Max %" value={filters.performanceMax} onChange={handleFilterChange} />
                        </div>
                    </div>
                </form>
                <div className="screener-actions">
                    <button onClick={handleSubmit} disabled={isLoading}>{isLoading ? 'Recherche...' : 'Lancer la Recherche'}</button>
                    <button onClick={resetFilters} className="secondary">Réinitialiser</button>
                </div>
            </div>

            <div className="card">
                <h3>Résultats ({sortedResults.length})</h3>
                {isLoading && <p>Recherche en cours...</p>}
                {error && <p style={{color: 'var(--danger-color)'}}>{error}</p>}
                
                {!isLoading && results.length > 0 && (
                    <div className="screener-results-container">
                        <div className="screener-results-header">
                            <span className="header-name">Société</span>
                            <button onClick={() => handleSort('globalScore')} className="sort-button">Score {getSortIndicator('globalScore')}</button>
                            <button onClick={() => handleSort('qualityScore')} className="sort-button">Qualité {getSortIndicator('qualityScore')}</button>
                            <button onClick={() => handleSort('valueScore')} className="sort-button">Valeur {getSortIndicator('valueScore')}</button>
                            <button onClick={() => handleSort('dividendYield')} className="sort-button">Dividende {getSortIndicator('dividendYield')}</button>
                        </div>
                        <ul className="screener-results-list">
                            {/* --- MODIFICATION : Utiliser paginatedResults au lieu de sortedResults --- */}
                            {paginatedResults.map(stock => (
                                <li key={stock.price.symbol} className="screener-result-item" onClick={() => onStockSelect(stock.price.symbol)}>
                                    <div className="result-name">
                                        <strong>{stock.price.shortName || stock.price.longName}</strong>
                                        <small>{stock.price.symbol}</small>
                                    </div>
                                    <span className="result-score">{stock.scores.globalScore}</span>
                                    <span>{stock.scores.qualityScore}</span>
                                    <span>{stock.scores.valueScore}</span>
                                    <span>{stock.summary.dividendYield ? (stock.summary.dividendYield * 100).toFixed(2) + '%' : 'N/A'}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* --- AJOUT : Contrôles de pagination --- */}
                {!isLoading && totalPages > 1 && (
                    <div className="pagination-controls">
                        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                            Précédent
                        </button>
                        <span>Page {currentPage} sur {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                            Suivant
                        </button>
                    </div>
                )}

                {!isLoading && results.length === 0 && <p>Aucun résultat trouvé pour ces critères.</p>}
            </div>
        </div>
    );
};

export default ScreenerView;