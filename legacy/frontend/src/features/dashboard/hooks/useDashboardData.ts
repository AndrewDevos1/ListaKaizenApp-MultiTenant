import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../services/api';
import { DashboardFilters, SuperDashboardData, Restaurante, DashboardState } from '../types';

const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const CACHE_KEY = 'superDashboardCache';
const CACHE_TTL_MS = 9 * 60 * 1000; // 9 minutes
const REQUEST_TIMEOUT_MS = 60_000; // tolera requisições mais longas

export function useDashboardData(filters: DashboardFilters, autoRefresh: boolean = true) {
  const [state, setState] = useState<DashboardState>({
    data: null,
    restaurantes: [],
    loading: true,
    error: null,
    lastUpdated: null
  });

  const restaurantesLoaded = useRef(false);
  const cacheLoaded = useRef(false);
  const fetchInProgress = useRef(false);
  const restaurantesCache = useRef<Restaurante[]>([]);
  const pendingRefetch = useRef(false);

  const parseRestaurantes = (payload: unknown): Restaurante[] => {
    if (Array.isArray(payload)) return payload as Restaurante[];
    if (payload && typeof payload === 'object') {
      const obj: any = payload;
      const candidates = [obj.restaurantes, obj.data, obj.items, obj.lista];
      for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
          return candidate as Restaurante[];
        }
        if (candidate && typeof candidate === 'object') {
          const values = Object.values(candidate as Record<string, Restaurante>).filter(
            (item) => item && typeof item === 'object'
          );
          if (values.length > 0) return values;
        }
      }
      const values = Object.values(obj as Record<string, Restaurante>).filter(
        (item) => item && typeof item === 'object'
      );
      if (values.length > 0) return values;
    }
    return [];
  };

  const normalizeRestaurantes = useCallback(
    (payload: unknown): Restaurante[] => {
      if (Array.isArray(payload)) return payload;
      if (payload && typeof payload === 'object') {
        return parseRestaurantes(payload);
      }
      return [];
    },
    []
  );

  const fetchRestaurantes = useCallback(async (): Promise<Restaurante[]> => {
    if (restaurantesLoaded.current) {
      return restaurantesCache.current;
    }
    try {
      const restaurantesResponse = await api.get<
        Restaurante[] | { restaurantes?: Restaurante[] } | Record<string, Restaurante>
      >('/admin/restaurantes', { timeout: REQUEST_TIMEOUT_MS });
      const parsed = parseRestaurantes(restaurantesResponse.data);
      restaurantesLoaded.current = true;
      restaurantesCache.current = parsed;
      return parsed;
    } catch (err) {
      console.log('Não foi possível carregar lista de restaurantes:', err);
      restaurantesLoaded.current = true;
      restaurantesCache.current = [];
      return [];
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (fetchInProgress.current) {
      pendingRefetch.current = true;
      return;
    }
    fetchInProgress.current = true;
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const params = new URLSearchParams();
      if (filters.restauranteId) {
        params.append('restaurante_id', filters.restauranteId.toString());
      }
      params.append('period', filters.period.toString());

      const shouldFetchRestaurantes = !restaurantesLoaded.current;

      const [dashboardResponse, restaurantes] = shouldFetchRestaurantes
        ? await Promise.all([
            api.get<SuperDashboardData>(`/admin/super-dashboard?${params}`, { timeout: REQUEST_TIMEOUT_MS }),
            fetchRestaurantes()
          ])
        : [
            await api.get<SuperDashboardData>(`/admin/super-dashboard?${params}`, { timeout: REQUEST_TIMEOUT_MS }),
            restaurantesCache.current
          ];

      const parsedRestaurantes = parseRestaurantes(restaurantes);

      setState({
        data: dashboardResponse.data,
        restaurantes: parsedRestaurantes,
        loading: false,
        error: null,
        lastUpdated: new Date()
      });

      try {
        const cachePayload = {
          timestamp: Date.now(),
          filters,
          data: dashboardResponse.data,
          restaurantes: parsedRestaurantes
        };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
      } catch {
        // cache falho não deve quebrar fluxo
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.error || 'Erro ao carregar dados do dashboard'
      }));
    } finally {
      fetchInProgress.current = false;
      setState(prev => ({ ...prev, loading: false }));
      if (pendingRefetch.current) {
        pendingRefetch.current = false;
        fetchData();
      }
    }
  }, [filters, fetchRestaurantes]);

  // Initial fetch
  useEffect(() => {
    if (!cacheLoaded.current) {
      cacheLoaded.current = true;
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            timestamp: number;
            filters: DashboardFilters;
            data: SuperDashboardData;
            restaurantes: Restaurante[];
          };
          const isFresh = Date.now() - parsed.timestamp < CACHE_TTL_MS;
          const sameFilters =
            parsed.filters?.restauranteId === filters.restauranteId &&
            parsed.filters?.period === filters.period;
          if (isFresh && sameFilters) {
            setState(prev => ({
              ...prev,
              data: parsed.data,
              restaurantes: normalizeRestaurantes(parsed.restaurantes),
              loading: false,
              error: null,
              lastUpdated: new Date(parsed.timestamp)
            }));
          }
        }
      } catch {
        // ignore cache read errors
      }
    }
    fetchData();
  }, [fetchData, filters.period, filters.restauranteId, normalizeRestaurantes]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchData, autoRefresh]);

  return {
    ...state,
    restaurantes: normalizeRestaurantes(state.restaurantes),
    refetch: fetchData
  };
}

export default useDashboardData;
