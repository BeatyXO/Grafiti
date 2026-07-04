"use client";

import { CredibilityBadge } from "@/components/badges";
import type { CredibilityLevel } from "@/types";

/**
 * Circular Gravity Score indicator (0-1000), rendered in the
 * A56ABD "orchid" brand color per the design system.
 */
export function GravityGauge({
  score,
  level,
  size = 180,
}: {
  score: number;
  level: CredibilityLevel;
  size?: number;
}) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(1, score / 1000));
  const dash = circumference * fraction;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Gravity Score ${score} of 1000`}
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--grafiti-violet)"
          strokeOpacity="0.35"
          strokeWidth="7"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--grafiti-orchid)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 50 50)"
        />
        <text
          x="50"
          y="48"
          textAnchor="middle"
          fill="var(--grafiti-pale)"
          fontSize="22"
          fontWeight="bold"
          fontFamily="var(--font-geist-mono), monospace"
        >
          {score}
        </text>
        <text
          x="50"
          y="62"
          textAnchor="middle"
          fill="var(--grafiti-orchid)"
          fontSize="8"
          fontFamily="var(--font-geist-mono), monospace"
        >
          GRAVITY SCORE
        </text>
      </svg>
      <CredibilityBadge level={level} />
    </div>
  );
}
