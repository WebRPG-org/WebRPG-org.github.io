import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CARD_COVER_SIZES, DETAIL_COVER_SIZES, CARD_COVER_WIDTHS, DETAIL_COVER_WIDTHS,
  optimizedCoverUrl, coverSrcSet,
} from "../src/lib/cover-image.ts";

const fork = "https://webrpg.org/Destiny236-Narcissuweb/cover.png";
const hosted = "https://webrpg.org/images/aiyoku-no-eustia.jpg";

test("static WebRPG cover URLs generate stable, width-specific image-proxy paths", () => {
  assert.equal(optimizedCoverUrl(fork, 384),
    "https://i.ravelloh.com/webrpg.org/Destiny236-Narcissuweb/cover.png?w=384");
  assert.equal(optimizedCoverUrl(hosted, 750),
    "https://i.ravelloh.com/webrpg.org/images/aiyoku-no-eustia.jpg?w=750");
  assert.equal(coverSrcSet(fork, CARD_COVER_WIDTHS)?.split(", ").length, CARD_COVER_WIDTHS.length);
  assert.equal(coverSrcSet(hosted, DETAIL_COVER_WIDTHS)?.split(", ").length, DETAIL_COVER_WIDTHS.length);
  assert.match(CARD_COVER_SIZES, /vw/);
  assert.match(DETAIL_COVER_SIZES, /500px/);
});

test("unsupported/malformed sources never become an open image proxy", () => {
  for (const url of [
    "https://example.com/image.jpg",
    "http://webrpg.org/images/foo.jpg",
    "https://webrpg.org/api/collect",
    "https://webrpg.org/images/foo.svg",
    "https://webrpg.org/images/foo.jpg?version=1",
    "https://webrpg.org/admin/cover.png",
    "https://webrpg.org/project/index.html",
    "not a url",
  ]) {
    assert.equal(optimizedCoverUrl(url, 384), url);
    assert.equal(coverSrcSet(url, CARD_COVER_WIDTHS), undefined);
  }
  assert.equal(optimizedCoverUrl(fork, 999), fork, "Width must be a supported transform");
});

test("every currently sourced WebRPG cover can be optimized", () => {
  const catalog = JSON.parse(readFileSync(new URL("../.cache/catalog.json", import.meta.url), "utf8"));
  const covers = catalog.games.filter((game) => game.coverUrl);
  assert(covers.length > 500);
  for (const game of covers) {
    const urls = coverSrcSet(game.coverUrl, CARD_COVER_WIDTHS);
    assert(urls?.includes("i.ravelloh.com/webrpg.org/"), game.slug);
  }
});
