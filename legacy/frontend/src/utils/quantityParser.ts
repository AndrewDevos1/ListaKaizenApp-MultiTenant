export const parseSumExpression = (raw: string): number | null => {
    const cleaned = raw.replace(/\s+/g, '');
    if (!cleaned.includes('+')) {
        return null;
    }
    const parts = cleaned.split('+');
    if (parts.length === 0) {
        return null;
    }
    let total = 0;
    for (const part of parts) {
        if (!part) {
            return null;
        }
        const normalized = part.replace(',', '.');
        const value = Number(normalized);
        if (!Number.isFinite(value)) {
            return null;
        }
        total += value;
    }
    return total;
};

export const parseQuantidadeInput = (value: string | number | ''): number | null => {
    if (value === '') {
        return null;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    const sum = parseSumExpression(trimmed);
    if (sum !== null) {
        return sum;
    }
    const normalized = trimmed.replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};
