import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const EventsCalendar = () => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/portfolio-events`);
                setEvents(response.data);
            } catch (error) {
                console.error("Erreur chargement des événements:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const sortedEvents = useMemo(() => {
        const allEvents = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        events.forEach(stock => {
            if (stock.earningsDate && new Date(stock.earningsDate) >= today) {
                allEvents.push({
                    date: stock.earningsDate,
                    type: 'Résultats',
                    name: stock.longName || stock.symbol,
                });
            }
            if (stock.dividendDate && new Date(stock.dividendDate) >= today) {
                allEvents.push({
                    date: stock.dividendDate,
                    type: 'Dividende',
                    name: stock.longName || stock.symbol,
                });
            }
        });

        return allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [events]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    };

    return (
        <div className="card">
            <h3>Événements à Venir</h3>
            {isLoading && <p>Chargement du calendrier...</p>}
            {!isLoading && sortedEvents.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                    Aucun événement à venir pour les actions de votre portefeuille.
                </p>
            )}
            {!isLoading && sortedEvents.length > 0 && (
                <ul className="events-list">
                    {sortedEvents.map((event, index) => (
                        <li key={index} className="event-item">
                            <div className="event-date">{formatDate(event.date)}</div>
                            <div className="event-details">
                                <span className="event-name">{event.name}</span>
                                <span className={`event-type event-type-${event.type.toLowerCase()}`}>
                                    {event.type}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default EventsCalendar;