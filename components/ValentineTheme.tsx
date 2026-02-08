
import React, { useEffect, useState } from 'react';
import '../valentines.css';

const ValentineTheme: React.FC = () => {
    const [hearts, setHearts] = useState<{ id: number; left: string; duration: string; delay: string; size: string }[]>([]);

    useEffect(() => {
        // Generate random hearts
        const newHearts = Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            duration: `${6 + Math.random() * 4}s`,
            delay: `${Math.random() * 5}s`,
            size: `${0.8 + Math.random() * 1.2}rem`,
        }));
        setHearts(newHearts);
    }, []);

    // Simple date check: Feb 1st to Feb 20th
    const now = new Date();
    const isValentineSeason = now.getMonth() === 1 && now.getDate() >= 1 && now.getDate() <= 20;

    if (!isValentineSeason) return null;

    return (
        <div className="heart-container">
            {hearts.map((heart) => (
                <span
                    key={heart.id}
                    className="heart"
                    style={{
                        left: heart.left,
                        animationDuration: heart.duration,
                        animationDelay: heart.delay,
                        fontSize: heart.size,
                    }}
                >
                    ❤️
                </span>
            ))}
        </div>
    );
};

export default ValentineTheme;
