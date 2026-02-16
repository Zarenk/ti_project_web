/**
 * Tests E2E - Help Learning Admin Dashboard
 *
 * Cobertura:
 * - Dashboard de insights
 * - Revisión de candidatos
 * - Aprobación/rechazo de sugerencias
 * - Export de datos
 */

describe('Help Learning Admin Dashboard', () => {
  beforeEach(() => {
    // Login como SUPER_ADMIN_GLOBAL
    cy.login('admin@test.com', 'password') // Custom command
    cy.visit('/dashboard/users')
  })

  describe('Navigation', () => {
    it('should display learning tab for super admin', () => {
      cy.get('[data-testid="learning-tab"]')
        .or('button:contains("🧠 Auto-Aprendizaje")')
        .should('exist')
        .and('be.visible')
    })

    it('should switch to learning tab', () => {
      cy.get('button').contains('🧠 Auto-Aprendizaje').click()
      cy.url().should('include', '/dashboard/users')
      cy.get('[data-testid="learning-dashboard"]').should('be.visible')
    })

    it('should not show learning tab for regular users', () => {
      cy.logout()
      cy.login('user@test.com', 'password')
      cy.visit('/dashboard/users')

      cy.get('button:contains("🧠 Auto-Aprendizaje")').should('not.exist')
    })
  })

  describe('Learning Insights Dashboard', () => {
    beforeEach(() => {
      cy.get('button').contains('🧠 Auto-Aprendizaje').click()
    })

    it('should display total sessions metric', () => {
      cy.get('[data-testid="total-sessions"]')
        .or('[data-testid="insight-total-sessions"]')
        .should('exist')
        .invoke('text')
        .should('match', /\d+/)
    })

    it('should display failure rate metric', () => {
      cy.get('[data-testid="failure-rate"]')
        .or('[data-testid="insight-failure-rate"]')
        .should('exist')
        .invoke('text')
        .should('match', /\d+(\.\d+)?%/)
    })

    it('should display learning velocity', () => {
      cy.get('[data-testid="learning-velocity"]')
        .or('[data-testid="insight-learning-velocity"]')
        .should('exist')
    })

    it('should display top failed queries', () => {
      cy.get('[data-testid="top-failed-queries"]')
        .or('[data-testid="failed-queries-list"]')
        .should('exist')
    })

    it('should show pending review count', () => {
      cy.get('[data-testid="pending-review-count"]')
        .or('[data-testid="insight-pending-review"]')
        .should('exist')
    })

    it('should refresh insights on button click', () => {
      cy.intercept('GET', '**/help/learning/insights').as('getInsights')

      cy.get('button').contains(/actualizar|refresh/i).click()

      cy.wait('@getInsights')
      cy.get('[data-testid="total-sessions"]').should('exist')
    })
  })

  describe('Candidates Tab', () => {
    beforeEach(() => {
      cy.get('button').contains('🧠 Auto-Aprendizaje').click()
      cy.get('[data-testid="candidates-tab"]')
        .or('button:contains("Candidatos")')
        .click()
    })

    it('should display list of pending candidates', () => {
      cy.get('[data-testid="candidates-list"]')
        .or('[data-testid="pending-candidates"]')
        .should('exist')
    })

    it('should show candidate question and answer', () => {
      cy.get('[data-testid^="candidate-"]').first().within(() => {
        cy.get('[data-testid="candidate-question"]').should('exist')
        cy.get('[data-testid="candidate-answer"]').should('exist')
      })
    })

    it('should approve a candidate successfully', () => {
      cy.intercept('POST', '**/help/learning/entry/approve').as('approveEntry')

      cy.get('[data-testid^="candidate-"]').first().within(() => {
        cy.get('[data-testid="approve-btn"]')
          .or('button:contains("Aprobar")')
          .click()
      })

      cy.wait('@approveEntry')
      cy.get('[data-testid="toast"]')
        .or('.toast')
        .should('contain', /aprobad/i)
    })

    it('should reject a candidate', () => {
      cy.intercept('POST', '**/help/learning/entry/*/reject').as('rejectEntry')

      cy.get('[data-testid^="candidate-"]').first().within(() => {
        cy.get('[data-testid="reject-btn"]')
          .or('button:contains("Rechazar")')
          .click()
      })

      // Confirmar rechazo
      cy.get('button:contains("Confirmar")').click()

      cy.wait('@rejectEntry')
      cy.get('[data-testid="toast"]').should('contain', /rechazad/i)
    })

    it('should display candidate votes', () => {
      cy.get('[data-testid^="candidate-"]').first().within(() => {
        cy.get('[data-testid="positive-votes"]').should('exist')
        cy.get('[data-testid="negative-votes"]').should('exist')
      })
    })

    it('should filter candidates by section', () => {
      cy.get('[data-testid="section-filter"]')
        .or('select[name="section"]')
        .select('sales')

      cy.get('[data-testid^="candidate-"]').each(($candidate) => {
        cy.wrap($candidate)
          .find('[data-testid="candidate-section"]')
          .should('contain', 'sales')
      })
    })
  })

  describe('Patterns Analysis Tab', () => {
    beforeEach(() => {
      cy.get('button').contains('🧠 Auto-Aprendizaje').click()
      cy.get('[data-testid="patterns-tab"]')
        .or('button:contains("Patrones")')
        .click()
    })

    it('should display query clusters', () => {
      cy.get('[data-testid="clusters-list"]')
        .or('[data-testid^="cluster-"]')
        .should('exist')
    })

    it('should show cluster frequency', () => {
      cy.get('[data-testid^="cluster-"]').first().within(() => {
        cy.get('[data-testid="cluster-count"]')
          .invoke('text')
          .should('match', /\d+ queries?/i)
      })
    })

    it('should trigger manual pattern analysis', () => {
      cy.intercept('POST', '**/help/learning/analyze').as('analyzePatterns')

      cy.get('button:contains("Analizar Patrones")').click()

      cy.wait('@analyzePatterns')
      cy.get('[data-testid="toast"]').should('contain', /análisis/i)
    })

    it('should create candidate from cluster', () => {
      cy.intercept('POST', '**/help/learning/entry/approve').as('createCandidate')

      cy.get('[data-testid^="cluster-"]').first().within(() => {
        cy.get('button:contains("Crear Candidato")').click()
      })

      // Fill form
      cy.get('input[name="question"]').should('be.visible')
      cy.get('textarea[name="answer"]').type('Respuesta de prueba')
      cy.get('button:contains("Guardar")').click()

      cy.wait('@createCandidate')
    })
  })

  describe('Synonyms Tab', () => {
    beforeEach(() => {
      cy.get('button').contains('🧠 Auto-Aprendizaje').click()
      cy.get('[data-testid="synonyms-tab"]')
        .or('button:contains("Sinónimos")')
        .click()
    })

    it('should display learned synonyms', () => {
      cy.get('[data-testid="synonyms-list"]').should('exist')
    })

    it('should show synonym confidence score', () => {
      cy.get('[data-testid^="synonym-"]').first().within(() => {
        cy.get('[data-testid="confidence-score"]')
          .invoke('text')
          .should('match', /\d+(\.\d+)?/)
      })
    })

    it('should filter auto-learned synonyms', () => {
      cy.get('input[type="checkbox"]').contains(/auto.*aprendid/i).check()

      cy.get('[data-testid^="synonym-"]').each(($synonym) => {
        cy.wrap($synonym)
          .find('[data-testid="auto-learned-badge"]')
          .should('exist')
      })
    })

    it('should approve a synonym rule', () => {
      cy.intercept('POST', '**/help/learning/alias/approve').as('approveAlias')

      cy.get('[data-testid^="synonym-"]').first().within(() => {
        cy.get('button:contains("Aprobar")').click()
      })

      cy.wait('@approveAlias')
      cy.get('[data-testid="toast"]').should('contain', /aprobad/i)
    })
  })

  describe('Export Functionality', () => {
    beforeEach(() => {
      cy.get('button').contains('🧠 Auto-Aprendizaje').click()
    })

    it('should export learning data as JSON', () => {
      cy.intercept('GET', '**/help/learning/export').as('exportData')

      cy.get('button:contains("Exportar")').click()

      cy.wait('@exportData').then((interception) => {
        expect(interception.response?.statusCode).to.equal(200)
        expect(interception.response?.body).to.have.property('sessions')
        expect(interception.response?.body).to.have.property('suggestedAliases')
        expect(interception.response?.body).to.have.property('suggestedEntries')
      })
    })

    it('should download exported file', () => {
      cy.get('button:contains("Exportar")').click()

      // Verificar que se inició la descarga (verificar que el botón de descarga apareció)
      cy.get('[data-testid="download-link"]').should('exist')
    })
  })

  describe('Real-time Updates', () => {
    beforeEach(() => {
      cy.get('button').contains('🧠 Auto-Aprendizaje').click()
    })

    it('should update metrics when new sessions arrive', () => {
      // Capturar métrica inicial
      cy.get('[data-testid="total-sessions"]')
        .invoke('text')
        .then((initialCount) => {
          // Simular nueva sesión desde otro usuario
          cy.window().then((win) => {
            // Trigger manual refresh o polling
            cy.wait(5000) // Esperar polling automático

            cy.get('[data-testid="total-sessions"]')
              .invoke('text')
              .should((newCount) => {
                // Puede ser igual o mayor
                expect(parseInt(newCount)).to.be.gte(parseInt(initialCount))
              })
          })
        })
    })

    it('should show notification for new pending candidates', () => {
      cy.intercept('GET', '**/help/learning/suggestions').as('getSuggestions')

      // Esperar polling
      cy.wait('@getSuggestions')

      // Verificar badge de notificación si hay nuevos candidatos
      cy.get('[data-testid="pending-badge"]')
        .or('.badge')
        .should('exist')
    })
  })

  describe('Permissions & Security', () => {
    it('should require SUPER_ADMIN role', () => {
      cy.logout()
      cy.login('employee@test.com', 'password') // Role: EMPLOYEE

      cy.visit('/dashboard/users')
      cy.get('button:contains("🧠 Auto-Aprendizaje")').should('not.exist')
    })

    it('should block API calls from non-admin users', () => {
      cy.logout()
      cy.login('user@test.com', 'password')

      cy.request({
        url: '/api/help/learning/insights',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(403)
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      cy.get('button').contains('🧠 Auto-Aprendizaje').click()
    })

    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '**/help/learning/insights', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('failedInsights')

      cy.get('button:contains(/actualizar|refresh/i)').click()

      cy.wait('@failedInsights')
      cy.get('[data-testid="error-message"]')
        .or('.error')
        .should('contain', /error/i)
    })

    it('should retry failed requests', () => {
      let attemptCount = 0

      cy.intercept('GET', '**/help/learning/insights', (req) => {
        attemptCount++
        if (attemptCount < 2) {
          req.reply({ statusCode: 500 })
        } else {
          req.reply({ statusCode: 200, body: {} })
        }
      }).as('retryInsights')

      cy.get('button:contains("Reintentar")').click()

      cy.wait('@retryInsights')
      expect(attemptCount).to.be.gte(2)
    })

    it('should validate form inputs', () => {
      cy.get('[data-testid="candidates-tab"]').click()
      cy.get('button:contains("Nueva Entrada")').click()

      // Submit sin llenar campos
      cy.get('button:contains("Guardar")').click()

      // Verificar mensajes de validación
      cy.get('input[name="question"]').should('have.attr', 'aria-invalid', 'true')
      cy.get('textarea[name="answer"]').should('have.attr', 'aria-invalid', 'true')
    })
  })
})
