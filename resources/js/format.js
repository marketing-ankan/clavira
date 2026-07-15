const inr = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
});

export const formatPrice = (value) => inr.format(value ?? 0);

export const metalLabel = { yellow: 'Yellow Gold', white: 'White Gold', rose: 'Rose Gold' };

export const diamondLabel = {
    lab_grown: 'Lab-Grown Diamond',
    natural: 'Natural Diamond',
    polki: 'Uncut Polki',
    none: 'Pure Gold',
};
