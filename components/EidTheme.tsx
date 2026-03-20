import React, { useEffect, useState } from 'react';
import '../eid.css';

const EidTheme: React.FC = () => {
    const [icons, setIcons] = useState<{ id: number; left: string; duration: string; delay: string; size: string; type: string; colorClass: string }[]>([]);

    useEffect(() => {
        // Generate random crescent moons and stars
        const newIcons = Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            duration: `${6 + Math.random() * 4}s`,
            delay: `${Math.random() * 5}s`,
            size: `${0.8 + Math.random() * 1.2}rem`,
            // 50% chance for moon, 50% for star
            type: Math.random() > 0.5 ? '🌙' : '⭐',
            // 50% chance for gold color variant
            colorClass: Math.random() > 0.5 ? 'gold' : ''
        }));
        setIcons(newIcons);
    }, []);

    // Theme will disappear ON Monday, March 23, 2026.
    // So it is active as long as current date is BEFORE March 23, 2026.
    const now = new Date();
    const expirationDate = new Date('2026-03-23T00:00:00');
    const isEidSeason = now < expirationDate;

    if (!isEidSeason) return null;

    return (
        <div className="eid-container">
            {icons.map((icon) => (
                <span
                    key={icon.id}
                    className={`eid-icon ${icon.colorClass}`}
                    style={{
                        left: icon.left,
                        animationDuration: icon.duration,
                        animationDelay: icon.delay,
                        fontSize: icon.size,
                    }}
                >
                    {icon.type}
                </span>
            ))}
        </div>
    );
};

export default EidTheme;
