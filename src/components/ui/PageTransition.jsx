import { useLocation } from "react-router-dom";

// Wraps a page's card/form content. Using the current pathname as `key`
// forces React to unmount and remount this div whenever you navigate to a
// different route, which restarts the CSS animation defined in index.css
// (.animate-page-enter) — that's what makes it replay on every page switch
// instead of only playing once on first load.
export default function PageTransition({ children, className = "" }) {
    const location = useLocation();
    return (
        <div key={location.pathname} className={`animate-page-enter ${className}`}>
            {children}
        </div>
    );
}