<?php

namespace Ernestdefoe\TagCovers\Api\Resource;

use Ernestdefoe\TagCovers\CoverStore;
use Ernestdefoe\TagCovers\TagCover;
use Flarum\Api\Schema;

/**
 * Adds `coverUrl` to every serialized tag.
 *
 * The whole map is loaded once per request rather than a query per tag —
 * the category index serializes every tag on the forum at once, so a
 * per-tag lookup would be a query per card.
 */
class TagCoverField
{
    /** @var array<int, string>|null */
    protected ?array $map = null;

    public function __construct(protected CoverStore $covers)
    {
    }

    public function __invoke(): array
    {
        return [
            Schema\Str::make('coverUrl')
                ->nullable()
                ->get(function ($tag) {
                    $this->map ??= TagCover::query()->pluck('path', 'tag_id')->all();

                    $path = $this->map[$tag->id] ?? null;

                    return $path ? $this->covers->url($path) : null;
                }),
        ];
    }
}
