<?php

namespace App\Support;

/**
 * Read-only accessor over config/countries.php.
 *
 * Every lookup falls back to the raw code rather than throwing: an order placed
 * before a market was removed from the config must still render its address.
 */
class Countries
{
    /** @return array<string, array{name: string, dial: string, currency: string, domestic: bool}> */
    public static function all(): array
    {
        return config('countries.list', []);
    }

    /** @return list<string> */
    public static function codes(): array
    {
        return array_keys(static::all());
    }

    public static function default(): string
    {
        return config('countries.default', 'IN');
    }

    public static function supports(?string $code): bool
    {
        return $code !== null && array_key_exists(strtoupper($code), static::all());
    }

    public static function name(?string $code): string
    {
        return static::attr($code, 'name') ?? strtoupper((string) $code);
    }

    public static function dial(?string $code): string
    {
        return static::attr($code, 'dial') ?? '+91';
    }

    public static function currency(?string $code): string
    {
        return static::attr($code, 'currency') ?? 'INR';
    }

    /** True only for the market where GST applies; everything else is an export. */
    public static function isDomestic(?string $code): bool
    {
        return (bool) static::attr($code, 'domestic');
    }

    /** Flat insured-shipping charge in INR for the market. */
    public static function shipping(?string $code): float
    {
        $value = static::attr($code, 'shipping');

        return is_numeric($value) ? round((float) $value, 2) : 0.0;
    }

    /** GST applies to domestic orders only; exports are zero-rated. */
    public static function taxRate(?string $code): float
    {
        return static::isDomestic($code) ? (float) config('clavira.gst_rate', 0.03) : 0.0;
    }

    /**
     * Shape the storefront consumes: [{code, name, dial, currency, domestic,
     * shipping}, ...] in config order, so India stays first in the selector.
     *
     * @return list<array{code: string, name: string, dial: string, currency: string, domestic: bool, shipping: float}>
     */
    public static function forSelect(): array
    {
        return array_values(array_map(
            fn (string $code, array $c) => [
                'code' => $code,
                'name' => $c['name'],
                'dial' => $c['dial'],
                'currency' => $c['currency'],
                'domestic' => (bool) ($c['domestic'] ?? false),
                'shipping' => round((float) ($c['shipping'] ?? 0), 2),
            ],
            array_keys(static::all()),
            static::all(),
        ));
    }

    private static function attr(?string $code, string $key): string|bool|float|int|null
    {
        if ($code === null) {
            return null;
        }

        return static::all()[strtoupper($code)][$key] ?? null;
    }
}
