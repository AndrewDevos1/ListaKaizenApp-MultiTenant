import { useState } from 'react';

/**
 * Hook customizado para persistir estado no localStorage
 *
 * @param key - Chave única para armazenar no localStorage
 * @param initialValue - Valor inicial caso não exista no localStorage
 * @returns [valor, setValor] - Tupla similar ao useState
 *
 * @example
 * const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
    // Estado para armazenar o valor
    // Passa função inicial para useState para que a lógica seja executada apenas uma vez
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }

        try {
            // Buscar do localStorage pela chave
            const item = window.localStorage.getItem(key);
            // Parse do JSON ou retornar initialValue
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            // Se erro, retornar initialValue
            console.error(`[useLocalStorage] Erro ao ler chave "${key}":`, error);
            return initialValue;
        }
    });

    // Retorna uma versão wrapped do setter do useState que
    // persiste o novo valor no localStorage
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            // Permite que value seja uma função (mesmo comportamento do useState)
            const valueToStore = value instanceof Function ? value(storedValue) : value;

            // Salvar no estado
            setStoredValue(valueToStore);

            // Salvar no localStorage
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(`[useLocalStorage] Erro ao salvar chave "${key}":`, error);
        }
    };

    return [storedValue, setValue];
}
