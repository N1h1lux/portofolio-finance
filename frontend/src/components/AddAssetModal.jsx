import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AddAssetModal = ({ onClose, onAssetAdded, initialData = null }) => {
  const [quantity, setQuantity] = useState('1');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [fetchedPrice, setFetchedPrice] = useState(null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData?.name && purchaseDate) {
      const fetchPrice = async () => {
        setIsFetchingPrice(true);
        setError('');
        setFetchedPrice(null);
        try {
          const response = await axios.get(`${API_BASE_URL}/market/historical-price`, {
            params: { symbol: initialData.name, date: purchaseDate }
          });
          setFetchedPrice(response.data.price);
        } catch (err) {
          setError("Prix non trouvé pour cette date. Essayez un jour de semaine.");
          console.error("Erreur de récupération du prix:", err);
        } finally {
          setIsFetchingPrice(false);
        }
      };
      fetchPrice();
    }
  }, [initialData?.name, purchaseDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fetchedPrice) return; // Ne pas soumettre si aucun prix n'a été trouvé

    const newAsset = {
      name: initialData.name,
      longName: initialData.longName,
      type: initialData.type,
      quantity: parseFloat(quantity),
      purchasePrice: fetchedPrice,
      value: fetchedPrice, // La valeur initiale est le prix d'achat
      sector: initialData.sector,
      country: initialData.country,
      purchaseDate
    };

    try {
      await axios.post(`${API_BASE_URL}/assets`, newAsset);
      onAssetAdded();
    } catch (error) {
      console.error("Erreur ajout actif:", error);
    }
  };
  
  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Ajouter un Actif</h2>
        <form onSubmit={handleSubmit}>
          <label>Actif</label>
          <input type="text" value={initialData.longName || initialData.name} disabled />
          
          <label>Date d'achat</label>
          <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} required />

          <div className="price-display-box">
            <label>Prix d'Achat par Action</label>
            {isFetchingPrice && <p>Recherche du prix...</p>}
            {error && <p className="price-error">{error}</p>}
            {fetchedPrice && !isFetchingPrice && (
                <p className="price-value">{fetchedPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
            )}
          </div>
          
          <label>Quantité</label>
          <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required step="any" min="0" />
          
          <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
            <button type="submit" style={{flex: 1}} disabled={isFetchingPrice || !fetchedPrice}>
                {isFetchingPrice ? 'Chargement...' : 'Ajouter'}
            </button>
            <button type="button" onClick={onClose} style={{flex: 1, backgroundColor: 'var(--color-danger)'}}>Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAssetModal;