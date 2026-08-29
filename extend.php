<?php

use Ernestdefoe\TagCovers\Api\Controller\DeleteCoverController;
use Ernestdefoe\TagCovers\Api\Controller\UploadCoverController;
use Ernestdefoe\TagCovers\Api\Resource\TagCoverField;
use Flarum\Extend;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js')
        ->css(__DIR__.'/less/admin.less'),

    new Extend\Locales(__DIR__.'/locale'),

    (new Extend\Routes('api'))
        ->post('/tag-covers/{id}', 'tag-covers.upload', UploadCoverController::class)
        ->delete('/tag-covers/{id}', 'tag-covers.delete', DeleteCoverController::class),

    // `coverUrl` on every tag, so anything that renders a tag can use it.
    (new Extend\ApiResource(\Flarum\Tags\Api\Resource\TagResource::class))
        ->fields(TagCoverField::class),
];
