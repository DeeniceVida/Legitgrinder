import { supabase } from '../supabase/client';
import { AdBanner } from '../types';

export const fetchBanners = async (): Promise<AdBanner[]> => {
    const { data, error } = await supabase
        .from('ad_banners')
        .select('*')
        .order('sortOrder', { ascending: true });

    if (error) {
        console.error('Error fetching ad banners:', error.message);
        throw error;
    }
    return data || [];
};

export const addBanner = async (banner: Omit<AdBanner, 'id'>): Promise<AdBanner> => {
    const { data, error } = await supabase
        .from('ad_banners')
        .insert([banner])
        .select()
        .single();

    if (error) {
        console.error('Error adding ad banner:', error.message);
        throw error;
    }
    return data;
};

export const updateBanner = async (id: string, updates: Partial<Omit<AdBanner, 'id'>>): Promise<void> => {
    const { error } = await supabase
        .from('ad_banners')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('Error updating ad banner:', error.message);
        throw error;
    }
};

export const deleteBanner = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('ad_banners')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting ad banner:', error.message);
        throw error;
    }
};
