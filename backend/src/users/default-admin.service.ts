import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

@Injectable()
export class DefaultAdminService implements OnModuleInit {
  private readonly logger = new Logger(DefaultAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const email = process.env.DEFAULT_ADMIN_EMAIL ?? "jdzare@gmail.com";
    const rawPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? "chuscasas19911991";
    const baseUsername = process.env.DEFAULT_ADMIN_USERNAME ?? email.split("@")[0];

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      return;
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    let username = baseUsername;
    let collision = await this.prisma.user.findUnique({ where: { username } });
    let suffix = 1;
    while (collision) {
      username = `${baseUsername}${suffix}`;
      collision = await this.prisma.user.findUnique({ where: { username } });
      suffix += 1;
    }

    await this.prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: UserRole.ADMIN,
        status: "ACTIVO",
      },
    });

    this.logger.log(`Default admin user ensured (${email})`);
  }
}