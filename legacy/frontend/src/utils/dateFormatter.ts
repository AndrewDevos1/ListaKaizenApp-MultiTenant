/**
 * Utilitários para formatação de datas em Brasília (America/Sao_Paulo)
 */

/**
 * Formata uma data ISO para o fuso horário de Brasília (BRT/BRST)
 * @param dateISO string em formato ISO 8601
 * @returns string formatada no padrão dd/MM/yyyy HH:mm em Brasília
 */
export const formatarDataBrasilia = (dateISO: string): string => {
    try {
        const date = parseISODate(dateISO);

        // Usar Intl.DateTimeFormat para garantir que converta corretamente para Brasília
        return new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(date);
    } catch (error) {
        console.warn('[dateFormatter] Erro ao formatar data:', dateISO, error);
        return dateISO;
    }
};

/**
 * Formata uma data ISO apenas com data (sem hora)
 * @param dateISO string em formato ISO 8601
 * @returns string formatada no padrão dd/MM/yyyy em Brasília
 */
export const formatarDataBrasiliaSemHora = (dateISO: string): string => {
    try {
        const date = parseISODate(dateISO);

        return new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    } catch (error) {
        console.warn('[dateFormatter] Erro ao formatar data:', dateISO, error);
        return dateISO;
    }
};

/**
 * Formata uma data ISO apenas com hora (sem data)
 * @param dateISO string em formato ISO 8601
 * @returns string formatada no padrão HH:mm em Brasília
 */
export const formatarHoraBrasilia = (dateISO: string): string => {
    try {
        const date = parseISODate(dateISO);

        return new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch (error) {
        console.warn('[dateFormatter] Erro ao formatar hora:', dateISO, error);
        return dateISO;
    }
};

/**
 * Formata uma data ISO com data e hora (sem segundos) no fuso de Brasília
 * @param dateISO string em formato ISO 8601
 * @returns string formatada no padrão dd/MM/yyyy HH:mm em Brasília
 */
export const formatarDataHoraBrasilia = (dateISO: string): string => {
    try {
        const date = parseISODate(dateISO);

        return new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch (error) {
        console.warn('[dateFormatter] Erro ao formatar data/hora:', dateISO, error);
        return dateISO;
    }
};

/**
 * Parser de datas ISO, assumindo UTC quando o offset não está presente.
 * Evita variações por fuso do dispositivo ao converter para BRT.
 */
export const parseISODate = (dateISO: string): Date => {
    if (!dateISO) {
        return new Date('');
    }

    const trimmed = String(dateISO).trim();
    if (!trimmed) {
        return new Date('');
    }

    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnlyMatch) {
        const year = Number(dateOnlyMatch[1]);
        const month = Number(dateOnlyMatch[2]) - 1;
        const day = Number(dateOnlyMatch[3]);
        return new Date(Date.UTC(year, month, day, 12, 0, 0));
    }

    const normalized = trimmed.includes(' ') && !trimmed.includes('T')
        ? trimmed.replace(' ', 'T')
        : trimmed;

    const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(normalized);
    const value = hasTimezone ? normalized : `${normalized}Z`;
    return new Date(value);
};
