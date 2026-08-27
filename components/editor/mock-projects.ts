/**
 * Placeholder project data for the editor sidebar and dialogs.
 * There is no persistence layer yet (see `context/feature-specs/04-project-dialogs`);
 * this stands in until the projects API exists.
 */

export type ProjectOwnership = "owned" | "shared"

export interface MockProject {
  id: string
  name: string
  slug: string
  ownership: ProjectOwnership
}

export const MOCK_PROJECTS: MockProject[] = [
  {
    id: "prj_payments",
    name: "Payments Platform",
    slug: "payments-platform",
    ownership: "owned",
  },
  {
    id: "prj_event_pipeline",
    name: "Event Pipeline",
    slug: "event-pipeline",
    ownership: "owned",
  },
  {
    id: "prj_billing_service",
    name: "Billing Service",
    slug: "billing-service",
    ownership: "owned",
  },
  {
    id: "prj_partner_integrations",
    name: "Partner Integrations",
    slug: "partner-integrations",
    ownership: "shared",
  },
  {
    id: "prj_analytics_warehouse",
    name: "Analytics Warehouse",
    slug: "analytics-warehouse",
    ownership: "shared",
  },
]
