-- Insertar cuentas contables necesarias para organizationId = 5

-- 1011 - Caja general (ACTIVO)
INSERT INTO "Account" ("code", "name", "accountType", "level", "isPosting", "organizationId", "createdAt", "updatedAt")
VALUES ('1011', 'Caja general', 'ACTIVO', 4, true, 5, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 1041 - Cuentas corrientes (ACTIVO)
INSERT INTO "Account" ("code", "name", "accountType", "level", "isPosting", "organizationId", "createdAt", "updatedAt")
VALUES ('1041', 'Cuentas corrientes - bancos', 'ACTIVO', 4, true, 5, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 7011 - Ventas de mercaderías (INGRESO)
INSERT INTO "Account" ("code", "name", "accountType", "level", "isPosting", "organizationId", "createdAt", "updatedAt")
VALUES ('7011', 'Ventas de mercaderías - nacional', 'INGRESO', 4, true, 5, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 4011 - IGV por pagar (PASIVO)
INSERT INTO "Account" ("code", "name", "accountType", "level", "isPosting", "organizationId", "createdAt", "updatedAt")
VALUES ('4011', 'IGV - Cuenta propia', 'PASIVO', 4, true, 5, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 6911 - Costo de ventas (GASTO)
INSERT INTO "Account" ("code", "name", "accountType", "level", "isPosting", "organizationId", "createdAt", "updatedAt")
VALUES ('6911', 'Costo de ventas - Mercaderías', 'GASTO', 4, true, 5, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 2011 - Mercaderías/Existencias (ACTIVO)
INSERT INTO "Account" ("code", "name", "accountType", "level", "isPosting", "organizationId", "createdAt", "updatedAt")
VALUES ('2011', 'Almacén de mercaderías', 'ACTIVO', 4, true, 5, NOW(), NOW())
ON CONFLICT DO NOTHING;

SELECT 'Cuentas creadas exitosamente' AS status;
