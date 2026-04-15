# Cross-Role Workflow Scenarios

# سيناريوهات سير العمل عبر الأدوار

## Overview

These scenarios describe workflows that involve multiple FV roles working
together. Each step notes which role performs the action.

## CR-001: Component Integration Lifecycle

**Roles**: Developer → Manager → End User

1. **Developer** explores component gallery (`/frappe-visual-gallery`)
2. **Developer** tests component in Developer Console
3. **Developer** integrates component into target app
4. **Manager** reviews visual output on staging
5. **Manager** configures Kanban/Calendar defaults for the team
6. **End User** begins using enhanced views in daily work

## CR-002: Dashboard Deployment

**Roles**: Admin → Manager → End User

1. **Admin** configures SceneEngine workspace header
2. **Admin** sets up SceneDataBinder for KPI frames
3. **Manager** validates KPI numbers against reports
4. **Manager** adjusts dashboard refresh intervals
5. **End User** monitors KPIs daily on workspace

## CR-003: Visual Documentation Generation

**Roles**: Developer → Manager

1. **Developer** generates ERD for all app DocTypes
2. **Developer** creates App Map showing module relationships
3. **Developer** exports diagrams as SVG/PNG
4. **Manager** reviews diagrams for completeness
5. **Manager** embeds diagrams in wiki/About page

## CR-004: Onboarding Flow

**Roles**: Admin → End User

1. **Admin** triggers onboarding wizard for new user
2. **End User** follows guided slides in floating window
3. **End User** learns workspace navigation
4. **End User** practices with list/form enhancers
5. **Admin** monitors onboarding completion via statistics
