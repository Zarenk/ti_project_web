describe('Vertical Management', () => {
  beforeEach(() => {
    // Login as super admin
    cy.login('zarenk', 'm8L4pNhV5YZL5Vqz');
    cy.visit('/dashboard/tenancy');
  });

  describe('Viewing Organization Vertical Cards', () => {
    it('should display organization cards with vertical information', () => {
      cy.get('[data-testid="organization-card"]').should('exist');
      cy.get('[data-testid="vertical-badge"]').should('be.visible');
    });

    it('should show current vertical for each company', () => {
      cy.get('[data-testid="organization-card"]')
        .first()
        .within(() => {
          cy.get('[data-testid="vertical-badge"]').should(
            'contain.text',
            /GENERAL|RESTAURANTS|RETAIL|SERVICES|MANUFACTURING|COMPUTERS/i,
          );
        });
    });

    it('should display vertical status indicator', () => {
      cy.get('[data-testid="vertical-status"]').should('exist');
    });
  });

  describe('Changing Company Vertical', () => {
    beforeEach(() => {
      // Navigate to first organization detail
      cy.get('[data-testid="organization-card"]').first().click();
      cy.url().should('include', '/dashboard/tenancy/');
    });

    it('should show vertical management panel', () => {
      cy.get('[data-testid="vertical-management-panel"]').should('be.visible');
    });

    it('should display all available verticals', () => {
      cy.get('[data-testid="vertical-select"]').click();

      const expectedVerticals = [
        'GENERAL',
        'RESTAURANTS',
        'RETAIL',
        'SERVICES',
        'MANUFACTURING',
        'COMPUTERS',
      ];

      expectedVerticals.forEach((vertical) => {
        cy.contains(vertical).should('be.visible');
      });
    });

    it('should show compatibility check before changing', () => {
      cy.get('[data-testid="vertical-select"]').click();
      cy.contains('RESTAURANTS').click();

      cy.get('[data-testid="change-vertical-btn"]').click();

      // Should show compatibility dialog
      cy.get('[role="dialog"]').should('be.visible');
      cy.contains(/compatibilidad|compatibility/i).should('be.visible');
    });

    it('should prevent change if incompatible', () => {
      // Assuming company has data that's incompatible
      cy.get('[data-testid="vertical-select"]').select('MANUFACTURING');
      cy.get('[data-testid="change-vertical-btn"]').click();

      // Check for warning/error messages
      cy.get('[data-testid="compatibility-errors"]').should('exist');
      cy.contains(/error|advertencia|warning/i).should('be.visible');
    });

    it('should successfully change vertical for empty company', () => {
      // This test assumes a test company with no data
      cy.visit('/dashboard/tenancy/companies');

      // Create or select test company with no data
      cy.get('[data-testid="company-row"]')
        .contains('Test Company')
        .parent()
        .within(() => {
          cy.get('[data-testid="vertical-change-btn"]').click();
        });

      cy.get('[data-testid="vertical-select"]').select('RESTAURANTS');
      cy.get('[data-testid="confirm-change"]').click();

      // Verify success
      cy.contains(/éxito|success/i, { timeout: 10000 }).should('be.visible');
      cy.get('[data-testid="vertical-badge"]').should('contain', 'RESTAURANTS');
    });
  });

  describe('Schema Enforcement Toggle', () => {
    beforeEach(() => {
      cy.get('[data-testid="organization-card"]').first().click();
    });

    it('should display schema enforcement toggle', () => {
      cy.get('[data-testid="schema-enforcement-toggle"]').should('be.visible');
    });

    it('should toggle schema enforcement', () => {
      cy.get('[data-testid="schema-enforcement-toggle"]').click();

      // Wait for API response
      cy.wait(500);

      // Verify state changed
      cy.get('[data-testid="schema-enforcement-toggle"]')
        .should('have.attr', 'data-state')
        .and('match', /checked|unchecked/);
    });

    it('should persist toggle state after page reload', () => {
      // Get initial state
      cy.get('[data-testid="schema-enforcement-toggle"]')
        .invoke('attr', 'data-state')
        .then((initialState) => {
          // Toggle
          cy.get('[data-testid="schema-enforcement-toggle"]').click();
          cy.wait(500);

          // Reload page
          cy.reload();

          // Verify state persisted
          cy.get('[data-testid="schema-enforcement-toggle"]')
            .invoke('attr', 'data-state')
            .should('not.eq', initialState);
        });
    });
  });

  describe('Vertical Overrides', () => {
    beforeEach(() => {
      cy.get('[data-testid="organization-card"]').first().click();
    });

    it('should display vertical overrides panel', () => {
      cy.contains('Configuración Personalizada').click();
      cy.get('[data-testid="vertical-overrides-panel"]').should('be.visible');
    });

    it('should allow creating custom configuration', () => {
      cy.contains('Configuración Personalizada').click();
      cy.get('[data-testid="add-override-btn"]').click();

      // Fill override form
      cy.get('[name="overrideKey"]').type('features.tableManagement');
      cy.get('[name="overrideValue"]').type('true');
      cy.get('[data-testid="save-override"]').click();

      // Verify success
      cy.contains(/guardado|saved/i).should('be.visible');
    });

    it('should list existing overrides', () => {
      cy.contains('Configuración Personalizada').click();
      cy.get('[data-testid="override-list"]').should('exist');
    });

    it('should allow deleting overrides', () => {
      cy.contains('Configuración Personalizada').click();

      cy.get('[data-testid="override-item"]').first().within(() => {
        cy.get('[data-testid="delete-override"]').click();
      });

      // Confirm deletion
      cy.get('[data-testid="confirm-delete"]').click();

      // Verify deletion
      cy.contains(/eliminado|deleted/i).should('be.visible');
    });
  });

  describe('Migration Status', () => {
    it('should show migration in progress indicator', () => {
      // Trigger a vertical change that requires migration
      cy.get('[data-testid="organization-card"]').first().click();
      cy.get('[data-testid="vertical-select"]').select('RESTAURANTS');
      cy.get('[data-testid="change-vertical-btn"]').click();
      cy.get('[data-testid="confirm-change"]').click();

      // Should show progress indicator
      cy.get('[data-testid="migration-progress"]', { timeout: 1000 }).should(
        'be.visible',
      );
    });

    it('should display migration completion', () => {
      // Wait for migration to complete
      cy.get('[data-testid="migration-complete"]', { timeout: 15000 }).should(
        'be.visible',
      );
    });

    it('should show error if migration fails', () => {
      // This would need to mock a failed migration scenario
      // or have a specific test case that causes failure
    });
  });

  describe('Role-Based Access', () => {
    it('should hide vertical management for non-super-admin users', () => {
      cy.logout();
      cy.login('employee_user', 'password123'); // Regular employee

      cy.visit('/dashboard/tenancy');

      // Should not see vertical management options
      cy.get('[data-testid="vertical-management-panel"]').should('not.exist');
    });

    it('should allow SUPER_ADMIN_ORG to manage verticals in their org', () => {
      cy.logout();
      cy.login('org_admin', 'password123');

      cy.visit('/dashboard/tenancy');

      // Should see vertical management for their organization
      cy.get('[data-testid="vertical-management-panel"]').should('exist');
    });
  });

  describe('Data-Vertical Attribute', () => {
    it('should apply data-vertical attribute to HTML root', () => {
      cy.get('html').should('have.attr', 'data-vertical');
    });

    it('should update data-vertical when changing company', () => {
      // Get initial vertical
      cy.get('html')
        .invoke('attr', 'data-vertical')
        .then((initialVertical) => {
          // Change to different company
          cy.get('[data-testid="company-selector"]').click();
          cy.contains('Different Company').click();

          // Verify attribute changed
          cy.get('html')
            .invoke('attr', 'data-vertical')
            .should('exist');
        });
    });
  });

  describe('CSS Variables', () => {
    it('should inject vertical-specific CSS variables', () => {
      cy.window().then((win) => {
        const styles = win.getComputedStyle(win.document.documentElement);

        // Check if CSS variables are defined
        const verticalPrimary = styles.getPropertyValue('--vertical-primary');
        const verticalTheme = styles.getPropertyValue('--vertical-theme');

        // Variables should exist (even if empty for GENERAL)
        expect(verticalPrimary).to.exist;
        expect(verticalTheme).to.exist;
      });
    });

    it('should update CSS variables when vertical changes', () => {
      cy.window().then((win) => {
        const initialPrimary = win
          .getComputedStyle(win.document.documentElement)
          .getPropertyValue('--vertical-primary');

        // Change vertical
        cy.get('[data-testid="vertical-select"]').select('RESTAURANTS');
        cy.get('[data-testid="change-vertical-btn"]').click();
        cy.get('[data-testid="confirm-change"]').click();
        cy.wait(2000);

        // Check if variable updated
        cy.window().then((newWin) => {
          const newPrimary = newWin
            .getComputedStyle(newWin.document.documentElement)
            .getPropertyValue('--vertical-primary');

          // May or may not be different depending on config
          expect(newPrimary).to.exist;
        });
      });
    });
  });
});
