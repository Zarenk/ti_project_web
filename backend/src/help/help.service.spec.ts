/**
 * Tests de Integración - Help Learning Service
 *
 * Cobertura:
 * - Registro de sesiones de aprendizaje
 * - Generación de insights
 * - Análisis de patrones
 * - Sistema de votos y auto-aprobación
 */

import { Test, TestingModule } from '@nestjs/testing'
import { HelpService } from './help.service'
import { PrismaService } from '../prisma/prisma.service'
import { HelpEmbeddingService } from './help-embedding.service'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'

describe('HelpService - Learning System Integration', () => {
  let service: HelpService
  let prisma: PrismaService

  // Mock data
  const mockUserId = 1
  const mockAdminId = 2

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HelpService,
        {
          provide: PrismaService,
          useValue: {
            helpLearningSession: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              groupBy: jest.fn(),
            },
            helpKBCandidate: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            helpSynonymRule: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: HelpEmbeddingService,
          useValue: {
            onCandidateApproved: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-value'),
          },
        },
      ],
    }).compile()

    service = module.get<HelpService>(HelpService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // ==================== RECORD LEARNING SESSION ====================

  describe('recordLearningSession', () => {
    it('should create a new learning session', async () => {
      const session = {
        query: '¿Cómo hago una venta?',
        normalizedQuery: 'como hago una venta',
        matchFound: true,
        matchScore: 0.85,
        matchedEntryId: 'faq-123',
        userFeedback: 'POSITIVE' as const,
        section: 'sales',
        userId: mockUserId,
        timestamp: Date.now(),
      }

      jest.spyOn(prisma.helpLearningSession, 'create').mockResolvedValue({
        id: 1,
        userId: mockUserId,
        query: session.query,
        queryNorm: session.normalizedQuery,
        section: session.section,
        matchFound: true,
        matchedFaqId: 'faq-123',
        confidence: 0.85,
        wasHelpful: true,
        timestamp: new Date(),
        source: 'static',
        responseTimeMs: 45,
        isMetaQuestion: false,
        isInvalidQuery: false,
        hasSteps: false,
        userType: null,
        urgency: null,
        isContextual: false,
      })

      await service.recordLearningSession(session)

      expect(prisma.helpLearningSession.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          query: session.query,
          queryNorm: session.normalizedQuery,
          section: session.section,
          matchFound: true,
          matchedFaqId: 'faq-123',
          confidence: 0.85,
          wasHelpful: true,
          timestamp: expect.any(Date),
          // 🆕 Enhanced fields
          source: undefined,
          responseTimeMs: undefined,
          isMetaQuestion: false,
          isInvalidQuery: false,
          hasSteps: false,
          userType: undefined,
          urgency: undefined,
          isContextual: false,
        },
      })
    })

    it('should handle session without feedback', async () => {
      const session = {
        query: 'test',
        normalizedQuery: 'test',
        matchFound: false,
        section: 'general',
        userId: mockUserId,
        timestamp: Date.now(),
      }

      jest.spyOn(prisma.helpLearningSession, 'create').mockResolvedValue({
        id: 2,
        userId: mockUserId,
        query: 'test',
        queryNorm: 'test',
        section: 'general',
        matchFound: false,
        matchedFaqId: null,
        confidence: null,
        wasHelpful: null,
        timestamp: new Date(),
        source: null,
        responseTimeMs: null,
        isMetaQuestion: false,
        isInvalidQuery: false,
        hasSteps: false,
        userType: null,
        urgency: null,
        isContextual: false,
      })

      await service.recordLearningSession(session)

      expect(prisma.helpLearningSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          wasHelpful: null, // Sin feedback
        }),
      })
    })

    it('should handle negative feedback', async () => {
      const session = {
        query: 'test',
        normalizedQuery: 'test',
        matchFound: true,
        userFeedback: 'NEGATIVE' as const,
        section: 'sales',
        userId: mockUserId,
        timestamp: Date.now(),
      }

      jest.spyOn(prisma.helpLearningSession, 'create').mockResolvedValue({
        id: 3,
        userId: mockUserId,
        query: 'test',
        queryNorm: 'test',
        section: 'sales',
        matchFound: true,
        matchedFaqId: null,
        confidence: null,
        wasHelpful: false,
        timestamp: new Date(),
        source: null,
        responseTimeMs: null,
        isMetaQuestion: false,
        isInvalidQuery: false,
        hasSteps: false,
        userType: null,
        urgency: null,
        isContextual: false,
      })

      await service.recordLearningSession(session)

      expect(prisma.helpLearningSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          wasHelpful: false,
        }),
      })
    })
  })

  // ==================== GET LEARNING SESSIONS ====================

  describe('getLearningSessions', () => {
    it('should retrieve sessions with default limit', async () => {
      const mockSessions = [
        {
          id: 1,
          userId: 1,
          query: 'test',
          queryNorm: 'test',
          section: 'sales',
          matchFound: true,
          matchedFaqId: 'faq-1',
          confidence: 0.8,
          wasHelpful: true,
          timestamp: new Date(),
          source: 'static',
          responseTimeMs: 45,
          isMetaQuestion: false,
          isInvalidQuery: false,
          hasSteps: false,
          userType: null,
          urgency: null,
          isContextual: false,
        },
      ]

      jest.spyOn(prisma.helpLearningSession, 'findMany').mockResolvedValue(mockSessions)

      const result = await service.getLearningSessions()

      expect(result).toEqual(mockSessions)
      expect(prisma.helpLearningSession.findMany).toHaveBeenCalledWith({
        take: 500,
        orderBy: { timestamp: 'desc' },
        select: expect.any(Object),
      })
    })

    it('should respect custom limit', async () => {
      jest.spyOn(prisma.helpLearningSession, 'findMany').mockResolvedValue([])

      await service.getLearningSessions(100)

      expect(prisma.helpLearningSession.findMany).toHaveBeenCalledWith({
        take: 100,
        orderBy: { timestamp: 'desc' },
        select: expect.any(Object),
      })
    })
  })

  // ==================== GENERATE LEARNING INSIGHTS ====================

  describe('generateLearningInsights', () => {
    it('should calculate insights correctly', async () => {
      // Mock counts
      jest.spyOn(prisma.helpLearningSession, 'count')
        .mockResolvedValueOnce(1000) // Total sessions
        .mockResolvedValueOnce(120) // Failed sessions

      // Mock groupBy for top failed queries
      jest.spyOn(prisma.helpLearningSession, 'groupBy').mockResolvedValue([
        { queryNorm: 'como anular factura', _count: { id: 23 } } as any,
        { queryNorm: 'exportar contabilidad', _count: { id: 18 } } as any,
      ])

      // Mock candidate counts
      jest.spyOn(prisma.helpKBCandidate, 'count')
        .mockResolvedValueOnce(15) // Approved
        .mockResolvedValueOnce(8) // Pending
        .mockResolvedValueOnce(4) // Learning velocity (24h)

      const insights = await service.generateLearningInsights()

      expect(insights).toEqual({
        totalSessions: 1000,
        failureRate: 0.12, // 120/1000
        topFailedQueries: [
          { query: 'como anular factura', count: 23 },
          { query: 'exportar contabilidad', count: 18 },
        ],
        suggestedImprovements: 8,
        autoApprovedCount: 15,
        pendingReviewCount: 8,
        learningVelocity: 4,
      })
    })

    it('should handle zero sessions gracefully', async () => {
      jest.spyOn(prisma.helpLearningSession, 'count').mockResolvedValue(0)
      jest.spyOn(prisma.helpLearningSession, 'groupBy').mockResolvedValue([])
      jest.spyOn(prisma.helpKBCandidate, 'count').mockResolvedValue(0)

      const insights = await service.generateLearningInsights()

      expect(insights.totalSessions).toBe(0)
      expect(insights.failureRate).toBe(0)
      expect(insights.topFailedQueries).toEqual([])
    })
  })

  // ==================== ANALYZE PATTERNS ====================

  describe('analyzePatterns', () => {
    it('should identify frequent failed queries', async () => {
      const failedSessions = [
        { id: 1, queryNorm: 'como anular factura', matchFound: false, timestamp: new Date() },
        { id: 2, queryNorm: 'como anular factura', matchFound: false, timestamp: new Date() },
        { id: 3, queryNorm: 'como anular factura', matchFound: false, timestamp: new Date() },
        { id: 4, queryNorm: 'exportar datos', matchFound: false, timestamp: new Date() },
      ]

      jest.spyOn(prisma.helpLearningSession, 'findMany').mockResolvedValue(failedSessions as any)
      jest.spyOn(prisma.helpKBCandidate, 'findFirst').mockResolvedValue(null)

      await service.analyzePatterns()

      // Verificar que se llamó findFirst para verificar duplicados
      expect(prisma.helpKBCandidate.findFirst).toHaveBeenCalled()
    })

    it('should skip existing candidates', async () => {
      const failedSessions = [
        { id: 1, queryNorm: 'query existente', matchFound: false, timestamp: new Date() },
        { id: 2, queryNorm: 'query existente', matchFound: false, timestamp: new Date() },
        { id: 3, queryNorm: 'query existente', matchFound: false, timestamp: new Date() },
      ]

      jest.spyOn(prisma.helpLearningSession, 'findMany').mockResolvedValue(failedSessions as any)
      jest.spyOn(prisma.helpKBCandidate, 'findFirst').mockResolvedValue({
        id: 1,
        questionNorm: 'query existente',
      } as any)

      await service.analyzePatterns()

      // No debería crear nuevos candidatos para queries existentes
      expect(prisma.helpKBCandidate.findFirst).toHaveBeenCalled()
    })
  })

  // ==================== PROMOTE ANSWER (VOTING SYSTEM) ====================

  describe('promoteAnswer', () => {
    it('should increment positive votes', async () => {
      const mockCandidate = {
        id: 1,
        question: 'test',
        questionNorm: 'test',
        answer: 'test answer',
        section: 'sales',
        positiveVotes: 2,
        negativeVotes: 0,
        status: 'PENDING' as any,
        approvedById: null,
        createdAt: new Date(),
        reviewedAt: null,
      }

      jest.spyOn(prisma.helpKBCandidate, 'findUnique').mockResolvedValue(mockCandidate as any)
      jest.spyOn(prisma.helpKBCandidate, 'update').mockResolvedValue({
        ...mockCandidate,
        positiveVotes: 3,
      } as any)

      await service.promoteAnswer('1', 'test answer', 'POSITIVE', mockUserId)

      expect(prisma.helpKBCandidate.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          positiveVotes: { increment: 1 },
          negativeVotes: undefined,
        },
      })
    })

    it('should auto-approve after 5 positive votes', async () => {
      const mockCandidate = {
        id: 1,
        question: 'test',
        questionNorm: 'test',
        answer: 'test answer',
        section: 'sales',
        positiveVotes: 4, // Ya tiene 4, uno más llegará a 5
        negativeVotes: 0,
        status: 'PENDING' as any,
        approvedById: null,
        createdAt: new Date(),
        reviewedAt: null,
      }

      jest.spyOn(prisma.helpKBCandidate, 'findUnique').mockResolvedValue(mockCandidate as any)
      jest.spyOn(prisma.helpKBCandidate, 'update')
        .mockResolvedValueOnce({ ...mockCandidate, positiveVotes: 5 } as any) // Primer update (votos)
        .mockResolvedValueOnce({ ...mockCandidate, status: 'APPROVED' } as any) // Segundo update (aprobación)

      await service.promoteAnswer('1', 'test answer', 'POSITIVE', mockUserId)

      // Debe haber 2 updates: uno para votos, otro para aprobación
      expect(prisma.helpKBCandidate.update).toHaveBeenCalledTimes(2)
    })

    it('should handle invalid candidate ID', async () => {
      await service.promoteAnswer('invalid', 'test', 'POSITIVE', mockUserId)

      // No debería lanzar error, solo warn
      expect(prisma.helpKBCandidate.findUnique).not.toHaveBeenCalled()
    })

    it('should handle non-existent candidate', async () => {
      jest.spyOn(prisma.helpKBCandidate, 'findUnique').mockResolvedValue(null)

      await service.promoteAnswer('999', 'test', 'POSITIVE', mockUserId)

      // No debería intentar actualizar
      expect(prisma.helpKBCandidate.update).not.toHaveBeenCalled()
    })
  })

  // ==================== GET LEARNING SUGGESTIONS ====================

  describe('getLearningSuggestions', () => {
    it('should return pending candidates and learned synonyms', async () => {
      const mockCandidates = [
        {
          id: 1,
          question: 'test',
          questionNorm: 'test',
          answer: 'test answer',
          section: 'sales',
          positiveVotes: 0,
          negativeVotes: 0,
          createdAt: new Date(),
        },
      ]

      const mockSynonyms = [
        {
          id: 1,
          canonical: 'factura',
          synonym: 'comprobante',
          section: 'sales',
          confidence: 0.9,
          autoLearned: true,
          createdAt: new Date(),
        },
      ]

      jest.spyOn(prisma.helpKBCandidate, 'findMany').mockResolvedValue(mockCandidates as any)
      jest.spyOn(prisma.helpSynonymRule, 'findMany').mockResolvedValue(mockSynonyms as any)

      const result = await service.getLearningSuggestions()

      expect(result).toEqual({
        suggestedAliases: mockSynonyms,
        suggestedEntries: mockCandidates,
      })
    })
  })

  // ==================== EXPORT LEARNING DATA ====================

  describe('exportLearningData', () => {
    it('should export all learning data', async () => {
      const mockData = {
        sessions: [{ id: 1 }],
        synonymRules: [{ id: 1 }],
        candidates: [
          { id: 1, status: 'PENDING' },
          { id: 2, status: 'APPROVED' },
        ],
      }

      jest.spyOn(prisma.helpLearningSession, 'findMany').mockResolvedValue(mockData.sessions as any)
      jest.spyOn(prisma.helpSynonymRule, 'findMany').mockResolvedValue(mockData.synonymRules as any)
      jest.spyOn(prisma.helpKBCandidate, 'findMany').mockResolvedValue(mockData.candidates as any)

      const result = await service.exportLearningData()

      expect(result).toEqual({
        sessions: mockData.sessions,
        suggestedAliases: mockData.synonymRules,
        suggestedEntries: [{ id: 1, status: 'PENDING' }],
        promotedAnswers: [{ id: 2, status: 'APPROVED' }],
        exportedAt: expect.any(String),
      })
    })
  })

  // ==================== GET PROMOTED ANSWERS ====================

  describe('getPromotedAnswers', () => {
    it('should return approved candidates with high confidence', async () => {
      const mockPromoted = [
        {
          id: 1,
          question: 'test',
          questionNorm: 'test',
          answer: 'test answer',
          section: 'sales',
          positiveVotes: 5,
          negativeVotes: 0,
          createdAt: new Date(),
          reviewedAt: new Date(),
        },
      ]

      jest.spyOn(prisma.helpKBCandidate, 'findMany').mockResolvedValue(mockPromoted as any)

      const result = await service.getPromotedAnswers()

      expect(result).toEqual(mockPromoted)
      expect(prisma.helpKBCandidate.findMany).toHaveBeenCalledWith({
        where: {
          status: 'APPROVED',
          positiveVotes: { gte: 3 },
        },
        orderBy: { positiveVotes: 'desc' },
        take: 100,
        select: expect.any(Object),
      })
    })
  })
})
