'use client';

import { useMemo } from 'react';
import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandItem,
  EditorCommandEmpty,
  EditorCommandList,
  EditorBubble,
  EditorBubbleItem,
  type JSONContent,
  type EditorInstance,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
  createImageUpload,
  createSuggestionItems,
  Command,
  renderItems,
  TiptapImage,
  StarterKit,
  Placeholder,
  TiptapLink,
  TiptapUnderline,
  TaskList,
  TaskItem,
  HorizontalRule,
  CharacterCount,
  HighlightExtension,
  TextStyle,
  Color,
  UploadImagesPlugin,
} from 'novel';

import { uploadFile } from '@/lib/firebase/upload';

// ─── Image upload via Firebase Storage ───

const uploadFn = createImageUpload({
  onUpload: async (file: File) => {
    const result = await uploadFile(file, 'article-images');
    return result.url;
  },
  validateFn: (file) => {
    if (!file.type.includes('image/')) {
      return false;
    }
    if (file.size / 1024 / 1024 > 10) {
      return false;
    }
    return true;
  },
});

// ─── Extensions ───

const tiptapImage = TiptapImage.extend({
  addProseMirrorPlugins() {
    return [
      UploadImagesPlugin({
        imageClass: 'opacity-40 rounded-lg border border-gray-200 dark:border-gray-700',
      }),
    ];
  },
}).configure({
  allowBase64: true,
  HTMLAttributes: {
    class: 'rounded-lg border border-gray-200 dark:border-gray-700',
  },
});

const placeholder = Placeholder.configure({
  placeholder: ({ node }) => {
    if (node.type.name === 'heading') return `Heading ${node.attrs.level}`;
    return "Press '/' for commands, or start writing...";
  },
  includeChildren: true,
});

const tiptapLink = TiptapLink.configure({
  HTMLAttributes: {
    class: 'text-cranberry underline underline-offset-4 hover:text-cranberry-800 transition-colors cursor-pointer',
  },
});

const taskList = TaskList.configure({
  HTMLAttributes: { class: 'not-prose pl-2' },
});

const taskItem = TaskItem.configure({
  HTMLAttributes: { class: 'flex gap-2 items-start my-4' },
  nested: true,
});

const horizontalRule = HorizontalRule.configure({
  HTMLAttributes: { class: 'mt-4 mb-6 border-t border-gray-300 dark:border-gray-700' },
});

const starterKit = StarterKit.configure({
  bulletList: {
    HTMLAttributes: { class: 'list-disc list-outside leading-3 -mt-2' },
  },
  orderedList: {
    HTMLAttributes: { class: 'list-decimal list-outside leading-3 -mt-2' },
  },
  listItem: {
    HTMLAttributes: { class: 'leading-normal -mb-2' },
  },
  blockquote: {
    HTMLAttributes: { class: 'border-l-4 border-cranberry pl-4 italic' },
  },
  codeBlock: {
    HTMLAttributes: { class: 'rounded-lg bg-gray-900 text-gray-100 p-4 font-mono text-sm' },
  },
  code: {
    HTMLAttributes: { class: 'rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 font-mono text-sm' },
  },
  horizontalRule: false,
  dropcursor: {
    color: '#dc2440',
    width: 4,
  },
});

const defaultExtensions = [
  starterKit,
  placeholder,
  tiptapLink,
  tiptapImage,
  TiptapUnderline,
  taskList,
  taskItem,
  horizontalRule,
  CharacterCount,
  HighlightExtension.configure({ multicolor: true }),
  TextStyle,
  Color,
];

// ─── Slash Commands ───

const suggestionItems = createSuggestionItems([
  {
    title: 'Text',
    description: 'Plain text paragraph.',
    searchTerms: ['p', 'paragraph'],
    icon: <span className="text-base">📝</span>,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleNode('paragraph', 'paragraph').run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Large section heading.',
    searchTerms: ['title', 'big', 'large', 'h1'],
    icon: <span className="text-base font-bold">H1</span>,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading.',
    searchTerms: ['subtitle', 'medium', 'h2'],
    icon: <span className="text-base font-bold">H2</span>,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading.',
    searchTerms: ['small', 'h3'],
    icon: <span className="text-base font-bold">H3</span>,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Unordered list.',
    searchTerms: ['unordered', 'point', 'ul'],
    icon: <span className="text-base">•</span>,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Ordered list with numbers.',
    searchTerms: ['ordered', 'ol'],
    icon: <span className="text-base">1.</span>,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'To-do List',
    description: 'Task list with checkboxes.',
    searchTerms: ['todo', 'task', 'checkbox'],
    icon: <span className="text-base">☑️</span>,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Quote',
    description: 'Block quote.',
    searchTerms: ['blockquote', 'cite'],
    icon: <span className="text-base">❝</span>,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Fenced code block.',
    searchTerms: ['code', 'codeblock', 'fenced'],
    icon: <span className="text-base font-mono">&lt;/&gt;</span>,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Divider',
    description: 'Horizontal line separator.',
    searchTerms: ['hr', 'divider', 'separator'],
    icon: <span className="text-base">—</span>,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Image',
    description: 'Upload an image from your device.',
    searchTerms: ['photo', 'picture', 'media', 'img'],
    icon: <span className="text-base">🖼️</span>,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        if (input.files?.length) {
          const file = input.files[0];
          const pos = editor.view.state.selection.from;
          uploadFn(file, editor.view, pos);
        }
      };
      input.click();
    },
  },
]);

const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems,
  },
});

const extensions = [...defaultExtensions, slashCommand];

// ─── Component ───

interface ArticleEditorProps {
  initialContent?: JSONContent;
  onUpdate?: (data: { html: string; json: JSONContent; wordCount: number }) => void;
}

export default function ArticleEditor({ initialContent, onUpdate }: ArticleEditorProps) {
  const defaultContent: JSONContent = useMemo(
    () =>
      initialContent || {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [],
          },
        ],
      },
    [initialContent],
  );

  return (
    <div className="novel-editor relative w-full">
      <EditorRoot>
        <EditorContent
          initialContent={defaultContent}
          extensions={extensions}
          className="relative min-h-[400px] w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class:
                'prose prose-lg dark:prose-invert prose-headings:font-display prose-a:text-cranberry max-w-full focus:outline-none px-8 py-6',
            },
          }}
          onUpdate={({ editor }) => {
            onUpdate?.({
              html: editor.getHTML(),
              json: editor.getJSON(),
              wordCount: editor.storage.characterCount?.words?.() ?? 0,
            });
          }}
        >
          {/* Slash command menu */}
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-1 py-2 shadow-xl transition-all">
            <EditorCommandEmpty className="px-3 py-2 text-sm text-gray-400">No results</EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command?.(val)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-800 cursor-pointer"
                  key={item.title}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          {/* Bubble menu on text selection */}
          <EditorBubble className="flex items-center gap-0.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl px-1 py-1">
            <EditorBubbleItem
              onSelect={(editor) => editor.chain().focus().toggleBold().run()}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
              </svg>
            </EditorBubbleItem>
            <EditorBubbleItem
              onSelect={(editor) => editor.chain().focus().toggleItalic().run()}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="19" y1="4" x2="10" y2="4" />
                <line x1="14" y1="20" x2="5" y2="20" />
                <line x1="15" y1="4" x2="9" y2="20" />
              </svg>
            </EditorBubbleItem>
            <EditorBubbleItem
              onSelect={(editor) => editor.chain().focus().toggleUnderline().run()}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3" />
                <line x1="4" y1="21" x2="20" y2="21" />
              </svg>
            </EditorBubbleItem>
            <EditorBubbleItem
              onSelect={(editor) => editor.chain().focus().toggleStrike().run()}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M16 4H9a3 3 0 00-3 3v0a3 3 0 003 3h6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <path d="M8 20h7a3 3 0 003-3v0a3 3 0 00-3-3h-6" />
              </svg>
            </EditorBubbleItem>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
            <EditorBubbleItem
              onSelect={(editor) => editor.chain().focus().toggleCode().run()}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </EditorBubbleItem>
            <EditorBubbleItem
              onSelect={(editor) => editor.chain().focus().toggleHighlight().run()}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </EditorBubbleItem>
          </EditorBubble>
        </EditorContent>
      </EditorRoot>
    </div>
  );
}
