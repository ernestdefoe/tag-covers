<?php

namespace Ernestdefoe\TagCovers\Api\Controller;

use Ernestdefoe\TagCovers\CoverStore;
use Ernestdefoe\TagCovers\TagCover;
use Flarum\Http\RequestUtil;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/** DELETE /api/tag-covers/{id} — remove a tag's cover, file and all. */
class DeleteCoverController implements RequestHandlerInterface
{
    public function __construct(protected CoverStore $covers)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $tagId = (int) Arr::get($request->getQueryParams(), 'id', 0);

        // Delete the file first: a row without its file renders a broken
        // image, which is worse than no cover at all.
        $this->covers->forget($tagId);
        TagCover::query()->where('tag_id', $tagId)->delete();

        return new JsonResponse(['coverUrl' => null]);
    }
}
