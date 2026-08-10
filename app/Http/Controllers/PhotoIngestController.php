<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductImage;
use App\Services\PhotoIngest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The door n8n knocks on while walking an unzipped Synology folder.
 *
 * Three calls, in order:
 *
 *   POST /api/ingest/plan    names + hashes only -> "upload these, skip those"
 *   POST /api/ingest/image   one file, one row
 *   GET  /api/ingest/report  what a batch actually achieved
 *
 * The split exists because of the numbers. Ten thousand files is tens of
 * gigabytes over a home uplink; the plan call is what turns a re-run into a few
 * hundred kilobytes of JSON instead of a second full upload, and what lets the
 * flow report "412 unknown SKUs" before a single byte crosses the wire.
 */
class PhotoIngestController extends Controller
{
    public function __construct(private readonly PhotoIngest $ingest) {}

    /** Dry run: which of these files are worth uploading? */
    public function plan(Request $request): JsonResponse
    {
        $max = (int) config('ingest.max_manifest');

        $data = $request->validate([
            'batch' => 'nullable|string|max:40',
            'files' => "required|array|min:1|max:{$max}",
            'files.*.name' => 'required|string|max:500',
            'files.*.sha256' => 'required|string|size:64|regex:/^[A-Fa-f0-9]{64}$/',
        ]);

        $result = $this->ingest->plan($data['files']);

        return response()->json([
            'batch' => $data['batch'] ?? null,
            'accept' => $result['accept'],
            'skip' => $result['skip'],
            'counts' => [
                'accept' => count($result['accept']),
                'skip' => count($result['skip']),
            ],
        ]);
    }

    /** Take one file that plan() accepted. */
    public function image(Request $request): JsonResponse
    {
        $maxKb = (int) config('ingest.max_kb');
        $exts = implode(',', (array) config('ingest.extensions'));

        $data = $request->validate([
            'file' => "required|file|image|mimes:{$exts}|max:{$maxKb}",
            'sku' => 'required|string|max:60',
            'sha256' => 'required|string|size:64|regex:/^[A-Fa-f0-9]{64}$/',
            'source_name' => 'required|string|max:500',
            'frame' => 'nullable|integer|min:0|max:9999',
            'view' => 'nullable|string|max:20',
            'batch' => 'nullable|string|max:40',
        ]);

        $file = $request->file('file');
        $sha = strtolower($data['sha256']);

        // Verify the hash against the bytes that actually arrived. Trusting the
        // client's hash would make the dedupe index a record of what n8n
        // believed rather than what is on disk, and a truncated upload would
        // permanently mask the real file behind a "duplicate" verdict.
        $actual = hash_file('sha256', $file->getRealPath());
        if (! hash_equals($sha, $actual)) {
            return response()->json([
                'status' => 'hash_mismatch',
                'expected' => $sha,
                'actual' => $actual,
            ], 422);
        }

        $products = $this->ingest->resolveSkus([$data['sku']]);
        $product = $products[$this->ingest->normaliseSku($data['sku'])] ?? null;

        if (! $product) {
            return response()->json(['status' => PhotoIngest::SKIP_UNKNOWN_SKU, 'sku' => $data['sku']], 422);
        }

        $image = $this->ingest->store(
            product: $product,
            sha256: $sha,
            extension: $file->getClientOriginalExtension() ?: 'jpg',
            sourceName: $data['source_name'],
            frame: isset($data['frame']) ? (int) $data['frame'] : null,
            view: $data['view'] ?? null,
            batch: $data['batch'] ?? null,
            move: fn (string $destination) => $file->move(dirname($destination), basename($destination)),
        );

        if (! $image) {
            // Lost a race with a concurrent batch. Same bytes, already filed.
            return response()->json(['status' => PhotoIngest::SKIP_DUPLICATE, 'sku' => $product->sku]);
        }

        return response()->json([
            'status' => 'stored',
            'sku' => $product->sku,
            'image' => ['id' => $image->id, 'path' => $image->path, 'frame' => $image->frame],
        ], 201);
    }

    /** What did a batch actually do? Also the flow's final summary line. */
    public function report(Request $request): JsonResponse
    {
        $data = $request->validate(['batch' => 'required|string|max:40']);

        $rows = ProductImage::where('ingest_batch', $data['batch']);

        $skus = (clone $rows)->distinct()->count('product_id');
        $images = (clone $rows)->count();

        $products = Product::whereIn('id', (clone $rows)->select('product_id'))
            ->withCount(['images as ingested_count' => fn ($q) => $q->where('ingest_batch', $data['batch'])])
            ->orderBy('sku')
            ->get(['id', 'sku', 'name'])
            ->map(fn ($p) => [
                'sku' => $p->sku,
                'name' => $p->name,
                'images' => $p->ingested_count,
            ]);

        return response()->json([
            'batch' => $data['batch'],
            'images' => $images,
            'products' => $skus,
            'detail' => $products,
        ]);
    }
}
