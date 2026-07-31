import type { SVGProps } from "react";

// lucide removed brand marks, so we ship our own minimal glyphs.

export function InstagramIcon({ size = 16, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokIcon({ size = 16, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.5 3c.3 2.1 1.6 3.7 3.7 4v2.4c-1.4.1-2.7-.3-3.8-1v6.1c0 3.1-2.4 5.5-5.4 5.5S5.6 17.6 5.6 14.5 8 9 11 9c.3 0 .6 0 .9.1v2.6c-.3-.1-.6-.2-.9-.2-1.5 0-2.7 1.3-2.7 2.9s1.2 2.9 2.7 2.9 2.7-1.3 2.7-2.9V3h1.8z" />
    </svg>
  );
}

export function YouTubeIcon({ size = 16, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23 7.5a3 3 0 0 0-2.1-2.1C19 5 12 5 12 5s-7 0-8.9.4A3 3 0 0 0 1 7.5 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.5a3 3 0 0 0 2.1 2.1C5 19 12 19 12 19s7 0 8.9-.4a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23.5 12 31 31 0 0 0 23 7.5zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z" />
    </svg>
  );
}
