# -*- coding: utf-8 -*-
from decimal import Decimal
from prisma import Prisma

PLANS = [
    {
        "code": "trial",
        "name": "Plan Trial",
        "description": "Version demo con 14 dias de prueba.",
        "interval": "MONTHLY",
        "price": Decimal("0"),
        "currency": "PEN",
        "trial_days": 14,
    },
    {
        "code": "starter",
        "name": "Starter",
        "description": "Hasta 2 usuarios y 200 comprobantes/mes.",
        "interval": "MONTHLY",
        "price": Decimal("120"),
        "currency": "PEN",
        "trial_days": 14,
    },
    {
        "code": "growth",
        "name": "Growth",
        "description": "Hasta 5 usuarios y 1000 comprobantes/mes.",
        "interval": "MONTHLY",
        "price": Decimal("220"),
        "currency": "PEN",
        "trial_days": 14,
    },
    {
        "code": "premium",
        "name": "Premium",
        "description": "Usuarios ilimitados y soporte prioritario.",
        "interval": "MONTHLY",
        "price": Decimal("360"),
        "currency": "PEN",
        "trial_days": 14,
    },
]

async def main():
    prisma = Prisma()
    await prisma.connect()
    for plan in PLANS:
        data = {
            "name": plan["name"],
            "description": plan["description"],
            "interval": plan["interval"],
            "price": plan["price"],
            "currency": plan["currency"],
            "trial_days": plan["trial_days"],
            "is_active": True,
        }
        await prisma.subscriptionplan.upsert(
            where={"code": plan["code"]},
            data={"update": data, "create": {"code": plan["code"], **data}},
        )
    await prisma.disconnect()

if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
