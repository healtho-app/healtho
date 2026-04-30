// @healtho/ui — design-system primitives barrel.
//
// Phase 2 surface: 8 primitives shipped as production JSX. Tokens at
// ./tokens.css, fonts at ./fonts/*. App components (CalorieRing,
// MacroCard, etc.) stay in apps/web/src/components/ — they consume
// these primitives but are app-shaped, not cross-platform candidates.
//
// Future React Native consumers can re-export a subset via a separate
// .native.js entrypoint when Phase 4 of the product roadmap lands.

export { Button } from './components/Button.jsx';
export { Card } from './components/Card.jsx';
export { Input } from './components/Input.jsx';
export { Modal } from './components/Modal.jsx';
export { Badge } from './components/Badge.jsx';
export { IconButton } from './components/IconButton.jsx';
export { MealAvatar } from './components/MealAvatar.jsx';
export { MaterialIcon } from './components/MaterialIcon.jsx';
