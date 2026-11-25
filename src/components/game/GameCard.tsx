import { eventAttrs } from "@/lib/analytics";
import { Badge } from "@/components/ui/pixelact-ui/badge";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/pixelact-ui/card";
import type { GameView } from "@/data/catalog";
import { taxonomyLabel, langLabel, UI, type Locale } from "@/i18n/ui";
import { gameDescription } from "@/data/game-description";
import { CARD_COVER_SIZES, CARD_COVER_WIDTHS, optimizedCoverUrl, coverSrcSet } from "@/lib/cover-image";

export function GameCard({ game, locale, source = "catalog", position }: { game: GameView; locale: Locale; source?: "catalog" | "similar"; position?: number }) {
  const title = game.titleByLocale[locale];
  const copy = UI[locale];
  const href = "/" + locale + "/game/" + game.slug + "/";
  const play = game.instances.find((instance) => instance.available === true && !instance.needsReview);
  const detail = (surface: string) => eventAttrs(source === "similar" ? "game_recommendation_click" : "game_detail_click", { gameSlug: game.slug, locale, source, position, surface });
  const versions = eventAttrs("game_versions_click", { gameSlug: game.slug, locale, source, position });
  return <Card className="game-card">
    <CardContent className="game-content">
      <a href={href} {...detail("cover")} className="cover-frame" aria-label={title}>
        <img className="cover-base" src="/assets/empty-book.jpg" width={480} height={300} alt="" aria-hidden="true" />
        {game.coverUrl && <img className="cover-image is-loaded" src={optimizedCoverUrl(game.coverUrl, 384)} srcSet={coverSrcSet(game.coverUrl, CARD_COVER_WIDTHS)} sizes={CARD_COVER_SIZES} alt={title} width={480} height={300} loading="lazy" decoding="async" referrerPolicy="no-referrer" />}
      </a>
      <div className="game-body">
        <div className="game-heading">
          <div className="game-title-row">
            <CardTitle className="game-title"><a href={href} {...detail("title")}>{title}</a></CardTitle>
            {game.editorialRating !== null && <span className="game-rating" title={copy.ratingLegend} aria-label={`${copy.editorialScore}: ${game.editorialRating}/10`}>★ {game.editorialRating}<small>/10</small></span>}
          </div>
          <p className="game-repo">{gameDescription(game, locale)}</p>
        </div>
        <div className="game-meta">
          {[...new Set([...game.genres, ...game.themes])].slice(0, 2).map((tag) => <a key={tag} href={"/" + locale + "/tags/" + tag + "/"}>
            <Badge variant="outline" className="engine-pill">{taxonomyLabel(tag, locale)}</Badge>
          </a>)}
          {game.languages.slice(0, 2).map((lang) => <a key={lang} href={"/" + locale + "/languages/" + lang + "/"}><Badge variant="outline" className="size-pill">{langLabel(lang, locale)}</Badge></a>)}
          {game.languages.length > 2 && <Badge variant="outline" className="size-pill">+{game.languages.length - 2}</Badge>}
          {game.nsfw !== false && <a href={"/" + locale + "/nsfw/" + (game.nsfw === true ? "adult" : "unknown") + "/"} aria-label={copy.nsfwFilter + ": " + (game.nsfw === true ? copy.adult : copy.unknown)}><Badge variant="outline" className="size-pill caution-pill">{game.nsfw === true ? copy.adult : copy.unknown}</Badge></a>}
          {game.instances.length > 1 && <Badge variant="outline" className="size-pill">{game.instances.length} {copy.editions}</Badge>}
        </div>
        <div className="game-actions">
          <Button asChild className="action-button"><a href={href} {...detail("button")}>{copy.details}</a></Button>
          {game.instances.length > 1
            ? <Button asChild variant="secondary" className="action-button"><a href={href + "#versions"} {...versions}>{copy.chooseVersion}</a></Button>
            : play
              ? <Button asChild variant="secondary" className="action-button"><a href={play.playUrl} {...eventAttrs("game_play_click", { gameSlug: game.slug, instanceId: play.id, instanceType: play.type, locale, source, position, engine: play.engine })} target="_blank" rel="noopener noreferrer">{copy.play}</a></Button>
              : <Button asChild variant="secondary" className="action-button"><a href={href + "#versions"} {...versions}>{copy.versions}</a></Button>}
        </div>
      </div>
    </CardContent>
  </Card>;
}
