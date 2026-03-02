import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  WASocket,
  Browsers,
  proto,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SendMessageDto, SendTemplateDto } from './dto/send-message.dto';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  private sock: WASocket | null = null;
  private isConnected = false;
  private currentQrCode: string | null = null;
  private sessionId: number | null = null;
  private organizationId: number | null = null;
  private companyId: number | null = null;
  private readonly authPath = './whatsapp_auth';
  private retryCount = 0;
  private readonly maxRetries = 5;
  private isInitializing = false;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private static readonly CONNECTION_TIMEOUT_MS = 60_000; // 60s to connect
  private static readonly FALLBACK_WA_VERSION: [number, number, number] = [2, 3000, 1015901424];

  // ── Rate Limiting (WhatsApp anti-ban protection) ──────────────────────
  // WhatsApp bans accounts that send messages too fast or to too many contacts.
  // These limits are conservative to stay well within WhatsApp's tolerance.
  private static readonly RATE_LIMIT = {
    MIN_DELAY_PER_CONTACT_MS: 2_000,   // Min 2s between messages to same number
    MIN_DELAY_BETWEEN_MSGS_MS: 1_000,  // Min 1s between any two messages
    MAX_MSGS_PER_MINUTE: 30,           // Max 30 msgs/min (well under WA's 80/s limit)
    MAX_UNIQUE_CONTACTS_PER_DAY: 500,  // Max 500 unique contacts/day
    CIRCUIT_BREAKER_THRESHOLD: 5,      // 5 consecutive failures → pause sending
    CIRCUIT_BREAKER_COOLDOWN_MS: 300_000, // 5 min cooldown after circuit trips
  };

  // Rate limiter state — keyed per session (org+company) so switching tenants
  // doesn't inherit stale counters from the previous session.
  private rateLimitState: {
    sessionKey: string; // "orgId:companyId"
    lastMessageTimestamp: number;
    lastMessagePerContact: Map<string, number>; // phone → last timestamp
    dailyUniqueContacts: Set<string>;
    dailyResetDate: string;
    minuteMessageCount: number;
    minuteWindowStart: number;
    consecutiveFailures: number;
    circuitBreakerUntil: number;
  } = this.freshRateLimitState('');

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private freshRateLimitState(sessionKey: string) {
    return {
      sessionKey,
      lastMessageTimestamp: 0,
      lastMessagePerContact: new Map<string, number>(),
      dailyUniqueContacts: new Set<string>(),
      dailyResetDate: new Date().toDateString(),
      minuteMessageCount: 0,
      minuteWindowStart: 0,
      consecutiveFailures: 0,
      circuitBreakerUntil: 0,
    };
  }

  /**
   * Get (or reset) rate limit state for the current session.
   * Ensures counters are scoped to the active org+company.
   */
  private getRL(): typeof this.rateLimitState {
    const key = `${this.organizationId}:${this.companyId}`;
    if (this.rateLimitState.sessionKey !== key) {
      this.rateLimitState = this.freshRateLimitState(key);
    }
    return this.rateLimitState;
  }

  async onModuleInit() {
    // Auto-reconnect sessions that were connected before server restart
    await this.checkAndInitialize();
  }

  private async checkAndInitialize() {
    try {
      // Find sessions that should be reconnected after restart.
      // Include CONNECTING/FAILED from a previous crash — they might still have valid auth.
      const activeSession = await this.prisma.whatsAppSession.findFirst({
        where: {
          status: { in: ['CONNECTED', 'DISCONNECTED', 'CONNECTING', 'FAILED'] },
        },
        orderBy: { lastConnected: 'desc' },
      });

      if (activeSession) {
        // Only auto-reconnect if auth files exist (previously paired)
        const authDir = path.join(this.authPath, `session_${activeSession.organizationId}_${activeSession.companyId}`);
        const authExists = await fs.access(authDir).then(() => true).catch(() => false);

        if (authExists) {
          this.logger.log(`Found session #${activeSession.id} (status: ${activeSession.status}) with saved auth, reconnecting...`);
          // Small delay to let the rest of the app fully start
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await this.initialize(activeSession.organizationId, activeSession.companyId);
        } else {
          this.logger.log(`Session #${activeSession.id} found but no auth files — skipping auto-reconnect`);
          // Clean up stale session status
          if (activeSession.status === 'CONNECTING' || activeSession.status === 'CONNECTED') {
            await this.prisma.whatsAppSession.update({
              where: { id: activeSession.id },
              data: { status: 'DISCONNECTED', isActive: false },
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error checking for active sessions', error);
    }
  }

  async initialize(organizationId: number, companyId: number, freshConnect = false): Promise<{ qrCode?: string }> {
    // Prevent concurrent initialization
    if (this.isInitializing) {
      this.logger.warn('Initialize already in progress, skipping duplicate call');
      return { qrCode: this.currentQrCode || undefined };
    }

    this.isInitializing = true;

    try {
      this.organizationId = organizationId;
      this.companyId = companyId;

      // Clear connection timeout if any
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      // Close existing socket if any
      if (this.sock) {
        try { this.sock.end(undefined); } catch {} // eslint-disable-line no-empty
        this.sock = null;
      }

      if (freshConnect) {
        this.retryCount = 0;
        // Clear old auth to force fresh QR
        const authDir = path.join(this.authPath, `session_${organizationId}_${companyId}`);
        await fs.rm(authDir, { recursive: true, force: true }).catch(() => {});
        this.logger.log('Fresh connect: cleared old auth state');
      } else {
        this.retryCount = 0;
      }

      // Create or get session
      let session = await this.prisma.whatsAppSession.findFirst({
        where: { organizationId, companyId },
      });

      if (!session) {
        session = await this.prisma.whatsAppSession.create({
          data: {
            organizationId,
            companyId,
            status: 'CONNECTING',
          },
        });
      } else {
        await this.prisma.whatsAppSession.update({
          where: { id: session.id },
          data: { status: 'CONNECTING' },
        });
      }

      this.sessionId = session.id;

      // Ensure auth directory exists
      await fs.mkdir(this.authPath, { recursive: true });

      const authDir = path.join(this.authPath, `session_${organizationId}_${companyId}`);
      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      // Fetch latest WA Web version with timeout + fallback
      let version: [number, number, number];
      try {
        const versionResult = await Promise.race([
          fetchLatestWaWebVersion({}),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Version fetch timeout')), 10_000),
          ),
        ]);
        version = versionResult.version;
        this.logger.log(`Using WA Web version: ${version.join('.')}`);
      } catch (err) {
        version = WhatsAppService.FALLBACK_WA_VERSION;
        this.logger.warn(`Failed to fetch WA version, using fallback: ${version.join('.')} (${(err as Error).message})`);
      }

      this.sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'),
        logger: P({ level: 'silent' }) as any,
        getMessage: async () => undefined,
      });

      // Handle connection updates
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.currentQrCode = qr;
          this.logger.log('QR Code generated');
          await this.prisma.whatsAppSession.update({
            where: { id: this.sessionId! },
            data: {
              qrCode: qr,
              status: 'QR_PENDING',
            },
          });

          // Emit event for frontend to pick up QR
          this.eventEmitter.emit('whatsapp.qr', {
            organizationId,
            companyId,
            qrCode: qr,
          });
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          const reason = (lastDisconnect?.error as any)?.output?.payload?.message || 'Unknown';

          this.logger.warn(`Connection closed. Reason: ${reason} (status: ${statusCode})`);

          // Clear connection timeout on close
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }

          if (statusCode === DisconnectReason.loggedOut) {
            // User unlinked the device from their phone — clear auth
            this.isConnected = false;
            this.isInitializing = false;
            this.logger.warn('Device was logged out from WhatsApp. Clearing auth.');
            const authDir = path.join(this.authPath, `session_${organizationId}_${companyId}`);
            await fs.rm(authDir, { recursive: true, force: true }).catch(() => {});
            await this.prisma.whatsAppSession.update({
              where: { id: this.sessionId! },
              data: { status: 'DISCONNECTED', phoneNumber: null, qrCode: null, isActive: false },
            });
            this.eventEmitter.emit('whatsapp.disconnected', {
              organizationId, companyId, reason: 'logged_out',
            });
          } else if (shouldReconnect && this.retryCount < this.maxRetries) {
            this.retryCount++;
            this.isInitializing = false; // Allow retry to call initialize
            const delay = Math.min(3000 * Math.pow(2, this.retryCount - 1), 30000);
            this.logger.log(`Reconnecting (attempt ${this.retryCount}/${this.maxRetries}) in ${delay / 1000}s...`);
            setTimeout(() => {
              void this.initialize(organizationId, companyId);
            }, delay);
          } else {
            // Max retries reached — keep auth files so user can retry manually
            this.isConnected = false;
            this.isInitializing = false;
            this.logger.error(`Max retries (${this.maxRetries}) reached. Session marked FAILED (auth preserved).`);
            await this.prisma.whatsAppSession.update({
              where: { id: this.sessionId! },
              data: { status: 'FAILED' },
            });
          }
        } else if (connection === 'open') {
          this.isConnected = true;
          this.currentQrCode = null;
          this.retryCount = 0;
          // Clear connection timeout — we made it
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          this.logger.log('WhatsApp connected successfully!');

          const phoneNumber = this.sock?.user?.id?.split(':')[0] || null;

          await this.prisma.whatsAppSession.update({
            where: { id: this.sessionId! },
            data: {
              status: 'CONNECTED',
              isActive: true,
              phoneNumber,
              lastConnected: new Date(),
              qrCode: null,
            },
          });

          this.eventEmitter.emit('whatsapp.connected', {
            organizationId,
            companyId,
            phoneNumber,
          });
        }
      });

      // Save credentials on update
      this.sock.ev.on('creds.update', saveCreds);

      // Handle incoming messages
      this.sock.ev.on('messages.upsert', async (m) => {
        await this.handleIncomingMessages(m);
      });

      // Set connection timeout — if not connected within 60s, mark as failed
      this.connectionTimeout = setTimeout(async () => {
        if (!this.isConnected) {
          this.logger.warn(`Connection timeout (${WhatsAppService.CONNECTION_TIMEOUT_MS / 1000}s) — marking session as FAILED`);
          if (this.sock) {
            try { this.sock.end(undefined); } catch {} // eslint-disable-line no-empty
            this.sock = null;
          }
          this.retryCount = this.maxRetries; // Prevent auto-reconnect
          if (this.sessionId) {
            await this.prisma.whatsAppSession.update({
              where: { id: this.sessionId },
              data: { status: 'FAILED' },
            }).catch(() => {});
          }
          this.isInitializing = false;
        }
      }, WhatsAppService.CONNECTION_TIMEOUT_MS);

      this.isInitializing = false;
      return { qrCode: this.currentQrCode || undefined };
    } catch (error) {
      this.logger.error('Error initializing WhatsApp', error);
      this.isInitializing = false;
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      if (this.sessionId) {
        await this.prisma.whatsAppSession.update({
          where: { id: this.sessionId },
          data: { status: 'FAILED' },
        });
      }
      throw error;
    }
  }

  /**
   * Disconnect: close the socket but KEEP auth files.
   * The session can be reconnected later without scanning QR again.
   */
  async disconnect(organizationId: number, companyId: number): Promise<void> {
    if (this.sock && this.organizationId === organizationId && this.companyId === companyId) {
      try { this.sock.end(undefined); } catch {} // eslint-disable-line no-empty
      this.sock = null;
      this.isConnected = false;
      this.currentQrCode = null;
      this.isInitializing = false;
      this.retryCount = this.maxRetries; // Prevent auto-reconnect
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      this.logger.log('WhatsApp disconnected (auth preserved)');
    }

    const session = await this.prisma.whatsAppSession.findFirst({
      where: { organizationId, companyId },
    });

    if (session) {
      await this.prisma.whatsAppSession.update({
        where: { id: session.id },
        data: { status: 'DISCONNECTED', qrCode: null },
      });
    }

    this.eventEmitter.emit('whatsapp.disconnected', {
      organizationId,
      companyId,
      reason: 'user_disconnect',
    });
  }

  /**
   * Logout: full unpair from WhatsApp + delete auth files.
   * The user will need to scan QR again to reconnect.
   */
  async logout(organizationId: number, companyId: number): Promise<void> {
    if (this.sock && this.organizationId === organizationId && this.companyId === companyId) {
      try { await this.sock.logout(); } catch {} // eslint-disable-line no-empty
      this.sock = null;
      this.isConnected = false;
      this.currentQrCode = null;
      this.isInitializing = false;
      this.retryCount = 0;
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      this.logger.log('WhatsApp logged out (device unlinked)');
    }

    // Delete auth files — forces new QR on next connect
    const authDir = path.join(this.authPath, `session_${organizationId}_${companyId}`);
    await fs.rm(authDir, { recursive: true, force: true }).catch(() => {});

    const session = await this.prisma.whatsAppSession.findFirst({
      where: { organizationId, companyId },
    });

    if (session) {
      await this.prisma.whatsAppSession.update({
        where: { id: session.id },
        data: {
          status: 'DISCONNECTED',
          phoneNumber: null,
          qrCode: null,
          isActive: false,
        },
      });
    }

    this.eventEmitter.emit('whatsapp.disconnected', {
      organizationId,
      companyId,
      reason: 'user_logout',
    });
  }

  /**
   * Check if auth files exist for a session (can reconnect without QR)
   */
  async hasAuthFiles(organizationId: number, companyId: number): Promise<boolean> {
    const authDir = path.join(this.authPath, `session_${organizationId}_${companyId}`);
    return fs.access(authDir).then(() => true).catch(() => false);
  }

  // ── Rate Limiting Helpers ───────────────────────────────────────────────

  /**
   * Normalize phone number for consistent rate tracking.
   * Strips @s.whatsapp.net and non-digit chars.
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/@.*/, '').replace(/\D/g, '');
  }

  /**
   * Enforce rate limits before sending any message.
   * Throws BadRequestException if limits are exceeded.
   * Adds delays as needed to stay within WhatsApp's tolerance.
   */
  private async enforceRateLimit(phone: string): Promise<void> {
    const LIMITS = WhatsAppService.RATE_LIMIT;
    const rl = this.getRL();
    const normalized = this.normalizePhone(phone);
    const now = Date.now();

    // 1. Circuit breaker — if tripped, reject until cooldown expires
    if (rl.circuitBreakerUntil > now) {
      const remainSec = Math.ceil((rl.circuitBreakerUntil - now) / 1000);
      throw new BadRequestException(
        `WhatsApp envio pausado temporalmente por errores consecutivos. Reintenta en ${remainSec}s.`,
      );
    }

    // 2. Daily unique contacts limit
    const today = new Date().toDateString();
    if (today !== rl.dailyResetDate) {
      rl.dailyUniqueContacts.clear();
      rl.dailyResetDate = today;
    }
    if (!rl.dailyUniqueContacts.has(normalized) && rl.dailyUniqueContacts.size >= LIMITS.MAX_UNIQUE_CONTACTS_PER_DAY) {
      throw new BadRequestException(
        `Limite diario alcanzado (${LIMITS.MAX_UNIQUE_CONTACTS_PER_DAY} contactos unicos). Reintenta manana.`,
      );
    }

    // 3. Per-minute window
    if (now - rl.minuteWindowStart > 60_000) {
      rl.minuteMessageCount = 0;
      rl.minuteWindowStart = now;
    }
    if (rl.minuteMessageCount >= LIMITS.MAX_MSGS_PER_MINUTE) {
      const waitMs = 60_000 - (now - rl.minuteWindowStart);
      this.logger.warn(`Rate limit: ${LIMITS.MAX_MSGS_PER_MINUTE} msgs/min reached, waiting ${Math.ceil(waitMs / 1000)}s`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      rl.minuteMessageCount = 0;
      rl.minuteWindowStart = Date.now();
    }

    // 4. Per-contact cooldown
    const lastContactMsg = rl.lastMessagePerContact.get(normalized) || 0;
    const contactElapsed = now - lastContactMsg;
    if (contactElapsed < LIMITS.MIN_DELAY_PER_CONTACT_MS) {
      const waitMs = LIMITS.MIN_DELAY_PER_CONTACT_MS - contactElapsed;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    // 5. Global inter-message delay
    const globalElapsed = Date.now() - rl.lastMessageTimestamp;
    if (globalElapsed < LIMITS.MIN_DELAY_BETWEEN_MSGS_MS) {
      const waitMs = LIMITS.MIN_DELAY_BETWEEN_MSGS_MS - globalElapsed;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  /**
   * Record a successful send (updates rate tracking state).
   */
  private recordSendSuccess(phone: string): void {
    const rl = this.getRL();
    const normalized = this.normalizePhone(phone);
    const now = Date.now();
    rl.lastMessageTimestamp = now;
    rl.lastMessagePerContact.set(normalized, now);
    rl.dailyUniqueContacts.add(normalized);
    rl.minuteMessageCount++;
    rl.consecutiveFailures = 0; // Reset circuit breaker counter

    // Housekeep: clean old per-contact entries every 100 messages
    if (rl.minuteMessageCount % 100 === 0) {
      const staleThreshold = now - 3_600_000; // 1 hour
      for (const [key, ts] of rl.lastMessagePerContact) {
        if (ts < staleThreshold) rl.lastMessagePerContact.delete(key);
      }
    }
  }

  /**
   * Record a failed send. Trips circuit breaker after N consecutive failures.
   */
  private recordSendFailure(): void {
    const LIMITS = WhatsAppService.RATE_LIMIT;
    const rl = this.getRL();
    rl.consecutiveFailures++;
    if (rl.consecutiveFailures >= LIMITS.CIRCUIT_BREAKER_THRESHOLD) {
      rl.circuitBreakerUntil = Date.now() + LIMITS.CIRCUIT_BREAKER_COOLDOWN_MS;
      this.logger.error(
        `Circuit breaker TRIPPED: ${rl.consecutiveFailures} consecutive failures. ` +
        `Pausing sends for ${LIMITS.CIRCUIT_BREAKER_COOLDOWN_MS / 1000}s.`,
      );
    }
  }

  /**
   * Get current rate limiter stats (for monitoring/debugging).
   */
  getRateLimitStats(): {
    dailyUniqueContacts: number;
    minuteMessageCount: number;
    consecutiveFailures: number;
    circuitBreakerActive: boolean;
    circuitBreakerRemainingMs: number;
  } {
    const rl = this.getRL();
    const now = Date.now();
    return {
      dailyUniqueContacts: rl.dailyUniqueContacts.size,
      minuteMessageCount: rl.minuteMessageCount,
      consecutiveFailures: rl.consecutiveFailures,
      circuitBreakerActive: rl.circuitBreakerUntil > now,
      circuitBreakerRemainingMs: Math.max(0, rl.circuitBreakerUntil - now),
    };
  }

  // ── Message Sending ───────────────────────────────────────────────────

  async sendMessage(
    organizationId: number,
    companyId: number,
    dto: SendMessageDto,
  ): Promise<any> {
    if (!this.isConnected || !this.sock) {
      throw new BadRequestException('WhatsApp is not connected. Please scan QR code first.');
    }

    if (this.organizationId !== organizationId || this.companyId !== companyId) {
      throw new BadRequestException('Session mismatch. Please initialize connection for this organization.');
    }

    // Enforce rate limits (may wait or throw)
    await this.enforceRateLimit(dto.to);

    try {
      // Format phone number to JID
      const jid = dto.to.includes('@') ? dto.to : `${dto.to}@s.whatsapp.net`;

      // Send message
      const sent = await this.sock.sendMessage(jid, {
        text: dto.content,
      });

      // Save to database
      const session = await this.prisma.whatsAppSession.findFirst({
        where: { organizationId, companyId },
      });

      if (session) {
        await this.prisma.whatsAppMessage.create({
          data: {
            sessionId: session.id,
            organizationId,
            companyId,
            remoteJid: jid,
            messageType: dto.messageType || 'TEXT',
            content: dto.content,
            isFromMe: true,
            status: 'SENT',
            sentAt: new Date(),
            clientId: dto.clientId,
            salesId: dto.salesId,
            invoiceId: dto.invoiceId,
          },
        });
      }

      this.recordSendSuccess(dto.to);
      this.logger.log(`Message sent to ${dto.to}`);

      return {
        success: true,
        messageId: sent?.key?.id,
        timestamp: new Date(),
      };
    } catch (error) {
      this.recordSendFailure();
      this.logger.error(`Error sending message to ${dto.to}`, error);

      // Save failed message
      const session = await this.prisma.whatsAppSession.findFirst({
        where: { organizationId, companyId },
      });

      if (session) {
        await this.prisma.whatsAppMessage.create({
          data: {
            sessionId: session.id,
            organizationId,
            companyId,
            remoteJid: dto.to,
            messageType: dto.messageType || 'TEXT',
            content: dto.content,
            isFromMe: true,
            status: 'FAILED',
            errorMessage: (error as Error).message,
          },
        });
      }

      throw error;
    }
  }

  /**
   * Send a document (PDF) via WhatsApp with an optional caption.
   */
  async sendDocument(
    organizationId: number,
    companyId: number,
    params: {
      to: string;
      document: Buffer;
      fileName: string;
      caption?: string;
      mimetype?: string;
      clientId?: number;
      salesId?: number;
      invoiceId?: number;
    },
  ): Promise<any> {
    if (!this.isConnected || !this.sock) {
      throw new BadRequestException('WhatsApp is not connected.');
    }

    if (this.organizationId !== organizationId || this.companyId !== companyId) {
      throw new BadRequestException('Session mismatch.');
    }

    // File size check — WhatsApp allows up to ~100MB but we cap at 16MB
    // to avoid slow uploads and timeouts with Baileys
    const MAX_DOC_SIZE = 16 * 1024 * 1024; // 16MB
    if (params.document.length > MAX_DOC_SIZE) {
      throw new BadRequestException(
        `El documento excede el limite de ${MAX_DOC_SIZE / 1024 / 1024}MB`,
      );
    }

    // Enforce rate limits (may wait or throw)
    await this.enforceRateLimit(params.to);

    const jid = params.to.includes('@') ? params.to : `${params.to}@s.whatsapp.net`;

    try {
      const sent = await this.sock.sendMessage(jid, {
        document: params.document,
        mimetype: params.mimetype || 'application/pdf',
        fileName: params.fileName,
        caption: params.caption,
      });

      // Save to database
      const session = await this.prisma.whatsAppSession.findFirst({
        where: { organizationId, companyId },
      });

      if (session) {
        await this.prisma.whatsAppMessage.create({
          data: {
            sessionId: session.id,
            organizationId,
            companyId,
            remoteJid: jid,
            messageType: 'DOCUMENT',
            content: params.caption || `[Documento: ${params.fileName}]`,
            isFromMe: true,
            status: 'SENT',
            sentAt: new Date(),
            clientId: params.clientId,
            salesId: params.salesId,
            invoiceId: params.invoiceId,
          },
        });
      }

      this.recordSendSuccess(params.to);
      this.logger.log(`Document "${params.fileName}" sent to ${params.to}`);
      return { success: true, messageId: sent?.key?.id, timestamp: new Date() };
    } catch (error) {
      this.recordSendFailure();
      this.logger.error(`Error sending document to ${params.to}`, error);
      throw error;
    }
  }

  async sendTemplateMessage(
    organizationId: number,
    companyId: number,
    dto: SendTemplateDto,
  ): Promise<any> {
    // Get template
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: {
        organizationId,
        companyId,
        name: dto.templateName,
        isActive: true,
      },
    });

    if (!template) {
      throw new BadRequestException(`Template "${dto.templateName}" not found`);
    }

    // Render template
    const content = this.renderTemplate(template.content, dto.variables || {});

    // Send as regular message
    return this.sendMessage(organizationId, companyId, {
      to: dto.to,
      content,
      messageType: 'TEMPLATE' as any,
      clientId: dto.clientId,
      salesId: dto.salesId,
    });
  }

  renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(variables[key] || ''));
    });
    return rendered;
  }

  // Message types that are internal WhatsApp signals, not real messages
  private static readonly IGNORED_MESSAGE_TYPES = new Set([
    'protocolMessage',
    'senderKeyDistributionMessage',
    'messageContextInfo',
    'reactionMessage',
    'ephemeralMessage',
    'keepInChatMessage',
    'peerDataOperationRequestResponseMessage',
  ]);

  private async handleIncomingMessages(m: any) {
    try {
      for (const msg of m.messages) {
        if (msg.key.fromMe) continue;
        if (!msg.message) continue;

        const remoteJid = msg.key.remoteJid;

        // Skip group chats — only process 1-to-1 conversations.
        // Responding to groups automatically is a high ban risk.
        if (remoteJid?.endsWith('@g.us') || remoteJid?.includes('-')) continue;

        // Skip status/broadcast messages
        if (remoteJid === 'status@broadcast') continue;

        // Find the real message type by skipping wrapper/metadata keys.
        // Baileys may place `messageContextInfo` before `conversation` in the object,
        // so relying on Object.keys()[0] alone can misclassify real text messages.
        const messageKeys = Object.keys(msg.message);
        const messageType = messageKeys.find(
          (k) => !WhatsAppService.IGNORED_MESSAGE_TYPES.has(k),
        );

        // Skip if the message only contained protocol/internal keys
        if (!messageType) continue;

        let content = '';
        let dbMessageType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'VIDEO' = 'TEXT';

        if (messageType === 'conversation') {
          content = msg.message.conversation;
        } else if (messageType === 'extendedTextMessage') {
          content = msg.message.extendedTextMessage.text;
        } else if (messageType === 'imageMessage') {
          content = msg.message.imageMessage?.caption || '[Imagen]';
          dbMessageType = 'IMAGE';
        } else if (messageType === 'videoMessage') {
          content = msg.message.videoMessage?.caption || '[Video]';
          dbMessageType = 'VIDEO';
        } else if (messageType === 'audioMessage') {
          content = '[Audio]';
          dbMessageType = 'AUDIO';
        } else if (messageType === 'documentMessage') {
          content = msg.message.documentMessage?.fileName || '[Documento]';
          dbMessageType = 'DOCUMENT';
        } else if (messageType === 'contactMessage') {
          content = `[Contacto: ${msg.message.contactMessage?.displayName || ''}]`;
        } else if (messageType === 'locationMessage') {
          content = '[Ubicación]';
        } else if (messageType === 'stickerMessage') {
          content = '[Sticker]';
        } else {
          content = `[${messageType}]`;
        }

        this.logger.log(`Received message from ${remoteJid}: ${content}`);

        const session = await this.prisma.whatsAppSession.findFirst({
          where: {
            organizationId: this.organizationId!,
            companyId: this.companyId!,
          },
        });

        if (session) {
          await this.prisma.whatsAppMessage.create({
            data: {
              sessionId: session.id,
              organizationId: this.organizationId!,
              companyId: this.companyId!,
              remoteJid,
              messageType: dbMessageType,
              content,
              isFromMe: false,
              status: 'READ',
            },
          });

          this.eventEmitter.emit('whatsapp.message.received', {
            organizationId: this.organizationId,
            companyId: this.companyId,
            from: remoteJid,
            content,
            messageType: dbMessageType,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error handling incoming messages', error);
    }
  }

  async getConnectionStatus(organizationId: number, companyId: number): Promise<{
    isConnected: boolean;
    qrCode: string | null;
    phoneNumber: string | null;
    hasAuth: boolean;
  }> {
    const isCurrentSession =
      this.organizationId === organizationId && this.companyId === companyId;
    const hasAuth = await this.hasAuthFiles(organizationId, companyId);

    return {
      isConnected: isCurrentSession && this.isConnected,
      qrCode: isCurrentSession ? this.currentQrCode : null,
      phoneNumber: this.sock?.user?.id?.split(':')[0] || null,
      hasAuth,
    };
  }

  async getSession(organizationId: number, companyId: number) {
    return this.prisma.whatsAppSession.findFirst({
      where: { organizationId, companyId },
    });
  }

  async getMessages(
    organizationId: number,
    companyId: number,
    filters?: {
      clientId?: number;
      salesId?: number;
      limit?: number;
    },
  ) {
    return this.prisma.whatsAppMessage.findMany({
      where: {
        organizationId,
        companyId,
        clientId: filters?.clientId,
        salesId: filters?.salesId,
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      include: {
        client: true,
        sale: true,
      },
    });
  }
}
