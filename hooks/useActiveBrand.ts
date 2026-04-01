"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface BrandProfile {
  id: string;
  company_name: string;
  logo_url?: string;
  entity_type?: string;
  brand_summary?: string;
  industry?: string;
  tone_voice?: string;
  competitors?: string[];
}

// Global cache to avoid refetching multiple times if mounted in multiple places
let globalBrandsCache: BrandProfile[] | null = null;
const listeners = new Set<() => void>();

const updateListeners = () => {
  listeners.forEach((listener) => listener());
};

export function useActiveBrand() {
  const [brands, setBrands] = useState<BrandProfile[]>(globalBrandsCache || []);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!globalBrandsCache);

  useEffect(() => {
    // Initial sync with localStorage
    const stored = localStorage.getItem('activeBrandId');
    if (stored) setActiveBrandId(stored);

    // Initial fetch if cache is empty
    if (!globalBrandsCache) {
      const fetchBrands = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data } = await supabase
            .from('briefs')
            .select('id, company_name, logo_url, entity_type, brand_summary, industry, tone_voice, competitors')
            .eq('user_id', session.user.id);
            
          if (data) {
            globalBrandsCache = data;
            setBrands(data);
            
            // Auto select the first one if none is selected
            const storedId = localStorage.getItem('activeBrandId');
            if (!storedId && data.length > 0) {
                localStorage.setItem('activeBrandId', data[0].id);
                setActiveBrandId(data[0].id);
            }
          }
        }
        setLoading(false);
        updateListeners();
      };
      fetchBrands();
    }

    // Subscribe to external changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'activeBrandId') {
        setActiveBrandId(e.newValue);
      }
    };
    
    const handleLocalUpdate = () => {
      if (globalBrandsCache) {
        setBrands(globalBrandsCache);
        setLoading(false);
      }
      const stored = localStorage.getItem('activeBrandId');
      if (stored) setActiveBrandId(stored);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('brandProfileChanged', handleLocalUpdate);
    listeners.add(handleLocalUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('brandProfileChanged', handleLocalUpdate);
      listeners.delete(handleLocalUpdate);
    };
  }, []);

  const selectBrand = (id: string) => {
    localStorage.setItem('activeBrandId', id);
    setActiveBrandId(id);
    window.dispatchEvent(new Event('brandProfileChanged'));
  };

  const activeBrand = brands.find(b => b.id === activeBrandId) || null;

  return { brands, activeBrand, activeBrandId, selectBrand, loading };
}
