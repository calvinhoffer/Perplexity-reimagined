/**
 * Planet Orbit & Tab Configuration
 * Contains popular websites with authentic logos, geometry, and radial distribution
 */
export const planetTabsConfig = {
  'p-des': {
    gap: 38,
    centerAngle: -6,
    spread: 116,
    dotSize: 40,
    tabs: [
      { n: 'Behance',       img: './Tabs/Behance.png',     url: 'https://www.behance.net' },
      { n: 'Mobbin',        img: './Tabs/Mobbin.png',      url: 'https://mobbin.com' },
      { n: 'Instagram',     img: './Tabs/Instagram.png',   url: 'https://www.instagram.com' },
      { n: 'Framer',        img: './Tabs/Framer.png',      url: 'https://www.framer.com' },
      { n: 'Pinterest',     img: './Tabs/Pinterest.png',   url: 'https://www.pinterest.com' },
      { n: 'Unsplash',      img: './Tabs/Unsplash.png',    url: 'https://unsplash.com' },
      { n: 'Red Dot Award', img: './Tabs/RedDotAward.png', url: 'https://www.red-dot.org' },
      { n: 'Awwwards',      img: './Tabs/Awwwards.png',    url: 'https://www.awwwards.org' },
    ]
  },
  'p-soc': {
    gap: 36,
    centerAngle: -30,
    spread: 106,
    dotSize: 36,
    tabs: [
      { n: 'X',             img: './Tabs/X.svg',           url: 'https://x.com' },
      { n: 'YouTube',       img: './Tabs/YouTube.svg',     url: 'https://www.youtube.com' },
      { n: 'Reddit',        img: './Tabs/Reddit.svg',      url: 'https://www.reddit.com' },
      { n: 'TikTok',        img: './Tabs/TikTok.svg',      url: 'https://www.tiktok.com' },
      { n: 'LinkedIn',      img: './Tabs/LinkedIn.svg',    url: 'https://www.linkedin.com' },
      { n: 'Threads',       img: './Tabs/Threads.svg',     url: 'https://www.threads.net' },
    ]
  },
  'p-ai': {
    gap: 32,
    centerAngle: 0,
    spread: 96,
    dotSize: 34,
    tabs: [
      { n: 'ChatGPT',       img: './Tabs/ChatGPT.svg',     url: 'https://chatgpt.com' },
      { n: 'Claude',        img: './Tabs/Claude.svg',      url: 'https://claude.ai' },
      { n: 'Gemini',        img: './Tabs/Gemini.svg',      url: 'https://gemini.google.com' },
      { n: 'Perplexity',    img: './Tabs/Perplexity.svg',  url: 'https://www.perplexity.ai' },
      { n: 'Copilot',       img: './Tabs/Copilot.svg',     url: 'https://copilot.microsoft.com' },
    ]
  },
  'p-mus': {
    gap: 26,
    centerAngle: 42,
    spread: 60,
    dotSize: 32,
    tabs: [
      { n: 'Spotify',       img: './Tabs/Spotify.svg',     url: 'https://open.spotify.com' },
      { n: 'Apple Music',   img: './Tabs/AppleMusic.svg',  url: 'https://music.apple.com' },
      { n: 'SoundCloud',    img: './Tabs/SoundCloud.svg',  url: 'https://soundcloud.com' },
    ]
  },
  'p-ent': {
    gap: 22,
    centerAngle: 0,
    spread: 38,
    dotSize: 28,
    tabs: [
      { n: 'Netflix',       img: './Tabs/Netflix.svg',     url: 'https://www.netflix.com' },
      { n: 'Twitch',        img: './Tabs/Twitch.svg',      url: 'https://www.twitch.tv' },
    ]
  }
};

export const defaultSizes = {
  'p-des': 304,
  'p-soc': 228,
  'p-ai': 172,
  'p-mus': 118,
  'p-ent': 84
};
