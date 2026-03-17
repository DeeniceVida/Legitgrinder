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
            className={`w-full relative overflow-hidden rounded-[2rem] flex flex-col md:flex-row items-center justify-between shadow-sm border border-black/5 ${className}`}
            style={{ backgroundColor, color: textColor }}
        >
            <div className="p-8 md:p-14 lg:p-20 z-10 md:w-[60%] flex flex-col items-start justify-center h-full">
                <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-1 leading-[1.05] heading-accent">
                    {title1}
                </h2>
                <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold italic tracking-tight mb-8 leading-[1.05] heading-accent">
                    {title2}
                </h2>
                <p className="text-lg md:text-xl font-light mb-10 max-w-md opacity-90 leading-relaxed font-sans">
                    {subtitle}
                </p>
                <Link
                    to={buttonLink}
                    className="bg-[#0f172a] text-white px-10 py-4 rounded-xl font-bold hover:bg-black hover:scale-105 transition-all shadow-xl hover:shadow-2xl"
                >
                    {buttonText}
                </Link>
            </div>

            <div className="relative md:absolute md:right-0 md:bottom-0 md:h-full md:w-[50%] w-full h-[320px] mt-2 md:mt-0 flex justify-end md:justify-center items-end">
                {/* Subtle shadow overlay for mobile devices to ground the image */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/5 to-transparent md:hidden mix-blend-multiply"></div>

                <SafeImage
                    src={imageSrc}
                    alt="Ad product"
                    className="h-[95%] md:h-[110%] w-[120%] lg:w-[110%] max-w-none md:max-w-[none] object-contain object-right-bottom mix-blend-multiply origin-bottom md:translate-y-[2%] translate-x-[10%] md:translate-x-0"
                />
            </div>
        </div>
    );
};

export default AdBanner;
