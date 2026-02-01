# Design Screen

Вы помогаете пользователю создать дизайн экрана для секции его продукта. Дизайн экрана будет компонентом React на основе пропсов, который можно экспортировать и интегрировать в любую кодовую базу React.

## Step 1: Check Prerequisites

Сначала определите целевую секцию и проверьте, что существуют `spec.md`, `data.json` и `types.ts`.

Прочитайте `/product/product-roadmap.md`, чтобы получить список доступных секций.

Если есть только одна секция, автоматически выберите её. Если секций несколько, используйте инструмент AskUserQuestion, чтобы спросить, для какой секции пользователь хочет создать дизайн экрана.

Затем проверьте, что все необходимые файлы существуют:

- `product/sections/[section-id]/spec.md`
- `product/sections/[section-id]/data.json`
- `product/sections/[section-id]/types.ts`

Если spec.md не существует:

"Я не вижу спецификации для **[Section Title]** пока. Пожалуйста, сначала запустите `/shape-section` для определения требований секции."

Если data.json или types.ts не существуют:

"Я не вижу примерных данных для **[Section Title]** пока. Пожалуйста, сначала запустите `/sample-data` для создания примерных данных и типов для дизайнов экранов."

Остановитесь здесь, если какой-либо файл отсутствует.

## Step 2: Check for Design System and Shell

Проверьте наличие дополнительных улучшений:

**Design Tokens:**
- Проверьте, существует ли `/product/design-system/colors.json`
- Проверьте, существует ли `/product/design-system/typography.json`

Если токены дизайна существуют, прочитайте их и используйте для стилизации. Если их нет, покажите предупреждение:

"Примечание: Токены дизайна еще не определены. Я буду использовать стили по умолчанию, но для согласованного брендинга рассмотрите сначала запуск `/design-tokens`."

**Shell:**
- Проверьте, существует ли `src/shell/components/AppShell.tsx`

Если shell существует, дизайн экрана будет отображаться внутри shell в Design OS. Если нет, покажите предупреждение:

"Примечание: Оболочка приложения еще не спроектирована. Дизайн экрана будет отображаться отдельно. Рассмотрите сначала запуск `/design-shell`, чтобы увидеть дизайны экранов секций в полном контексте приложения."

## Step 3: Analyze Requirements

Прочитайте и проанализируйте все три файла:

1. **spec.md** - Поймите пользовательские потоки и требования к UI
2. **data.json** - Поймите структуру данных и примерный контент
3. **types.ts** - Поймите интерфейсы TypeScript и доступные колбэки

Определите, какие представления нужны на основе спецификации. Общие паттерны:

- Представление списка/дашборда (показывает несколько элементов)
- Представление деталей (показывает один элемент)
- Представление формы/создания (для добавления/редактирования)

## Step 4: Clarify the Screen Design Scope

Если спецификация подразумевает несколько представлений, используйте инструмент AskUserQuestion, чтобы подтвердить, какое представление строить первым:

"Спецификация предполагает несколько разных представлений для **[Section Title]**:

1. **[View 1]** - [Краткое описание]
2. **[View 2]** - [Краткое описание]

Какое представление мне создать первым?"

Если есть только одно очевидное представление, продолжайте напрямую.

## Step 5: Invoke the Frontend Design Skill

Перед созданием дизайна экрана прочитайте навык `frontend-design`, чтобы обеспечить высококачественный дизайн.

Прочитайте файл `.claude/skills/frontend-design/SKILL.md` и следуйте его рекомендациям для создания отличительных, производственных интерфейсов.

## Step 6: Create the Props-Based Component

Создайте основной файл компонента в `src/sections/[section-id]/components/[ViewName].tsx`.

### Component Structure

Компонент ДОЛЖЕН:

- Импортировать типы из файла types.ts
- Принимать все данные через пропсы (никогда не импортировать data.json напрямую)
- Принимать пропсы колбэков для всех действий
- Быть полностью самодостаточным и портативным

Пример:

```tsx
import type { InvoiceListProps } from '@/../product/sections/[section-id]/types'

export function InvoiceList({
  invoices,
  onView,
  onEdit,
  onDelete,
  onCreate
}: InvoiceListProps) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Component content here */}

      {/* Example: Using a callback */}
      <button onClick={onCreate}>Create Invoice</button>

      {/* Example: Mapping data with callbacks */}
      {invoices.map(invoice => (
        <div key={invoice.id}>
          <span>{invoice.clientName}</span>
          <button onClick={() => onView?.(invoice.id)}>View</button>
          <button onClick={() => onEdit?.(invoice.id)}>Edit</button>
          <button onClick={() => onDelete?.(invoice.id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}
```

### Design Requirements

- **Адаптивность для мобильных:** Используйте адаптивные префиксы Tailwind (`sm:`, `md:`, `lg:`) и убедитесь, что макет дизайна работает плавно на мобильных, планшетах и настольных размерах экрана.
- **Светлый и темный режим:** Используйте варианты `dark:` для всех цветов
- **Используйте токены дизайна:** Если определены, применяйте цветовую палитру и типографику продукта
- **Следуйте навыку frontend-design:** Создавайте отличительные, запоминающиеся интерфейсы

### Applying Design Tokens

**Если `/product/design-system/colors.json` существует:**
- Используйте основной цвет для кнопок, ссылок и ключевых акцентов
- Используйте вторичный цвет для тегов, выделений, вторичных элементов
- Используйте нейтральный цвет для фонов, текста и границ
- Пример: Если основной цвет `lime`, используйте `lime-500`, `lime-600` и т.д. для основных действий

**Если `/product/design-system/typography.json` существует:**
- Отметьте выбор шрифтов для справки в комментариях
- Шрифты будут применены на уровне приложения, но используйте соответствующие веса шрифтов

**Если токены дизайна не существуют:**
- Используйте `stone` для нейтральных и `lime` для акцентов (значения по умолчанию Design OS)

### What to Include

- Реализуйте ВСЕ пользовательские потоки и требования к UI из спецификации
- Используйте данные пропсов (не жестко закодированные значения)
- Включите реалистичные состояния UI (hover, active и т.д.)
- Используйте пропсы колбэков для всех интерактивных элементов
- Обрабатывайте опциональные колбэки с опциональной цепочкой: `onClick={() => onDelete?.(id)}`

### What NOT to Include

- Никаких операторов `import data from` - данные приходят через пропсы
- Никаких функций, не указанных в спецификации
- Никакой логики маршрутизации - колбэки обрабатывают намерение навигации
- Никаких элементов навигации (shell обрабатывает навигацию)

## Step 7: Create Sub-Components (If Needed)

Для сложных представлений разбейте на подкомпоненты. Каждый подкомпонент также должен быть на основе пропсов.

Создайте подкомпоненты в `src/sections/[section-id]/components/[SubComponent].tsx`.

Пример:

```tsx
import type { Invoice } from '@/../product/sections/[section-id]/types'

interface InvoiceRowProps {
  invoice: Invoice
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function InvoiceRow({ invoice, onView, onEdit, onDelete }: InvoiceRowProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div>
        <p className="font-medium">{invoice.clientName}</p>
        <p className="text-sm text-stone-500">{invoice.invoiceNumber}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onView}>View</button>
        <button onClick={onEdit}>Edit</button>
        <button onClick={onDelete}>Delete</button>
      </div>
    </div>
  )
}
```

Затем импортируйте и используйте в основном компоненте:

```tsx
import { InvoiceRow } from './InvoiceRow'

export function InvoiceList({ invoices, onView, onEdit, onDelete }: InvoiceListProps) {
  return (
    <div>
      {invoices.map(invoice => (
        <InvoiceRow
          key={invoice.id}
          invoice={invoice}
          onView={() => onView?.(invoice.id)}
          onEdit={() => onEdit?.(invoice.id)}
          onDelete={() => onDelete?.(invoice.id)}
        />
      ))}
    </div>
  )
}
```

## Step 8: Create the Preview Wrapper

Создайте обертку предпросмотра в `src/sections/[section-id]/[ViewName].tsx` (примечание: это в корне секции, а не в components/).

Эта обертка - это то, что отображает Design OS. Она импортирует примерные данные и передает их в компонент на основе пропсов.

Пример:

```tsx
import data from '@/../product/sections/[section-id]/data.json'
import { InvoiceList } from './components/InvoiceList'

export default function InvoiceListPreview() {
  return (
    <InvoiceList
      invoices={data.invoices}
      onView={(id) => console.log('View invoice:', id)}
      onEdit={(id) => console.log('Edit invoice:', id)}
      onDelete={(id) => console.log('Delete invoice:', id)}
      onCreate={() => console.log('Create new invoice')}
    />
  )
}
```

Обертка предпросмотра:

- Имеет экспорт `default` (требуется для маршрутизации Design OS)
- Импортирует примерные данные из data.json
- Передает данные в компонент через пропсы
- Предоставляет обработчики console.log для колбэков (для тестирования взаимодействий)
- НЕ экспортируется в кодовую базу пользователя - только для Design OS
- **Будет отображаться внутри shell**, если он был спроектирован

## Step 9: Create Component Index

Создайте индексный файл в `src/sections/[section-id]/components/index.ts` для чистого экспорта всех компонентов.

Пример:

```tsx
export { InvoiceList } from './InvoiceList'
export { InvoiceRow } from './InvoiceRow'
// Add other sub-components as needed
```

## Step 10: Confirm and Next Steps

Сообщите пользователю:

"Я создал дизайн экрана для **[Section Title]**:

**Экспортируемые компоненты** (на основе пропсов, портативные):

- `src/sections/[section-id]/components/[ViewName].tsx`
- `src/sections/[section-id]/components/[SubComponent].tsx` (если создан)
- `src/sections/[section-id]/components/index.ts`

**Обертка предпросмотра** (только для Design OS):

- `src/sections/[section-id]/[ViewName].tsx`

**Важно:** Перезапустите ваш dev server, чтобы увидеть изменения.

[Если shell существует]: Дизайн экрана будет отображаться внутри оболочки вашего приложения, показывая полный опыт приложения.

[Если токены дизайна существуют]: Я применил вашу цветовую палитру ([primary], [secondary], [neutral]) и выбор типографики.

**Следующие шаги:**

- Запустите `/screenshot-design` для захвата скриншота этого дизайна экрана для документации
- Если спецификация требует дополнительных представлений, запустите `/design-screen` снова для их создания
- Когда все секции завершены, запустите `/export-product` для генерации полного пакета экспорта"

Если спецификация указывает, что нужны дополнительные представления:

"Спецификация также требует [другие представления]. Запустите `/design-screen` снова для их создания, затем `/screenshot-design` для захвата каждого."

## Important Notes

- ВСЕГДА читайте навык `frontend-design` перед созданием дизайнов экранов
- Компоненты ДОЛЖНЫ быть на основе пропсов - никогда не импортируйте data.json в экспортируемых компонентах
- Обертка предпросмотра - ЕДИНСТВЕННЫЙ файл, который импортирует data.json
- Используйте интерфейсы TypeScript из types.ts для всех пропсов
- Колбэки должны быть опциональными (используйте `?`) и вызываться с опциональной цепочкой (`?.`)
- Всегда напоминайте пользователю перезапустить dev server после создания файлов
- Подкомпоненты также должны быть на основе пропсов для максимальной портативности
- Применяйте токены дизайна, когда доступны, для согласованного брендинга
- Дизайны экранов отображаются внутри shell при просмотре в Design OS (если shell существует)
