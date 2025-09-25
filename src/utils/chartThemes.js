// utils/chartThemes.js
export const lightTheme = {
    // Primary colors extracted from your CSS
    primary: '#1a202c',      // Main text color
    secondary: '#718096',     // Secondary text color  
    accent: '#5a67d8',       // Button accent color
    success: '#10b981',      // Connection indicator
    warning: '#f59e0b',      // Warning states
    danger: '#dc2626',       // Error states

    // Background colors
    background: '#ffffff',    // Main background
    surface: '#f8fafc',      // Surface/card background
    border: '#e2e8f0',       // Border color

    // Chart-specific palette
    chartColors: [
        '#1a202c',  // Primary dark
        '#5a67d8',  // Accent blue
        '#10b981',  // Success green
        '#dc2626',  // Error red
        '#f59e0b',  // Warning orange
        '#8b5cf6',  // Purple
        '#718096',  // Secondary gray
        '#4c51bf'   // Darker blue
    ],

    // Gradient backgrounds for charts
    gradientColors: [
        'rgba(26, 32, 44, 0.1)',     // Primary with opacity
        'rgba(90, 103, 216, 0.1)',   // Accent with opacity
        'rgba(16, 185, 129, 0.1)',   // Success with opacity
        'rgba(220, 38, 38, 0.1)',    // Error with opacity
        'rgba(245, 158, 11, 0.1)',   // Warning with opacity
        'rgba(139, 92, 246, 0.1)',   // Purple with opacity
        'rgba(113, 128, 150, 0.1)',  // Secondary with opacity
        'rgba(76, 81, 191, 0.1)'     // Darker blue with opacity
    ]
};
