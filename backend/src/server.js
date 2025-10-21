import express from 'express';
import cors from 'cors';
import { dbPromise } from './database.js';
import { getCompleteStockDetails, searchSymbols, getStockData, getPortfolioPerformance, getHistoricalPerformance, getPriceOnDate } from './api.js';
import { INDICES } from './stockLists.js';

const app = express();
const PORT = 3001;
app.use(cors());
app.use(express.json());

dbPromise.then(db => {
  app.get('/api/performance', async (req, res) => {
      const { range = '1y' } = req.query;
      const assets = db.prepare("SELECT * FROM assets WHERE (type = 'Action' OR type = 'ETF') AND purchaseDate IS NOT NULL").all();
      const { performance } = await getPortfolioPerformance(assets, range); 
      res.json(performance);
  });
  
  app.get('/api/assets', async (req, res) => {
    const transactions = db.prepare('SELECT * FROM assets ORDER BY purchaseDate ASC').all();
    const aggregated = new Map();
    transactions.forEach(tx => {
      const key = tx.name.trim().toUpperCase();
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          key: key, name: tx.name, longName: tx.longName, type: tx.type, sector: tx.sector, country: tx.country,
          totalQuantity: 0, totalCost: 0, transactions: []
        });
      }
      const asset = aggregated.get(key);
      asset.totalQuantity += tx.quantity;
      asset.totalCost += tx.quantity * tx.purchasePrice;
      asset.transactions.push(tx);
    });
    const assets = Array.from(aggregated.values());
    assets.forEach(asset => {
      asset.purchasePrice = asset.totalQuantity > 0 ? asset.totalCost / asset.totalQuantity : 0;
      asset.quantity = asset.totalQuantity;
    });
    const stockSymbols = assets.map(a => a.key);
    if (stockSymbols.length > 0) {
      const liveData = await getStockData(stockSymbols);
      const liveDataMap = new Map(liveData.map(d => [d.symbol.trim().toUpperCase(), d]));
      assets.forEach(asset => {
        if (liveDataMap.has(asset.key)) {
          const liveAsset = liveDataMap.get(asset.key);
          asset.currentPrice = liveAsset.price;
          asset.dailyChange = liveAsset.change;
          asset.plAmount = (liveAsset.price - asset.purchasePrice) * asset.quantity;
          asset.totalValue = liveAsset.price * asset.quantity;
        }
      });
    }
    res.json(assets);
  });

  app.post('/api/assets', async (req, res) => {
    const { name, longName, type, quantity, sector, country, purchaseDate } = req.body;
    
    const purchasePrice = await getPriceOnDate(name, purchaseDate);

    if (purchasePrice === null) {
      return res.status(400).json({ error: "Impossible de récupérer le prix d'achat pour cette date." });
    }

    const cleanName = name.trim().toUpperCase();
    const stmt = db.prepare('INSERT INTO assets (name, longName, type, value, quantity, purchasePrice, sector, country, purchaseDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const result = stmt.run(cleanName, longName, type, purchasePrice, quantity, purchasePrice, sector, country, purchaseDate);
    res.status(201).json({ id: result.lastInsertRowid, ...req.body, name: cleanName });
  });

  app.delete('/api/assets/:id', async (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM assets WHERE id = ?').run(id);
    res.status(204).send();
  });

  app.get('/api/portfolio-score', async (req, res) => {
    const assets = db.prepare('SELECT * FROM assets').all();
    if (assets.length === 0) {
      return res.json({ finalScore: 0, diversificationScore: 0, qualityScore: 0, performanceScore: 0 });
    }
    const stockSymbols = assets.filter(a => a.type === 'Action').map(a => a.name);
    const liveData = await getStockData(stockSymbols);
    const liveDataMap = new Map(liveData.map(d => [d.symbol, d]));
    let totalValue = 0;
    assets.forEach(asset => {
      const liveAsset = liveDataMap.get(asset.name);
      if (liveAsset && typeof liveAsset.price === 'number') { asset.totalValue = liveAsset.price * asset.quantity; } 
      else { asset.totalValue = asset.value * asset.quantity; }
      totalValue += asset.totalValue;
    });
    if (totalValue <= 0) { return res.json({ finalScore: 0, diversificationScore: 0, qualityScore: 0, performanceScore: 0 }); }
    const normalize = (val, min, max) => 100 - Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
    const byType = assets.reduce((acc, a) => ({...acc, [a.type]: (acc[a.type] || 0) + a.totalValue}), {});
    const typeValues = Object.values(byType);
    const maxTypeWeight = typeValues.length > 0 ? Math.max(...typeValues) / totalValue : 0;
    const typeScore = normalize(maxTypeWeight * 100, 50, 100);
    const assetValues = assets.map(a => a.totalValue);
    const maxAssetWeight = assetValues.length > 0 ? Math.max(...assetValues) / totalValue : 0;
    const assetScore = normalize(maxAssetWeight * 100, 5, 30);
    const bySector = assets.reduce((acc, a) => (a.sector ? {...acc, [a.sector]: (acc[a.sector] || 0) + a.totalValue} : acc), {});
    const sectorValues = Object.values(bySector);
    const maxSectorWeight = sectorValues.length > 0 ? Math.max(...sectorValues) / totalValue : 0;
    const sectorScore = normalize(maxSectorWeight * 100, 30, 60);
    const diversificationScore = (typeScore * 0.3) + (assetScore * 0.4) + (sectorScore * 0.3);
    const stockDetailsPromises = stockSymbols.map(symbol => getCompleteStockDetails(symbol));
    const stockDetailsResults = await Promise.all(stockDetailsPromises);
    const scoresMap = new Map(stockDetailsResults.filter(d => d && d.scores).map(d => [d.price.symbol, d.scores.globalScore]));
    let totalQualityWeight = 0;
    let qualityScoreSum = 0;
    assets.forEach(asset => {
        if (asset.type === 'Action' && scoresMap.has(asset.name)) {
            const weight = asset.totalValue / totalValue;
            qualityScoreSum += scoresMap.get(asset.name) * weight;
            totalQualityWeight += weight;
        }
    });
    const qualityScore = totalQualityWeight > 0 ? qualityScoreSum / totalQualityWeight : 50;
    const { dailyReturns } = await getPortfolioPerformance(assets, '1y');
    let performanceScore = 0;
    if (dailyReturns.length > 20) {
        const meanReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
        const stdDev = Math.sqrt(dailyReturns.map(r => Math.pow(r - meanReturn, 2)).reduce((sum, r) => sum + r, 0) / dailyReturns.length);
        if (stdDev > 0) {
            const annualizedReturn = Math.pow(1 + meanReturn, 252) - 1;
            const annualizedStdDev = stdDev * Math.sqrt(252);
            const riskFreeRate = 0.02;
            const sharpeRatio = (annualizedReturn - riskFreeRate) / annualizedStdDev;
            performanceScore = Math.min(100, Math.max(0, (sharpeRatio / 1.5) * 100));
        }
    }
    const finalScore = (diversificationScore * 0.5) + (qualityScore * 0.3) + (performanceScore * 0.2);
    res.json({ finalScore: Math.round(finalScore), diversificationScore: Math.round(diversificationScore), qualityScore: Math.round(qualityScore), performanceScore: Math.round(performanceScore) });
  });

  // --- C'EST CETTE ROUTE QUI MANQUAIT PROBABLEMENT ---
  app.get('/api/market/historical-price', async (req, res) => {
    const { symbol, date } = req.query;
    if (!symbol || !date) { return res.status(400).json({ error: 'Symbole et date requis.' }); }
    const price = await getPriceOnDate(symbol, date);
    if (price !== null) { res.json({ price }); } 
    else { res.status(404).json({ error: `Prix non trouvé pour ${symbol} à la date ${date}.` }); }
  });
  
  app.get('/api/market/stock/:symbol', async (req, res) => {
      const { symbol } = req.params;
      const { range = '1y' } = req.query;
      const data = await getCompleteStockDetails(symbol, range);
      if (data) { res.json(data); } 
      else { res.status(404).json({ error: 'Données non trouvées.' }); }
  });
  
  app.get('/api/market/search', async (req, res) => {
      const query = req.query.q;
      if (!query) return res.status(400).json({ error: 'Query manquant.' });
      const results = await searchSymbols(query);
      res.json(results);
  });

  app.post('/api/market/watchlist', async (req, res) => {
      const { symbols } = req.body;
      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) { return res.json([]); }
      try {
          const liveData = await getStockData(symbols);
          res.json(liveData);
      } catch (error) {
          console.error("Erreur API Watchlist:", error);
          res.status(500).json({ error: "Erreur lors de la récupération des données de la watchlist." });
      }
  });
  
  app.post('/api/market/screener', async (req, res) => {
    const { index, performanceRange, ...filters } = req.body;
    const stockList = (INDICES[index] && INDICES[index].components) ? INDICES[index].components : INDICES['^GSPC'].components;
    const promises = stockList.map(symbol => getCompleteStockDetails(symbol));
    const results = await Promise.allSettled(promises);
    const allStockData = results
      .filter(res => res.status === 'fulfilled' && res.value && res.value.summary && res.value.scores)
      .map(res => res.value);
    const baseFiltered = allStockData.filter(stock => {
      const { summary, profile, recommendations, scores } = stock;
      if (filters.sector && profile.sector !== filters.sector) return false;
      if (filters.dividendYieldMin && (summary.dividendYield == null || (summary.dividendYield * 100) < filters.dividendYieldMin)) return false;
      if (filters.analystBuyMin) {
          if (!recommendations) return false;
          const { strongBuy, buy, hold, sell, strongSell } = recommendations;
          if ([strongBuy, buy, hold, sell, strongSell].some(val => typeof val !== 'number')) return false;
          const total = strongBuy + buy + hold + sell + strongSell;
          if (total === 0) return false;
          const buyPercent = ((strongBuy + buy) / total) * 100;
          if (buyPercent < filters.analystBuyMin) return false;
      }
      if (filters.globalScoreMin && scores.globalScore < filters.globalScoreMin) return false;
      if (filters.valueScoreMin && scores.valueScore < filters.valueScoreMin) return false;
      if (filters.qualityScoreMin && scores.qualityScore < filters.qualityScoreMin) return false;
      return true;
    });
    let finalResults = [];
    if (filters.performanceMin != null || filters.performanceMax != null) {
        const perfPromises = baseFiltered.map(async (stock) => {
            const perf = await getHistoricalPerformance(stock.price.symbol, performanceRange);
            if (perf === null) return null;
            const passesMin = filters.performanceMin == null || perf >= filters.performanceMin;
            const passesMax = filters.performanceMax == null || perf <= filters.performanceMax;
            if (passesMin && passesMax) {
                return { ...stock, performance: perf };
            }
            return null;
        });
        const perfResults = await Promise.all(perfPromises);
        finalResults = perfResults.filter(Boolean);
    } else {
        finalResults = baseFiltered;
    }
    res.json(finalResults.slice(0, 50));
  });

  app.listen(PORT, () => console.log(`Backend server en écoute sur http://localhost:${PORT}`));
}).catch(err => { console.error("Failed to initialize database:", err); process.exit(1); });