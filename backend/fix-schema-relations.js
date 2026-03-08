/**
 * Fix Prisma 7 schema relation field names.
 *
 * Prisma 7's `prisma format` renamed all relation fields from camelCase to PascalCase.
 * This script reverts them to the names the code expects.
 *
 * Rules:
 * 1. Fields already starting with lowercase or underscore: skip
 * 2. Fields with disambiguation suffix (e.g., _BillOfMaterials_componentIdToProduct): skip
 * 3. Known custom mappings (details, lines, payments, etc.): apply custom name
 * 4. Default: camelCase of the PascalCase field name
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Build a complete mapping of: "ModelName.FieldName" -> "newFieldName"
// Based on what the code expects (from TSC error analysis)

const customMappings = {
  // Entry model - code uses details, invoice, store, provider, user, etc.
  'Entry.EntryDetail': 'details',
  'Entry.Invoice': 'invoice',
  'Entry.Store': 'store',
  'Entry.Provider': 'provider',
  'Entry.User': 'user',
  'Entry.Journal': 'journal',
  'Entry.TipoCambio': 'tipoCambio',
  'Entry.InvoiceSample': 'invoiceSamples',
  'Entry.ShippingGuide': 'shippingGuides',

  // EntryDetail model
  'EntryDetail.Entry': 'entry',
  'EntryDetail.Inventory': 'inventory',
  'EntryDetail.Product': 'product',
  'EntryDetail.EntryDetailSeries': 'series',
  'EntryDetail.SalesDetail': 'salesDetails',

  // EntryDetailSeries model
  'EntryDetailSeries.EntryDetail': 'entryDetail',
  'EntryDetailSeries.Organization': 'organization',
  'EntryDetailSeries.Store': 'store',

  // Invoice model
  'Invoice.Entry': 'entry',

  // Sales model
  'Sales.SalesDetail': 'salesDetails',
  'Sales.SalePayment': 'payments',
  'Sales.InvoiceSales': 'invoices',
  'Sales.Client': 'client',
  'Sales.Store': 'store',
  'Sales.User': 'user',
  'Sales.Company': 'company',
  'Sales.CreditNote': 'creditNotes',
  'Sales.Orders': 'order',
  'Sales.RestaurantOrder': 'restaurantOrder',
  'Sales.ShippingGuide': 'shippingGuides',
  'Sales.SunatTransmission': 'sunatTransmissions',
  'Sales.WhatsAppMessage': 'whatsAppMessages',

  // SalesDetail model
  'SalesDetail.EntryDetail': 'entryDetail',
  'SalesDetail.Sales': 'sale',
  'SalesDetail.StoreOnInventory': 'storeOnInventory',

  // SalePayment model
  'SalePayment.PaymentMethod': 'paymentMethod',
  'SalePayment.Sales': 'sale',

  // AccEntry model
  'AccEntry.AccEntryLine': 'lines',
  'AccEntry.AccPeriod': 'period',
  'AccEntry.Provider': 'provider',
  'AccEntry.Company': 'company',
  'AccEntry.Organization': 'organization',

  // AccEntryLine model
  'AccEntryLine.AccEntry': 'entry',

  // AccPeriod model
  'AccPeriod.AccEntry': 'entries',

  // Account model
  'Account.Company': 'company',
  'Account.Organization': 'organization',
  'Account.JournalLine': 'journalLines',
  'Account.TaxCode': 'taxCodes',

  // Journal model
  'Journal.Entry': 'entries',

  // JournalEntry model
  'JournalEntry.JournalLine': 'lines',
  'JournalEntry.Company': 'company',
  'JournalEntry.Organization': 'organization',
  'JournalEntry.Period': 'period',
  'JournalEntry.AuditLog': 'auditLogs',
  'JournalEntry.DocumentLink': 'documentLinks',

  // JournalLine model
  'JournalLine.Account': 'account',
  'JournalLine.JournalEntry': 'entry',
  'JournalLine.TaxCode': 'taxCode',

  // Period model
  'Period.JournalEntry': 'journalEntries',
  'Period.PleExport': 'pleExports',

  // PleExport model
  'PleExport.Period': 'period',

  // DocumentLink model
  'DocumentLink.JournalEntry': 'journalEntry',

  // AuditLog model
  'AuditLog.Company': 'company',
  'AuditLog.JournalEntry': 'journalEntry',
  'AuditLog.Organization': 'organization',

  // TaxCode model
  'TaxCode.JournalLine': 'journalLines',
  'TaxCode.Account': 'account',

  // Product model
  'Product.Brand': 'brand',
  'Product.Category': 'category',
  'Product.Company': 'company',
  'Product.Organization': 'organization',
  'Product.EntryDetail': 'entryDetails',
  'Product.Favorite': 'favorites',
  'Product.Inventory': 'inventory',
  'Product.ProductFeature': 'features',
  'Product.ProductSpecification': 'specification',
  'Product.QuoteItem': 'quoteItems',
  'Product.RecipeItem': 'recipeItems',
  'Product.RestaurantOrderItem': 'restaurantOrderItems',
  'Product.Review': 'reviews',
  'Product.Transfer': 'transfers',
  'Product.WorkOrder': 'workOrders',
  'Product.AdGeneration': 'adGenerations',

  // Inventory model
  'Inventory.Product': 'product',
  'Inventory.InventoryHistory': 'history',
  'Inventory.StoreOnInventory': 'storeOnInventory',

  // InventoryHistory model
  'InventoryHistory.Company': 'company',
  'InventoryHistory.Inventory': 'inventory',
  'InventoryHistory.User': 'user',

  // InventorySnapshot model
  'InventorySnapshot.Company': 'company',
  'InventorySnapshot.Organization': 'organization',

  // StoreOnInventory model
  'StoreOnInventory.SalesDetail': 'salesDetails',
  'StoreOnInventory.Inventory': 'inventory',
  'StoreOnInventory.Store': 'store',

  // Store model
  'Store.Company': 'company',
  'Store.Entry': 'entries',
  'Store.EntryDetailSeries': 'entryDetailSeries',
  'Store.RestaurantOrder': 'restaurantOrders',
  'Store.Sales': 'sales',
  'Store.StoreOnInventory': 'storeOnInventory',

  // Provider model
  'Provider.AccEntry': 'accEntries',
  'Provider.Entry': 'entries',
  'Provider.InvoiceTemplate': 'invoiceTemplates',
  'Provider.Organization': 'organization',

  // Client model
  'Client.Company': 'company',
  'Client.User': 'user',
  'Client.LegalMatter': 'legalMatters',
  'Client.Quote': 'quotes',
  'Client.RestaurantOrder': 'restaurantOrders',
  'Client.Sales': 'sales',
  'Client.WhatsAppMessage': 'whatsAppMessages',

  // Brand model
  'Brand.Organization': 'organization',
  'Brand.Keyword': 'keywords',
  'Brand.Product': 'products',

  // Category model
  'Category.Company': 'company',
  'Category.Organization': 'organization',
  'Category.Product': 'products',

  // ProductFeature model
  'ProductFeature.Product': 'product',

  // ProductSpecification model
  'ProductSpecification.Product': 'product',

  // Favorite model
  'Favorite.Product': 'product',
  'Favorite.User': 'user',

  // Review model
  'Review.Product': 'product',
  'Review.User': 'user',

  // User model
  'User.Company': 'company',
  'User.Organization': 'organization',
  'User.CalendarNote': 'calendarNotes',
  'User.Client': 'client',
  'User.CompanyVerticalChangeAudit': 'companyVerticalChangeAudits',
  'User.CreditNote': 'creditNotes',
  'User.Entry': 'entries',
  'User.Favorite': 'favorites',
  'User.HelpConversation': 'helpConversations',
  'User.HelpKBCandidate': 'helpKBCandidates',
  'User.IngredientMovement': 'ingredientMovements',
  'User.InventoryHistory': 'inventoryHistory',
  'User.JurisprudenceDocument': 'jurisprudenceDocuments',
  'User.JurisprudenceQuery': 'jurisprudenceQueries',
  'User.JurisprudenceScrapeJob': 'jurisprudenceScrapeJobs',
  'User.LegalDocument': 'legalDocuments',
  'User.LegalNote': 'legalNotes',
  'User.LegalTimeEntry': 'legalTimeEntries',
  'User.OrganizationDataExport': 'organizationDataExports',
  'User.OrganizationMembership': 'organizationMemberships',
  'User.Quote': 'quotes',
  'User.RestaurantOrder': 'restaurantOrders',
  'User.Review': 'reviews',
  'User.Sales': 'sales',
  'User.SunatStoredPdf': 'sunatStoredPdfs',
  'User.UserContextHistory': 'userContextHistory',
  'User.UserContextPreference': 'userContextPreferences',
  'User.VerticalChangeAudit': 'verticalChangeAudits',

  // Organization model
  'Organization.Company': 'companies',
  'Organization.AccEntry': 'accEntries',
  'Organization.Account': 'accounts',
  'Organization.AdGeneration': 'adGenerations',
  'Organization.AuditLog': 'auditLogs',
  'Organization.BillingPaymentMethod': 'billingPaymentMethods',
  'Organization.Brand': 'brands',
  'Organization.CalendarNote': 'calendarNotes',
  'Organization.CatalogCover': 'catalogCovers',
  'Organization.Category': 'categories',
  'Organization.CompanyVerticalChangeAudit': 'companyVerticalChangeAudits',
  'Organization.CompanyVerticalRollbackSnapshot': 'companyVerticalRollbackSnapshots',
  'Organization.CreditNote': 'creditNotes',
  'Organization.EntryDetailSeries': 'entryDetailSeries',
  'Organization.GymCheckin': 'gymCheckins',
  'Organization.GymClass': 'gymClasses',
  'Organization.GymClassBooking': 'gymClassBookings',
  'Organization.GymClassSchedule': 'gymClassSchedules',
  'Organization.GymMember': 'gymMembers',
  'Organization.GymMembership': 'gymMemberships',
  'Organization.GymTrainer': 'gymTrainers',
  'Organization.Ingredient': 'ingredients',
  'Organization.IngredientMovement': 'ingredientMovements',
  'Organization.InventorySnapshot': 'inventorySnapshots',
  'Organization.InvoiceSample': 'invoiceSamples',
  'Organization.InvoiceTemplate': 'invoiceTemplates',
  'Organization.JournalEntry': 'journalEntries',
  'Organization.JurisprudenceConfig': 'jurisprudenceConfig',
  'Organization.JurisprudenceDocument': 'jurisprudenceDocuments',
  'Organization.KitchenStation': 'kitchenStations',
  'Organization.LegalDocument': 'legalDocuments',
  'Organization.LegalMatter': 'legalMatters',
  'Organization.MonitoringAlert': 'monitoringAlerts',
  'Organization.MonitoringAlertEvent': 'monitoringAlertEvents',
  'Organization.OnboardingProgress': 'onboardingProgress',
  'Organization.Orders': 'orders',
  'Organization.OrganizationDataExport': 'organizationDataExports',
  'Organization.OrganizationMembership': 'organizationMemberships',
  'Organization.OrganizationSetting': 'organizationSetting',
  'Organization.OrganizationUnit': 'organizationUnits',
  'Organization.OrganizationVerticalOverride': 'organizationVerticalOverride',
  'Organization.Product': 'products',
  'Organization.Provider': 'providers',
  'Organization.Quote': 'quotes',
  'Organization.RecipeItem': 'recipeItems',
  'Organization.RestaurantOrder': 'restaurantOrders',
  'Organization.RestaurantTable': 'restaurantTables',
  'Organization.SiteSettings': 'siteSettings',
  'Organization.SocialAccount': 'socialAccounts',
  'Organization.Subscription': 'subscription',
  'Organization.SubscriptionInvoice': 'subscriptionInvoices',
  'Organization.SunatStoredPdf': 'sunatStoredPdfs',
  'Organization.SunatTransmission': 'sunatTransmissions',
  'Organization.TipoCambio': 'tipoCambios',
  'Organization.User': 'users',
  'Organization.VerticalChangeAudit': 'verticalChangeAudits',
  'Organization.VerticalRollbackSnapshot': 'verticalRollbackSnapshots',
  'Organization.WhatsAppAutoReplyConfig': 'whatsAppAutoReplyConfigs',
  'Organization.WhatsAppAutoReplyLog': 'whatsAppAutoReplyLogs',
  'Organization.WhatsAppAutomation': 'whatsAppAutomations',
  'Organization.WhatsAppMessage': 'whatsAppMessages',
  'Organization.WhatsAppSession': 'whatsAppSessions',
  'Organization.WhatsAppTemplate': 'whatsAppTemplates',

  // Company model
  'Company.Organization': 'organization',
  'Company.AccEntry': 'accEntries',
  'Company.Account': 'accounts',
  'Company.ArchivedBillOfMaterials': 'archivedBillOfMaterials',
  'Company.ArchivedKitchenStation': 'archivedKitchenStations',
  'Company.ArchivedPosStation': 'archivedPosStations',
  'Company.ArchivedRestaurantTable': 'archivedRestaurantTables',
  'Company.ArchivedWorkOrder': 'archivedWorkOrders',
  'Company.AuditLog': 'auditLogs',
  'Company.BillOfMaterials': 'billOfMaterials',
  'Company.CalendarNote': 'calendarNotes',
  'Company.CatalogCover': 'catalogCovers',
  'Company.Category': 'categories',
  'Company.Client': 'clients',
  'Company.CompanyDocumentSequence': 'documentSequences',
  'Company.CompanyVerticalChangeAudit': 'companyVerticalChangeAudits',
  'Company.CompanyVerticalOverride': 'companyVerticalOverride',
  'Company.CompanyVerticalRollbackSnapshot': 'companyVerticalRollbackSnapshots',
  'Company.CreditNote': 'creditNotes',
  'Company.GymCheckin': 'gymCheckins',
  'Company.GymClass': 'gymClasses',
  'Company.GymClassBooking': 'gymClassBookings',
  'Company.GymClassSchedule': 'gymClassSchedules',
  'Company.GymMember': 'gymMembers',
  'Company.GymMembership': 'gymMemberships',
  'Company.GymTrainer': 'gymTrainers',
  'Company.Ingredient': 'ingredients',
  'Company.IngredientMovement': 'ingredientMovements',
  'Company.InventoryHistory': 'inventoryHistory',
  'Company.InventorySnapshot': 'inventorySnapshots',
  'Company.InvoiceSales': 'invoiceSales',
  'Company.InvoiceSample': 'invoiceSamples',
  'Company.InvoiceTemplate': 'invoiceTemplates',
  'Company.JournalEntry': 'journalEntries',
  'Company.JurisprudenceDocument': 'jurisprudenceDocuments',
  'Company.KitchenStation': 'kitchenStations',
  'Company.LegalMatter': 'legalMatters',
  'Company.MonitoringAlert': 'monitoringAlerts',
  'Company.MonitoringAlertEvent': 'monitoringAlertEvents',
  'Company.Orders': 'orders',
  'Company.OrganizationUnit': 'organizationUnits',
  'Company.PosStation': 'posStations',
  'Company.Product': 'products',
  'Company.Quote': 'quotes',
  'Company.QuoteSequence': 'quoteSequences',
  'Company.RecipeItem': 'recipeItems',
  'Company.RestaurantOrder': 'restaurantOrders',
  'Company.RestaurantTable': 'restaurantTables',
  'Company.Sales': 'sales',
  'Company.SiteSettings': 'siteSettings',
  'Company.Store': 'stores',
  'Company.SubscriptionInvoice': 'subscriptionInvoices',
  'Company.SunatStoredPdf': 'sunatStoredPdfs',
  'Company.SunatTransmission': 'sunatTransmissions',
  'Company.User': 'users',
  'Company.WhatsAppAutoReplyConfig': 'whatsAppAutoReplyConfigs',
  'Company.WhatsAppAutoReplyLog': 'whatsAppAutoReplyLogs',
  'Company.WhatsAppAutomation': 'whatsAppAutomations',
  'Company.WhatsAppMessage': 'whatsAppMessages',
  'Company.WhatsAppSession': 'whatsAppSessions',
  'Company.WhatsAppTemplate': 'whatsAppTemplates',
  'Company.WorkOrder': 'workOrders',

  // cash_registers model
  'cash_registers.Store': 'store',

  // cash_transactions model
  'cash_transactions.CashTransactionPaymentMethod': 'cashTransactionPaymentMethods',
  'cash_transactions.SalePayment': 'salePayments',
  'cash_transactions.User': 'user',

  // cash_closures model
  'cash_closures.User': 'user',

  // CashTransactionPaymentMethod model
  'CashTransactionPaymentMethod.PaymentMethod': 'paymentMethod',

  // PaymentMethod model
  'PaymentMethod.CashTransactionPaymentMethod': 'cashTransactionPaymentMethods',
  'PaymentMethod.SalePayment': 'salePayments',

  // Subscription model
  'Subscription.BillingPaymentMethod': 'billingPaymentMethod',
  'Subscription.Organization': 'organization',
  'Subscription.SubscriptionPlan': 'plan',
  'Subscription.SubscriptionInvoice': 'invoices',

  // SubscriptionPlan model
  'SubscriptionPlan.Subscription': 'subscriptions',

  // SubscriptionInvoice model
  'SubscriptionInvoice.Company': 'company',
  'SubscriptionInvoice.Organization': 'organization',
  'SubscriptionInvoice.BillingPaymentMethod': 'billingPaymentMethod',
  'SubscriptionInvoice.Subscription': 'subscription',
  'SubscriptionInvoice.SunatTransmission': 'sunatTransmissions',

  // BillingPaymentMethod model
  'BillingPaymentMethod.Organization': 'organization',
  'BillingPaymentMethod.Subscription': 'subscriptions',
  'BillingPaymentMethod.SubscriptionInvoice': 'subscriptionInvoices',

  // CreditNote model
  'CreditNote.Company': 'company',
  'CreditNote.User': 'user',
  'CreditNote.Organization': 'organization',
  'CreditNote.InvoiceSales': 'originalInvoice',
  'CreditNote.Sales': 'originalSale',
  'CreditNote.SunatTransmission': 'sunatTransmissions',

  // InvoiceSales model
  'InvoiceSales.CreditNote': 'creditNotes',
  'InvoiceSales.Company': 'company',
  'InvoiceSales.Sales': 'sale',
  'InvoiceSales.WhatsAppMessage': 'whatsAppMessages',

  // SunatTransmission model
  'SunatTransmission.Company': 'company',
  'SunatTransmission.CreditNote': 'creditNote',
  'SunatTransmission.Organization': 'organization',
  'SunatTransmission.Sales': 'sale',
  'SunatTransmission.SubscriptionInvoice': 'subscriptionInvoice',

  // SunatStoredPdf model
  'SunatStoredPdf.Company': 'company',
  'SunatStoredPdf.User': 'user',
  'SunatStoredPdf.Organization': 'organization',

  // Quote model
  'Quote.Client': 'client',
  'Quote.Company': 'company',
  'Quote.User': 'user',
  'Quote.Organization': 'organization',
  'Quote.QuoteItem': 'items',

  // QuoteItem model
  'QuoteItem.Product': 'product',
  'QuoteItem.Quote': 'quote',

  // QuoteSequence model
  'QuoteSequence.Company': 'company',

  // CompanyDocumentSequence model
  'CompanyDocumentSequence.Company': 'company',

  // Orders model
  'Orders.Company': 'company',
  'Orders.Organization': 'organization',
  'Orders.Sales': 'sale',
  'Orders.OrderTracking': 'tracking',

  // OrderTracking model
  'OrderTracking.Orders': 'order',

  // GymMember model
  'GymMember.GymCheckin': 'checkins',
  'GymMember.GymClassBooking': 'classBookings',
  'GymMember.Company': 'company',
  'GymMember.Organization': 'organization',
  'GymMember.GymMembership': 'memberships',

  // GymMembership model
  'GymMembership.GymCheckin': 'checkins',
  'GymMembership.Company': 'company',
  'GymMembership.GymMember': 'member',
  'GymMembership.Organization': 'organization',

  // GymCheckin model
  'GymCheckin.Company': 'company',
  'GymCheckin.GymMember': 'member',
  'GymCheckin.GymMembership': 'membership',
  'GymCheckin.Organization': 'organization',

  // GymClass model
  'GymClass.Company': 'company',
  'GymClass.Organization': 'organization',
  'GymClass.GymClassSchedule': 'schedules',

  // GymClassSchedule model
  'GymClassSchedule.GymClassBooking': 'bookings',
  'GymClassSchedule.GymClass': 'gymClass',
  'GymClassSchedule.Company': 'company',
  'GymClassSchedule.Organization': 'organization',
  'GymClassSchedule.GymTrainer': 'trainer',

  // GymClassBooking model
  'GymClassBooking.Company': 'company',
  'GymClassBooking.GymMember': 'member',
  'GymClassBooking.Organization': 'organization',
  'GymClassBooking.GymClassSchedule': 'schedule',

  // GymTrainer model
  'GymTrainer.GymClassSchedule': 'schedules',
  'GymTrainer.Company': 'company',
  'GymTrainer.Organization': 'organization',

  // Ingredient model
  'Ingredient.Company': 'company',
  'Ingredient.Organization': 'organization',
  'Ingredient.IngredientMovement': 'movements',
  'Ingredient.RecipeItem': 'recipeItems',

  // IngredientMovement model
  'IngredientMovement.Company': 'company',
  'IngredientMovement.User': 'user',
  'IngredientMovement.Ingredient': 'ingredient',
  'IngredientMovement.RestaurantOrder': 'restaurantOrder',
  'IngredientMovement.Organization': 'organization',

  // RecipeItem model
  'RecipeItem.Company': 'company',
  'RecipeItem.Ingredient': 'ingredient',
  'RecipeItem.Organization': 'organization',
  'RecipeItem.Product': 'product',

  // RestaurantOrder model
  'RestaurantOrder.IngredientMovement': 'ingredientMovements',
  'RestaurantOrder.Client': 'client',
  'RestaurantOrder.Company': 'company',
  'RestaurantOrder.User': 'user',
  'RestaurantOrder.Organization': 'organization',
  'RestaurantOrder.Sales': 'sale',
  'RestaurantOrder.Store': 'store',
  'RestaurantOrder.RestaurantOrderItem': 'items',

  // RestaurantOrderItem model
  'RestaurantOrderItem.RestaurantOrder': 'order',
  'RestaurantOrderItem.Product': 'product',
  'RestaurantOrderItem.KitchenStation': 'kitchenStation',

  // RestaurantTable model
  'RestaurantTable.Company': 'company',
  'RestaurantTable.Organization': 'organization',

  // KitchenStation model
  'KitchenStation.Company': 'company',
  'KitchenStation.Organization': 'organization',
  'KitchenStation.RestaurantOrderItem': 'orderItems',

  // LegalMatter model
  'LegalMatter.JurisprudenceQuery': 'jurisprudenceQueries',
  'LegalMatter.LegalDocument': 'documents',
  'LegalMatter.LegalEvent': 'events',
  'LegalMatter.Client': 'client',
  'LegalMatter.Company': 'company',
  'LegalMatter.Organization': 'organization',
  'LegalMatter.LegalMatterParty': 'parties',
  'LegalMatter.LegalNote': 'notes',
  'LegalMatter.LegalTimeEntry': 'timeEntries',

  // LegalMatterParty model
  'LegalMatterParty.LegalMatter': 'matter',

  // LegalDocument model
  'LegalDocument.LegalMatter': 'matter',
  'LegalDocument.Organization': 'organization',
  'LegalDocument.User': 'uploadedBy',

  // LegalEvent model
  'LegalEvent.LegalMatter': 'matter',

  // LegalNote model
  'LegalNote.User': 'user',
  'LegalNote.LegalMatter': 'matter',

  // LegalTimeEntry model
  'LegalTimeEntry.LegalMatter': 'matter',
  'LegalTimeEntry.User': 'user',

  // HelpConversation model
  'HelpConversation.User': 'user',
  'HelpConversation.HelpMessage': 'messages',

  // HelpMessage model
  'HelpMessage.HelpConversation': 'conversation',

  // HelpKBCandidate model
  'HelpKBCandidate.User': 'user',

  // CalendarNote model
  'CalendarNote.Company': 'company',
  'CalendarNote.User': 'user',
  'CalendarNote.Organization': 'organization',

  // WhatsAppSession model
  'WhatsAppSession.WhatsAppAutomation': 'automations',
  'WhatsAppSession.WhatsAppMessage': 'messages',
  'WhatsAppSession.Company': 'company',
  'WhatsAppSession.Organization': 'organization',

  // WhatsAppMessage model
  'WhatsAppMessage.Client': 'client',
  'WhatsAppMessage.Company': 'company',
  'WhatsAppMessage.InvoiceSales': 'invoiceSales',
  'WhatsAppMessage.Organization': 'organization',
  'WhatsAppMessage.Sales': 'sale',
  'WhatsAppMessage.WhatsAppSession': 'session',

  // WhatsAppTemplate model
  'WhatsAppTemplate.WhatsAppAutomation': 'automations',
  'WhatsAppTemplate.Company': 'company',
  'WhatsAppTemplate.Organization': 'organization',

  // WhatsAppAutomation model
  'WhatsAppAutomation.Company': 'company',
  'WhatsAppAutomation.Organization': 'organization',
  'WhatsAppAutomation.WhatsAppSession': 'session',
  'WhatsAppAutomation.WhatsAppTemplate': 'template',
  'WhatsAppAutomation.WhatsAppAutomationLog': 'logs',

  // WhatsAppAutomationLog model
  'WhatsAppAutomationLog.WhatsAppAutomation': 'automation',

  // WhatsAppAutoReplyConfig model
  'WhatsAppAutoReplyConfig.Company': 'company',
  'WhatsAppAutoReplyConfig.Organization': 'organization',
  'WhatsAppAutoReplyConfig.WhatsAppAutoReplyRule': 'rules',

  // WhatsAppAutoReplyRule model
  'WhatsAppAutoReplyRule.WhatsAppAutoReplyConfig': 'config',

  // WhatsAppAutoReplyLog model
  'WhatsAppAutoReplyLog.Company': 'company',
  'WhatsAppAutoReplyLog.Organization': 'organization',

  // InvoiceTemplate model
  'InvoiceTemplate.InvoiceSample': 'samples',
  'InvoiceTemplate.Company': 'company',
  'InvoiceTemplate.Organization': 'organization',
  'InvoiceTemplate.Provider': 'provider',

  // InvoiceSample model
  'InvoiceSample.InvoiceExtractionLog': 'extractionLogs',
  'InvoiceSample.Company': 'company',
  'InvoiceSample.Entry': 'entry',
  'InvoiceSample.InvoiceTemplate': 'template',
  'InvoiceSample.Organization': 'organization',

  // InvoiceExtractionLog model
  'InvoiceExtractionLog.InvoiceSample': 'sample',

  // ShippingGuide model
  'ShippingGuide.Entry': 'entry',
  'ShippingGuide.Sales': 'sale',
  'ShippingGuide.Transfer': 'transfers',

  // Transfer model
  'Transfer.Product': 'product',
  'Transfer.ShippingGuide': 'shippingGuide',

  // Campaign model
  'Campaign.Org': 'org',
  'Campaign.Creative': 'creatives',
  'Campaign.Run': 'runs',
  'Campaign.Template': 'templates',

  // Creative model
  'Creative.Asset': 'assets',
  'Creative.Campaign': 'campaign',
  'Creative.Template': 'template',

  // Template model (ads)
  'Template.Creative': 'creatives',
  'Template.Campaign': 'campaign',

  // Asset model
  'Asset.Creative': 'creative',
  'Asset.Run': 'run',
  'Asset.PublishTargetLog': 'publishTargetLogs',

  // Run model
  'Run.Asset': 'assets',
  'Run.PublishTargetLog': 'publishTargetLogs',
  'Run.Campaign': 'campaign',

  // PublishTarget model
  'PublishTarget.Org': 'org',
  'PublishTarget.PublishTargetLog': 'logs',

  // PublishTargetLog model
  'PublishTargetLog.Asset': 'asset',
  'PublishTargetLog.PublishTarget': 'publishTarget',
  'PublishTargetLog.Run': 'run',

  // SocialAccount model
  'SocialAccount.Organization': 'organization',

  // AdGeneration model
  'AdGeneration.Organization': 'organization',
  'AdGeneration.Product': 'product',

  // Keyword model
  'Keyword.Brand': 'brand',

  // SiteSettings model
  'SiteSettings.Company': 'company',
  'SiteSettings.Organization': 'organization',

  // CatalogCover model
  'CatalogCover.Company': 'company',
  'CatalogCover.Organization': 'organization',

  // OnboardingProgress model
  'OnboardingProgress.Organization': 'organization',

  // OrganizationMembership model
  'OrganizationMembership.Organization': 'organization',
  'OrganizationMembership.OrganizationUnit': 'organizationUnit',
  'OrganizationMembership.User': 'user',

  // OrganizationUnit model
  'OrganizationUnit.OrganizationMembership': 'memberships',
  'OrganizationUnit.Company': 'company',
  'OrganizationUnit.Organization': 'organization',

  // OrganizationSetting model
  'OrganizationSetting.Organization': 'organization',

  // OrganizationVerticalOverride model
  'OrganizationVerticalOverride.Organization': 'organization',

  // CompanyVerticalOverride model
  'CompanyVerticalOverride.Company': 'company',

  // CompanyVerticalChangeAudit model
  'CompanyVerticalChangeAudit.Company': 'company',
  'CompanyVerticalChangeAudit.Organization': 'organization',
  'CompanyVerticalChangeAudit.User': 'user',

  // CompanyVerticalRollbackSnapshot model
  'CompanyVerticalRollbackSnapshot.Company': 'company',
  'CompanyVerticalRollbackSnapshot.Organization': 'organization',

  // VerticalChangeAudit model
  'VerticalChangeAudit.Organization': 'organization',
  'VerticalChangeAudit.User': 'user',

  // VerticalRollbackSnapshot model
  'VerticalRollbackSnapshot.Organization': 'organization',

  // OrganizationDataExport model
  'OrganizationDataExport.Organization': 'organization',
  'OrganizationDataExport.User': 'user',

  // MonitoringAlert model
  'MonitoringAlert.Company': 'company',
  'MonitoringAlert.Organization': 'organization',
  'MonitoringAlert.MonitoringAlertEvent': 'events',

  // MonitoringAlertEvent model
  'MonitoringAlertEvent.MonitoringAlert': 'alert',
  'MonitoringAlertEvent.Company': 'company',
  'MonitoringAlertEvent.Organization': 'organization',

  // ArchivedBillOfMaterials model
  'ArchivedBillOfMaterials.Company': 'company',

  // ArchivedKitchenStation model
  'ArchivedKitchenStation.Company': 'company',
  'ArchivedKitchenStation.Organization': 'organization',

  // ArchivedPosStation model
  'ArchivedPosStation.Company': 'company',

  // ArchivedRestaurantTable model
  'ArchivedRestaurantTable.Company': 'company',
  'ArchivedRestaurantTable.Organization': 'organization',

  // ArchivedWorkOrder model
  'ArchivedWorkOrder.Company': 'company',

  // BillOfMaterials model
  'BillOfMaterials.Company': 'company',

  // PosStation model
  'PosStation.Company': 'company',

  // WorkOrder model
  'WorkOrder.Company': 'company',
  'WorkOrder.Product': 'product',

  // JurisprudenceConfig model
  'JurisprudenceConfig.Organization': 'organization',

  // JurisprudenceDocument model
  'JurisprudenceDocument.Company': 'company',
  'JurisprudenceDocument.Organization': 'organization',
  'JurisprudenceDocument.User': 'uploadedBy',
  'JurisprudenceDocument.JurisprudenceDocumentPage': 'pages',
  'JurisprudenceDocument.JurisprudenceDocumentSection': 'sections',
  'JurisprudenceDocument.JurisprudenceEmbedding': 'embeddings',

  // JurisprudenceDocumentPage model
  'JurisprudenceDocumentPage.JurisprudenceDocument': 'document',
  'JurisprudenceDocumentPage.JurisprudenceOcrJob': 'ocrJob',

  // JurisprudenceDocumentSection model
  'JurisprudenceDocumentSection.JurisprudenceDocument': 'document',

  // JurisprudenceEmbedding model
  'JurisprudenceEmbedding.JurisprudenceDocument': 'document',

  // JurisprudenceOcrJob model
  'JurisprudenceOcrJob.JurisprudenceDocumentPage': 'pages',

  // JurisprudenceQuery model
  'JurisprudenceQuery.LegalMatter': 'legalMatter',
  'JurisprudenceQuery.User': 'user',

  // JurisprudenceScrapeJob model
  'JurisprudenceScrapeJob.User': 'user',

  // UserContextHistory
  'UserContextHistory.User': 'user',

  // UserContextPreference
  'UserContextPreference.User': 'user',

  // ===== DISAMBIGUATION FIELDS (with underscores) =====
  // ChatMessage
  'ChatMessage.User_ChatMessage_clientIdToUser': 'client',
  'ChatMessage.User_ChatMessage_senderIdToUser': 'sender',

  // InvoiceTemplate
  'InvoiceTemplate.User_InvoiceTemplate_createdByIdToUser': 'createdBy',
  'InvoiceTemplate.User_InvoiceTemplate_updatedByIdToUser': 'updatedBy',

  // LegalEvent
  'LegalEvent.User_LegalEvent_assignedToIdToUser': 'assignedTo',
  'LegalEvent.User_LegalEvent_createdByIdToUser': 'createdBy',

  // LegalMatter
  'LegalMatter.User_LegalMatter_assignedToIdToUser': 'assignedTo',
  'LegalMatter.User_LegalMatter_createdByIdToUser': 'createdBy',

  // BillOfMaterials
  'BillOfMaterials.Product_BillOfMaterials_componentIdToProduct': 'component',
  'BillOfMaterials.Product_BillOfMaterials_productIdToProduct': 'product',

  // Product (inverse of BillOfMaterials)
  'Product.BillOfMaterials_BillOfMaterials_componentIdToProduct': 'billOfMaterialsAsComponent',
  'Product.BillOfMaterials_BillOfMaterials_productIdToProduct': 'billOfMaterialsAsProduct',

  // RestaurantOrder
  'RestaurantOrder.RestaurantTable_RestaurantOrder_tableIdToRestaurantTable': 'table',
  'RestaurantOrder.RestaurantTable_RestaurantTable_currentOrderIdToRestaurantOrder': 'currentOrderTable',

  // RestaurantTable
  'RestaurantTable.RestaurantOrder_RestaurantOrder_tableIdToRestaurantTable': 'orders',
  'RestaurantTable.RestaurantOrder_RestaurantTable_currentOrderIdToRestaurantOrder': 'currentOrder',

  // ShippingGuide
  'ShippingGuide.Store_ShippingGuide_destinationStoreIdToStore': 'destinationStore',
  'ShippingGuide.Store_ShippingGuide_sourceStoreIdToStore': 'sourceStore',

  // Store (inverse shipping guides)
  'Store.ShippingGuide_ShippingGuide_destinationStoreIdToStore': 'destinationGuides',
  'Store.ShippingGuide_ShippingGuide_sourceStoreIdToStore': 'sourceGuides',

  // Store (inverse transfers)
  'Store.Transfer_Transfer_destinationStoreIdToStore': 'incomingTransfers',
  'Store.Transfer_Transfer_sourceStoreIdToStore': 'outgoingTransfers',

  // Transfer
  'Transfer.Store_Transfer_destinationStoreIdToStore': 'destinationStore',
  'Transfer.Store_Transfer_sourceStoreIdToStore': 'sourceStore',

  // User (inverse disambiguation)
  'User.ChatMessage_ChatMessage_clientIdToUser': 'chatMessagesAsClient',
  'User.ChatMessage_ChatMessage_senderIdToUser': 'chatMessagesAsSender',
  'User.InvoiceTemplate_InvoiceTemplate_createdByIdToUser': 'invoiceTemplatesCreated',
  'User.InvoiceTemplate_InvoiceTemplate_updatedByIdToUser': 'invoiceTemplatesUpdated',
  'User.LegalEvent_LegalEvent_assignedToIdToUser': 'legalEventsAssigned',
  'User.LegalEvent_LegalEvent_createdByIdToUser': 'legalEventsCreated',
  'User.LegalMatter_LegalMatter_assignedToIdToUser': 'legalMattersAssigned',
  'User.LegalMatter_LegalMatter_createdByIdToUser': 'legalMattersCreated',

  // Self-relations
  'Account.Account': 'parent',
  'Account.other_Account': 'children',
  'Entry.Entry': 'reversalEntry',
  'Entry.other_Entry': 'reversedBy',
  'LegalDocument.LegalDocument': 'parentDocument',
  'LegalDocument.other_LegalDocument': 'childDocuments',
  'OrganizationUnit.OrganizationUnit': 'parentUnit',
  'OrganizationUnit.other_OrganizationUnit': 'childUnits',
  'WhatsAppMessage.WhatsAppMessage': 'parentMessage',
  'WhatsAppMessage.other_WhatsAppMessage': 'replies',

  // ===== ADDITIONAL FIXES =====
  // CalendarNote has single User relation, code expects createdBy
  'CalendarNote.User': 'createdBy',
  // CreditNote: code expects createdBy for User relation
  'CreditNote.User': 'createdBy',
  // JurisprudenceScrapeJob: code expects createdBy
  'JurisprudenceScrapeJob.User': 'createdBy',
  // LegalNote: code expects createdBy
  'LegalNote.User': 'createdBy',
  // Subscription: code expects plan for SubscriptionPlan
  // (already defined above)
  // SubscriptionInvoice: code expects paymentMethod
  'SubscriptionInvoice.BillingPaymentMethod': 'paymentMethod',
  // IngredientMovement: code expects order
  'IngredientMovement.RestaurantOrder': 'order',
  // RestaurantOrderItem: code expects station
  'RestaurantOrderItem.KitchenStation': 'station',
  // InvoiceSales: code expects sales (plural)
  'InvoiceSales.Sales': 'sales',
  // Inventory: code expects entryDetails (wrong? let's check)
  // Actually the Inventory model doesn't have EntryDetail relation, it has Product and StoreOnInventory
  // The code uses inventory.entryDetails but that's probably accessing via product.entryDetails
};

// Parse the schema to find all models and their relation fields
// Handle CRLF line endings (Windows)
const rawLines = schema.split('\n');
let currentModel = null;
let output = [];
let changeCount = 0;

for (let i = 0; i < rawLines.length; i++) {
  const line = rawLines[i].replace(/\r$/, ''); // Strip trailing CR

  // Detect model start
  const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
  if (modelMatch) {
    currentModel = modelMatch[1];
    output.push(line);
    continue;
  }

  // Detect model end
  if (line.trim() === '}') {
    currentModel = null;
    output.push(line);
    continue;
  }

  if (!currentModel) {
    output.push(line);
    continue;
  }

  // Check if this is a relation field (starts with uppercase letter OR has underscore pattern, type is a model reference)
  // Pattern: "  FieldName   ModelType   @relation(...)" or "  FieldName   ModelType[]" or "  FieldName   ModelType?"
  // Also match disambiguation fields like "User_LegalEvent_assignedToIdToUser"
  const relationMatch = line.match(/^(\s+)([A-Za-z]\w+)(\s+)(\w+)(\??\[?\]?)(\s*.*)$/);

  if (!relationMatch) {
    output.push(line);
    continue;
  }

  const [, indent, fieldName, spacing, modelType, suffix, rest] = relationMatch;

  // Skip if this is an enum value or a scalar type
  const scalarTypes = ['Int', 'String', 'Float', 'Boolean', 'DateTime', 'Decimal', 'BigInt', 'Json', 'Bytes'];
  if (scalarTypes.includes(modelType)) {
    output.push(line);
    continue;
  }

  // Skip if already lowercase and not in custom mappings
  const key = `${currentModel}.${fieldName}`;
  if (fieldName[0] >= 'a' && fieldName[0] <= 'z' && !customMappings[key]) {
    output.push(line);
    continue;
  }

  // Check if we have a custom mapping
  let newFieldName;

  if (customMappings[key]) {
    newFieldName = customMappings[key];
  } else {
    // Default: camelCase the field name
    newFieldName = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
  }

  if (newFieldName === fieldName) {
    output.push(line);
    continue;
  }

  // Calculate new spacing to maintain alignment
  const oldLen = fieldName.length;
  const newLen = newFieldName.length;
  const spacingLen = spacing.length + (oldLen - newLen);
  const newSpacing = spacingLen > 0 ? ' '.repeat(spacingLen) : ' ';

  const newLine = `${indent}${newFieldName}${newSpacing}${modelType}${suffix}${rest}`;
  output.push(newLine);

  if (newFieldName !== fieldName) {
    changeCount++;
    // console.log(`  ${currentModel}: ${fieldName} → ${newFieldName}`);
  }
}

console.log(`Total relation field renames: ${changeCount}`);

// Fix known scalar field conflicts BEFORE writing
// Product model: rename scalar `brand String?` to `brandLabel String? @map("brand")`
// to avoid conflict with Brand relation being renamed to `brand`
let inProductModel = false;
let brandFixed = false;
for (let i = 0; i < output.length; i++) {
  if (output[i].match(/^model Product\s*\{/)) { inProductModel = true; continue; }
  if (inProductModel && output[i].trim() === '}') { inProductModel = false; continue; }
  if (inProductModel && !brandFixed && output[i].match(/^\s+brand\s+String\?/)) {
    output[i] = output[i].replace(/brand(\s+)String\?/, 'brandLabel$1String?               @map("brand")');
    brandFixed = true;
    console.log('Fixed Product.brand scalar → brandLabel @map("brand")');
  }
}

fs.writeFileSync(schemaPath, output.join('\n'));
console.log('Schema updated successfully!');
