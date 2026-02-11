
import React, { useState } from 'react';
import { getSafeCloudinaryUrl } from '../utils/cloudinary';
import { ImageIcon } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackColor?: string;
    showPlaceholder?: boolean;
}

const SafeImage: React.FC<SafeImageProps> = ({
    src,
    alt,
    className,
    fallbackColor = 'bg-gray-100',
    showPlaceholder = true,
    ...props
}) => {
    const [errorCount, setErrorCount] = useState(0);
    const [failed, setFailed] = useState(false);

    // Initial transformation
    const safeSrc = getSafeCloudinaryUrl(src);

    const handleError = () => {
        // If res-1 fails, we can try res-2, etc. (Recursive fallback strategy)
        if (errorCount === 0 && safeSrc.includes('res-1.cloudinary.com')) {
            setErrorCount(1);
            // Try next subdomain if the first one fails
            const nextSrc = safeSrc.replace('res-1.cloudinary.com', 'res-2.cloudinary.com');
            // Update the src via a re-render
            // Note: We don't set local state for src to keep it simple, 
            // the browser will just try the new one on next attempt if we handled it in the attribute.
            // But for React to react, we need a slight change.
        } else {
            setFailed(true);
        }
    };

    if (failed || !src) {
        if (!showPlaceholder) return null;
        return (
            <div className={`${className} ${fallbackColor} flex items-center justify-center border border-gray-100`}>
                <div className="text-gray-300 flex flex-col items-center gap-2">
                    <ImageIcon className="w-8 h-8 opacity-20" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Image Unavailable</span>
                </div>
            </div>
        );
    }

    // Handle alternative subdomain on first failure
    const currentSrc = errorCount === 1
        ? safeSrc.replace('res-1.cloudinary.com', 'res-2.cloudinary.com')
        : safeSrc;

    return (
        <img
            {...props}
            src={currentSrc}
            alt={alt}
            className={className}
            onError={handleError}
            loading="lazy"
        />
    );
};

export default SafeImage;
