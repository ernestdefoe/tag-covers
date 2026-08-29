<?php

namespace Ernestdefoe\TagCovers;

use Illuminate\Contracts\Filesystem\Factory;
use Illuminate\Contracts\Filesystem\Filesystem;
use Intervention\Image\ImageManager;
use Psr\Http\Message\UploadedFileInterface;

/**
 * Reads and writes the cover files themselves.
 *
 * Files live on the `flarum-assets` disk, the same place core keeps the logo
 * and favicon, so they are served by the web server and survive a cache
 * clear. Everything is re-encoded to webp at a bounded size — an admin
 * uploading a 6MB PNG straight from an image generator should not become a
 * 6MB download for every visitor.
 */
class CoverStore
{
    public const MAX_WIDTH = 1200;
    public const QUALITY = 82;

    protected Filesystem $disk;

    public function __construct(
        Factory $filesystem,
        protected ImageManager $images,
    ) {
        $this->disk = $filesystem->disk('flarum-assets');
    }

    /** @return string the stored filename */
    public function put(int $tagId, UploadedFileInterface $file): string
    {
        $encoded = $this->images
            ->read($file->getStream()->getContents())
            ->scaleDown(width: self::MAX_WIDTH)
            ->toWebp(self::QUALITY);

        $name = 'tag-cover-'.$tagId.'-'.substr(bin2hex(random_bytes(4)), 0, 8).'.webp';

        $this->forget($tagId);
        $this->disk->put($name, (string) $encoded);

        return $name;
    }

    /**
     * Remove every cover file belonging to a tag.
     *
     * Deliberately matched by PREFIX rather than by the path recorded in the
     * database. An upload that writes its file and then fails before the row
     * is saved leaves an orphan the recorded path knows nothing about; going
     * by prefix means the next upload or removal sweeps it up.
     */
    public function forget(int $tagId): void
    {
        $prefix = 'tag-cover-'.$tagId.'-';

        foreach ($this->disk->files() as $file) {
            if (str_starts_with(basename($file), $prefix)) {
                $this->disk->delete($file);
            }
        }
    }

    public function url(string $path): string
    {
        return $this->disk->url($path);
    }
}
