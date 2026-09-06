import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  NODE_COLORS,
  SHAPE_DEFAULT_SIZE,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeShape,
} from "@/types/canvas"

/** A pre-built canvas the user can import to replace the current diagram. */
export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

/** Build a node from a shape + grid position, using the shared color palette. */
function node(
  id: string,
  shape: CanvasNodeShape,
  label: string,
  x: number,
  y: number,
  colorIndex = 0,
): CanvasNode {
  const { fill, text } = NODE_COLORS[colorIndex]
  return {
    id,
    type: CANVAS_NODE_TYPE,
    position: { x, y },
    ...SHAPE_DEFAULT_SIZE[shape],
    data: { label, color: fill, textColor: text, shape },
  }
}

function edge(source: string, target: string, label?: string): CanvasEdge {
  return {
    id: `${source}__${target}`,
    type: CANVAS_EDGE_TYPE,
    source,
    target,
    data: label ? { label } : {},
  }
}

/** Tight bounding box of a template's nodes, used to fit the card preview. */
export function templateBounds(template: CanvasTemplate) {
  const xs = template.nodes.map((n) => n.position.x)
  const ys = template.nodes.map((n) => n.position.y)
  const rights = template.nodes.map((n) => n.position.x + (n.width ?? 160))
  const bottoms = template.nodes.map((n) => n.position.y + (n.height ?? 80))
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return {
    minX,
    minY,
    width: Math.max(...rights) - minX,
    height: Math.max(...bottoms) - minY,
  }
}

const microservices: CanvasTemplate = {
  id: "microservices",
  name: "Microservices",
  description:
    "API Gateway routes traffic to isolated services, each backed by a dedicated database and connected via a shared message bus.",
  nodes: [
    node("ms-client", "circle", "Client", 0, 120, 0),
    node("ms-gateway", "diamond", "API Gateway", 200, 90, 3),
    node("ms-auth", "pill", "Auth Service", 480, 0, 1),
    node("ms-orders", "pill", "Orders Service", 480, 120, 6),
    node("ms-catalog", "pill", "Catalog Service", 480, 240, 6),
    node("ms-orders-db", "cylinder", "Orders DB", 720, 110, 7),
    node("ms-catalog-db", "cylinder", "Catalog DB", 720, 230, 7),
  ],
  edges: [
    edge("ms-client", "ms-gateway"),
    edge("ms-gateway", "ms-auth"),
    edge("ms-gateway", "ms-orders"),
    edge("ms-gateway", "ms-catalog"),
    edge("ms-orders", "ms-orders-db"),
    edge("ms-catalog", "ms-catalog-db"),
  ],
}

const cicd: CanvasTemplate = {
  id: "cicd-pipeline",
  name: "CI/CD Pipeline",
  description:
    "End-to-end delivery from source commit through build, test, containerisation, and staged deployment to production.",
  nodes: [
    node("ci-commit", "circle", "Commit", 0, 0, 0),
    node("ci-build", "rectangle", "Build", 220, 20, 1),
    node("ci-unit", "diamond", "Unit Tests", 420, -10, 3),
    node("ci-staging", "rectangle", "Deploy Staging", 680, 20, 6),
    node("ci-e2e", "diamond", "E2E Tests", 900, -10, 3),
    node("ci-prod", "rectangle", "Deploy Prod", 1160, 20, 6),
    node("ci-monitor", "circle", "Monitor", 1380, 0, 7),
  ],
  edges: [
    edge("ci-commit", "ci-build"),
    edge("ci-build", "ci-unit"),
    edge("ci-unit", "ci-staging", "pass"),
    edge("ci-staging", "ci-e2e"),
    edge("ci-e2e", "ci-prod", "pass"),
    edge("ci-prod", "ci-monitor"),
  ],
}

const eventDriven: CanvasTemplate = {
  id: "event-driven",
  name: "Event-Driven System",
  description:
    "Producers publish events to a central bus. Independent consumers handle emails, push notifications, analytics, and error queues.",
  nodes: [
    node("ev-producer", "pill", "Producer", 0, 120, 1),
    node("ev-bus", "hexagon", "Event Bus", 240, 110, 2),
    node("ev-consumer-a", "pill", "Analytics Consumer", 480, 0, 6),
    node("ev-consumer-b", "pill", "Notification Consumer", 480, 120, 6),
    node("ev-consumer-c", "pill", "Audit Consumer", 480, 240, 6),
    node("ev-analytics-db", "cylinder", "Analytics Store", 760, -10, 7),
    node("ev-notify", "pill", "Email / Push", 760, 120, 3),
  ],
  edges: [
    edge("ev-producer", "ev-bus"),
    edge("ev-bus", "ev-consumer-a"),
    edge("ev-bus", "ev-consumer-b"),
    edge("ev-bus", "ev-consumer-c"),
    edge("ev-consumer-a", "ev-analytics-db"),
    edge("ev-consumer-b", "ev-notify"),
  ],
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  microservices,
  cicd,
  eventDriven,
]

/** Window event the canvas listens for to swap in a template. */
export const IMPORT_TEMPLATE_EVENT = "canvas:import-template"

/** Ask the mounted canvas to replace its contents with `template`. */
export function dispatchTemplateImport(template: CanvasTemplate) {
  window.dispatchEvent(
    new CustomEvent<CanvasTemplate>(IMPORT_TEMPLATE_EVENT, { detail: template }),
  )
}
