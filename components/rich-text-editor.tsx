'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Undo2, Redo2 } from 'lucide-react'

type Props = {
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  autoFocus?: boolean
  placeholder?: string
  disabled?: boolean
}

// Keep the feature set narrow — tier descriptions are short, and the brand
// typography doesn't call for headings/quotes/code inside a booking card.
const EDITOR_CLASS =
  'min-h-[96px] w-full border border-input bg-transparent px-3 py-2 text-sm rounded-md shadow-xs outline-none focus:border-ring [&_p]:m-0 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline'

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={
        'inline-flex items-center justify-center h-7 w-7 rounded border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:hover:bg-transparent ' +
        (active ? 'bg-muted text-foreground border-border' : '')
      }
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  autoFocus,
  disabled,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: { class: EDITOR_CLASS },
    },
    onUpdate: ({ editor }: { editor: Editor }) => {
      onChange(editor.isEmpty ? '' : editor.getHTML())
    },
    onBlur,
    content: value || '',
    editable: !disabled,
    autofocus: autoFocus ? 'end' : false,
  })

  if (!editor) return null

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Ссылка (оставьте пустым чтобы убрать)', prev ?? '')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5 flex-wrap">
        <ToolbarButton
          label="Жирный"
          active={editor.isActive('bold')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Курсив"
          active={editor.isActive('italic')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Маркированный список"
          active={editor.isActive('bulletList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Нумерованный список"
          active={editor.isActive('orderedList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Ссылка"
          active={editor.isActive('link')}
          disabled={disabled}
          onClick={setLink}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          label="Отменить"
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Повторить"
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
