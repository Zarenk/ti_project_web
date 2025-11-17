/**
 * Test helpers previously attempted to stub the `@prisma/client` module from here,
 * but that shadowed the real Prisma type declarations and caused errors such as
 * `TS2305: Module "@prisma/client" has no exported member 'Prisma'.`
 *
 * Leaving this file as an explicit (empty) module keeps the door open for future
 * test-specific augmentations without overriding the generated Prisma typings.
 */
export {};
