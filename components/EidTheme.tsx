import React, { useEffect, useState } from 'react';
import '../eid.css';

const EidTheme: React.FC = () => {
    const [icons, setIcons] = useState<{ id: number; left: string; duration: string; delay: string; size: string; type: string; colorClass: string }[]>([]);

    useEffect(() => {
        // Generate random crescent moons, stars, and Eid al-Adha symbols
        const newIcons = Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            duration: `${6 + Math.random() * 4}s`,
            delay: `${Math.random() * 5}s`,
            size: `${0.8 + Math.random() * 1.2}rem`,
            // Mix of moon, star, sheep, and kaaba for Eid al-Adha
            type: ['🌙', '⭐', '🐑', '🕋'][Math.floor(Math.random() * 4)],
            // 50% chance for gold color variant
            colorClass: Math.random() > 0.5 ? 'gold' : ''
        }));
        setIcons(newIcons);
    }, []);

    // Theme will disappear after 48 hours (around May 28, 2026)
    // So it is active as long as current date is BEFORE the expiration date.
    const now = new Date();
    const expirationDate = new Date('2026-05-28T21:41:34+03:00');
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
