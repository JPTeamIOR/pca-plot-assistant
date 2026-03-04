---
name: Frontend & Plotly
description: Specialist knowledge in Angular 19, Angular Material, and Plotly.js for scientific visualizations.
---

# Frontend & Plotly

This skill focuses on the visual and interactive layer of the Prostate Cancer Atlas Assistant, ensuring high-performance data visualization and a premium user experience.

## Technology Stack

### Angular 19
- **Standalone Components**: The app uses standalone components to reduce boilerplate.
- **Signals**: State management (like loading states and plot data) is handled using Angular Signals (`signal`, `computed`, `effect`).
- **Styles**: Global styles are in `src/styles.css`, component-specific styles are in `.css` or `.scss` files.

### Angular Material
- Uses modern Material components (`MatToolbar`, `MatCard`, `MatButton`, `MatIcon`, `MatProgressBar`).
- Follows Material Design 3 (M3) principles where possible.

### Plotly.js
- Integrated via `angular-plotly.js` and `plotly.js-dist-min`.
- **Plot Types**:
    - **Scatter3D**: Used for Bulk PCA plots (PC1, PC2, PC3).
    - **Scatter**: Used for Single-cell UMAP/TSNE plots.
- **Customization**:
    - Always set `responsive: true` in the plot configuration.
    - Customize `layout` for titles, axis labels, and dark/light theme consistency.

## Component Architecture

### `PlotContainerComponent`
Wraps the `<plotly-plot>` component. Receives `data` and `layout` signals to render the visualization.

### `ChatInputComponent`
Handles user input and emits events to the main app component. Includes a textarea and send button with appropriate loading states.

### `AiService`
Handles HTTP communication with the backend. Expects a JSON response containing an `explanation` and optionally a `plot` object with `data` and `layout`.

## Best Practices

### Scientific Visualization
- **Colors**: Use scientifically appropriate color scales (e.g., Viridis, Plasma) for expression data.
- **Interactivity**: Enable hover tooltips and legend filtering to allow researchers to explore the data.
- **Responsive Design**: Ensure plots resize correctly within their `MatCard` containers.

### Performance
- Use `plotly.js-dist-min` to keep the bundle size small.
- Leverage Angular's `OnPush` change detection and Signals to minimize unnecessary re-renders.
