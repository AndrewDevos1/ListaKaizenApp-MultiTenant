# Architecture Documentation

Technical architecture and design decisions for Kaizen Lists application.

## 📋 Overview

- **[Project Purpose](project-purpose.md)** - Why this project exists and what problems it solves
- **[Domain-Driven Design](domain-driven-design.md)** - DDD principles and how they're applied

## 🏗️ System Architecture

- **[Backend (Flask)](backend-flask.md)** - Backend architecture, patterns, and structure
  - Application factory pattern
  - Blueprint organization
  - Layered architecture (controllers, services, repositories)
  - Authentication & authorization

- **[Frontend Screens](frontend-screens.md)** - Frontend screen flow and navigation
  - User journeys
  - Screen hierarchy
  - Routing structure

## 💾 Data Architecture

- **[Database](database.md)** - Database design, schema, and best practices
  - Database choice (SQLite dev, PostgreSQL prod)
  - Schema overview
  - Migration strategy

- **[ER Model](er-model.md)** - Entity-Relationship model
  - Complete ER diagram
  - Table relationships
  - Foreign keys and constraints

- **[Data Flow](data-flow.md)** - How data flows through the system
  - Request/response flow
  - Data transformation layers
  - State management

- **[Data Flow Diagram](data-flow-diagram.md)** - Visual data flow diagrams
  - System boundaries
  - Data stores
  - Processes and flows

## 🔑 Key Design Patterns

### Backend Patterns
- **Application Factory** - `create_app()` for flexible configuration
- **Blueprint Organization** - Modular route organization
- **Repository Pattern** - Data access abstraction
- **Service Layer** - Business logic separation

### Database Patterns
- **Many-to-Many Relationships** - Always use junction tables
- **Soft Deletes** - Where appropriate for audit trails
- **Timestamps** - Created/updated tracking
- **Foreign Key Constraints** - Data integrity

### Frontend Patterns
- **Protected Routes** - Authentication guards
- **Context API** - Global state management
- **Component Composition** - Reusable UI components

---

## 📚 Related Documentation

- **Troubleshooting** → [../troubleshooting/](../troubleshooting/)
- **Implementation Guides** → [../guides/](../guides/)
- **Future Plans** → [../planning/](../planning/)
