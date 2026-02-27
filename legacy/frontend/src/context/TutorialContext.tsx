import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { getTutorialKeysForRole, TutorialRole } from '../tutorial/tutorialDefinitions';

interface TutorialStorage {
    enabled: boolean;
    seenScreens: Record<string, boolean>;
}

interface TutorialProgress {
    seen: number;
    total: number;
}

interface TutorialContextType {
    enabled: boolean;
    seenScreens: Record<string, boolean>;
    availableKeys: string[];
    progress: TutorialProgress;
    enableTutorial: (reset?: boolean) => void;
    disableTutorial: () => void;
    markSeen: (key: string) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const STORAGE_PREFIX = 'kaizen:tutorial';

const getStorageKey = (userId?: string | null, role?: string | null) => {
    if (!userId || !role) return null;
    return `${STORAGE_PREFIX}:${userId}:${role}`;
};

export const TutorialProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const role = user?.role as TutorialRole | undefined;
    const storageKey = useMemo(() => getStorageKey(user?.id, user?.role), [user?.id, user?.role]);
    const [enabled, setEnabled] = useState(false);
    const [seenScreens, setSeenScreens] = useState<Record<string, boolean>>({});

    const availableKeys = useMemo(() => {
        if (!role) return [];
        return getTutorialKeysForRole(role);
    }, [role]);

    const progress = useMemo(() => {
        const total = availableKeys.length;
        const seen = availableKeys.filter((key) => Boolean(seenScreens[key])).length;
        return { seen, total };
    }, [availableKeys, seenScreens]);

    useEffect(() => {
        if (!storageKey) {
            setEnabled(false);
            setSeenScreens({});
            return;
        }

        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored) as TutorialStorage;
                setEnabled(Boolean(parsed.enabled));
                setSeenScreens(parsed.seenScreens || {});
            } else {
                const shouldEnable = availableKeys.length > 0;
                setEnabled(shouldEnable);
                setSeenScreens({});
                localStorage.setItem(
                    storageKey,
                    JSON.stringify({ enabled: shouldEnable, seenScreens: {} })
                );
            }
        } catch (error) {
            console.warn('[Tutorial] Erro ao carregar estado:', error);
            setEnabled(false);
            setSeenScreens({});
        }
    }, [storageKey, availableKeys.length]);

    useEffect(() => {
        if (!storageKey || !enabled) return;

        if (availableKeys.length > 0 && availableKeys.every((key) => Boolean(seenScreens[key]))) {
            setEnabled(false);
            try {
                localStorage.setItem(storageKey, JSON.stringify({ enabled: false, seenScreens }));
            } catch (error) {
                console.warn('[Tutorial] Erro ao salvar desativacao:', error);
            }
        }
    }, [availableKeys, enabled, seenScreens, storageKey]);

    const persistState = (nextEnabled: boolean, nextSeen: Record<string, boolean>) => {
        if (!storageKey) return;
        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify({ enabled: nextEnabled, seenScreens: nextSeen })
            );
        } catch (error) {
            console.warn('[Tutorial] Erro ao salvar estado:', error);
        }
    };

    const enableTutorial = (reset = true) => {
        const nextSeen = reset ? {} : seenScreens;
        setEnabled(true);
        setSeenScreens(nextSeen);
        persistState(true, nextSeen);
    };

    const disableTutorial = () => {
        setEnabled(false);
        persistState(false, seenScreens);
    };

    const markSeen = (key: string) => {
        setSeenScreens((prev) => {
            if (prev[key]) return prev;
            const next = { ...prev, [key]: true };
            const allSeen = availableKeys.length > 0 && availableKeys.every((k) => Boolean(next[k]));
            const nextEnabled = allSeen ? false : enabled;
            if (allSeen) {
                setEnabled(false);
            }
            persistState(nextEnabled, next);
            return next;
        });
    };

    return (
        <TutorialContext.Provider
            value={{
                enabled,
                seenScreens,
                availableKeys,
                progress,
                enableTutorial,
                disableTutorial,
                markSeen,
            }}
        >
            {children}
        </TutorialContext.Provider>
    );
};

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (!context) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
};
