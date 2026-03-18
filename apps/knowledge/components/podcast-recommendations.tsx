import type { Podcast } from "@/lib/data";

interface Props {
  podcasts: Podcast[];
}

export function PodcastRecommendations({ podcasts }: Props) {
  if (podcasts.length === 0) return null;

  const shows = podcasts.filter((p) => p.type === "show");
  const episodes = podcasts.filter((p) => p.type === "episode");

  return (
    <div className="podcast-section">
      <div className="related-heading">Related Podcasts</div>

      {/* Spotify embeds for episodes (compact player) */}
      {episodes.length > 0 && (
        <div className="podcast-embeds">
          {episodes.slice(0, 2).map((ep) => (
            <iframe
              key={ep.spotifyId}
              title={ep.name}
              src={`https://open.spotify.com/embed/episode/${ep.spotifyId}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="podcast-embed"
            />
          ))}
        </div>
      )}

      {/* Show cards */}
      {shows.length > 0 && (
        <div className="podcast-grid">
          {shows.map((show) => (
            <a
              key={show.spotifyId}
              href={show.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="podcast-card"
            >
              {show.imageUrl && (
                <img
                  src={show.imageUrl}
                  alt={show.name}
                  className="podcast-card-img"
                  width={60}
                  height={60}
                />
              )}
              <div className="podcast-card-info">
                <span className="podcast-card-name">{show.name}</span>
                {show.publisher && (
                  <span className="podcast-card-publisher">{show.publisher}</span>
                )}
                {show.description && (
                  <span className="podcast-card-desc">
                    {show.description.slice(0, 120)}
                    {show.description.length > 120 ? "..." : ""}
                  </span>
                )}
              </div>
              <svg
                className="podcast-card-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          ))}
        </div>
      )}

      {/* Remaining episodes as cards */}
      {episodes.length > 2 && (
        <div className="podcast-grid">
          {episodes.slice(2).map((ep) => (
            <a
              key={ep.spotifyId}
              href={ep.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="podcast-card"
            >
              {ep.imageUrl && (
                <img
                  src={ep.imageUrl}
                  alt={ep.name}
                  className="podcast-card-img"
                  width={60}
                  height={60}
                />
              )}
              <div className="podcast-card-info">
                <span className="podcast-card-name">{ep.name}</span>
                <span className="podcast-card-publisher">
                  {(ep as { showName?: string }).showName || "Episode"}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
