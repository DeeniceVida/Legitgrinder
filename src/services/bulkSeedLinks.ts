
import { supabase } from '../lib/supabase';

const PRODUCT_LINKS: Record<string, string> = {
    // iPhones
    "iPhone 15 Plus": "https://www.backmarket.com/en-us/p/iphone-15-plus",
    "iPhone 16": "https://www.backmarket.com/en-us/p/iphone-16",
    "iPhone 16 Plus": "https://www.backmarket.com/en-us/p/iphone-16-plus",
    "iPhone 15": "https://www.backmarket.com/en-us/p/iphone-15",
    "iPhone 16 Pro": "https://www.backmarket.com/en-us/p/iphone-16-pro",
    "iPhone 16 Pro Max": "https://www.backmarket.com/en-us/p/iphone-16-pro-max",
    "iPhone 15 Pro": "https://www.backmarket.com/en-us/p/iphone-15-pro",
    "iPhone 15 Pro Max": "https://www.backmarket.com/en-us/p/iphone-15-pro-max",
    "iPhone 16e": "https://www.backmarket.com/en-us/p/iphone-16e",
    "iPhone 17 Pro Max": "https://www.backmarket.com/en-us/p/iphone-17-pro-max",
    "iPhone 14": "https://www.backmarket.com/en-us/p/iphone-14",
    "iPhone 13": "https://www.backmarket.com/en-us/p/iphone-13",
    "iPhone 14 Pro": "https://www.backmarket.com/en-us/p/iphone-14-pro",
    "iPhone 14 Pro Max": "https://www.backmarket.com/en-us/p/iphone-14-pro-max",
    "iPhone 14 Plus": "https://www.backmarket.com/en-us/p/iphone-14-plus",
    "iPhone 13 mini": "https://www.backmarket.com/en-us/p/iphone-13-mini",
    "iPhone 13 Pro": "https://www.backmarket.com/en-us/p/iphone-13-pro",
    "iPhone 13 Pro Max": "https://www.backmarket.com/en-us/p/iphone-13-pro-max",
    "iPhone 12": "https://www.backmarket.com/en-us/p/iphone-12",
    "iPhone 11": "https://www.backmarket.com/en-us/p/iphone-11",

    // Samsung
    "S23 Ultra": "https://www.backmarket.com/en-us/p/galaxy-s23-ultra",
    "S24 Ultra": "https://www.backmarket.com/en-us/p/galaxy-s24-ultra",
    "S24": "https://www.backmarket.com/en-us/p/galaxy-s24",
    "S25": "https://www.backmarket.com/en-us/p/galaxy-s25",
    "S22 5G": "https://www.backmarket.com/en-us/p/galaxy-s22-5g",
    "S22 Ultra 5G": "https://www.backmarket.com/en-us/p/galaxy-s22-ultra-5g",
    "S23": "https://www.backmarket.com/en-us/p/galaxy-s23",
    "S21 5G": "https://www.backmarket.com/en-us/p/galaxy-s21-5g",
    "S23+": "https://www.backmarket.com/en-us/p/galaxy-s23plus",
    "S25 Ultra": "https://www.backmarket.com/en-us/p/galaxy-s25-ultra",
    "S24+": "https://www.backmarket.com/en-us/p/galaxy-s24plus",
    "Z Flip5": "https://www.backmarket.com/en-us/p/galaxy-z-flip5",
    "Z Flip6": "https://www.backmarket.com/en-us/p/galaxy-z-flip6",
    "Z Fold6": "https://www.backmarket.com/en-us/p/galaxy-z-fold6",
    "S21+ 5G": "https://www.backmarket.com/en-us/p/galaxy-s21plus-5g",
    "S25+": "https://www.backmarket.com/en-us/p/galaxy-s25plus",
    "Z Fold5": "https://www.backmarket.com/en-us/p/galaxy-z-fold5",
    "S21 Ultra 5G": "https://www.backmarket.com/en-us/p/galaxy-s21-ultra-5g",
    "S24 FE": "https://www.backmarket.com/en-us/p/galaxy-s24-fe",
    "Z Flip4": "https://www.backmarket.com/en-us/p/galaxy-z-flip4",

    // Pixel
    "Pixel 7": "https://www.backmarket.com/en-us/p/google-pixel-7",
    "Pixel 8": "https://www.backmarket.com/en-us/p/google-pixel-8",
    "Pixel 8 Pro": "https://www.backmarket.com/en-us/p/google-pixel-8-pro",
    "Pixel 7 Pro": "https://www.backmarket.com/en-us/p/google-pixel-7-pro",
    "Pixel 9": "https://www.backmarket.com/en-us/p/google-pixel-9",
    "Pixel 8a": "https://www.backmarket.com/en-us/p/google-pixel-8a",
    "Pixel 9 Pro": "https://www.backmarket.com/en-us/p/google-pixel-9-pro",
    "Pixel Fold": "https://www.backmarket.com/en-us/p/google-pixel-fold",
    "Pixel 6": "https://www.backmarket.com/en-us/p/google-pixel-6",
    "Pixel 6a": "https://www.backmarket.com/en-us/p/google-pixel-6a",
    "Pixel 9 Pro XL": "https://www.backmarket.com/en-us/p/google-pixel-9-pro-xl",
    "Pixel 7a": "https://www.backmarket.com/en-us/p/google-pixel-7a",
    "Pixel 6 Pro": "https://www.backmarket.com/en-us/p/google-pixel-6-pro",
    "Pixel 10 Pro": "https://www.backmarket.com/en-us/p/google-pixel-10-pro",
    "Pixel 10 Pro XL": "https://www.backmarket.com/en-us/p/google-pixel-10-pro-xl",
    "Pixel 9a": "https://www.backmarket.com/en-us/p/google-pixel-9a",
    "Pixel 10": "https://www.backmarket.com/en-us/p/google-pixel-10",
    "Pixel XL": "https://www.backmarket.com/en-us/p/google-pixel-xl",
    "Pixel 3 XL": "https://www.backmarket.com/en-us/p/google-pixel-3-xl",
    "Pixel 9 Pro Fold": "https://www.backmarket.com/en-us/p/google-pixel-9-pro-fold"
};

export const bulkUpdateSourceLinks = async () => {
    console.log("Starting bulk source link update...");

    for (const [name, url] of Object.entries(PRODUCT_LINKS)) {
        try {
            // Find the product
            const { data: product, error: pError } = await supabase
                .from('products')
                .select('id')
                .eq('name', name)
                .maybeSingle();

            if (pError) {
                console.error(`Error finding product ${name}:`, pError);
                continue;
            }

            if (!product) {
                console.warn(`Product not found in database: ${name}`);
                continue;
            }

            // Update all variants of this product to use this master URL
            const { error: vError } = await supabase
                .from('product_variants')
                .update({ source_url: url })
                .eq('product_id', product.id);

            if (vError) {
                console.error(`Error updating variants for ${name}:`, vError);
            } else {
                console.log(`Successfully mapped ${name} to ${url}`);
            }
        } catch (err) {
            console.error(`Unexpected error for ${name}:`, err);
        }
    }

    console.log("Bulk update complete!");
};
