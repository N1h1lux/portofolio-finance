import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AddTransactionModal = ({ onClose, onTransactionAdded }) => {
    const [description, setDescription] = useState('');
    const [type, setType] = useState('Dépense');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/transactions`, { description, type, amount: parseFloat(amount), date });
            if (onTransactionAdded) onTransactionAdded();
            onClose();
        } catch (error) { console.error("Erreur ajout transaction:", error); }
    };
    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h2>Ajouter une Transaction</h2>
                <form onSubmit={handleSubmit}>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" required />
                    <select value={type} onChange={e => setType(e.target.value)}><option>Dépense</option><option>Revenu</option></select>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Montant (€)" required />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    <div><button type="submit">Ajouter</button><button type="button" onClick={onClose} style={{backgroundColor:'var(--danger-color)'}}>Annuler</button></div>
                </form>
            </div>
        </div>
    );
};
export default AddTransactionModal;