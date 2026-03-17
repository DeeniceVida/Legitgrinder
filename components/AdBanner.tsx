import React from 'react';
import { Link } from 'react-router-dom';
import SafeImage from './SafeImage';

interface AdBannerProps {
    title1: string;
    title2: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    imageSrc: string;
    backgroundColor?: string;
    textColor?: string;
    className?: string;
}

const AdBanner: React.FC<AdBannerProps> = ({
    title1,
    title2,
    subtitle,
    buttonText,
    buttonLink,
    imageSrc,
    backgroundColor = '#e2f07d', // Default light lime-green
    textColor = '#0f172a',
    className = '',
}) => {
    return (
        <div
            className={`w-full relative overflow-hidden rounded-[2rem] flex flex-col md:flex-row shadow-sm border border-black/5 ${className}`}
            style={{ backgroundColor, color: textColor }}
        >
            {/* Text Content Area */}
            <div className="p-8 md:p-14 lg:p-20 z-20 flex-1 flex flex-col items-start justify-center h-full relative">
                <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-2 leading-[1.1] heading-accent z-10 w-full break-words">
                    {title1}
                </h2>
                <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold italic tracking-tight mb-6 leading-[1.1] heading-accent z-10 w-full break-words">
                    {title2}
                </h2>
                <p className="text-lg md:text-xl font-light mb-8 max-w-lg opacity-90 leading-relaxed font-sans z-10">
                    {subtitle}
                </p>
                <div className="z-10 mt-auto md:mt-4">
                    <Link
                        to={buttonLink}
                        className="bg-[#0f172a] text-white px-8 py-4 rounded-xl font-bold hover:bg-black hover:scale-105 transition-all shadow-xl hover:shadow-2xl inline-block"
                        style={{ color: '#ffffff' }} // Force white text on the dark button regardless of textColor prop
                    >
                        {buttonText}
                    </Link>
                </div>
            </div>

            {/* Image Area */}
            <div className="w-full md:w-[45%] lg:w-[50%] h-[300px] md:h-auto min-h-[300px] md:min-h-[450px] relative z-10 flex items-end justify-center md:justify-end mt-4 md:mt-0">
                <SafeImage
                    src={imageSrc}
                    alt="Ad Campaign Image"
                    className="w-[90%] md:w-full h-[90%] md:h-[110%] object-contain object-bottom md:object-right-bottom mix-blend-multiply md:translate-y-4"
                />
            </div>
        </div>
    );
};

export default AdBanner;
