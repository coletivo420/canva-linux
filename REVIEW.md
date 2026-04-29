# Review Checklist

## Logging review checklist

Reject or request changes if a PR:

- uses `JSON.stringify(args)` without safe wrapping
- serializes arbitrary logger arguments as a whole array
- removes `normalizeLogArg`
- removes `normalizeArgs`
- removes circular-object handling
- removes BigInt handling
- allows logging to throw from the main process
- reintroduces `CANVA_DEBUG=gpu` or other module-specific public debug modes
- creates a second log file without explicit request
