<?php

namespace Tests\Feature;

use App\Models\ProductImage;
use App\Services\PhotoIngest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\Concerns\BuildsShop;
use Tests\TestCase;

/**
 * Bulk photo ingest.
 *
 * The cases that matter here are the ones a ten-thousand-file run actually hits:
 * a filename that reads two ways, a re-run of a batch that already landed, and a
 * client whose hash does not describe the bytes it sent.
 */
class PhotoIngestTest extends TestCase
{
    use BuildsShop, RefreshDatabase;

    private function headers(): array
    {
        config(['ingest.token' => 'test-ingest-secret']);

        return ['X-Ingest-Token' => 'test-ingest-secret'];
    }

    private function jpeg(): UploadedFile
    {
        return UploadedFile::fake()->image('shot.jpg', 64, 64);
    }

    // ------------------------------------------------------------------- auth

    public function test_ingest_is_closed_when_no_token_is_configured(): void
    {
        config(['ingest.token' => null]);

        $this->postJson('/api/ingest/plan', ['files' => []])
            ->assertStatus(503);
    }

    public function test_a_wrong_token_is_rejected(): void
    {
        $this->headers();

        $this->postJson('/api/ingest/plan', ['files' => []], ['X-Ingest-Token' => 'nope'])
            ->assertStatus(401);
    }

    // ------------------------------------------------------------------- plan

    public function test_plan_matches_files_to_skus_and_reads_frame_numbers(): void
    {
        $this->makeProduct(['sku' => 'CLV-1234']);

        $response = $this->postJson('/api/ingest/plan', [
            'batch' => 'b1',
            'files' => [
                ['name' => 'CLV-1234/001.jpg', 'sha256' => str_repeat('a', 64)],
                ['name' => 'CLV-1234/002.jpg', 'sha256' => str_repeat('b', 64)],
                ['name' => 'NOPE-1/001.jpg', 'sha256' => str_repeat('c', 64)],
            ],
        ], $this->headers())->assertOk();

        $response->assertJsonPath('counts.accept', 2);
        $response->assertJsonPath('counts.skip', 1);
        $response->assertJsonPath('accept.0.sku', 'CLV-1234');
        $response->assertJsonPath('accept.0.frame', 1);
        $response->assertJsonPath('accept.1.frame', 2);
        $response->assertJsonPath('skip.0.reason', PhotoIngest::SKIP_UNKNOWN_SKU);
    }

    /**
     * "CLV-1234.jpg" is either SKU CLV-1234, or SKU CLV with frame 1234. No
     * regex can decide; the catalogue does. Both readings are generated and the
     * one that exists wins — here, twice, in opposite directions.
     */
    public function test_ambiguous_names_are_resolved_against_the_catalogue(): void
    {
        $this->makeProduct(['sku' => 'CLV-1234']);
        $this->makeProduct(['sku' => 'RNG']);

        $response = $this->postJson('/api/ingest/plan', [
            'files' => [
                ['name' => 'CLV-1234.jpg', 'sha256' => str_repeat('a', 64)],
                ['name' => 'RNG-0007.jpg', 'sha256' => str_repeat('b', 64)],
            ],
        ], $this->headers())->assertOk();

        // Whole name is a real SKU -> not split into a frame.
        $response->assertJsonPath('accept.0.sku', 'CLV-1234');
        $response->assertJsonPath('accept.0.frame', null);

        // Whole name is not a SKU, but the stem is -> read the digits as frame.
        $response->assertJsonPath('accept.1.sku', 'RNG');
        $response->assertJsonPath('accept.1.frame', 7);
    }

    /**
     * The CAD supplier's real convention, taken verbatim from the archive
     * listing. Each design arrives as 3 metals x 4 views, and the metal is
     * encoded as a bare @R/@W/@Y that has to survive into something readable.
     */
    public function test_supplier_cad_lot_names_are_understood(): void
    {
        $this->makeProduct(['sku' => '588']);
        $this->makeProduct(['sku' => '25-CAD']);

        $response = $this->postJson('/api/ingest/plan', [
            'files' => [
                ['name' => 'LBR/588/588-01@R-#viwe2.png', 'sha256' => str_repeat('a', 64)],
                ['name' => 'LBR/588/588-01@W-#viwe4.png', 'sha256' => str_repeat('b', 64)],
                ['name' => 'LBR/25-CAD/25-CAD-01@Y-#viwe1.png', 'sha256' => str_repeat('c', 64)],
            ],
        ], $this->headers())->assertOk();

        $response->assertJsonPath('counts.accept', 3);

        $response->assertJsonPath('accept.0.sku', '588');
        $response->assertJsonPath('accept.0.view', 'rose');
        $response->assertJsonPath('accept.0.frame', 2);

        $response->assertJsonPath('accept.1.view', 'white');
        $response->assertJsonPath('accept.1.frame', 4);

        $response->assertJsonPath('accept.2.sku', '25-CAD');
        $response->assertJsonPath('accept.2.view', 'yellow');
        $response->assertJsonPath('accept.2.frame', 1);
    }

    public function test_unknown_skus_report_every_reading_that_was_tried(): void
    {
        $response = $this->postJson('/api/ingest/plan', [
            'files' => [['name' => 'GHOST-1_07.jpg', 'sha256' => str_repeat('a', 64)]],
        ], $this->headers())->assertOk();

        $response->assertJsonPath('skip.0.reason', PhotoIngest::SKIP_UNKNOWN_SKU);
        $this->assertSame(['GHOST-1_07', 'GHOST-1'], $response->json('skip.0.tried'));
    }

    // ------------------------------------------------------------------ image

    public function test_an_uploaded_file_is_stored_and_becomes_the_primary_image(): void
    {
        $product = $this->makeProduct(['sku' => 'CLV-1234']);
        $file = $this->jpeg();
        $sha = hash_file('sha256', $file->getRealPath());

        $this->post('/api/ingest/image', [
            'file' => $file,
            'sku' => 'CLV-1234',
            'sha256' => $sha,
            'source_name' => 'CLV-1234/001.jpg',
            'frame' => 1,
            'batch' => 'b1',
        ], $this->headers())
            ->assertStatus(201)
            ->assertJsonPath('status', 'stored');

        $image = ProductImage::firstWhere('product_id', $product->id);
        $this->assertNotNull($image);
        $this->assertTrue($image->is_primary);
        $this->assertSame(1, $image->frame);
        $this->assertSame('b1', $image->ingest_batch);
        $this->assertSame($sha, $image->sha256);
        $this->assertFileExists(public_path($image->path));

        @unlink(public_path($image->path));
    }

    /**
     * The dedupe index is only trustworthy if the stored hash describes the
     * stored bytes. A truncated upload whose hash was computed on the NAS would
     * otherwise mask the real file behind a permanent "duplicate" verdict.
     */
    public function test_a_hash_that_does_not_match_the_bytes_is_refused(): void
    {
        $this->makeProduct(['sku' => 'CLV-1234']);

        $this->post('/api/ingest/image', [
            'file' => $this->jpeg(),
            'sku' => 'CLV-1234',
            'sha256' => str_repeat('a', 64),
            'source_name' => 'CLV-1234/001.jpg',
        ], $this->headers())
            ->assertStatus(422)
            ->assertJsonPath('status', 'hash_mismatch');

        $this->assertSame(0, ProductImage::count());
    }

    public function test_re_running_a_batch_is_free_rather_than_destructive(): void
    {
        $product = $this->makeProduct(['sku' => 'CLV-1234']);
        $file = $this->jpeg();
        $sha = hash_file('sha256', $file->getRealPath());

        $send = fn () => $this->post('/api/ingest/image', [
            'file' => UploadedFile::fake()->createWithContent('shot.jpg', file_get_contents(__DIR__.'/../../public/images/tryon/pear-drop-dangles.png')),
            'sku' => 'CLV-1234',
            'sha256' => hash_file('sha256', public_path('images/tryon/pear-drop-dangles.png')),
            'source_name' => 'CLV-1234/001.png',
            'frame' => 1,
            'batch' => 'b1',
        ], $this->headers());

        $send()->assertStatus(201);

        // plan() now reports it as already held...
        $this->postJson('/api/ingest/plan', [
            'files' => [[
                'name' => 'CLV-1234/001.png',
                'sha256' => hash_file('sha256', public_path('images/tryon/pear-drop-dangles.png')),
            ]],
        ], $this->headers())->assertJsonPath('skip.0.reason', PhotoIngest::SKIP_DUPLICATE);

        // ...and re-uploading anyway is a no-op, not a second row.
        $send()->assertOk()->assertJsonPath('status', PhotoIngest::SKIP_DUPLICATE);

        $this->assertSame(1, ProductImage::where('product_id', $product->id)->count());

        foreach (ProductImage::all() as $image) {
            @unlink(public_path($image->path));
        }
    }

    public function test_report_summarises_what_a_batch_achieved(): void
    {
        $product = $this->makeProduct(['sku' => 'CLV-1234']);
        $product->images()->create([
            'path' => 'images/catalog/ingest/CLV-1234/abc.jpg',
            'sha256' => str_repeat('d', 64),
            'ingest_batch' => 'b9',
            'frame' => 1,
            'sort_order' => 1,
        ]);

        $this->getJson('/api/ingest/report?batch=b9', $this->headers())
            ->assertOk()
            ->assertJsonPath('images', 1)
            ->assertJsonPath('products', 1)
            ->assertJsonPath('detail.0.sku', 'CLV-1234');
    }
}
