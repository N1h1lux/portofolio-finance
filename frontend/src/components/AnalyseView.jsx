import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import EventsCalendar from './EventsCalendar'; // <-- 1. IMPORTATION DU NOUVEAU COMPOSANT
import { API_BASE_URL } from '../config';

const ScoreDetails = () => {
    const [scores, setScores] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchScores = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/portfolio-score`);
                setScores(response.data);
            } catch (error) { console.error("Erreur chargement des scores:", error); } 
            finally { setIsLoading(false); }
        };
        fetchScores();
    }, []);

    const getScoreColor = (s) => {
        if (s == null) return 'var(--text-secondary)';
        if (s < 40) return 'var(--danger-color)';
        if (s < 75) return 'var(--warning-color)';
        return 'var(--success-color)';
    };

    const getAdvice = (scoreName, score) => {
        if (score == null) return "Calcul en cours...";
        switch(scoreName) {
            case 'diversification':
                if (score < 50) return "Votre portefeuille est très concentré. Envisagez de réduire le poids de vos plus grosses positions/secteurs.";
                if (score < 75) return "Votre diversification est correcte mais pourrait être améliorée. Surveillez la concentration de vos actifs.";
                return "Excellente diversification ! Votre risque est bien réparti sur différents types d'actifs, actions et secteurs.";
            case 'quality':
                if (score < 50) return "La qualité fondamentale moyenne de vos actions est faible. Envisagez de rééquilibrer vers des entreprises plus solides.";
                if (score < 75) return "La qualité de vos actifs est bonne. Continuez de privilégier les entreprises solides avec de bons fondamentaux.";
                return "Vous détenez un portefeuille d'entreprises de très haute qualité, félicitations !";
            case 'performance':
                if (score < 50) return "Votre rendement est faible par rapport au risque pris. Vos investissements sont peut-être trop volatils pour le gain généré.";
                if (score < 75) return "Votre performance ajustée au risque est bonne. Vous obtenez un rendement correct pour le niveau de volatilité.";
                return "Excellente performance ! Votre portefeuille génère un rendement élevé par rapport au risque encouru.";
            default: return '';
        }
    };

    return (
        <div className="card">
            <h3>Détail de votre Score de Santé</h3>
            {isLoading && <p>Analyse de votre portefeuille en cours...</p>}
            {!isLoading && scores && (
                <div className="score-breakdown">
                    <div className="score-line">
                        <strong>Score Global</strong>
                        <strong style={{fontSize: '1.5rem', color: getScoreColor(scores.finalScore)}}>{scores.finalScore} / 100</strong>
                        <small>Ce score évalue la santé globale de votre portefeuille sur 3 piliers.</small>
                    </div>
                    <div className="score-line">
                        <span>Score de Diversification (50%)</span>
                        <strong style={{color: getScoreColor(scores.diversificationScore)}}>{scores.diversificationScore} / 100</strong>
                        <small>{getAdvice('diversification', scores.diversificationScore)}</small>
                    </div>
                    <div className="score-line">
                        <span>Score de Qualité des Actifs (30%)</span>
                        <strong style={{color: getScoreColor(scores.qualityScore)}}> {scores.qualityScore} / 100</strong>
                        <small>{getAdvice('quality', scores.qualityScore)}</small>
                    </div>
                    <div className="score-line">
                        <span>Performance / Risque (20%)</span>
                        <strong style={{color: getScoreColor(scores.performanceScore)}}> {scores.performanceScore} / 100</strong>
                        <small>{getAdvice('performance', scores.performanceScore)}</small>
                    </div>
                </div>
            )}
        </div>
    );
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return ( <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">{`${(percent * 100).toFixed(0)}%`}</text> );
};

const DonutCard = ({ title, data }) => {
  const total = useMemo(() => data.reduce((sum, entry) => sum + entry.value, 0), [data]);
  return (
    <div className="card">
      <div className="repartition-header">
        <h4>{title}</h4>
        <span>{total.toLocaleString('fr-FR', {style:'currency', currency:'EUR'})}</span>
      </div>
      <div className="repartition-chart">
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={55} paddingAngle={5} labelLine={false} label={renderCustomizedLabel}>
              {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
            </Pie>
            <Legend layout="vertical" verticalAlign="middle" align="right" iconType="square" wrapperStyle={{fontSize: '0.9rem'}}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const AnalyseView = ({ assets }) => {
    const byAssetType = useMemo(() => {
        const data = assets.reduce((acc, asset) => { acc[asset.type] = (acc[asset.type] || 0) + (asset.totalValue || 0); return acc; }, {});
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [assets]);
    const bySector = useMemo(() => {
        const data = assets.reduce((acc, asset) => { if (asset.sector) { acc[asset.sector] = (acc[asset.sector] || 0) + (asset.totalValue || 0); } return acc; }, {});
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [assets]);
    const byGeography = useMemo(() => {
        const data = assets.reduce((acc, asset) => { if (asset.country) { acc[asset.country] = (acc[asset.country] || 0) + (asset.totalValue || 0); } return acc; }, {});
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [assets]);

    return (
        <div>
            <ScoreDetails />
            <div className="repartition-grid">
                <DonutCard title="Répartition par Actif" data={byAssetType} />
                <DonutCard title="Répartition par Secteur" data={bySector} />
                <DonutCard title="Répartition Géographique" data={byGeography} />
            </div>
            
            {/* 2. AJOUT DU CALENDRIER */}
            <div style={{marginTop: '1.5rem'}}>
                <EventsCalendar />
            </div>
        </div>
    );
};

export default AnalyseView;