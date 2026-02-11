
/**
 * Utility to bypass DNS blocking of res.cloudinary.com (e.g. by AdGuard)
 * by switching to working indexed subdomains like res-1.cloudinary.com
 */
export const getSafeCloudinaryUrl = (url: string | undefined): string => {
    if (!url) return '';

    // If it's a Cloudinary URL using the default res.cloudinary.com domain
    if (url.includes('res.cloudinary.com')) {
        // Replace the main domain with an indexed subdomain which is usually not blocked
        return url.replace('res.cloudinary.com', 'res-1.cloudinary.com');
    }

    return url;
};
