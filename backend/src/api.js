import yahooFinance2 from 'yahoo-finance2';

const getPeriod1 = (range) => {
  const dt = new Date();
  switch (range) {
    case '1d': dt.setDate(dt.getDate() - 1); break;
    case '5d': dt.setDate(dt.getDate() - 5); break;
    case '1mo': dt.setMonth(dt.getMonth() - 1); break;
    case '6mo': dt.setMonth(dt.getMonth() - 6); break;
    case 'ytd': dt.setMonth(0); dt.setDate(1); break;
    case '1y': dt.setFullYear(dt.getFullYear() - 1); break;
    case '5y': dt.setFullYear(dt.getFullYear() - 5); break;
    case 'max': return '1970-01-01';
    default: dt.setFullYear(dt.getFullYear() - 1);
  }
  return dt.toISOString().split('T')[0];
};

async function getCurrencyRates(currencies) {
    const rates = new Map();
    rates.set('EUR', 1);

    const pairsToFetch = [...new Set(currencies)]
        .filter(c => c && c !== 'EUR' && c !== 'ILA' && c !== 'GBp')
        .map(c => `EUR${c.toUpperCase()}=X`);

    if (pairsToFetch.length > 0) {
        try {
            const results = await yahooFinance.quote(pairsToFetch);
            const quotes = Array.isArray(results) ? results : [results];
            quotes.forEach(quote => {
                if (quote && quote.regularMarketPrice) {
                    const currency = quote.symbol.substring(3, 6);
                    rates.set(currency, quote.regularMarketPrice);
                }
            });
        } catch (error) {
            console.error("Erreur de récupération des taux de change:", error.message);
        }
    }
    return rates;
}

export async function getHistoricalPerformance(symbol, range = 'ytd') {
  const startDate = getPeriod1(range);
  try {
    const history = await yahooFinance.chart(symbol, { period1: startDate, interval: '1d' });
    const quotes = history.quotes;
    if (!quotes || quotes.length < 2) return null;
    const startPrice = quotes[0].close;
    const endPrice = quotes[quotes.length - 1].close;
    if (startPrice > 0) {
      return ((endPrice - startPrice) / startPrice) * 100;
    }
    return null;
  } catch (error) {
    return null;
  }
}

function getPreviousDayStr(dateStr, priceHistory) {
  let prevDate = new Date(dateStr);
  for (let i = 0; i < 7; i++) {
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    if (priceHistory && priceHistory[prevDateStr]) return prevDateStr;
  }
  return null;
}

export async function getPortfolioPerformance(assets, range = '1y') {
  if (!assets || assets.length === 0) return { performance: [], dailyReturns: [] };
  const startDate = getPeriod1(range);
  try {
    const assetSymbols = [...new Set(assets.map(a => a.name))];
    const promises = assetSymbols.map(symbol => yahooFinance.chart(symbol, { period1: startDate, interval: '1d' }));
    const historicalResults = await Promise.all(promises);
    const priceMap = {};
    historicalResults.forEach(result => {
        const symbol = result.meta.symbol;
        priceMap[symbol] = {};
        if (Array.isArray(result.quotes)) {
            for (const day of result.quotes) {
                if (day && day.date && typeof day.close === 'number') {
                    priceMap[symbol][day.date.toISOString().split('T')[0]] = day.close;
                }
            }
        }
    });

    const performance = [];
    const dailyReturns = [];
    const firstPurchaseDate = new Date(Math.min(...assets.map(a => new Date(a.purchaseDate))));
    let currentDate = new Date(startDate > firstPurchaseDate ? startDate : firstPurchaseDate);
    const endDate = new Date();
    let twrFactor = 1;

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let startOfDayValue = 0, endOfDayValue = 0;
      let totalMarketValue = 0;

      const transactionsUpToCurrentDate = assets.filter(tx => new Date(tx.purchaseDate) <= currentDate);
      
      const aggregatedAssets = new Map();
      transactionsUpToCurrentDate.forEach(tx => {
        const key = tx.name;
        if (!aggregatedAssets.has(key)) {
          aggregatedAssets.set(key, { name: key, totalQuantity: 0, totalCost: 0 });
        }
        const asset = aggregatedAssets.get(key);
        asset.totalQuantity += tx.quantity;
        asset.totalCost += tx.quantity * tx.purchasePrice;
      });

      const portfolioAtDate = Array.from(aggregatedAssets.values());
      const totalCostBasis = portfolioAtDate.reduce((sum, asset) => sum + asset.totalCost, 0);

      for (const asset of portfolioAtDate) {
          const todaysPrice = priceMap[asset.name]?.[dateStr] || priceMap[asset.name]?.[getPreviousDayStr(dateStr, priceMap[asset.name])];
          if (todaysPrice) {
            totalMarketValue += asset.totalQuantity * todaysPrice;
          }

          const yesterdaysPrice = priceMap[asset.name]?.[yesterdayStr] || priceMap[asset.name]?.[getPreviousDayStr(yesterdayStr, priceMap[asset.name])];
          if (todaysPrice && yesterdaysPrice) {
              startOfDayValue += asset.totalQuantity * yesterdaysPrice;
              endOfDayValue += asset.totalQuantity * todaysPrice;
          }
      }

      if (startOfDayValue > 0) {
        const dailyReturn = (endOfDayValue - startOfDayValue) / startOfDayValue;
        twrFactor = twrFactor * (1 + dailyReturn);
        dailyReturns.push(dailyReturn);
      }

      if (totalMarketValue > 0) {
        performance.push({ 
          date: dateStr, 
          pl: totalMarketValue - totalCostBasis,
          performancePct: (twrFactor - 1) * 100 
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return { performance, dailyReturns };
  } catch (error) {
    console.error("Erreur getPortfolioPerformance:", error);
    return { performance: [], dailyReturns: [] };
  }
}

function calculateInvestmentScores(data) {
    if (!data) return null;
    const { summaryDetail, defaultKeyStatistics, financialData, assetProfile, earningsTrend } = data;
    const normalize = (value, min, max, invert = false) => {
        if (value == null || isNaN(value)) return 0;
        const clampedValue = Math.max(min, Math.min(max, value));
        const normalized = (clampedValue - min) / (max - min);
        return invert ? (1 - normalized) * 100 : normalized * 100;
    };
    const isFinancial = assetProfile?.sector === 'Financial Services';
    let valueScore = 0;
    if (!isFinancial) { valueScore = normalize(summaryDetail?.trailingPE, 40, 5, true); }
    let qualityScore = 0;
    if (isFinancial) { qualityScore = normalize(financialData?.returnOnEquity ?? defaultKeyStatistics?.returnOnEquity, 0, 0.20); } 
    else { qualityScore = normalize(financialData?.profitMargins ?? defaultKeyStatistics?.profitMargins, 0, 0.25); }
    const growth = earningsTrend?.trend.find(t => ['+1y', '0y'].includes(t.period))?.growth;
    const growthScore = normalize(growth, 0, 0.30);
    const dividendYield = summaryDetail?.dividendYield ?? defaultKeyStatistics?.yield;
    const dividendScore = normalize(dividendYield, 0, 0.06);
    let weights = { value: 0.25, quality: 0.35, growth: 0.25, dividend: 0.15 };
    let totalWeight = 1;
    if (isFinancial) {
        totalWeight -= weights.value;
        weights.quality += 0.15;
        weights.dividend += 0.10;
        weights.value = 0;
    }
    const globalScore = ((valueScore * weights.value) + (qualityScore * weights.quality) + (growthScore * weights.growth) + (dividendScore * weights.dividend)) / totalWeight;
    return {
        globalScore: Math.round(globalScore), valueScore: Math.round(valueScore), qualityScore: Math.round(qualityScore),
        growthScore: Math.round(growthScore), dividendScore: Math.round(dividendScore)
    };
}

export async function getPriceOnDate(symbol, date) {
  try {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 3);

    const [history, quoteData] = await Promise.all([
        yahooFinance.chart(symbol, {
            period1: startDate.toISOString().split('T')[0],
            period2: endDate.toISOString().split('T')[0],
            interval: '1d'
        }),
        yahooFinance.quote(symbol, { fields: ['currency'] })
    ]);
    
    if (history.quotes && history.quotes.length > 0) {
      let price = history.quotes[0].close;
      let currency = quoteData.currency;
      
      if (currency === 'GBp') {
          price /= 100;
          currency = 'GBP';
      }

      if (currency && currency !== 'EUR') {
          const rates = await getCurrencyRates([currency]);
          const rate = rates.get(currency);
          if (rate) {
              price = price / rate;
          }
      }
      return price;
    }
    return null;
  } catch (error) {
    console.error(`Erreur getPriceOnDate pour ${symbol} à la date ${date}:`, error.message);
    return null;
  }
}

export async function getCompleteStockDetails(symbol, range = '1y') {
  try {
    const quoteData = await yahooFinance.quote(symbol);
    let currency = quoteData.currency || 'USD';
    let price = quoteData.regularMarketPrice;

    if (currency === 'GBp') {
        price /= 100;
        currency = 'GBP';
    }
    
    const rates = await getCurrencyRates([currency]);
    const rate = rates.get(currency) || 1;

    const isIndex = symbol.startsWith('^');
    const chartOptions = { period1: getPeriod1(range), interval: (isIndex || range === 'max' || range === '5y' || range === '1y') ? '1d' : '1h' };

    if (isIndex) {
      const chartData = await yahooFinance.chart(symbol, chartOptions);
      return {
        price: { longName: quoteData.longName || quoteData.shortName, symbol: quoteData.symbol, regularMarketPrice: price, originalMarketPrice: price, currency: currency, originalCurrency: currency, rate: 1 },
        chart: chartData.quotes.filter(q => q && typeof q.close === 'number').map(q => ({ 
            date: new Date(q.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
            price: q.close 
        })),
        profile: null, stats: null, summary: null, recommendations: null, events: null, financials: null, scores: null
      };
    }
    
    let response = {
      price: { 
        longName: quoteData.longName || quoteData.shortName, 
        symbol: quoteData.symbol, 
        regularMarketPrice: price / rate, 
        currency: 'EUR',
        originalMarketPrice: price,
        originalCurrency: currency,
        rate: rate
      },
      profile: null, stats: null, summary: null, chart: [], recommendations: null, events: null, financials: null, scores: null
    };
    
    try {
      const summaryOptions = { modules: [ "assetProfile", "summaryDetail", "defaultKeyStatistics", "recommendationTrend", "calendarEvents", "financialData", "incomeStatementHistory", "incomeStatementHistoryQuarterly", "earningsTrend" ] };
      
      const [chartData, summaryData] = await Promise.all([ 
        yahooFinance.chart(symbol, chartOptions), 
        yahooFinance.quoteSummary(symbol, summaryOptions) 
      ]);
      
      response.scores = calculateInvestmentScores(summaryData);
      response.profile = summaryData.assetProfile;
      response.stats = summaryData.defaultKeyStatistics;
      response.summary = {
          ...summaryData.summaryDetail,
          marketCap: (summaryData.summaryDetail.marketCap && rate) ? summaryData.summaryDetail.marketCap / rate : null,
      };
      response.recommendations = summaryData.recommendationTrend?.trend[0];
      response.events = { dividendDate: summaryData.calendarEvents?.dividendDate, earningsDate: summaryData.calendarEvents?.earnings?.earningsDate[0], amount: summaryData.summaryDetail?.dividendRate || null };
      response.financials = {
        annual: summaryData.incomeStatementHistory?.incomeStatementHistory.map(s => ({ year: new Date(s.endDate).getFullYear(), revenue: s.totalRevenue / rate, earnings: s.netIncome / rate })).reverse(),
        quarterly: summaryData.incomeStatementHistoryQuarterly?.incomeStatementHistory.map(s => ({ quarter: `${new Date(s.endDate).getFullYear()} Q${Math.floor(new Date(s.endDate).getMonth() / 3) + 1}`, revenue: s.totalRevenue / rate, earnings: s.netIncome / rate })).reverse(),
      };
      
      response.chart = chartData.quotes.filter(q => q && typeof q.close === 'number').map(q => ({ 
        date: range === '1d' || range === '5d' ? new Date(q.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : new Date(q.date).toLocaleDateString('fr-FR'), 
        price: q.close 
      }));
    } catch (detailsError) { 
      console.log(`Avertissement: Détails financiers non disponibles pour ${symbol}.`, detailsError.message);
      if (response.chart.length === 0) {
          try {
            const chartData = await yahooFinance.chart(symbol, chartOptions);
            response.chart = chartData.quotes.filter(q => q && typeof q.close === 'number').map(q => ({ 
              date: range === '1d' || range === '5d' ? new Date(q.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : new Date(q.date).toLocaleDateString('fr-FR'), 
              price: q.close 
            }));
          } catch (chartError) {
            console.error(`Erreur critique graphique pour ${symbol}:`, chartError.message);
          }
      }
    }
    
    return response;
  } catch (error) { 
    console.error(`Erreur critique pour ${symbol}:`, error.message); 
    return null; 
  }
}

export async function searchSymbols(query) {
  try {
    const results = await yahooFinance.search(query);
    return results.quotes.filter(q => ['EQUITY', 'ETF', 'INDEX', 'CRYPTOCURRENCY'].includes(q.quoteType)).map(q => ({ symbol: q.symbol, name: q.shortname || q.longname, quoteType: q.quoteType }));
  } catch (error) { console.error(`Erreur searchSymbols pour "${query}":`, error.message); return []; }
}

export async function getStockData(symbols) {
  if (!symbols || symbols.length === 0) return [];
  try {
    const results = await yahooFinance.quote(symbols);
    const quotes = Array.isArray(results) ? results : [results];

    const currencies = [...new Set(quotes.map(q => q.currency))];
    const rates = await getCurrencyRates(currencies);

    return quotes.map(q => {
      let price = q.regularMarketPrice;
      let currency = q.currency;

      if (currency === 'GBp') {
        price = price / 100;
        currency = 'GBP';
      }
      
      const rate = rates.get(currency) || 1;

      return {
        symbol: q.symbol,
        price: price / rate,
        change: q.regularMarketChangePercent,
        currency: 'EUR',
        originalCurrency: q.currency
      };
    });
  } catch (error) {
    console.error(`Erreur getStockData pour "${symbols}":`, error.message);
    return symbols.map(symbol => ({ symbol: 'N/A', price: 'N/A', change: 'N/A' }));
  }
}