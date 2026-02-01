# Export Product

Вы помогаете пользователю экспортировать его полный дизайн продукта как пакет передачи для реализации. Это генерирует все файлы, необходимые для построения продукта в реальной кодовой базе.

## Step 1: Check Prerequisites

Проверьте, что существуют минимальные требования:

**Обязательные:**
- `/product/product-overview.md` — Обзор продукта
- `/product/product-roadmap.md` — Определенные секции
- По крайней мере одна секция с дизайнами экранов в `src/sections/[section-id]/`

**Рекомендуемые (показывать предупреждение, если отсутствуют):**
- `/product/data-model/data-model.md` — Глобальная модель данных
- `/product/design-system/colors.json` — Токены цветов
- `/product/design-system/typography.json` — Токены типографики
- `src/shell/components/AppShell.tsx` — Оболочка приложения

Если обязательные файлы отсутствуют:

"Для экспорта вашего продукта вам нужно минимум:
- Обзор продукта (`/product-vision`)
- Дорожная карта с секциями (`/product-roadmap`)
- По крайней мере одна секция с дизайнами экранов

Пожалуйста, сначала завершите эти."

Остановитесь здесь, если обязательные файлы отсутствуют.

Если рекомендуемые файлы отсутствуют, покажите предупреждения, но продолжайте:

"Примечание: Некоторые рекомендуемые элементы отсутствуют:
- [ ] Модель данных — Запустите `/data-model` для согласованных определений сущностей
- [ ] Токены дизайна — Запустите `/design-tokens` для согласованной стилизации
- [ ] Оболочка приложения — Запустите `/design-shell` для структуры навигации

Вы можете продолжить без них, но они помогают обеспечить полную передачу."

## Step 2: Gather Export Information

Прочитайте все соответствующие файлы:

1. `/product/product-overview.md` — Название продукта, описание, функции
2. `/product/product-roadmap.md` — Список секций по порядку
3. `/product/data-model/data-model.md` (если существует)
4. `/product/design-system/colors.json` (если существует)
5. `/product/design-system/typography.json` (если существует)
6. `/product/shell/spec.md` (если существует)
7. Для каждой секции: `spec.md`, `data.json`, `types.ts`
8. Список компонентов дизайна экранов в `src/sections/` и `src/shell/`

## Step 3: Create Export Directory Structure

Создайте директорию `product-plan/` со следующей структурой:

```
product-plan/
├── README.md                    # Quick start guide
├── product-overview.md          # Product summary (always provide)
│
├── prompts/                     # Ready-to-use prompts for coding agents
│   ├── one-shot-prompt.md       # Prompt for full implementation
│   └── section-prompt.md        # Prompt template for section-by-section
│
├── instructions/                # Implementation instructions
│   ├── one-shot-instructions.md # All milestones combined
│   └── incremental/             # For milestone-by-milestone implementation
│       ├── 01-foundation.md
│       ├── 02-[first-section].md
│       ├── 03-[second-section].md
│       └── ...
│
├── design-system/               # Design tokens
│   ├── tokens.css
│   ├── tailwind-colors.md
│   └── fonts.md
│
├── data-model/                  # Data model
│   ├── README.md
│   ├── types.ts
│   └── sample-data.json
│
├── shell/                       # Shell components
│   ├── README.md
│   ├── components/
│   │   ├── AppShell.tsx
│   │   ├── MainNav.tsx
│   │   ├── UserMenu.tsx
│   │   └── index.ts
│   └── screenshot.png (if exists)
│
└── sections/                    # Section components
    └── [section-id]/
        ├── README.md
        ├── tests.md               # Test-writing instructions for TDD
        ├── components/
        │   ├── [Component].tsx
        │   └── index.ts
        ├── types.ts
        ├── sample-data.json
        └── screenshot.png (if exists)
```

## Step 4: Generate product-overview.md

Создайте `product-plan/product-overview.md`:

```markdown
# [Product Name] — Product Overview

## Summary

[Product description from product-overview.md]

## Planned Sections

[Ordered list of sections from roadmap with descriptions]

1. **[Section 1]** — [Description]
2. **[Section 2]** — [Description]
...

## Data Model

[If data model exists: list entity names]
[If not: "Data model to be defined during implementation"]

## Design System

**Colors:**
- Primary: [color or "Not defined"]
- Secondary: [color or "Not defined"]
- Neutral: [color or "Not defined"]

**Typography:**
- Heading: [font or "Not defined"]
- Body: [font or "Not defined"]
- Mono: [font or "Not defined"]

## Implementation Sequence

Build this product in milestones:

1. **Foundation** — Set up design tokens, data model types, and application shell
2. **[Section 1]** — [Brief description]
3. **[Section 2]** — [Brief description]
...

Each milestone has a dedicated instruction document in `product-plan/instructions/`.
```

## Step 5: Generate Milestone Instructions

Каждый файл инструкций по вехам должен начинаться со следующего преамбулы (адаптируйте детали, специфичные для вехи):

```markdown
---

## About These Instructions

**What you're receiving:**
- Finished UI designs (React components with full styling)
- Data model definitions (TypeScript types and sample data)
- UI/UX specifications (user flows, requirements, screenshots)
- Design system tokens (colors, typography, spacing)
- Test-writing instructions for each section (for TDD approach)

**What you need to build:**
- Backend API endpoints and database schema
- Authentication and authorization
- Data fetching and state management
- Business logic and validation
- Integration of the provided UI components with real data

**Important guidelines:**
- **DO NOT** redesign or restyle the provided components — use them as-is
- **DO** wire up the callback props to your routing and API calls
- **DO** replace sample data with real data from your backend
- **DO** implement proper error handling and loading states
- **DO** implement empty states when no records exist (first-time users, after deletions)
- **DO** use test-driven development — write tests first using `tests.md` instructions
- The components are props-based and ready to integrate — focus on the backend and data layer

---
```

### 01-foundation.md

Поместите в `product-plan/instructions/incremental/01-foundation.md`:

```markdown
# Milestone 1: Foundation

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** None

[Include the preamble above]

## Goal

Set up the foundational elements: design tokens, data model types, routing structure, and application shell.

## What to Implement

### 1. Design Tokens

[If design tokens exist:]
Configure your styling system with these tokens:

- See `product-plan/design-system/tokens.css` for CSS custom properties
- See `product-plan/design-system/tailwind-colors.md` for Tailwind configuration
- See `product-plan/design-system/fonts.md` for Google Fonts setup

[If not:]
Define your own design tokens based on your brand guidelines.

### 2. Data Model Types

[If data model exists:]
Create TypeScript interfaces for your core entities:

- See `product-plan/data-model/types.ts` for interface definitions
- See `product-plan/data-model/README.md` for entity relationships

[If not:]
Define data types as you implement each section.

### 3. Routing Structure

Create placeholder routes for each section:

[List routes based on roadmap sections]

### 4. Application Shell

[If shell exists:]

Copy the shell components from `product-plan/shell/components/` to your project:

- `AppShell.tsx` — Main layout wrapper
- `MainNav.tsx` — Navigation component
- `UserMenu.tsx` — User menu with avatar

**Wire Up Navigation:**

Connect navigation to your routing:

[List nav items from shell spec]

**User Menu:**

The user menu expects:
- User name
- Avatar URL (optional)
- Logout callback

[If shell doesn't exist:]

Design and implement your own application shell with:
- Navigation for all sections
- User menu
- Responsive layout

## Files to Reference

- `product-plan/design-system/` — Design tokens
- `product-plan/data-model/` — Type definitions
- `product-plan/shell/README.md` — Shell design intent
- `product-plan/shell/components/` — Shell React components
- `product-plan/shell/screenshot.png` — Shell visual reference

## Done When

- [ ] Design tokens are configured
- [ ] Data model types are defined
- [ ] Routes exist for all sections (can be placeholder pages)
- [ ] Shell renders with navigation
- [ ] Navigation links to correct routes
- [ ] User menu shows user info
- [ ] Responsive on mobile
```

### [NN]-[section-id].md (for each section)

Поместите в `product-plan/instructions/incremental/[NN]-[section-id].md` (начиная с 02 для первой секции):

```markdown
# Milestone [N]: [Section Title]

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** Milestone 1 (Foundation) complete, plus any prior section milestones

## Goal

Implement the [Section Title] feature — [brief description from roadmap].

## Overview

[One paragraph describing what this section enables users to do. Focus on the user's perspective and the value they get from this feature. Extract from spec.md overview.]

**Key Functionality:**
- [Bullet point 1 — e.g., "View a list of all projects with status indicators"]
- [Bullet point 2 — e.g., "Create new projects with name, description, and due date"]
- [Bullet point 3 — e.g., "Edit existing project details inline"]
- [Bullet point 4 — e.g., "Delete projects with confirmation"]
- [Bullet point 5 — e.g., "Filter projects by status or search by name"]

[List 3-6 key capabilities that the UI components support and need backend wiring]

## Recommended Approach: Test-Driven Development

Before implementing this section, **write tests first** based on the test specifications provided.

See `product-plan/sections/[section-id]/tests.md` for detailed test-writing instructions including:
- Key user flows to test (success and failure paths)
- Specific UI elements, button labels, and interactions to verify
- Expected behaviors and assertions

The test instructions are framework-agnostic — adapt them to your testing setup (Jest, Vitest, Playwright, Cypress, RSpec, Minitest, PHPUnit, etc.).

**TDD Workflow:**
1. Read `tests.md` and write failing tests for the key user flows
2. Implement the feature to make tests pass
3. Refactor while keeping tests green

## What to Implement

### Components

Copy the section components from `product-plan/sections/[section-id]/components/`:

[List components]

### Data Layer

The components expect these data shapes:

[Key types from types.ts]

You'll need to:
- Create API endpoints or data fetching logic
- Connect real data to the components

### Callbacks

Wire up these user actions:

[List callbacks from Props interface with descriptions]

### Empty States

Implement empty state UI for when no records exist yet:

- **No data yet:** Show a helpful message and call-to-action when the primary list/collection is empty
- **No related records:** Handle cases where associated records don't exist (e.g., a project with no tasks)
- **First-time user experience:** Guide users to create their first item with clear CTAs

The provided components include empty state designs — make sure to render them when data is empty rather than showing blank screens.

## Files to Reference

- `product-plan/sections/[section-id]/README.md` — Feature overview and design intent
- `product-plan/sections/[section-id]/tests.md` — Test-writing instructions (use for TDD)
- `product-plan/sections/[section-id]/components/` — React components
- `product-plan/sections/[section-id]/types.ts` — TypeScript interfaces
- `product-plan/sections/[section-id]/sample-data.json` — Test data
- `product-plan/sections/[section-id]/screenshot.png` — Visual reference

## Expected User Flows

When fully implemented, users should be able to complete these flows:

### Flow 1: [Primary Flow Name — e.g., "Create a New Project"]

1. User [starting action — e.g., "clicks 'New Project' button"]
2. User [next step — e.g., "fills in project name and description"]
3. User [next step — e.g., "clicks 'Create' to save"]
4. **Outcome:** [Expected result — e.g., "New project appears in the list, success message shown"]

### Flow 2: [Secondary Flow Name — e.g., "Edit an Existing Project"]

1. User [starting action — e.g., "clicks on a project row"]
2. User [next step — e.g., "modifies the project details"]
3. User [next step — e.g., "clicks 'Save' to confirm changes"]
4. **Outcome:** [Expected result — e.g., "Project updates in place, changes persisted"]

### Flow 3: [Additional Flow — e.g., "Delete a Project"]

1. User [starting action — e.g., "clicks delete icon on a project"]
2. User [next step — e.g., "confirms deletion in the modal"]
3. **Outcome:** [Expected result — e.g., "Project removed from list, empty state shown if last item"]

[Include 2-4 flows covering the main user journeys in this section. Reference the specific UI elements and button labels from the components.]

## Done When

- [ ] Tests written for key user flows (success and failure paths)
- [ ] All tests pass
- [ ] Components render with real data
- [ ] Empty states display properly when no records exist
- [ ] All user actions work
- [ ] User can complete all expected flows end-to-end
- [ ] Matches the visual design
- [ ] Responsive on mobile
```

## Step 6: Generate one-shot-instructions.md

Создайте `product-plan/instructions/one-shot-instructions.md`, объединив весь контент вех в один документ. Включите преамбулу в самом верху:

```markdown
# [Product Name] — Complete Implementation Instructions

---

## About These Instructions

**What you're receiving:**
- Finished UI designs (React components with full styling)
- Data model definitions (TypeScript types and sample data)
- UI/UX specifications (user flows, requirements, screenshots)
- Design system tokens (colors, typography, spacing)
- Test-writing instructions for each section (for TDD approach)

**What you need to build:**
- Backend API endpoints and database schema
- Authentication and authorization
- Data fetching and state management
- Business logic and validation
- Integration of the provided UI components with real data

**Important guidelines:**
- **DO NOT** redesign or restyle the provided components — use them as-is
- **DO** wire up the callback props to your routing and API calls
- **DO** replace sample data with real data from your backend
- **DO** implement proper error handling and loading states
- **DO** implement empty states when no records exist (first-time users, after deletions)
- **DO** use test-driven development — write tests first using `tests.md` instructions
- The components are props-based and ready to integrate — focus on the backend and data layer

---

## Test-Driven Development

Each section includes a `tests.md` file with detailed test-writing instructions. These are **framework-agnostic** — adapt them to your testing setup (Jest, Vitest, Playwright, Cypress, RSpec, Minitest, PHPUnit, etc.).

**For each section:**
1. Read `product-plan/sections/[section-id]/tests.md`
2. Write failing tests for key user flows (success and failure paths)
3. Implement the feature to make tests pass
4. Refactor while keeping tests green

The test instructions include:
- Specific UI elements, button labels, and interactions to verify
- Expected success and failure behaviors
- Empty state handling (when no records exist yet)
- Data assertions and state validations

---

[Include product-overview.md content]

---

# Milestone 1: Foundation

[Include 01-foundation.md content WITHOUT the preamble — it's already at the top. This includes design tokens, data model, routing, AND application shell.]

---

# Milestone 2: [First Section Name]

[Include first section handoff content WITHOUT the preamble]

---

# Milestone 3: [Second Section Name]

[Include second section handoff content WITHOUT the preamble]

[Repeat for all sections, incrementing milestone numbers]
```

## Step 7: Copy and Transform Components

### Shell Components

Скопируйте из `src/shell/components/` в `product-plan/shell/components/`:

- Преобразуйте пути импорта из `@/...` в относительные пути
- Удалите любые импорты, специфичные для Design OS
- Убедитесь, что компоненты самодостаточны

### Section Components

Для каждой секции скопируйте из `src/sections/[section-id]/components/` в `product-plan/sections/[section-id]/components/`:

- Преобразуйте пути импорта:
  - `@/../product/sections/[section-id]/types` → `../types`
- Удалите импорты, специфичные для Design OS
- Оставьте только экспортируемые компоненты (не обертки предпросмотра)

### Types Files

Скопируйте `product/sections/[section-id]/types.ts` в `product-plan/sections/[section-id]/types.ts`

### Sample Data

Скопируйте `product/sections/[section-id]/data.json` в `product-plan/sections/[section-id]/sample-data.json`

## Step 8: Generate Section READMEs

Для каждой секции создайте `product-plan/sections/[section-id]/README.md`:

```markdown
# [Section Title]

## Overview

[From spec.md overview]

## User Flows

[From spec.md user flows]

## Design Decisions

[Notable design choices from the screen design]

## Data Used

**Entities:** [List entities from types.ts]

**From global model:** [Which entities from data model are used]

## Visual Reference

See `screenshot.png` for the target UI design.

## Components Provided

- `[Component]` — [Brief description]
- `[SubComponent]` — [Brief description]

## Callback Props

| Callback | Description |
|----------|-------------|
| `onView` | Called when user clicks to view details |
| `onEdit` | Called when user clicks to edit |
| `onDelete` | Called when user clicks to delete |
| `onCreate` | Called when user clicks to create new |

[Adjust based on actual Props interface]
```

## Step 9: Generate Section Test Instructions

Для каждой секции создайте `product-plan/sections/[section-id]/tests.md` с подробными инструкциями по написанию тестов на основе спецификации секции, пользовательских потоков и дизайна UI.

```markdown
# Test Instructions: [Section Title]

These test-writing instructions are **framework-agnostic**. Adapt them to your testing setup (Jest, Vitest, Playwright, Cypress, React Testing Library, RSpec, Minitest, PHPUnit, etc.).

## Overview

[Brief description of what this section does and the key functionality to test]

---

## User Flow Tests

### Flow 1: [Primary User Flow Name]

**Scenario:** [Describe what the user is trying to accomplish]

#### Success Path

**Setup:**
- [Preconditions - what state the app should be in]
- [Sample data to use - reference types from types.ts]

**Steps:**
1. User navigates to [page/route]
2. User sees [specific UI element - be specific about labels, text]
3. User clicks [specific button/link with exact label]
4. User enters [specific data in specific field]
5. User clicks [submit button with exact label]

**Expected Results:**
- [ ] [Specific UI change - e.g., "Success toast appears with message 'Item created'"]
- [ ] [Data assertion - e.g., "New item appears in the list"]
- [ ] [State change - e.g., "Form is cleared and reset to initial state"]
- [ ] [Navigation - e.g., "User is redirected to /items/:id"]

#### Failure Path: [Specific Failure Scenario]

**Setup:**
- [Conditions that will cause failure - e.g., "Server returns 500 error"]

**Steps:**
1. [Same steps as success path, or modified steps]

**Expected Results:**
- [ ] [Error handling - e.g., "Error message appears: 'Unable to save. Please try again.'"]
- [ ] [UI state - e.g., "Form data is preserved, not cleared"]
- [ ] [User can retry - e.g., "Submit button remains enabled"]

#### Failure Path: [Validation Error]

**Setup:**
- [Conditions - e.g., "User submits empty required field"]

**Steps:**
1. User leaves [specific field] empty
2. User clicks [submit button]

**Expected Results:**
- [ ] [Validation message - e.g., "Field shows error: 'Name is required'"]
- [ ] [Form state - e.g., "Form is not submitted"]
- [ ] [Focus - e.g., "Focus moves to first invalid field"]

---

### Flow 2: [Secondary User Flow Name]

[Repeat the same structure for additional flows]

---

## Empty State Tests

Empty states are critical for first-time users and when records are deleted. Test these thoroughly:

### Primary Empty State

**Scenario:** User has no [primary records] yet (first-time or all deleted)

**Setup:**
- [Primary data collection] is empty (`[]`)

**Expected Results:**
- [ ] [Empty state message is visible - e.g., "Shows heading 'No projects yet'"]
- [ ] [Helpful description - e.g., "Shows text 'Create your first project to get started'"]
- [ ] [Primary CTA is visible - e.g., "Shows button 'Create Project'"]
- [ ] [CTA is functional - e.g., "Clicking 'Create Project' opens the create form/modal"]
- [ ] [No blank screen - The UI is helpful, not empty or broken]

### Related Records Empty State

**Scenario:** A [parent record] exists but has no [child records] yet

**Setup:**
- [Parent record] exists with valid data
- [Child records collection] is empty (`[]`)

**Expected Results:**
- [ ] [Parent renders correctly with its data]
- [ ] [Child section shows empty state - e.g., "Shows 'No tasks yet' in the tasks panel"]
- [ ] [CTA to add child record - e.g., "Shows 'Add Task' button"]
- [ ] [No broken layouts or missing sections]

### Filtered/Search Empty State

**Scenario:** User applies filters or search that returns no results

**Setup:**
- Data exists but filter/search matches nothing

**Expected Results:**
- [ ] [Clear message - e.g., "Shows 'No results found'"]
- [ ] [Guidance - e.g., "Shows 'Try adjusting your filters' or similar"]
- [ ] [Reset option - e.g., "Shows 'Clear filters' link"]

---

## Component Interaction Tests

### [Component Name]

**Renders correctly:**
- [ ] [Specific element is visible - e.g., "Displays item title 'Sample Item'"]
- [ ] [Data display - e.g., "Shows formatted date 'Dec 12, 2025'"]

**User interactions:**
- [ ] [Click behavior - e.g., "Clicking 'Edit' button calls onEdit with item id"]
- [ ] [Hover behavior - e.g., "Hovering row shows action buttons"]
- [ ] [Keyboard - e.g., "Pressing Escape closes the modal"]

**Loading and error states:**
- [ ] [Loading - e.g., "Shows skeleton loader while data is fetching"]
- [ ] [Error - e.g., "Shows error message when data fails to load"]

---

## Edge Cases

- [ ] [Edge case 1 - e.g., "Handles very long item names with text truncation"]
- [ ] [Edge case 2 - e.g., "Works correctly with 1 item and 100+ items"]
- [ ] [Edge case 3 - e.g., "Preserves data when navigating away and back"]
- [ ] [Transition from empty to populated - e.g., "After creating first item, list renders correctly"]
- [ ] [Transition from populated to empty - e.g., "After deleting last item, empty state appears"]

---

## Accessibility Checks

- [ ] [All interactive elements are keyboard accessible]
- [ ] [Form fields have associated labels]
- [ ] [Error messages are announced to screen readers]
- [ ] [Focus is managed appropriately after actions]

---

## Sample Test Data

Use the data from `sample-data.json` or create variations:

[Include 2-3 example data objects based on types.ts that tests can use]

```typescript
// Example test data - populated state
const mockItem = {
  id: "test-1",
  name: "Test Item",
  // ... other fields from types.ts
};

const mockItems = [mockItem, /* ... more items */];

// Example test data - empty states
const mockEmptyList = [];

const mockItemWithNoChildren = {
  id: "test-1",
  name: "Test Item",
  children: [], // No related records
};

// Example test data - error states
const mockErrorResponse = {
  status: 500,
  message: "Internal server error"
};
```

---

## Notes for Test Implementation

- Mock API calls to test both success and failure scenarios
- Test each callback prop is called with correct arguments
- Verify UI updates optimistically where appropriate
- Test that loading states appear during async operations
- Ensure error boundaries catch and display errors gracefully
- **Always test empty states** — Pass empty arrays to verify helpful empty state UI appears (not blank screens)
- Test transitions: empty → first item created, last item deleted → empty state returns
```

### Guidelines for Writing tests.md

При генерации tests.md для каждой секции:

1. **Тщательно прочитайте spec.md** — Извлеките все пользовательские потоки и требования
2. **Изучите компоненты дизайна экранов** — Отметьте точные метки кнопок, имена полей, текст UI
3. **Просмотрите types.ts** — Поймите формы данных для утверждений
4. **Включите конкретный текст UI** — Тесты должны проверять точные метки, сообщения, плейсхолдеры
5. **Покройте пути успеха и неудачи** — Каждое действие должно иметь оба протестированных
6. **Всегда тестируйте пустые состояния** — Основные списки без элементов, родительские записи без дочерних, отфильтрованные результаты без совпадений
7. **Будьте конкретны в утверждениях** — "Показывает ошибку" слишком расплывчато; "Показывает красную границу и сообщение 'Email обязателен' под полем" конкретно
8. **Включите граничные случаи** — Граничные условия, переходы между пустыми и заполненными состояниями
9. **Оставайтесь независимыми от фреймворка** — Описывайте ЧТО тестировать, а не КАК писать тестовый код

## Step 10: Generate Design System Files

### tokens.css

```css
/* Design Tokens for [Product Name] */

:root {
  /* Colors */
  --color-primary: [Tailwind color];
  --color-secondary: [Tailwind color];
  --color-neutral: [Tailwind color];

  /* Typography */
  --font-heading: '[Heading Font]', sans-serif;
  --font-body: '[Body Font]', sans-serif;
  --font-mono: '[Mono Font]', monospace;
}
```

### tailwind-colors.md

```markdown
# Tailwind Color Configuration

## Color Choices

- **Primary:** `[color]` — Used for buttons, links, key accents
- **Secondary:** `[color]` — Used for tags, highlights, secondary elements
- **Neutral:** `[color]` — Used for backgrounds, text, borders

## Usage Examples

Primary button: `bg-[primary]-600 hover:bg-[primary]-700 text-white`
Secondary badge: `bg-[secondary]-100 text-[secondary]-800`
Neutral text: `text-[neutral]-600 dark:text-[neutral]-400`
```

### fonts.md

```markdown
# Typography Configuration

## Google Fonts Import

Add to your HTML `<head>` or CSS:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=[Heading+Font]&family=[Body+Font]&family=[Mono+Font]&display=swap" rel="stylesheet">
```

## Font Usage

- **Headings:** [Heading Font]
- **Body text:** [Body Font]
- **Code/technical:** [Mono Font]
```

## Step 11: Generate Prompt Files

Создайте директорию `product-plan/prompts/` с двумя готовыми к использованию файлами промптов.

### one-shot-prompt.md

Создайте `product-plan/prompts/one-shot-prompt.md`:

```markdown
# One-Shot Implementation Prompt

I need you to implement a complete web application based on detailed design specifications and UI components I'm providing.

## Instructions

Please carefully read and analyze the following files:

1. **@product-plan/product-overview.md** — Product summary with sections and data model overview
2. **@product-plan/instructions/one-shot-instructions.md** — Complete implementation instructions for all milestones

After reading these, also review:
- **@product-plan/design-system/** — Color and typography tokens
- **@product-plan/data-model/** — Entity types and relationships
- **@product-plan/shell/** — Application shell components
- **@product-plan/sections/** — All section components, types, sample data, and test instructions

## Before You Begin

Please ask me clarifying questions about:

1. **Authentication & Authorization**
   - How should users sign up and log in? (email/password, OAuth providers, magic links?)
   - Are there different user roles with different permissions?
   - Should there be an admin interface?

2. **User & Account Modeling**
   - Is this a single-user app or multi-user?
   - Do users belong to organizations/teams/workspaces?
   - How should user profiles be structured?

3. **Tech Stack Preferences**
   - What backend framework/language should I use?
   - What database do you prefer?
   - Any specific hosting/deployment requirements?

4. **Backend Business Logic**
   - Any server-side logic, validations or processes needed beyond what's shown in the UI?
   - Background processes, notifications, or other processes to trigger?

5. **Any Other Clarifications**
   - Questions about specific features or user flows
   - Edge cases that need clarification
   - Integration requirements

Lastly, be sure to ask me if I have any other notes to add for this implementation.

Once I answer your questions, create a comprehensive implementation plan before coding.

```

### section-prompt.md

Создайте `product-plan/prompts/section-prompt.md`:

```markdown
# Section Implementation Prompt

## Define Section Variables

- **SECTION_NAME** = [Human-readable name, e.g., "Invoices" or "Project Dashboard"]
- **SECTION_ID** = [Folder name in sections/, e.g., "invoices" or "project-dashboard"]
- **NN** = [Milestone number, e.g., "02" or "03" — sections start at 02 since 01 is Foundation]

---

I need you to implement the **SECTION_NAME** section of my application.

## Instructions

Please carefully read and analyze the following files:

1. **@product-plan/product-overview.md** — Product summary for overall context
2. **@product-plan/instructions/incremental/NN-SECTION_ID.md** — Specific instructions for this section

Also review the section assets:
- **@product-plan/sections/SECTION_ID/README.md** — Feature overview and design intent
- **@product-plan/sections/SECTION_ID/tests.md** — Test-writing instructions (use TDD approach)
- **@product-plan/sections/SECTION_ID/components/** — React components to integrate
- **@product-plan/sections/SECTION_ID/types.ts** — TypeScript interfaces
- **@product-plan/sections/SECTION_ID/sample-data.json** — Test data

## Before You Begin

Please ask me clarifying questions about:

1. **Authentication & Authorization** (if not yet established)
   - How should users authenticate?
   - What permissions are needed for this section?

2. **Data Relationships**
   - How does this section's data relate to other entities?
   - Are there any cross-section dependencies?

3. **Integration Points**
   - How should this section connect to existing features?
   - Any API endpoints already built that this should use?

4. **Backend Business Logic**
   - Any server-side logic, validations or processes needed beyond what's shown in the UI?
   - Background processes, notifications, or other processes to trigger?

5. **Any Other Clarifications**
   - Questions about specific user flows in this section
   - Edge cases that need clarification

## Implementation Approach

Use test-driven development:
1. Read the `tests.md` file and write failing tests first
2. Implement the feature to make tests pass
3. Refactor while keeping tests green

Lastly, be sure to ask me if I have any other notes to add for this implementation.

Once I answer your questions, proceed with implementation.

```

## Step 12: Generate README.md

Создайте `product-plan/README.md`:

```markdown
# [Product Name] — Design Handoff

This folder contains everything needed to implement [Product Name].

## What's Included

**Ready-to-Use Prompts:**
- `prompts/one-shot-prompt.md` — Prompt template for full implementation
- `prompts/section-prompt.md` — Prompt template for section-by-section implementation

**Instructions:**
- `product-overview.md` — Product summary (provide with every implementation)
- `instructions/one-shot-instructions.md` — All milestones combined for full implementation
- `instructions/incremental/` — Milestone-by-milestone instructions (foundation, then sections)

**Design Assets:**
- `design-system/` — Colors, fonts, design tokens
- `data-model/` — Core entities and TypeScript types
- `shell/` — Application shell components
- `sections/` — All section components, types, sample data, and test instructions

## How to Use This

### Option A: Incremental (Recommended)

Build your app milestone by milestone for better control:

1. Copy the `product-plan/` folder to your codebase
2. Start with Foundation (`instructions/incremental/01-foundation.md`) — includes design tokens, data model, routing, and application shell
3. For each section:
   - Open `prompts/section-prompt.md`
   - Fill in the section variables at the top (SECTION_NAME, SECTION_ID, NN)
   - Copy/paste into your coding agent
   - Answer questions and implement
4. Review and test after each milestone

### Option B: One-Shot

Build the entire app in one session:

1. Copy the `product-plan/` folder to your codebase
2. Open `prompts/one-shot-prompt.md`
3. Add any additional notes to the prompt
4. Copy/paste the prompt into your coding agent
5. Answer the agent's clarifying questions
6. Let the agent plan and implement everything

## Test-Driven Development

Each section includes a `tests.md` file with test-writing instructions. For best results:

1. Read `sections/[section-id]/tests.md` before implementing
2. Write failing tests based on the instructions
3. Implement the feature to make tests pass
4. Refactor while keeping tests green

The test instructions are **framework-agnostic** — they describe WHAT to test, not HOW. Adapt to your testing setup (Jest, Vitest, Playwright, Cypress, RSpec, Minitest, PHPUnit, etc.).

## Tips

- **Use the pre-written prompts** — They include important clarifying questions about auth and data modeling.
- **Add your own notes** — Customize prompts with project-specific context when needed.
- **Build on your designs** — Use completed sections as the starting point for future feature development.
- **Review thoroughly** — Check plans and implementations carefully to catch details and inconsistencies.
- **Fill in the gaps** — Backend business logic may need manual additions. Incremental implementation helps you identify these along the way.

---

*Generated by Design OS*
```

## Step 13: Copy Screenshots

Скопируйте любые файлы `.png` из:
- `product/shell/` → `product-plan/shell/`
- `product/sections/[section-id]/` → `product-plan/sections/[section-id]/`

## Step 14: Create Zip File

После генерации всех файлов экспорта создайте zip-архив папки product-plan:

```bash
# Remove any existing zip file
rm -f product-plan.zip

# Create the zip file
cd . && zip -r product-plan.zip product-plan/
```

Это создаст `product-plan.zip` в корне проекта, который будет доступен для загрузки на странице Export.

## Step 15: Confirm Completion

Сообщите пользователю:

"Я создал полный пакет экспорта в `product-plan/` и `product-plan.zip`.

**Что включено:**

**Готовые к использованию промпты:**
- `prompts/one-shot-prompt.md` — Промпт для полной реализации
- `prompts/section-prompt.md` — Шаблон промпта для реализации по секциям

**Инструкции:**
- `product-overview.md` — Резюме продукта (всегда предоставляйте с инструкциями)
- `instructions/one-shot-instructions.md` — Все вехи объединены
- `instructions/incremental/` — [N] инструкций по вехам (основа, затем секции)

**Дизайн-активы:**
- `design-system/` — Цвета, шрифты, токены
- `data-model/` — Типы сущностей и примерные данные
- `shell/` — Компоненты оболочки приложения
- `sections/` — [N] пакетов компонентов секций с инструкциями по тестам

**Загрузка:**

Перезапустите ваш dev server и посетите страницу Export для загрузки `product-plan.zip`.

**Как использовать:**

1. Скопируйте `product-plan/` в вашу кодовую базу реализации
2. Откройте `prompts/one-shot-prompt.md` или `prompts/section-prompt.md`
3. Добавьте любые дополнительные заметки, затем скопируйте/вставьте в ваш агент кодирования
4. Ответьте на уточняющие вопросы агента об аутентификации, моделировании данных и т.д.
5. Позвольте агенту реализовать на основе инструкций

Компоненты на основе пропсов и портативны — они принимают данные и колбэки, позволяя вашему агенту реализации обрабатывать маршрутизацию, получение данных и управление состоянием как угодно подходит вашему стеку."

## Important Notes

- Всегда преобразуйте пути импорта при копировании компонентов
- Включайте контекст `product-overview.md` в каждую сессию реализации
- Используйте предварительно написанные промпты — они запрашивают важные уточняющие вопросы
- Скриншоты предоставляют визуальную справку для проверки точности
- Файлы примерных данных предназначены для тестирования перед построением реальных API
- Экспорт самодостаточен — нет зависимостей от Design OS
- Компоненты портативны — они работают с любой настройкой React
