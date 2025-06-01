export const darkTheme = {
  colors: {
    primary: '#6366F1',
    background: '#0F0F0F',
    surface: '#1A1A1A',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textTertiary: '#737373',
    accent: '#F97316',
    border: '#404040',
    success: '#10B981',
    error: '#EF4444',
    pdfBackground: '#1A1A1A',
    pdfOverlay: 'rgba(0, 0, 0, 0.8)',
  },
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  },
  borderRadius: {
    sm: 6, md: 12, lg: 16, xl: 24, full: 9999,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
    body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
    bodySmall: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
    kanjiLarge: { fontSize: 48, fontWeight: '400', lineHeight: 56 },
    kanjiMedium: { fontSize: 32, fontWeight: '400', lineHeight: 40 },
    button: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  },
  shadows: {
    small: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 2 },
    medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    large: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  },
};

export type Theme = typeof darkTheme;
