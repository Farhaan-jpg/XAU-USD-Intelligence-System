// client/src/components/CollapsibleBentoCard.jsx
// Institutional Bento-Box Progressive Disclosure Card
// Expands to reveal deep data; collapses to a clean single-row summary to maximize negative space

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function CollapsibleBentoCard({
  id,
  title,
  icon: Icon,
  badge,
  badgeColor = 'var(--cyan-primary)',
  badgeBg = 'rgba(56, 189, 248, 0.08)',
  summary,
  defaultExpanded = true,
  className = '',
  style = {},
  children,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`panel-card bento-card ${isExpanded ? 'bento-expanded' : 'bento-collapsed'} ${className}`}
      style={style}
    >
      {/* Bento Header / Interactive Collapse Handle */}
      <div
        className="bento-header"
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? 'Click to collapse module' : 'Click to expand module'}
      >
        <div className="bento-header-left">
          {Icon && <Icon size={13} className="bento-icon" />}
          <span className="bento-title">{title}</span>

          {/* Collapsed Summary Text */}
          {!isExpanded && summary && (
            <span className="bento-summary-text">{summary}</span>
          )}
        </div>

        <div className="bento-header-right">
          {badge && (
            <span
              className="bento-badge"
              style={{
                color: badgeColor,
                background: badgeBg,
                borderColor: `${badgeColor}33`,
              }}
            >
              {badge}
            </span>
          )}
          <button
            type="button"
            className="bento-collapse-btn"
            aria-label={isExpanded ? 'Collapse card' : 'Expand card'}
          >
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Card Content with Smooth Transition */}
      {isExpanded && <div className="bento-body">{children}</div>}
    </div>
  );
}
